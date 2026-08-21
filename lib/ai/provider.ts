import { z } from "zod"
import {
    getAiProviderGuardOptions,
    readResponseWithLimit,
    safeExternalFetch,
} from "@/lib/security/url-guard"

export const AI_PROVIDER_GEMINI = "gemini"
export const AI_PROVIDER_OPENAI_COMPATIBLE = "openai_compatible"

export const AI_PROVIDERS = [AI_PROVIDER_GEMINI, AI_PROVIDER_OPENAI_COMPATIBLE] as const

export const AI_CAPABILITIES = ["text", "image"] as const
export type AiCapability = (typeof AI_CAPABILITIES)[number]

export const GEMINI_MODEL_CANDIDATES = ["gemini-2.5-flash", "gemini-1.5-flash", "gemini-1.5-flash-001"]

const GENERATE_TIMEOUT_MS = 90_000
export const aiArticleOutputSchema = z.object({
    title: z.string().trim().min(10).max(180),
    contentHtml: z.string().trim().min(200),
    excerpt: z.string().trim().min(30).max(320),
    metaTitle: z.string().trim().min(10).max(70),
    metaDescription: z.string().trim().min(30).max(170),
    focusKeyword: z.string().trim().min(2).max(120),
    slugSuggestion: z.string().trim().min(3).max(180),
})

export type AiArticleOutput = z.infer<typeof aiArticleOutputSchema>

export type GenerateArticleInput = {
    topic: string
    tone?: string
    targetWordCount?: number
}

export type ResolvedAiProvider = {
    provider: string
    apiKey: string
    baseUrl?: string | null
    model?: string | null
}

