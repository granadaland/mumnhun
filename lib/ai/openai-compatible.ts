import { getAiProviderGuardOptions, safeExternalFetch } from "@/lib/security/url-guard"

/**
 * How the API key is presented to an OpenAI-compatible gateway.
 *
 * Not every gateway follows the OpenAI convention. Some expect the raw key in the
 * Authorization header without the "Bearer " prefix, others use x-api-key. The
 * detected style is persisted per key so subsequent calls skip the probing.
 */
export const AUTH_STYLES = ["bearer", "raw", "x-api-key"] as const
export type AuthStyle = (typeof AUTH_STYLES)[number]

export const DEFAULT_AUTH_STYLE: AuthStyle = "bearer"

export function isAuthStyle(value: unknown): value is AuthStyle {
    return typeof value === "string" && (AUTH_STYLES as readonly string[]).includes(value)
}

export function buildAuthHeaders(apiKey: string, style: AuthStyle): Record<string, string> {
    if (style === "raw") {
        return { Authorization: apiKey }
    }

    if (style === "x-api-key") {
        return { "x-api-key": apiKey }
    }

    return { Authorization: `Bearer ${apiKey}` }
}

/** Auth styles to try, starting with the one already known to work. */
export function authStyleCandidates(preferred?: AuthStyle | null): AuthStyle[] {
    const first = preferred && isAuthStyle(preferred) ? preferred : DEFAULT_AUTH_STYLE
    return [first, ...AUTH_STYLES.filter((style) => style !== first)]
}

export function normalizeBaseUrl(baseUrl: string): string {
    return baseUrl.trim().replace(/\/+$/, "")
}

export class OpenAiCompatibleError extends Error {
    status: number
    bodySnippet: string

    constructor(message: string, status: number, bodySnippet: string) {
        super(message)
        this.name = "OpenAiCompatibleError"
        this.status = status
        this.bodySnippet = bodySnippet
    }
}

/** True when the status suggests the credential was rejected, so another auth style is worth trying. */
function isAuthRejection(status: number): boolean {
    return status === 401 || status === 403
}

export type OpenAiCompatibleConfig = {
    baseUrl: string
    apiKey: string
    model: string
    authStyle?: AuthStyle | null
}

export type ChatMessage = {
    role: "system" | "user" | "assistant"
    content: string
}

export type ChatCompletionOptions = {
    messages: ChatMessage[]
    temperature?: number
    topP?: number
    maxTokens?: number
    /** Ask the provider for a JSON object. Silently ignored by gateways that do not support it. */
    jsonMode?: boolean
    timeoutMs?: number
}

export type ChatCompletionResult = {
    text: string
    authStyle: AuthStyle
    model: string
}

type OpenAiChatCompletionResponse = {
    choices?: Array<{
        message?: { content?: string | null; reasoning_content?: string | null }
        text?: string | null
    }>
    error?: { message?: string; type?: string }
}

function extractChoiceText(payload: OpenAiChatCompletionResponse): string {
    const choice = payload.choices?.[0]
    if (!choice) return ""

    const content = choice.message?.content
    if (typeof content === "string" && content.trim()) return content.trim()

    // Some reasoning models place the answer in reasoning_content when content is empty.
    const reasoning = choice.message?.reasoning_content
    if (typeof reasoning === "string" && reasoning.trim()) return reasoning.trim()

    if (typeof choice.text === "string" && choice.text.trim()) return choice.text.trim()

    return ""
}

async function readBodySnippet(response: Response): Promise<string> {
    const raw = await response.text().catch(() => "")
    return raw.slice(0, 300)
}

/**
 * Calls {baseUrl}/chat/completions, retrying with alternate auth styles when the
 * gateway rejects the credential. Returns the auth style that worked so the caller
 * can persist it.
 */
export async function chatCompletion(
    config: OpenAiCompatibleConfig,
    options: ChatCompletionOptions
): Promise<ChatCompletionResult> {
    const baseUrl = normalizeBaseUrl(config.baseUrl)
    const endpoint = `${baseUrl}/chat/completions`
    const guard = getAiProviderGuardOptions()

    const body: Record<string, unknown> = {
        model: config.model,
        messages: options.messages,
        ...(typeof options.temperature === "number" ? { temperature: options.temperature } : {}),
        ...(typeof options.topP === "number" ? { top_p: options.topP } : {}),
        ...(typeof options.maxTokens === "number" ? { max_tokens: options.maxTokens } : {}),
    }

    let lastError: OpenAiCompatibleError | null = null

    for (const style of authStyleCandidates(config.authStyle)) {
        // json_mode is attempted first, then retried without it if the gateway rejects it.
        for (const withJsonMode of options.jsonMode ? [true, false] : [false]) {
            const requestBody = withJsonMode
                ? { ...body, response_format: { type: "json_object" } }
                : body

            const response = await safeExternalFetch(endpoint, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json",
                    ...buildAuthHeaders(config.apiKey, style),
                },
                body: JSON.stringify(requestBody),
                guard,
                timeoutMs: options.timeoutMs ?? 90_000,
            })

            if (response.ok) {
                const payload = (await response.json().catch(() => null)) as OpenAiChatCompletionResponse | null
                const text = payload ? extractChoiceText(payload) : ""

                if (!text) {
                    throw new OpenAiCompatibleError(
                        "Provider AI tidak mengembalikan konten",
                        response.status,
                        JSON.stringify(payload?.error ?? {}).slice(0, 200)
                    )
                }

                return { text, authStyle: style, model: config.model }
            }

            const snippet = await readBodySnippet(response)
            lastError = new OpenAiCompatibleError(
                `Provider HTTP ${response.status} (${config.model}): ${snippet}`,
                response.status,
                snippet
            )

            // A 400 while asking for JSON mode usually means the gateway lacks that feature.
            if (withJsonMode && response.status === 400) {
                continue
            }

            break
        }

        if (lastError && !isAuthRejection(lastError.status)) {
            throw lastError
        }
    }

    throw lastError ?? new OpenAiCompatibleError("Permintaan ke provider AI gagal", 502, "")
}

