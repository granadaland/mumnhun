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

function buildRewritePrompt(post: any, tone?: string, keyword?: string): string {
    let prompt = `Tolong tulis ulang (rewrite) artikel blog berikut ini secara menyeluruh agar unik, segar, dan bebas plagiarisme.
Tetap pertahankan informasi kuncinya, namun ubah cara penyampaian, struktur kalimat, dan paragrafnya.
Pastikan format output tetap berupa HTML yang rapi (menggunakan <p>, <h2>, <h3>, <ul>, dsb). Jangan sertakan <h1>.

Judul Asli: ${post.title}
Konten Asli:
${post.content}

`
    if (tone) {
        prompt += `Target Gaya Bahasa (Tone): ${tone}\n`
    }
    if (keyword) {
        prompt += `Fokus Keyword SEO: ${keyword}\n`
    }

    prompt += `\nKenbalikan hasilnya HANYA dalam format JSON dengan struktur: "title" (opsional judul baru), "contentHtml" (konten hasil rewrite lengkap), dan "excerpt" (ringkasan pendek maksimal 300 karakter).`

    return prompt
}

async function callGeminiRewrite(apiKey: string, prompt: string) {
    const controller = new AbortController()
    const timeoutHandle = setTimeout(() => {
        controller.abort()
    }, 60000) // 60s for rewriting

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
                        temperature: 0.7,
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
            const parsed = rewriteOutputSchema.safeParse(JSON.parse(jsonText))

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

        const activeKeys = await prisma.aiApiKey.findMany({
            where: { isActive: true },
            orderBy: [{ usageCount: "asc" }, { order: "asc" }, { createdAt: "asc" }],
        })

        if (activeKeys.length === 0) {
            throw new Error("Tidak ada API key AI aktif")
        }

        const attemptedKeyIds: string[] = []
        const maxAttempts = Math.min(activeKeys.length, 3)

        let aiResult: z.infer<typeof rewriteOutputSchema> | null = null
        let selectedKeyId: string | null = null
        let lastErrorMessage = "AI rewrite failed"

        for (let index = 0; index < maxAttempts; index += 1) {
            const keyRecord = activeKeys[index]
            attemptedKeyIds.push(keyRecord.id)

            await prisma.aiTask.update({
                where: { id: task.id },
                data: {
                    progress: Math.min(70, 25 + index * 20),
                    output: toJsonString({ attemptedKeyIds }),
                },
            })

            try {
                const decryptedKey = decryptStoredApiKey(keyRecord.apiKey)
                const prompt = buildRewritePrompt(postToRewrite, payload.tone, payload.focusKeyword)
                aiResult = await callGeminiRewrite(decryptedKey, prompt)
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

        if (!aiResult || !selectedKeyId) {
            throw new Error(`Semua API key gagal: ${lastErrorMessage}`)
        }

        const taskOutput = {
            postId: postToRewrite.id,
            originalTitle: postToRewrite.title,
            rewrittenTitle: aiResult.title,
            rewrittenContentHtml: aiResult.contentHtml,
            rewrittenExcerpt: aiResult.excerpt,
            usedKeyId: selectedKeyId,
            attemptedKeyIds,
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
                attempts: attemptedKeyIds.length,
                usedKeyId: selectedKeyId,
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
            action: "ai-rewrite:create",
            userId: adminCheck.identity.id,
            role: adminCheck.identity.role,
            roleSource: adminCheck.identity.source,
            status: 500,
            error: summarizedError,
            payloadSummary: { taskId: task.id },
        })

        return errorJsonWithCode(
            "Gagal me-rewrite artikel AI",
            toAiKeyFailureHttpStatus(failure),
            failure.code,
            { taskId: task.id }
        )
    }
}
