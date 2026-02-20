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
import { logAdminError, logAdminWarn, logAdminInfo } from "@/lib/observability/admin-log"
import { summarizeUnknownError } from "@/lib/security/admin-helpers"

const assistRequestSchema = z.discriminatedUnion("action", [
    z.object({
        action: z.literal("generate_title"),
        payload: z.object({ topic: z.string().trim().min(2).max(200) })
    }),
    z.object({
        action: z.literal("generate_excerpt"),
        payload: z.object({
            title: z.string().trim().max(180),
            content: z.string().trim().min(10)
        })
    }),
    z.object({
        action: z.literal("generate_outline"),
        payload: z.object({
            title: z.string().trim().max(180),
            keyword: z.string().trim().max(120).optional()
        })
    }),
    z.object({
        action: z.literal("generate_content"),
        payload: z.object({
            title: z.string().trim().max(180),
            outline: z.string().trim().min(10),
            keyword: z.string().trim().max(120).optional()
        })
    }),
    z.object({
        action: z.literal("generate_seo"),
        payload: z.object({
            title: z.string().trim().max(180),
            content: z.string().trim().min(50),
            keyword: z.string().trim().max(120).optional()
        })
    }),
])

type GeminiResponse = {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
    text?: string
}

const GEMINI_MODEL_CANDIDATES = ["gemini-2.5-flash", "gemini-1.5-flash", "gemini-1.5-flash-001"]

function extractJsonObject(raw: string): string {
    const start = raw.indexOf("{")
    const end = raw.lastIndexOf("}")
    if (start === -1 || end === -1 || end < start) return raw
    return raw.slice(start, end + 1)
}

function errorJsonWithCode(message: string, status: number, errorCode: string, data?: unknown) {
    return NextResponse.json({ success: false, error: message, errorCode, data }, { status })
}

function buildPrompt(req: z.infer<typeof assistRequestSchema>): string {
    switch (req.action) {
        case "generate_title":
            return `Hasilkan 5 ide judul artikel blog SEO-friendly untuk topik: "${req.payload.topic}". 
Tuliskan hasil dalam format JSON array of strings dengan nama key "titles". Contoh: {"titles": ["Judul 1", "Judul 2", ...]}`

        case "generate_excerpt":
            return `Buatkan ringkasan (excerpt) menarik maksimal 300 karakter untuk artikel blog ini.
Judul: ${req.payload.title}
Konten: ${req.payload.content.slice(0, 1500)}...
Kembalikan dalam format JSON dengan key "excerpt".`

        case "generate_outline":
            return `Buatkan struktur outline artikel (H2 dan H3) untuk artikel blog.
Judul: ${req.payload.title}
${req.payload.keyword ? `Fokus Keyword: ${req.payload.keyword}` : ""}
Kembalikan dalam format JSON HTML string dengan key "outlineHtml".`

        case "generate_content":
            return `Tulis artikel blog lengkap dan SEO-friendly dalam format HTML.
Judul: ${req.payload.title}
${req.payload.keyword ? `Keyword: ${req.payload.keyword}` : ""}
Gunakan outline ini sebagai struktur:
${req.payload.outline}
Hanya gunakan tag H2, H3, p, ul, ol, li, strong, em. Jangan sertakan tag H1.
Kembalikan dalam format JSON dengan key "contentHtml".`

        case "generate_seo":
            return `Buatkan metadata SEO lengkap untuk artikel blog ini.
Judul: ${req.payload.title}
${req.payload.keyword ? `Keyword: ${req.payload.keyword}` : ""}
Konten: ${req.payload.content.slice(0, 2000)}...
Kembalikan dalam format JSON dengan keys: "metaTitle" (maks 60 char), "metaDescription" (maks 160 char), "ogTitle" (mirip metaTitle), "ogDescription" (mirip metaDeskripsi), "schemaType" (pilih antara Article, BlogPosting, atau HowTo).`
    }
}

async function callGemini(apiKey: string, prompt: string) {
    // Set 45s timeout limit like the original
    const controller = new AbortController()
    const timeoutHandle = setTimeout(() => controller.abort(), 45000)

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

            if (!candidateText) throw new Error("Gemini tidak mengembalikan konten")

            const jsonText = extractJsonObject(candidateText)
            return JSON.parse(jsonText)
        }

        throw lastModelError ?? new Error("Semua model Gemini gagal diakses")
    } finally {
        clearTimeout(timeoutHandle)
    }
}

export async function POST(request: NextRequest) {
    const adminCheck = await requireAdminMutationApi(request, { action: "ai-assist" })
    if (!adminCheck.ok) return adminCheck.response

    const requestId = crypto.randomUUID()

    let payload: z.infer<typeof assistRequestSchema>
    try {
        const body = await request.json()
        const parsed = assistRequestSchema.safeParse(body)
        if (!parsed.success) {
            return NextResponse.json({ success: false, error: "Validation failed" }, { status: 400 })
        }
        payload = parsed.data
    } catch {
        return NextResponse.json({ success: false, error: "Invalid payload" }, { status: 400 })
    }

    try {
        const activeKeys = await prisma.aiApiKey.findMany({
            where: { isActive: true },
            orderBy: [{ usageCount: "asc" }, { order: "asc" }, { createdAt: "asc" }],
        })

        if (activeKeys.length === 0) {
            throw new Error("Tidak ada API key AI aktif")
        }

        const maxAttempts = Math.min(activeKeys.length, 3)
        let aiResult: any = null
        let lastErrorMessage = "AI failed"

        for (let index = 0; index < maxAttempts; index++) {
            const keyRecord = activeKeys[index]
            try {
                const decryptedKey = decryptStoredApiKey(keyRecord.apiKey)
                aiResult = await callGemini(decryptedKey, buildPrompt(payload))

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

        if (!aiResult) {
            throw new Error(`Semua trial gagal: ${lastErrorMessage}`)
        }

        return NextResponse.json({ success: true, data: aiResult })

    } catch (error) {
        const summarizedError = summarizeUnknownError(error).slice(0, 800)
        const failure = classifyAiKeyFailure(error)

        logAdminError({
            requestId,
            action: "ai-assist",
            userId: adminCheck.identity.id,
            role: adminCheck.identity.role,
            roleSource: adminCheck.identity.source,
            status: 500,
            error: summarizedError,
        })

        return errorJsonWithCode(
            "Gagal diproses AI",
            toAiKeyFailureHttpStatus(failure),
            failure.code
        )
    }
}