export function buildArticlePrompt(input: GenerateArticleInput): string {
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

export function extractJsonObject(raw: string): string {
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

function parseArticleOutput(rawText: string): AiArticleOutput {
    const jsonText = extractJsonObject(rawText)
    const parsed = aiArticleOutputSchema.safeParse(JSON.parse(jsonText))

    if (!parsed.success) {
        throw new Error(`Output AI tidak valid: ${parsed.error.issues[0]?.message || "unknown"}`)
    }

    return parsed.data
}

type GeminiResponse = {
    candidates?: Array<{
        content?: {
            parts?: Array<{ text?: string }>
        }
    }>
}

async function callGeminiGenerateArticle(apiKey: string, input: GenerateArticleInput): Promise<AiArticleOutput> {
    const controller = new AbortController()
    const timeoutHandle = setTimeout(() => {
        controller.abort()
    }, GENERATE_TIMEOUT_MS)

    try {
        let lastModelError: Error | null = null

        for (let index = 0; index < GEMINI_MODEL_CANDIDATES.length; index += 1) {
            const model = GEMINI_MODEL_CANDIDATES[index]
            const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`

            const response = await fetch(endpoint, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{ role: "user", parts: [{ text: buildArticlePrompt(input) }] }],
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
                const isNotFound = response.status === 404
                lastModelError = new Error(`Gemini HTTP ${response.status} (${model}): ${rawText.slice(0, 200)}`)

                if (isNotFound && index < GEMINI_MODEL_CANDIDATES.length - 1) {
                    continue
                }

                throw lastModelError
            }

            const payload = (await response.json()) as GeminiResponse
            const candidateText = payload.candidates?.[0]?.content?.parts
                ?.map((part) => part.text || "")
                .join("\n")
                .trim()

            if (!candidateText) {
                throw new Error("Gemini tidak mengembalikan konten")
            }

            return parseArticleOutput(candidateText)
        }

        throw lastModelError ?? new Error("Semua model Gemini gagal diakses")
    } finally {
        clearTimeout(timeoutHandle)
    }
}

type OpenAiChatCompletionResponse = {
    choices?: Array<{
        message?: {
            content?: string | null
        }
    }>
}

async function callOpenAiCompatibleGenerateArticle(
    config: { apiKey: string; baseUrl: string; model: string },
    input: GenerateArticleInput
): Promise<AiArticleOutput> {
    const endpoint = `${config.baseUrl.replace(/\/+$/, "")}/chat/completions`

    const response = await safeExternalFetch(endpoint, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            Authorization: `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({
            model: config.model,
            temperature: 0.7,
            top_p: 0.9,
            max_tokens: 4096,
            response_format: { type: "json_object" },
            messages: [
                {
                    role: "system",
                    content:
                        "Kamu adalah penulis konten SEO berbahasa Indonesia. Selalu jawab dengan JSON object valid tanpa markdown code fence.",
                },
                { role: "user", content: buildArticlePrompt(input) },
            ],
        }),
        guard: getAiProviderGuardOptions(),
        timeoutMs: GENERATE_TIMEOUT_MS,
    })

    if (!response.ok) {
        const rawText = await response.text().catch(() => "")
        throw new Error(`Provider HTTP ${response.status} (${config.model}): ${rawText.slice(0, 200)}`)
    }

    const payload = (await response.json()) as OpenAiChatCompletionResponse
    const candidateText = payload.choices?.[0]?.message?.content?.trim()

    if (!candidateText) {
        throw new Error("Provider AI tidak mengembalikan konten")
    }

    return parseArticleOutput(candidateText)
}

/**
 * Dispatches article generation to the provider configured on the selected key record.
 * Gemini keeps its native endpoint; every other provider is treated as OpenAI-compatible
 * and must supply both a validated base URL and an explicit model.
 */
export async function generateArticleWithProvider(
    resolved: ResolvedAiProvider,
    input: GenerateArticleInput
): Promise<AiArticleOutput> {
    if (resolved.provider === AI_PROVIDER_OPENAI_COMPATIBLE) {
        const baseUrl = resolved.baseUrl?.trim()
        const model = resolved.model?.trim()

        if (!baseUrl) {
            throw new Error("Custom provider tidak memiliki base URL")
        }

        if (!model) {
            throw new Error("Custom provider tidak memiliki model")
        }

        return callOpenAiCompatibleGenerateArticle({ apiKey: resolved.apiKey, baseUrl, model }, input)
    }

    return callGeminiGenerateArticle(resolved.apiKey, input)
}

export type GeneratedImage = {
    buffer: Buffer
    mimeType: string
}

type OpenAiImageResponse = {
    data?: Array<{
        b64_json?: string
        url?: string
    }>
}

export function buildImagePrompt(input: { title: string; topic: string }): string {
    return [
        `Ilustrasi editorial untuk artikel blog berjudul "${input.title}".`,
        `Topik: ${input.topic}.`,
        "Gaya: fotografi natural, pencahayaan lembut, komposisi bersih, tanpa teks dan tanpa watermark.",
        "Aspek rasio lanskap, cocok sebagai featured image blog.",
    ].join(" ")
}

/**
 * Generates a featured image through an OpenAI-compatible image endpoint.
 * Only base64 payloads are accepted inline; remote URLs are fetched through the SSRF guard.
 */
export async function generateImageWithProvider(
    config: { apiKey: string; baseUrl: string; model: string },
    prompt: string,
    options: { maxBytes: number; timeoutMs?: number }
): Promise<GeneratedImage> {
    const endpoint = `${config.baseUrl.replace(/\/+$/, "")}/images/generations`

    const response = await safeExternalFetch(endpoint, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            Authorization: `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({
            model: config.model,
            prompt,
            n: 1,
            size: "1536x1024",
            response_format: "b64_json",
        }),
        guard: getAiProviderGuardOptions(),
        timeoutMs: options.timeoutMs ?? 120_000,
    })

    if (!response.ok) {
        const rawText = await response.text().catch(() => "")
        throw new Error(`Provider image HTTP ${response.status} (${config.model}): ${rawText.slice(0, 200)}`)
    }

    const payload = (await response.json()) as OpenAiImageResponse
    const first = payload.data?.[0]

    if (first?.b64_json) {
        const buffer = Buffer.from(first.b64_json, "base64")
        if (buffer.byteLength === 0) {
            throw new Error("Provider image mengembalikan payload kosong")
        }
        if (buffer.byteLength > options.maxBytes) {
            throw new Error("Ukuran gambar hasil AI melebihi batas yang diizinkan")
        }
        return { buffer, mimeType: "image/png" }
    }

    if (first?.url) {
        const imageResponse = await safeExternalFetch(first.url, {
            method: "GET",
            timeoutMs: 30_000,
        })

        if (!imageResponse.ok) {
            throw new Error(`Gagal mengunduh gambar hasil AI (HTTP ${imageResponse.status})`)
        }

        const buffer = await readResponseWithLimit(imageResponse, options.maxBytes)
        const mimeType = imageResponse.headers.get("content-type")?.split(";")[0]?.trim() || "image/png"

        return { buffer, mimeType }
    }

    throw new Error("Provider image tidak mengembalikan data gambar")
}
