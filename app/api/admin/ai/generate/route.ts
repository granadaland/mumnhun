import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import prisma from "@/lib/db/prisma"
import { requireAdminMutationApi } from "@/lib/security/admin"
import { decryptStoredApiKey } from "@/lib/security/api-key-crypto"
import { logAdminError, logAdminInfo, logAdminWarn } from "@/lib/observability/admin-log"
import { summarizeUnknownError } from "@/lib/security/admin-helpers"

const generateArticleSchema = z.object({
    topic: z.string().trim().min(3, "Topic/keyword minimal 3 karakter").max(200),
    tone: z.string().trim().min(2).max(80).optional(),
    targetWordCount: z.coerce.number().int().min(300).max(3000).optional(),
})

const aiArticleOutputSchema = z.object({
    title: z.string().trim().min(10).max(180),
    contentHtml: z.string().trim().min(200),
    excerpt: z.string().trim().min(30).max(320),
    metaTitle: z.string().trim().min(10).max(70),
    metaDescription: z.string().trim().min(30).max(170),
    focusKeyword: z.string().trim().min(2).max(120),
    slugSuggestion: z.string().trim().min(3).max(180),
})

type GeminiResponse = {
    candidates?: Array<{
        content?: {
            parts?: Array<{ text?: string }>
        }
    }>
}

function toJsonString(value: unknown): string {
    try {
        return JSON.stringify(value)
    } catch {
        return "{}"
    }
}

function errorJson(message: string, status: number, data?: unknown) {
    return NextResponse.json(
        {
            success: false,
            error: message,
            ...(typeof data === "undefined" ? {} : { data }),
        },
        { status }
    )
}

function slugify(text: string): string {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-+|-+$/g, "")
}

function estimateReadingTime(contentHtml: string): number {
    const words = contentHtml.replace(/<[^>]*>/g, " ").split(/\s+/).filter(Boolean).length
    return Math.max(1, Math.ceil(words / 200))
}

async function ensureUniquePostSlug(base: string): Promise<string> {
    const normalizedBase = slugify(base) || `artikel-${Date.now()}`
    let attempt = 0

    while (attempt < 50) {
        const candidate = attempt === 0 ? normalizedBase : `${normalizedBase}-${attempt + 1}`
        const existing = await prisma.post.findUnique({ where: { slug: candidate }, select: { id: true } })

        if (!existing) {
            return candidate
        }

        attempt += 1
    }

    return `${normalizedBase}-${Date.now()}`
}

function buildPrompt(input: z.infer<typeof generateArticleSchema>): string {
    const toneText = input.tone?.trim() ? input.tone.trim() : "informatif"
    const targetWordCount = input.targetWordCount ?? 900

    return [
        "Tulis artikel blog berbahasa Indonesia yang siap dipublikasikan.",
        `Topik utama: ${input.topic}`,
        `Tone: ${toneText}`,
        `Target jumlah kata: sekitar ${targetWordCount} kata`,
        "",
        "Keluaran HARUS valid JSON object tanpa markdown code fence.",
        "Gunakan struktur persis berikut:",
        "{",
        '  "title": "...",',
        '  "contentHtml": "...",',
        '  "excerpt": "...",',
        '  "metaTitle": "...",',
        '  "metaDescription": "...",',
        '  "focusKeyword": "...",',
        '  "slugSuggestion": "..."',
        "}",
        "",
        "Ketentuan penting:",
        "- contentHtml harus berupa HTML sederhana dan valid.",
        "- Sertakan <h2> untuk subjudul, <p> untuk paragraf, dan setidaknya satu <ul><li>.",
        "- Jangan gunakan <script> atau style inline.",
        "- excerpt maksimal 320 karakter.",
        "- metaTitle maksimal 70 karakter.",
        "- metaDescription maksimal 170 karakter.",
        "- slugSuggestion berupa slug URL-friendly (huruf kecil, dash).",
    ].join("\n")
}

function extractJsonObject(raw: string): string {
    const trimmed = raw.trim()
    if (trimmed.startsWith("{")) return trimmed

    const codeFenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)
    if (codeFenceMatch?.[1]) {
        return codeFenceMatch[1].trim()
    }

    const firstBrace = trimmed.indexOf("{")
    const lastBrace = trimmed.lastIndexOf("}")
    if (firstBrace >= 0 && lastBrace > firstBrace) {
        return trimmed.slice(firstBrace, lastBrace + 1)
    }

    throw new Error("AI response tidak berformat JSON")
}

