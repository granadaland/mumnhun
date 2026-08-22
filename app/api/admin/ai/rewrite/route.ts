import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import prisma from "@/lib/db/prisma"
import { requireAdminMutationApi } from "@/lib/security/admin"
import {
    classifyProviderFailure,
    toAiKeyFailureHttpStatus,
} from "@/lib/security/ai-key-status"
import { logAdminError, logAdminInfo, logAdminWarn } from "@/lib/observability/admin-log"
import { summarizeUnknownError, adminJsonValidationError } from "@/lib/security/admin-helpers"
import { AllAiKeysFailedError, NoActiveAiKeyError, runWithAiRotary } from "@/lib/ai/key-rotary"
import { generateJson } from "@/lib/ai/provider"

const rewriteRequestSchema = z.object({
    postId: z.string().cuid(),
    tone: z.string().trim().max(80).optional(),
    focusKeyword: z.string().trim().max(120).optional(),
})

const rewriteOutputSchema = z.object({
    title: z.string().trim().max(180),
    contentHtml: z.string().trim().min(50),
    excerpt: z.string().trim().max(320).optional(),
})

const REWRITE_SYSTEM_PROMPT =
    "Kamu adalah editor konten SEO berbahasa Indonesia. Selalu jawab HANYA dengan JSON object valid tanpa markdown code fence."

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

function buildRewritePrompt(
    post: { title: string; content: string | null },
    tone?: string,
    keyword?: string
): string {
    let prompt = `Tolong tulis ulang (rewrite) artikel blog berikut ini secara menyeluruh agar unik, segar, dan bebas plagiarisme.
Tetap pertahankan informasi kuncinya, namun ubah cara penyampaian, struktur kalimat, dan paragrafnya.
Pastikan format output tetap berupa HTML yang rapi (menggunakan <p>, <h2>, <h3>, <ul>, dsb). Jangan sertakan <h1>.

Judul Asli: ${post.title}
Konten Asli:
${post.content ?? ""}

`

    if (tone) {
        prompt += `Target Gaya Bahasa (Tone): ${tone}\n`
    }
    if (keyword) {
        prompt += `Fokus Keyword SEO: ${keyword}\n`
    }

    prompt += `\nKembalikan hasilnya HANYA dalam format JSON dengan struktur: "title" (judul baru), "contentHtml" (konten hasil rewrite lengkap), dan "excerpt" (ringkasan pendek maksimal 300 karakter).`

    return prompt
}

export async function POST(request: NextRequest) {
    const adminCheck = await requireAdminMutationApi(request, { action: "ai-rewrite:create" })
    if (!adminCheck.ok) return adminCheck.response

    const requestId = crypto.randomUUID()

    let payload: z.infer<typeof rewriteRequestSchema>
    try {
        const body = await request.json()
        const parsed = rewriteRequestSchema.safeParse(body)
        if (!parsed.success) {
            logAdminWarn({
                requestId,
                action: "ai-rewrite:create",
                userId: adminCheck.identity.id,
                role: adminCheck.identity.role,
                roleSource: adminCheck.identity.source,
                status: 400,
                validation: { ok: false, reason: "invalid_payload" },
            })
            return adminJsonValidationError(parsed.error)
        }
        payload = parsed.data
    } catch {
        return errorJson("Invalid request payload", 400)
    }

    const postToRewrite = await prisma.post.findUnique({
        where: { id: payload.postId },
        select: { id: true, title: true, content: true },
    })

    if (!postToRewrite) {
        return errorJson("Artikel tidak ditemukan", 404)
    }

    if (!postToRewrite.content || postToRewrite.content.length < 50) {
        return errorJson("Konten artikel terlalu pendek untuk di-rewrite", 400)
    }

    const task = await prisma.aiTask.create({
        data: {
            type: "rewrite_article",
            status: "pending",
            progress: 0,
            userId: adminCheck.identity.id,
            input: toJsonString(payload),
        },
    })

    try {
        await prisma.aiTask.update({
            where: { id: task.id },
            data: { status: "processing", progress: 15 },
        })

        const prompt = buildRewritePrompt(postToRewrite, payload.tone, payload.focusKeyword)

        // Provider-agnostic: works with Gemini or any custom OpenAI-compatible gateway.
        const result = await runWithAiRotary({
            capability: "text",
            onAttempt: async (attemptIndex, attemptedKeyIds) => {
                await prisma.aiTask.update({
                    where: { id: task.id },
                    data: {
                        progress: Math.min(70, 25 + attemptIndex * 20),
                        output: toJsonString({ attemptedKeyIds }),
                    },
                })
            },
            run: async (provider) => {
                const generated = await generateJson(
                    provider,
                    {
                        system: REWRITE_SYSTEM_PROMPT,
                        prompt,
                        temperature: 0.7,
                        maxTokens: 4096,
                        timeoutMs: 90_000,
                    },
                    rewriteOutputSchema
                )

                return { value: generated.data, authStyle: generated.authStyle }
            },
        })

        const taskOutput = {
            postId: postToRewrite.id,
            originalTitle: postToRewrite.title,
            rewrittenTitle: result.value.title,
            rewrittenContentHtml: result.value.contentHtml,
            rewrittenExcerpt: result.value.excerpt,
            usedKeyId: result.usedKeyId,
            attemptedKeyIds: result.attemptedKeyIds,
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
            action: "ai-rewrite:create",
            userId: adminCheck.identity.id,
            role: adminCheck.identity.role,
            roleSource: adminCheck.identity.source,
            status: 200,
            payloadSummary: {
                taskId: task.id,
                postId: postToRewrite.id,
                attempts: result.attemptedKeyIds.length,
                usedKeyId: result.usedKeyId,
            },
            validation: { ok: true },
        })

        return NextResponse.json({
            success: true,
            data: {
                taskId: task.id,
                taskStatus: "completed",
                result: taskOutput,
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
            action: "ai-rewrite:create",
            userId: adminCheck.identity.id,
            role: adminCheck.identity.role,
            roleSource: adminCheck.identity.source,
            status: toAiKeyFailureHttpStatus(failure),
            error: summarizedError,
            payloadSummary: { taskId: task.id },
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
            "Gagal me-rewrite artikel AI",
            toAiKeyFailureHttpStatus(failure),
            failure.code,
            { taskId: task.id }
        )
    }
}
