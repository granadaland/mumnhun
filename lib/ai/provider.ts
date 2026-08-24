import { z } from "zod"
import { geminiGenerate, GEMINI_MODEL_CANDIDATES } from "@/lib/ai/gemini"
import {
    authStyleCandidates,
    buildAuthHeaders,
    chatCompletion,
    ImageGenerationUnsupportedError,
    normalizeBaseUrl,
    type AuthStyle,
    type ChatMessage,
} from "@/lib/ai/openai-compatible"
import { getAiProviderGuardOptions, readResponseWithLimit, safeExternalFetch } from "@/lib/security/url-guard"
import { AiJsonParseError, parseLlmJson } from "@/lib/ai/json-extract"
import { openAiSizeForAspectRatio } from "@/lib/ai/image-policy"
import { salvageArticleOutputFromRaw } from "@/lib/ai/article-format"
import { GoogleGenAI } from "@google/genai"

export const AI_PROVIDER_GEMINI = "gemini"
export const AI_PROVIDER_OPENAI_COMPATIBLE = "openai_compatible"

export const AI_PROVIDERS = [AI_PROVIDER_GEMINI, AI_PROVIDER_OPENAI_COMPATIBLE] as const

export const AI_CAPABILITIES = ["text", "image"] as const
export type AiCapability = (typeof AI_CAPABILITIES)[number]

export { GEMINI_MODEL_CANDIDATES }

/**
 * Default budget for one long-form text generation attempt.
 *
 * Free/aggregate OpenAI-compatible gateways routinely take 2–4 minutes for a full
 * Indonesian article; a 90 s ceiling aborted them mid-generation and surfaced as
 * NETWORK_TIMEOUT. Overridable via AI_TEXT_TIMEOUT_MS because gateway speed varies wildly.
 * The 280 s ceiling keeps a single attempt inside the 300 s route maxDuration with room
 * for parsing and DB writes.
 */
const DEFAULT_TEXT_TIMEOUT_MS = 150_000

export function resolveTextGenerationTimeoutMs(explicit?: number): number {
    const raw =
        typeof explicit === "number" && Number.isFinite(explicit)
            ? explicit
            : Number.parseInt(process.env.AI_TEXT_TIMEOUT_MS ?? "", 10)

    if (!Number.isFinite(raw)) return DEFAULT_TEXT_TIMEOUT_MS
    return Math.min(280_000, Math.max(30_000, Math.round(raw)))
}

/**
 * Decides whether a failed-JSON first attempt is worth an automatic repair retry.
 *
 * A retry costs a second full generation. When the first attempt was slow, the remaining
 * route/platform budget cannot fit another one, so the caller would be aborted mid-retry
 * and see a confusing timeout instead of the real format error. Fast failures (<30 s) are
 * almost always refusals/format issues that the reminder nudge fixes cheaply.
 */
export const JSON_RETRY_FAST_THRESHOLD_MS = 30_000

export function shouldRetryJsonParse(elapsedMs: number): boolean {
    return elapsedMs < JSON_RETRY_FAST_THRESHOLD_MS
}

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
                timeoutMs: resolveTextGenerationTimeoutMs(request.timeoutMs),
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
        timeoutMs: resolveTextGenerationTimeoutMs(request.timeoutMs),
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
                timeoutMs: resolveTextGenerationTimeoutMs(input.timeoutMs ?? 60_000),
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
        timeoutMs: resolveTextGenerationTimeoutMs(input.timeoutMs ?? 60_000),
        model: resolved.model,
    })

    return { text: result.text, model: result.model }
}

const JSON_REPAIR_REMINDER =
    "PENTING: keluaran sebelumnya gagal diparse sebagai JSON. Jawab ULANG dengan HANYA satu JSON object valid. Tanpa teks pembuka/penutup, tanpa markdown code fence, tanpa trailing comma."

/**
 * Thrown when the model's output cannot be parsed as the requested JSON even after the
 * repair retry (or when a retry was skipped because the first attempt was slow).
 *
 * Carries the RAW model output so callers can salvage it: a gateway that wrote a perfectly
 * good article as Markdown instead of JSON should not cost the operator another paid
 * generation — the text converts deterministically via coerceToHtml/salvage helpers.
 */
export class AiJsonFormatError extends Error {
    raw: string
    elapsedMs: number

    constructor(message: string, raw: string, elapsedMs: number) {
        super(message)
        this.name = "AiJsonFormatError"
        this.raw = raw
        this.elapsedMs = elapsedMs
    }
}