export type DiscoveredModel = {
    id: string
    ownedBy: string | null
}

export type ListModelsResult = {
    models: DiscoveredModel[]
    authStyle: AuthStyle
}

type OpenAiModelListResponse = {
    data?: Array<{ id?: unknown; owned_by?: unknown }>
    models?: Array<{ id?: unknown; name?: unknown }>
}

function parseModelList(payload: unknown): DiscoveredModel[] {
    if (!payload || typeof payload !== "object") return []

    const typed = payload as OpenAiModelListResponse
    const entries = Array.isArray(typed.data)
        ? typed.data
        : Array.isArray(typed.models)
            ? typed.models
            : []

    const seen = new Set<string>()
    const models: DiscoveredModel[] = []

    for (const entry of entries) {
        if (!entry || typeof entry !== "object") continue

        const record = entry as { id?: unknown; name?: unknown; owned_by?: unknown }
        const rawId = typeof record.id === "string" ? record.id : typeof record.name === "string" ? record.name : null
        const id = rawId?.trim()

        if (!id || seen.has(id)) continue
        seen.add(id)

        models.push({
            id,
            ownedBy: typeof record.owned_by === "string" && record.owned_by.trim() ? record.owned_by.trim() : null,
        })
    }

    return models.slice(0, 500)
}

/**
 * Lists models from {baseUrl}/models, probing auth styles until one is accepted.
 * Providers that do not expose /models produce an empty list rather than an error,
 * so the caller can fall back to a manually typed model name.
 */
export async function listModels(config: {
    baseUrl: string
    apiKey: string
    authStyle?: AuthStyle | null
    timeoutMs?: number
}): Promise<ListModelsResult> {
    const baseUrl = normalizeBaseUrl(config.baseUrl)
    const endpoint = `${baseUrl}/models`
    const guard = getAiProviderGuardOptions()

    let lastError: OpenAiCompatibleError | null = null

    for (const style of authStyleCandidates(config.authStyle)) {
        const response = await safeExternalFetch(endpoint, {
            method: "GET",
            headers: {
                Accept: "application/json",
                ...buildAuthHeaders(config.apiKey, style),
            },
            cache: "no-store",
            guard,
            timeoutMs: config.timeoutMs ?? 20_000,
        })

        if (response.ok) {
            const payload = await response.json().catch(() => null)
            return { models: parseModelList(payload), authStyle: style }
        }

        const snippet = await readBodySnippet(response)
        lastError = new OpenAiCompatibleError(
            `Provider HTTP ${response.status}: ${snippet}`,
            response.status,
            snippet
        )

        if (!isAuthRejection(response.status)) {
            throw lastError
        }
    }

    throw lastError ?? new OpenAiCompatibleError("Gagal membaca daftar model provider", 502, "")
}

export type ProbeResult = {
    authStyle: AuthStyle
    models: DiscoveredModel[]
    /** True when the credential was proven by an actual chat completion. */
    chatVerified: boolean
    verifiedModel: string | null
    modelsEndpointAvailable: boolean
}

const PROBE_PROMPT = "Reply with the single word: ok"

/**
 * Validates a custom provider credential and discovers its models.
 *
 * Model listing alone is not proof the key can generate text (some gateways leave
 * /models unauthenticated), so a minimal chat completion is also attempted. Either
 * a successful chat or a successful authenticated model list is accepted.
 */
export async function probeProvider(config: {
    baseUrl: string
    apiKey: string
    model?: string | null
    authStyle?: AuthStyle | null
}): Promise<ProbeResult> {
    let models: DiscoveredModel[] = []
    let authStyle: AuthStyle | null = null
    let modelsEndpointAvailable = false
    let listError: unknown = null

    try {
        const listed = await listModels({
            baseUrl: config.baseUrl,
            apiKey: config.apiKey,
            authStyle: config.authStyle,
        })
        models = listed.models
        authStyle = listed.authStyle
        modelsEndpointAvailable = true
    } catch (error) {
        listError = error
    }

    const requestedModel = config.model?.trim()
    const candidateModel =
        requestedModel || models[0]?.id || "auto"

    try {
        const chat = await chatCompletion(
            {
                baseUrl: config.baseUrl,
                apiKey: config.apiKey,
                model: candidateModel,
                authStyle: authStyle ?? config.authStyle,
            },
            {
                messages: [{ role: "user", content: PROBE_PROMPT }],
                maxTokens: 16,
                temperature: 0,
                timeoutMs: 30_000,
            }
        )

        return {
            authStyle: chat.authStyle,
            models,
            chatVerified: true,
            verifiedModel: candidateModel,
            modelsEndpointAvailable,
        }
    } catch (chatError) {
        // An authenticated model list is still acceptable proof the credential works.
        if (modelsEndpointAvailable && authStyle) {
            return {
                authStyle,
                models,
                chatVerified: false,
                verifiedModel: null,
                modelsEndpointAvailable,
            }
        }

        throw listError ?? chatError
    }
}
