import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import prisma from "@/lib/db/prisma"
import { requireAdminMutationApi } from "@/lib/security/admin"
import {
    classifyProviderFailure,
    toAiKeyFailureHttpStatus,
} from "@/lib/security/ai-key-status"
import { logAdminError, logAdminInfo } from "@/lib/observability/admin-log"
import { summarizeUnknownError, adminJsonValidationError } from "@/lib/security/admin-helpers"
import { AllAiKeysFailedError, NoActiveAiKeyError, runWithAiRotary } from "@/lib/ai/key-rotary"
import { generateJson } from "@/lib/ai/provider"

// Analysing a post against up to 100 targets is a large model call; extend the timeout.
export const maxDuration = 300

const internalLinksRequestSchema = z.object({
    postId: z.string().cuid(),
})

const linkSuggestionSchema = z.object({
    targetUrl: z.string(),
    targetTitle: z.string(),
    exactPhrase: z.string(),
    replacementHtml: z.string(),
    rationale: z.string().optional(),
})

const internalLinksOutputSchema = z.object({
    suggestions: z.array(linkSuggestionSchema),
})

const INTERNAL_LINKS_SYSTEM_PROMPT =
    "Kamu adalah spesialis SEO internal linking berbahasa Indonesia. Selalu jawab HANYA dengan JSON object valid tanpa markdown code fence."

type SourcePost = { id: string; title: string; content: string }
type TargetPost = { id: string; title: string; slug: string; focusKeyword: string | null }

function toJsonString(value: unknown): string {
    try {
        return JSON.stringify(value)
    } catch {
        return "{}"
    }
}

function errorJsonWithCode(message: string, status: number, errorCode: string, data?: unknown) {
    return NextResponse.json({ success: false, error: message, errorCode, data }, { status })
}

function errorJson(message: string, status: number, data?: unknown) {
    return NextResponse.json({ success: false, error: message, data }, { status })
}

function buildInternalLinkPrompt(sourcePost: SourcePost, targetPosts: TargetPost[]): string {
    return `Tugas Anda adalah menemukan peluang menyisipkan internal link pada "Artikel Sumber" menuju "Artikel Target".
Pilihlah 3 hingga 5 kalimat spesifik dari Artikel Sumber di mana internal link bisa ditambahkan secara sangat natural, kontekstual, dan SEO-friendly.

Daftar Artikel Target:
${targetPosts.map((p) => `- Judul: "${p.title}" | URL: /${p.slug} | Keyword: ${p.focusKeyword || "Tidak ada"}`).join("\n")}

Artikel Sumber:
Judul: ${sourcePost.title}
Konten Asli:
${sourcePost.content}

Instruksi Output:
Kembalikan HANYA format JSON valid dengan key "suggestions" (berisi array objek berikut):
- "targetUrl": (string) URL persis dari daftar Artikel Target (misal: /judul-url).
- "targetTitle": (string) Judul Artikel Target.
- "exactPhrase": (string) Kalimat ASLI yang disalin SAMA PERSIS dari Konten Asli. Minimal 4-8 kata supaya unik saat di-replace. Tidak boleh ada beda tanda baca atau spasi.
- "replacementHtml": (string) "exactPhrase" yang telah disisipkan tautan.
- "rationale": (string) Alasan singkat kenapa link ini relevan.
`
}

