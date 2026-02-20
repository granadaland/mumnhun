import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import prisma from "@/lib/db/prisma"
import { requireAdminMutationApi } from "@/lib/security/admin"
import { decryptStoredApiKey } from "@/lib/security/api-key-crypto"
import {
    classifyAiKeyFailure,
    formatStoredAiKeyFailure,
    toAiKeyFailureHttpStatus,
} from "@/lib/security/ai-key-status"
import { logAdminError, logAdminInfo, logAdminWarn } from "@/lib/observability/admin-log"
import { summarizeUnknownError, adminJsonValidationError } from "@/lib/security/admin-helpers"

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

type GeminiResponse = {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
    text?: string
}

const GEMINI_MODEL_CANDIDATES = ["gemini-2.5-flash", "gemini-1.5-flash", "gemini-1.5-flash-001"]

function toJsonString(value: unknown): string {
    return JSON.stringify(value)
}

function errorJsonWithCode(message: string, status: number, errorCode: string, data?: unknown) {
    return NextResponse.json({ success: false, error: message, errorCode, data }, { status })
}

function errorJson(message: string, status: number, data?: unknown) {
    return NextResponse.json({ success: false, error: message, data }, { status })
}

function extractJsonObject(raw: string): string {
    const start = raw.indexOf("{")
    const end = raw.lastIndexOf("}")
    if (start === -1 || end === -1 || end < start) return raw
    return raw.slice(start, end + 1)
}

function buildInternalLinkPrompt(sourcePost: any, targetPosts: any[]): string {
    return `Tugas Anda adalah menemukan peluang menyisipkan internal link pada "Artikel Sumber" menuju "Artikel Target".
Pilihlah 3 hingga 5 kalimat spesifik dari Artikel Sumber di mana internal link bisa ditambahkan secara sangat natural, kontekstual, dan SEO-friendly.

Daftar Artikel Target:
${targetPosts.map(p => `- Judul: "${p.title}" | URL: /${p.slug} | Keyword: ${p.focusKeyword || 'Tidak ada'}`).join('\n')}

Artikel Sumber:
Judul: ${sourcePost.title}
Konten Asli:
${sourcePost.content}

Instruksi Output:
Kembalikan HANYA format JSON valid dengan key "suggestions" (berisi array objek berikut):
- "targetUrl": (string) URL persis dari daftar Artikel Target (misal: /judul-url).
- "targetTitle": (string) Judul Artikel Target.
- "exactPhrase": (string) Kalimat ASLI yang disalin SAMA PERSIS dari Konten Asli. Minimal 4-8 kata supaya unik saat di-replace (text replacement). Tidak boleh ada beda tanda baca atau spasi.
- "replacementHtml": (string) "exactPhrase" yang telah disisipkan tautan. Contoh aslinya "minum air sangat penting" menjadi "minum <a href='/pentingnya-hidrasi'>air sangat penting</a>".
- "rationale": (string) Alasan singkat kenapa link ini relevan.
`
}