async function callGeminiGenerateArticle(apiKey: string, input: z.infer<typeof generateArticleSchema>) {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`

    const controller = new AbortController()
    const timeoutHandle = setTimeout(() => {
        controller.abort()
    }, 45000)

    try {
        const response = await fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{ role: "user", parts: [{ text: buildPrompt(input) }] }],
                generationConfig: {
                    temperature: 0.7,
                    topP: 0.9,
                    maxOutputTokens: 4096,
                    responseMimeType: "application/json",
                },
            }),
            signal: controller.signal,
        })

        if (!response.ok) {
            const rawText = await response.text()
            throw new Error(`Gemini HTTP ${response.status}: ${rawText.slice(0, 200)}`)
        }

        const payload = (await response.json()) as GeminiResponse
        const candidateText = payload.candidates?.[0]?.content?.parts
            ?.map((part) => part.text || "")
            .join("\n")
            .trim()

        if (!candidateText) {
            throw new Error("Gemini tidak mengembalikan konten")
        }

        const jsonText = extractJsonObject(candidateText)
        const parsed = aiArticleOutputSchema.safeParse(JSON.parse(jsonText))

        if (!parsed.success) {
            throw new Error(`Output AI tidak valid: ${parsed.error.issues[0]?.message || "unknown"}`)
        }

        return parsed.data
    } finally {
        clearTimeout(timeoutHandle)
    }
}

export async function POST(request: NextRequest) {
    const adminCheck = await requireAdminMutationApi(request, { action: "ai-generate:create" })
    if (!adminCheck.ok) return adminCheck.response

    const requestId = crypto.randomUUID()

    let payload: z.infer<typeof generateArticleSchema>
    try {
        const body = await request.json()
        const parsed = generateArticleSchema.safeParse(body)

        if (!parsed.success) {
            logAdminWarn({
                requestId,
                action: "ai-generate:create",
                userId: adminCheck.identity.id,
                role: adminCheck.identity.role,
                roleSource: adminCheck.identity.source,
                status: 400,
                validation: { ok: false, reason: "invalid_payload" },
            })

            return errorJson("Validation failed", 400, {
                issues: parsed.error.issues.map((issue) => ({
                    path: issue.path.join("."),
                    code: issue.code,
                    message: issue.message,
                })),
            })
        }

        payload = parsed.data
    } catch {
        return errorJson("Invalid request payload", 400)
    }

    const task = await prisma.aiTask.create({
        data: {
            type: "generate_article",
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

        let aiResult: z.infer<typeof aiArticleOutputSchema> | null = null
        let selectedKeyId: string | null = null
        let lastErrorMessage = "AI generation failed"

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
                aiResult = await callGeminiGenerateArticle(decryptedKey, payload)
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
                lastErrorMessage = summarizeUnknownError(error)

                await prisma.aiApiKey.update({
                    where: { id: keyRecord.id },
                    data: {
                        lastUsedAt: new Date(),
                        lastError: lastErrorMessage.slice(0, 500),
                    },
                })
            }
        }

        if (!aiResult || !selectedKeyId) {
            throw new Error(`Semua API key gagal: ${lastErrorMessage}`)
        }

        await prisma.aiTask.update({
            where: { id: task.id },
            data: { progress: 80 },
        })

        const slug = await ensureUniquePostSlug(aiResult.slugSuggestion || aiResult.title || payload.topic)

        const dbUser = adminCheck.identity.email
            ? await prisma.user.findUnique({
                where: { email: adminCheck.identity.email },
                select: { id: true },
            })
            : null

        const post = await prisma.post.create({
            data: {
                title: aiResult.title,
                slug,
                content: aiResult.contentHtml,
                excerpt: aiResult.excerpt,
                status: "DRAFT",
                readingTime: estimateReadingTime(aiResult.contentHtml),
                metaTitle: aiResult.metaTitle,
                metaDescription: aiResult.metaDescription,
                focusKeyword: aiResult.focusKeyword,
                authorId: dbUser?.id,
            },
            select: {
                id: true,
                slug: true,
                title: true,
                status: true,
            },
        })

        const taskOutput = {
            postId: post.id,
            postSlug: post.slug,
            postTitle: post.title,
            usedKeyId: selectedKeyId,
            attemptedKeyIds,
            editUrl: `/admin/posts/${post.id}/edit`,
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
            action: "ai-generate:create",
            userId: adminCheck.identity.id,
            role: adminCheck.identity.role,
            roleSource: adminCheck.identity.source,
            status: 200,
            payloadSummary: {
                taskId: task.id,
                postId: post.id,
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
                post: {
                    id: post.id,
                    slug: post.slug,
                    title: post.title,
                    status: post.status,
                    editUrl: `/admin/posts/${post.id}/edit`,
                },
            },
        })
    } catch (error) {
        const summarizedError = summarizeUnknownError(error).slice(0, 800)

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
            action: "ai-generate:create",
            userId: adminCheck.identity.id,
            role: adminCheck.identity.role,
            roleSource: adminCheck.identity.source,
            status: 500,
            error: summarizedError,
            payloadSummary: { taskId: task.id },
        })

        return errorJson("Gagal generate artikel AI", 500, { taskId: task.id })
    }
}