export async function POST(request: NextRequest) {
    const adminCheck = await requireAdminMutationApi(request, { action: "ai-internal-links:create" })
    if (!adminCheck.ok) return adminCheck.response

    const requestId = crypto.randomUUID()

    let payload: z.infer<typeof internalLinksRequestSchema>
    try {
        const body = await request.json()
        const parsed = internalLinksRequestSchema.safeParse(body)
        if (!parsed.success) {
            return adminJsonValidationError(parsed.error)
        }
        payload = parsed.data
    } catch {
        return errorJson("Invalid request payload", 400)
    }

    const sourcePost = await prisma.post.findUnique({
        where: { id: payload.postId },
        select: { id: true, title: true, content: true },
    })

    if (!sourcePost) return errorJson("Artikel sumber tidak ditemukan", 404)
    if (!sourcePost.content || sourcePost.content.length < 50) {
        return errorJson("Konten artikel terlalu pendek", 400)
    }

    const targetPosts = await prisma.post.findMany({
        where: {
            status: "PUBLISHED",
            id: { not: payload.postId },
        },
        select: { id: true, title: true, slug: true, focusKeyword: true },
        take: 100,
        orderBy: { publishedAt: "desc" },
    })

    if (targetPosts.length === 0) {
        return errorJson("Tidak ada artikel lain yang PUBLISHED untuk dijadikan target link.", 400)
    }

    const task = await prisma.aiTask.create({
        data: {
            type: "internal_links",
            status: "pending",
            progress: 0,
            userId: adminCheck.identity.id,
            input: toJsonString(payload),
        },
    })

    const sourceContent = sourcePost.content

    try {
        await prisma.aiTask.update({
            where: { id: task.id },
            data: { status: "processing", progress: 20 },
        })

        const prompt = buildInternalLinkPrompt(
            { id: sourcePost.id, title: sourcePost.title, content: sourceContent },
            targetPosts
        )

        const result = await runWithAiRotary({
            capability: "text",
            onAttempt: async (attemptIndex, attemptedKeyIds) => {
                await prisma.aiTask.update({
                    where: { id: task.id },
                    data: {
                        progress: Math.min(70, 30 + attemptIndex * 20),
                        output: toJsonString({ attemptedKeyIds }),
                    },
                })
            },
            run: async (provider) => {
                const generated = await generateJson(
                    provider,
                    {
                        system: INTERNAL_LINKS_SYSTEM_PROMPT,
                        prompt,
                        // Low temperature: the phrase must match the source text verbatim.
                        temperature: 0.2,
                        maxTokens: 4096,
                        timeoutMs: 150_000,
                    },
                    internalLinksOutputSchema
                )

                return { value: generated.data, authStyle: generated.authStyle }
            },
        })

        // Drop hallucinated phrases that do not literally occur in the source content.
        const validSuggestions = result.value.suggestions.filter((suggestion) =>
            sourceContent.includes(suggestion.exactPhrase)
        )

        const taskOutput = {
            postId: sourcePost.id,
            totalSuggestions: result.value.suggestions.length,
            validSuggestionsCount: validSuggestions.length,
            suggestions: validSuggestions,
            invalidSuggestions: result.value.suggestions.filter(
                (suggestion) => !sourceContent.includes(suggestion.exactPhrase)
            ),
            usedKeyId: result.usedKeyId,
        }

        await prisma.aiTask.update({
            where: { id: task.id },
            data: {
                status: "completed",
                progress: 100,
                output: toJsonString(taskOutput),
                error: null,
                completedAt: new Date(),
            },
        })

        logAdminInfo({
            requestId,
            action: "ai-internal-links:create",
            userId: adminCheck.identity.id,
            role: adminCheck.identity.role,
            roleSource: adminCheck.identity.source,
            status: 200,
            payloadSummary: { taskId: task.id, validSuggestions: validSuggestions.length },
            validation: { ok: true },
        })

        return NextResponse.json({
            success: true,
            data: {
                taskId: task.id,
                suggestions: validSuggestions,
            },
        })
    } catch (error) {
        const summarizedError = summarizeUnknownError(error).slice(0, 800)
        const failure = error instanceof AllAiKeysFailedError ? error.failure : classifyProviderFailure(error)

        await prisma.aiTask.update({
            where: { id: task.id },
            data: {
                status: "failed",
                progress: 100,
                error: summarizedError,
                completedAt: new Date(),
            },
        })

        logAdminError({
            requestId,
            action: "ai-internal-links:create",
            userId: adminCheck.identity.id,
            role: adminCheck.identity.role,
            roleSource: adminCheck.identity.source,
            status: toAiKeyFailureHttpStatus(failure),
            error: summarizedError,
        })

        if (error instanceof NoActiveAiKeyError) {
            return errorJsonWithCode(
                "Tidak ada API key AI aktif",
                400,
                "AI_KEYS_NOT_CONFIGURED",
                { taskId: task.id }
            )
        }

        return errorJsonWithCode(
            "Gagal memproses internal link",
            toAiKeyFailureHttpStatus(failure),
            failure.code,
            { taskId: task.id }
        )
    }
}