async function callGeminiInternalLinks(apiKey: string, prompt: string) {
    const controller = new AbortController()
    const timeoutHandle = setTimeout(() => {
        controller.abort()
    }, 45000)

    try {
        let lastModelError: Error | null = null

        for (let index = 0; index < GEMINI_MODEL_CANDIDATES.length; index += 1) {
            const model = GEMINI_MODEL_CANDIDATES[index]
            const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`

            const response = await fetch(endpoint, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{ role: "user", parts: [{ text: prompt }] }],
                    generationConfig: {
                        temperature: 0.2, // Low temperature for high precision matching
                        responseMimeType: "application/json",
                    },
                }),
                signal: controller.signal,
            })

            if (!response.ok) {
                const rawText = await response.text()
                const isNotFound = response.status === 404
                lastModelError = new Error(`Gemini HTTP ${response.status} (${model}): ${rawText.slice(0, 200)}`)

                if (isNotFound && index < GEMINI_MODEL_CANDIDATES.length - 1) {
                    continue
                }

                throw lastModelError
            }

            const payload = (await response.json()) as GeminiResponse
            const candidateText = payload.candidates?.[0]?.content?.parts?.[0]?.text || ""

            if (!candidateText) {
                throw new Error("Gemini tidak mengembalikan konten")
            }

            const jsonText = extractJsonObject(candidateText)
            const parsed = internalLinksOutputSchema.safeParse(JSON.parse(jsonText))

            if (!parsed.success) {
                throw new Error(`Output AI tidak valid: ${parsed.error.issues[0]?.message || "unknown"}`)
            }

            return parsed.data
        }

        throw lastModelError ?? new Error("Semua model Gemini gagal diakses")
    } finally {
        clearTimeout(timeoutHandle)
    }
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
    if (!sourcePost.content || sourcePost.content.length < 50) return errorJson("Konten artikel terlalu pendek", 400)

    // Fetch up to 100 other published posts
    const targetPosts = await prisma.post.findMany({
        where: {
            status: "PUBLISHED",
            id: { not: payload.postId }
        },
        select: { id: true, title: true, slug: true, focusKeyword: true },
        take: 100,
        orderBy: { publishedAt: "desc" }
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

    try {
        await prisma.aiTask.update({
            where: { id: task.id },
            data: { status: "processing", progress: 20 },
        })

        const activeKeys = await prisma.aiApiKey.findMany({
            where: { isActive: true },
            orderBy: [{ usageCount: "asc" }, { order: "asc" }, { createdAt: "asc" }],
        })

        if (activeKeys.length === 0) throw new Error("Tidak ada API key AI aktif")

        const attemptedKeyIds: string[] = []
        const maxAttempts = Math.min(activeKeys.length, 3)

        let aiResult: z.infer<typeof internalLinksOutputSchema> | null = null
        let selectedKeyId: string | null = null
        let lastErrorMessage = "AI internal link failed"

        for (let index = 0; index < maxAttempts; index += 1) {
            const keyRecord = activeKeys[index]
            attemptedKeyIds.push(keyRecord.id)

            await prisma.aiTask.update({
                where: { id: task.id },
                data: {
                    progress: Math.min(70, 30 + index * 20),
                    output: toJsonString({ attemptedKeyIds }),
                },
            })

            try {
                const decryptedKey = decryptStoredApiKey(keyRecord.apiKey)
                const prompt = buildInternalLinkPrompt(sourcePost, targetPosts)
                aiResult = await callGeminiInternalLinks(decryptedKey, prompt)
                selectedKeyId = keyRecord.id

                await prisma.aiApiKey.update({
                    where: { id: keyRecord.id },
                    data: {
                        usageCount: { increment: 1 },
                        lastUsedAt: new Date(),
                        lastError: null,
                    },
                })
                break
            } catch (error) {
                const failure = classifyAiKeyFailure(error)
                lastErrorMessage = failure.message

                await prisma.aiApiKey.update({
                    where: { id: keyRecord.id },
                    data: {
                        lastUsedAt: new Date(),
                        lastError: formatStoredAiKeyFailure(failure),
                    },
                })
            }
        }

        if (!aiResult || !selectedKeyId) throw new Error(`Semua API key gagal: ${lastErrorMessage}`)

        // Filter out suggestions that don't actually exist in the content (hallucinations)
        const validSuggestions = aiResult.suggestions.filter(s => sourcePost.content.includes(s.exactPhrase))

        const taskOutput = {
            postId: sourcePost.id,
            totalSuggestions: aiResult.suggestions.length,
            validSuggestionsCount: validSuggestions.length,
            suggestions: validSuggestions,
            invalidSuggestions: aiResult.suggestions.filter(s => !sourcePost.content.includes(s.exactPhrase)),
            usedKeyId: selectedKeyId,
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
        const failure = classifyAiKeyFailure(error)

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
            status: 500,
            error: summarizedError,
        })

        return errorJsonWithCode("Gagal memproses internal link", toAiKeyFailureHttpStatus(failure), failure.code)
    }
}
