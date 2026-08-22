import { z } from "zod"
import { geminiGenerate, GEMINI_MODEL_CANDIDATES } from "@/lib/ai/gemini"
import {
    authStyleCandidates,
    buildAuthHeaders,
    chatCompletion,
    normalizeBaseUrl,
    type AuthStyle,
    type ChatMessage,
} from "@/lib/ai/openai-compatible"
import { getAiProviderGuardOptions, readResponseWithLimit, safeExternalFetch } from "@/lib/security/url-guard"

export const AI_PROVIDER_GEMINI = "gemini"
export const AI_PROVIDER_OPENAI_COMPATIBLE = "openai_compatible"

export const AI_PROVIDERS = [AI_PROVIDER_GEMINI, AI_PROVIDER_OPENAI_COMPATIBLE] as const

export const AI_CAPABILITIES = ["text", "image"] as const
export type AiCapability = (typeof AI_CAPABILITIES)[number]

export { GEMINI_MODEL_CANDIDATES }

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

/** A decrypted, ready-to-use provider credential. */
export type ResolvedAiProvider = {
    provider: string
    apiKey: string
    baseUrl?: string | null
    model?: string | null
    authStyle?: AuthStyle | null
}

/** Provider-agnostic text generation request. */
export type TextGenerationRequest = {
    /** Steering instruction applied as a system message (or systemInstruction on Gemini). */
    system?: string
    prompt: string
    temperature?: number
    topP?: number
    maxTokens?: number
    /** Request a strict JSON object response. */
    jsonMode?: boolean
    timeoutMs?: number
}

export type TextGenerationResult = {
    text: string
    model: string
    /** Present only for OpenAI-compatible providers; lets the caller persist what worked. */
    authStyle?: AuthStyle
}

export function isCustomProvider(provider: string): boolean {
    return provider === AI_PROVIDER_OPENAI_COMPATIBLE
}

/**
 * Single entry point for text generation across every configured provider.
 *
 * Gemini keeps its native endpoint; anything else is treated as OpenAI-compatible and
 * requires a validated base URL plus an explicit model.
 */
export async function generateText(
    resolved: ResolvedAiProvider,
    request: TextGenerationRequest
): Promise<TextGenerationResult> {
    if (isCustomProvider(resolved.provider)) {
        const baseUrl = resolved.baseUrl?.trim()
        const model = resolved.model?.trim()

        if (!baseUrl) throw new Error("Custom provider tidak memiliki base URL")
        if (!model) throw new Error("Custom provider tidak memiliki model")

        const messages: ChatMessage[] = [
            ...(request.system ? [{ role: "system" as const, content: request.system }] : []),
            { role: "user" as const, content: request.prompt },
        ]

        const result = await chatCompletion(
            { baseUrl, apiKey: resolved.apiKey, model, authStyle: resolved.authStyle },
            {
                messages,
                temperature: request.temperature,
                topP: request.topP,
                maxTokens: request.maxTokens,
                jsonMode: request.jsonMode,
                timeoutMs: request.timeoutMs ?? GENERATE_TIMEOUT_MS,
            }
        )

        return { text: result.text, model: result.model, authStyle: result.authStyle }
    }

    const result = await geminiGenerate(resolved.apiKey, {
        contents: [{ role: "user", parts: [{ text: request.prompt }] }],
        systemInstruction: request.system,
        temperature: request.temperature,
        topP: request.topP,
        maxOutputTokens: request.maxTokens,
        jsonMode: request.jsonMode,
        timeoutMs: request.timeoutMs ?? GENERATE_TIMEOUT_MS,
        model: resolved.model,
    })

    return { text: result.text, model: result.model }
}

/** Multi-turn variant used by the admin chat, mapped onto each provider's native shape. */
export type ConversationTurn = {
    role: "user" | "assistant"
    content: string
}