/**
 * Generates a JSON object and validates it against a schema.
 *
 * Resilient to gateways that ignore json_mode or wrap output in prose/fences: the text is
 * parsed with parseLlmJson (fence stripping, balanced-span extraction, defect repair). If
 * the first attempt cannot be parsed or fails schema validation, it retries once with an
 * explicit repair reminder appended — but only when the first attempt failed FAST. A slow
 * first attempt has already consumed most of the route/platform budget, so a second full
 * generation would be aborted mid-flight and surface as a misleading timeout instead of the
 * real format error.
 */
export async function generateJson<T>(
    resolved: ResolvedAiProvider,
    request: Omit<TextGenerationRequest, "jsonMode">,
    schema: z.ZodType<T>
): Promise<{ data: T; model: string; authStyle?: AuthStyle }> {
    const attempt = async (extraInstruction?: string) => {
        const prompt = extraInstruction ? `${request.prompt}\n\n${extraInstruction}` : request.prompt
        return generateText(resolved, { ...request, prompt, jsonMode: true })
    }

    const startedAt = Date.now()
    let result = await attempt()
    let parsedRaw: unknown
    let parseFailed = false

    try {
        parsedRaw = parseLlmJson(result.text)
    } catch {
        parseFailed = true
    }

    if (!parseFailed) {
        const parsed = schema.safeParse(parsedRaw)
        if (parsed.success) {
            return { data: parsed.data, model: result.model, authStyle: result.authStyle }
        }
    }

    // One retry with an explicit reminder fixes the vast majority of format-only failures —
    // but only when there is budget left for a second full generation.
    if (!shouldRetryJsonParse(Date.now() - startedAt)) {
        throw new AiJsonFormatError(
            "Output AI tidak dapat diparse sebagai JSON pada percobaan panjang.",
            result.text,
            Date.now() - startedAt
        )
    }

    result = await attempt(JSON_REPAIR_REMINDER)

    let retryRaw: unknown
    try {
        retryRaw = parseLlmJson(result.text)
    } catch (error) {
        if (error instanceof AiJsonParseError) {
            throw new AiJsonFormatError(
                `Output AI bukan JSON yang valid setelah 2 percobaan. Cuplikan: ${error.snippet || "(kosong)"}`,
                result.text,
                Date.now() - startedAt
            )
        }
        throw error
    }

    const retryParsed = schema.safeParse(retryRaw)
    if (!retryParsed.success) {
        throw new AiJsonFormatError(
            `Output AI tidak sesuai format yang diminta: ${retryParsed.error.issues[0]?.message || "unknown"}`,
            result.text,
            Date.now() - startedAt
        )
    }

    return { data: retryParsed.data, model: result.model, authStyle: result.authStyle }
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
    try {
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
    } catch (error) {
        // A gateway that wrote the whole article as Markdown instead of JSON should not
        // cost a second paid generation: convert the raw text deterministically instead.
        if (error instanceof AiJsonFormatError) {
            const salvaged = salvageArticleOutputFromRaw(error.raw, { title: input.topic })
            if (salvaged) return salvaged
        }

        throw error
    }
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
 * OpenAI-compatible gateways disagree on the image path. `/images/generations` is the
 * OpenAI spec, but several proxies only expose `/images/generate` or `/image/generations`.
 * Each is tried in turn on 404 so one non-standard gateway does not look like a dead key.
 */
const IMAGE_ENDPOINT_PATHS = ["/images/generations", "/images/generate", "/image/generations"] as const

/** Size is rejected by some gateways; the retry drops it rather than failing outright. */
function buildImageRequestBody(
    config: { model: string },
    prompt: string,
    options: { includeSize: boolean; aspectRatio?: string }
): string {
    return JSON.stringify({
        model: config.model,
        prompt,
        n: 1,
        // OpenAI-style APIs take pixel dimensions, not a ratio; map the site's two
        // landscape ratios onto the closest supported sizes.
        ...(options.includeSize
            ? { size: openAiSizeForAspectRatio(options.aspectRatio === "4:3" ? "4:3" : "16:9") }
            : {}),
        response_format: "b64_json",
    })
}

/**
 * Generates an image through an OpenAI-compatible image endpoint.
 *
 * Tolerant of gateway variation: the auth header style, the image path, and whether `size`
 * is accepted are all probed. Base64 payloads are used inline; remote URLs are fetched
 * through the SSRF guard. A 404 across every known path means the gateway has no image
 * surface at all, which is surfaced as ImageGenerationUnsupportedError so the operator gets
 * an actionable message instead of a bare HTTP code.
 */
export async function generateImageWithProvider(
    resolved: ResolvedAiProvider,
    prompt: string,
    options: { maxBytes: number; timeoutMs?: number; aspectRatio?: string }
): Promise<GeneratedImage> {
    if (!isCustomProvider(resolved.provider)) {
        // Gemini image generation (Imagen via @google/genai).
        // Only landscape ratios are offered site-wide: 16:9 (default) and 4:3.
        const ratio = options.aspectRatio === "4:3" ? "4:3" : "16:9"
        const ai = new GoogleGenAI({ apiKey: resolved.apiKey })
        // The SDK exposes no per-request deadline of its own; without this race a hung
        // Imagen call runs until the platform kills the whole function.
        const timeoutMs = options.timeoutMs ?? 120_000
        let timeoutHandle: ReturnType<typeof setTimeout> | undefined

        try {
            const timeoutPromise = new Promise<never>((_resolve, reject) => {
                timeoutHandle = setTimeout(() => {
                    // "AbortError" maps to NETWORK_TIMEOUT in ai-key-status classification.
                    const error = new Error(`Gemini image generation melebihi ${timeoutMs} ms`)
                    error.name = "AbortError"
                    reject(error)
                }, timeoutMs)
            })

            const response = await Promise.race([
                ai.models.generateImages({
                    model: "imagen-3.0-generate-001",
                    prompt,
                    config: {
                        numberOfImages: 1,
                        aspectRatio: ratio,
                        outputMimeType: "image/jpeg",
                    },
                }),
                timeoutPromise,
            ])

            clearTimeout(timeoutHandle)

            const base64 = response.generatedImages?.[0]?.image?.imageBytes
            if (!base64) {
                throw new Error("Gemini tidak mengembalikan data gambar")
            }

            const buffer = Buffer.from(base64, "base64")
            if (buffer.byteLength > options.maxBytes) {
                throw new Error("Ukuran gambar hasil AI melebihi batas yang diizinkan")
            }

            return { buffer, mimeType: response.generatedImages?.[0]?.image?.mimeType || "image/jpeg" }
        } catch (e) {
            const err = e as Error
            // Re-throw deadline errors untouched so NETWORK_TIMEOUT classification and
            // the operator-facing message survive the wrapper.
            if (err?.name === "AbortError") throw err
            throw new Error(`Gagal generate gambar dengan Gemini: ${err.message}`)
        }
    }

    const baseUrl = normalizeBaseUrl(resolved.baseUrl ?? "")
    const guard = getAiProviderGuardOptions()

    let lastError: Error | null = null
    let allPathsNotFound = true
    let lastNotFoundDetail = ""

    for (const style of authStyleCandidates(resolved.authStyle)) {
        for (const path of IMAGE_ENDPOINT_PATHS) {
            for (const includeSize of [true, false]) {
                const response = await safeExternalFetch(`${baseUrl}${path}`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Accept: "application/json",
                        ...buildAuthHeaders(resolved.apiKey, style),
                    },
                    body: buildImageRequestBody({ model: resolved.model ?? "" }, prompt, {
                        includeSize,
                        aspectRatio: options.aspectRatio,
                    }),
                    guard,
                    timeoutMs: options.timeoutMs ?? 120_000,
                })

                if (response.ok) {
                    const payload = (await response.json().catch(() => null)) as OpenAiImageResponse | null
                    const first = payload?.data?.[0]

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
                        const mimeType =
                            imageResponse.headers.get("content-type")?.split(";")[0]?.trim() || "image/png"

                        return { buffer, mimeType }
                    }

                    throw new Error("Provider image tidak mengembalikan data gambar")
                }

                const rawText = await response.text().catch(() => "")
                const snippet = rawText.slice(0, 200)
                lastError = new Error(
                    `Provider image HTTP ${response.status} (${resolved.model}): ${snippet}`
                )

                if (response.status === 404) {
                    lastNotFoundDetail = snippet
                    // Path or model unknown to this gateway; try the next path.
                    break
                }

                allPathsNotFound = false

                // 400/422 while sending `size` usually means the gateway rejects that field.
                if (includeSize && (response.status === 400 || response.status === 422)) {
                    continue
                }

                if (response.status === 401 || response.status === 403) {
                    // Credential rejected: stop trying paths and move to the next auth style.
                    break
                }

                throw lastError
            }

            // A non-404 failure was already handled above (thrown or auth retry).
            if (!allPathsNotFound) break
        }
    }

    if (allPathsNotFound) {
        throw new ImageGenerationUnsupportedError(
            `Provider tidak menyediakan endpoint image generation untuk model "${resolved.model}". ` +
            `Path yang dicoba: ${IMAGE_ENDPOINT_PATHS.join(", ")}.`,
            lastNotFoundDetail
        )
    }

    throw lastError ?? new Error("Permintaan ke provider image gagal")
}