export async function generateConversation(
    resolved: ResolvedAiProvider,
    input: {
        system?: string
        history: ConversationTurn[]
        message: string
        temperature?: number
        topP?: number
        maxTokens?: number
        timeoutMs?: number
    }
): Promise<TextGenerationResult> {
    if (isCustomProvider(resolved.provider)) {
        const baseUrl = resolved.baseUrl?.trim()
        const model = resolved.model?.trim()

        if (!baseUrl) throw new Error("Custom provider tidak memiliki base URL")
        if (!model) throw new Error("Custom provider tidak memiliki model")

        const messages: ChatMessage[] = [
            ...(input.system ? [{ role: "system" as const, content: input.system }] : []),
            ...input.history.map((turn) => ({ role: turn.role, content: turn.content })),
            { role: "user" as const, content: input.message },
        ]

        const result = await chatCompletion(
            { baseUrl, apiKey: resolved.apiKey, model, authStyle: resolved.authStyle },
            {
                messages,
                temperature: input.temperature,
                topP: input.topP,
                maxTokens: input.maxTokens,
                timeoutMs: input.timeoutMs ?? 60_000,
            }
        )

        return { text: result.text, model: result.model, authStyle: result.authStyle }
    }

    const result = await geminiGenerate(resolved.apiKey, {
        contents: [
            ...input.history.map((turn) => ({
                role: (turn.role === "assistant" ? "model" : "user") as "user" | "model",
                parts: [{ text: turn.content }],
            })),
            { role: "user" as const, parts: [{ text: input.message }] },
        ],
        systemInstruction: input.system,
        temperature: input.temperature,
        topP: input.topP,
        maxOutputTokens: input.maxTokens,
        timeoutMs: input.timeoutMs ?? 60_000,
        model: resolved.model,
    })

    return { text: result.text, model: result.model }
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

/**
 * Generates a JSON object and validates it against a schema.
 * Works with providers that ignore json_mode because the text is re-extracted anyway.
 */
export async function generateJson<T>(
    resolved: ResolvedAiProvider,
    request: Omit<TextGenerationRequest, "jsonMode">,
    schema: z.ZodType<T>
): Promise<{ data: T; model: string; authStyle?: AuthStyle }> {
    const result = await generateText(resolved, { ...request, jsonMode: true })

    const jsonText = extractJsonObject(result.text)

    let parsedRaw: unknown
    try {
        parsedRaw = JSON.parse(jsonText)
    } catch {
        throw new Error("Output AI bukan JSON yang valid")
    }

    const parsed = schema.safeParse(parsedRaw)
    if (!parsed.success) {
        throw new Error(`Output AI tidak valid: ${parsed.error.issues[0]?.message || "unknown"}`)
    }

    return { data: parsed.data, model: result.model, authStyle: result.authStyle }
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

const ARTICLE_SYSTEM_PROMPT =
    "Kamu adalah penulis konten SEO berbahasa Indonesia. Selalu jawab dengan JSON object valid tanpa markdown code fence."

export async function generateArticleWithProvider(
    resolved: ResolvedAiProvider,
    input: GenerateArticleInput
): Promise<AiArticleOutput & { usedAuthStyle?: AuthStyle }> {
    const result = await generateJson(
        resolved,
        {
            system: ARTICLE_SYSTEM_PROMPT,
            prompt: buildArticlePrompt(input),
            temperature: 0.7,
            topP: 0.9,
            maxTokens: 4096,
        },
        aiArticleOutputSchema
    )

    return { ...result.data, usedAuthStyle: result.authStyle }
}

export type GeneratedImage = {
    buffer: Buffer
    mimeType: string
}

type OpenAiImageResponse = {
    data?: Array<{ b64_json?: string; url?: string }>
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
 * Generates an image through an OpenAI-compatible image endpoint.
 * Base64 payloads are used inline; remote URLs are fetched through the SSRF guard.
 */
export async function generateImageWithProvider(
    config: { apiKey: string; baseUrl: string; model: string; authStyle?: AuthStyle | null },
    prompt: string,
    options: { maxBytes: number; timeoutMs?: number }
): Promise<GeneratedImage> {
    const endpoint = `${normalizeBaseUrl(config.baseUrl)}/images/generations`
    const guard = getAiProviderGuardOptions()

    let lastError: Error | null = null

    for (const style of authStyleCandidates(config.authStyle)) {
        const response = await safeExternalFetch(endpoint, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
                ...buildAuthHeaders(config.apiKey, style),
            },
            body: JSON.stringify({
                model: config.model,
                prompt,
                n: 1,
                size: "1536x1024",
                response_format: "b64_json",
            }),
            guard,
            timeoutMs: options.timeoutMs ?? 120_000,
        })

        if (!response.ok) {
            const rawText = await response.text().catch(() => "")
            lastError = new Error(
                `Provider image HTTP ${response.status} (${config.model}): ${rawText.slice(0, 200)}`
            )

            if (response.status === 401 || response.status === 403) {
                continue
            }

            throw lastError
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

    throw lastError ?? new Error("Permintaan ke provider image gagal")
}
