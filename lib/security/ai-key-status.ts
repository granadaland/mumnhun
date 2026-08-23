import type { ApiKeyCryptoConfigErrorCode } from "@/lib/security/api-key-crypto"
import { UrlGuardError } from "@/lib/security/url-guard"
import { probeProvider, type AuthStyle } from "@/lib/ai/openai-compatible"

export type AiKeyConnectionStatus = "connected" | "failed" | "not_tested"

export type AiKeyErrorCode =
    | ApiKeyCryptoConfigErrorCode
    | "CRYPTO_DECRYPT_FAILED"
    | "PROVIDER_KEY_INVALID"
    | "PROVIDER_RATE_LIMITED"
    | "PROVIDER_UNAVAILABLE"
    | "PROVIDER_REQUEST_FAILED"
    | "PROVIDER_BASE_URL_INVALID"
    | "PROVIDER_MODEL_UNAVAILABLE"
    | "NETWORK_TIMEOUT"
    | "NETWORK_ERROR"
    | "UNKNOWN_ERROR"

export type AiKeyFailure = {
    code: AiKeyErrorCode
    message: string
}

export type AiKeyConnectionState = {
    connectionStatus: AiKeyConnectionStatus
    lastError: string | null
    lastErrorCode: AiKeyErrorCode | null
}

export type VerifyGeminiApiKeyResult =
    | { ok: true }
    | { ok: false; status: number; failure: AiKeyFailure }

export type VerifyProviderApiKeyResult = VerifyGeminiApiKeyResult

const LAST_ERROR_DELIMITER = "::"
const MAX_ERROR_MESSAGE_LENGTH = 300

const CRYPTO_CONFIG_CODES: ApiKeyCryptoConfigErrorCode[] = [
    "CRYPTO_CONFIG_MISSING",
    "CRYPTO_CONFIG_EMPTY",
    "CRYPTO_CONFIG_MALFORMED",
    "CRYPTO_CONFIG_INVALID_LENGTH",
]

const AI_KEY_ERROR_CODES: AiKeyErrorCode[] = [
    ...CRYPTO_CONFIG_CODES,
    "CRYPTO_DECRYPT_FAILED",
    "PROVIDER_KEY_INVALID",
    "PROVIDER_RATE_LIMITED",
    "PROVIDER_UNAVAILABLE",
    "PROVIDER_REQUEST_FAILED",
    "PROVIDER_BASE_URL_INVALID",
    "PROVIDER_MODEL_UNAVAILABLE",
    "NETWORK_TIMEOUT",
    "NETWORK_ERROR",
    "UNKNOWN_ERROR",
]

function isCryptoConfigCode(value: string): value is ApiKeyCryptoConfigErrorCode {
    return CRYPTO_CONFIG_CODES.includes(value as ApiKeyCryptoConfigErrorCode)
}

function isAiKeyErrorCode(value: string): value is AiKeyErrorCode {
    return AI_KEY_ERROR_CODES.includes(value as AiKeyErrorCode)
}

function toErrorLike(error: unknown): { name?: string; code?: string; message?: string } {
    if (!error || typeof error !== "object") {
        return {}
    }

    const candidate = error as { name?: unknown; code?: unknown; message?: unknown }

    return {
        name: typeof candidate.name === "string" ? candidate.name : undefined,
        code: typeof candidate.code === "string" ? candidate.code : undefined,
        message: typeof candidate.message === "string" ? candidate.message : undefined,
    }
}

export function sanitizeAiKeyErrorMessage(message: string): string {
    const collapsed = message.replace(/\s+/g, " ").trim()

    const masked = collapsed
        // Gemini keys
        .replace(/AIza[0-9A-Za-z\-_]{16,}/g, "AIza***")
        // OpenAI-style keys, including project/org-scoped variants (sk-proj-..., sk-or-v1-...)
        .replace(/\bsk-[0-9A-Za-z\-_]{8,}/gi, "sk-***")
        // Anthropic-style keys
        .replace(/\bsk-ant-[0-9A-Za-z\-_]{8,}/gi, "sk-ant-***")
        // Authorization headers echoed back inside provider error payloads
        .replace(/\b(bearer)\s+[0-9A-Za-z\-._~+/]{8,}=*/gi, "$1 ***")
        // key/api_key/access_token query params or JSON fields
        .replace(/\b(api[-_]?key|access[-_]?token|authorization|key)(["']?\s*[:=]\s*["']?)[0-9A-Za-z\-._~+/]{8,}=*/gi, "$1$2***")

    if (!masked) {
        return "Terjadi kesalahan koneksi API key AI"
    }

    return masked.slice(0, MAX_ERROR_MESSAGE_LENGTH)
}

export function formatStoredAiKeyFailure(failure: AiKeyFailure): string {
    return `${failure.code}${LAST_ERROR_DELIMITER}${sanitizeAiKeyErrorMessage(failure.message)}`
}

export function parseStoredAiKeyFailure(lastError: string | null): AiKeyFailure | null {
    if (!lastError?.trim()) return null

    const raw = lastError.trim()
    const delimiterIndex = raw.indexOf(LAST_ERROR_DELIMITER)

    if (delimiterIndex < 1) {
        return {
            code: "UNKNOWN_ERROR",
            message: sanitizeAiKeyErrorMessage(raw),
        }
    }

    const codeRaw = raw.slice(0, delimiterIndex).trim()
    const messageRaw = raw.slice(delimiterIndex + LAST_ERROR_DELIMITER.length).trim()

    return {
        code: isAiKeyErrorCode(codeRaw) ? codeRaw : "UNKNOWN_ERROR",
        message: sanitizeAiKeyErrorMessage(messageRaw || "Terjadi kegagalan koneksi API key AI"),
    }
}

export function deriveAiKeyConnectionState(input: { lastError: string | null; lastUsedAt: Date | null }): AiKeyConnectionState {
    const parsedFailure = parseStoredAiKeyFailure(input.lastError)

    if (parsedFailure) {
        return {
            connectionStatus: "failed",
            lastError: parsedFailure.message,
            lastErrorCode: parsedFailure.code,
        }
    }

    if (input.lastUsedAt) {
        return {
            connectionStatus: "connected",
            lastError: null,
            lastErrorCode: null,
        }
    }

    return {
        connectionStatus: "not_tested",
        lastError: null,
        lastErrorCode: null,
    }
}

function classifyProviderHttpStatus(status: number, providerLabel: string): AiKeyFailure {
    if (status === 400 || status === 401 || status === 403) {
        return {
            code: "PROVIDER_KEY_INVALID",
            message: `API key ${providerLabel} tidak valid atau tidak memiliki izin akses`,
        }
    }

    if (status === 429) {
        return {
            code: "PROVIDER_RATE_LIMITED",
            message: `API key ${providerLabel} terkena rate limit`,
        }
    }

    if (status >= 500) {
        return {
            code: "PROVIDER_UNAVAILABLE",
            message: `Layanan ${providerLabel} sedang tidak tersedia`,
        }
    }

    return {
        code: "PROVIDER_REQUEST_FAILED",
        message: `Permintaan ke ${providerLabel} gagal (HTTP ${status})`,
    }
}

function classifyGeminiHttpStatus(status: number): AiKeyFailure {
    return classifyProviderHttpStatus(status, "Gemini")
}

function classifyOpenAiCompatibleHttpStatus(status: number): AiKeyFailure {
    if (status === 401 || status === 403) {
        return {
            code: "PROVIDER_KEY_INVALID",
            message: "API key provider tidak valid atau tidak memiliki izin akses",
        }
    }

    if (status === 400 || status === 422) {
        return {
            code: "PROVIDER_REQUEST_FAILED",
            message: "Provider menolak permintaan (cek nama model dan format request)",
        }
    }

    if (status === 404) {
        return {
            code: "PROVIDER_MODEL_UNAVAILABLE",
            message: "Endpoint atau model tidak ditemukan pada provider ini",
        }
    }

    if (status === 429) {
        return {
            code: "PROVIDER_RATE_LIMITED",
            message: "Provider AI terkena rate limit",
        }
    }

    if (status >= 500) {
        return {
            code: "PROVIDER_UNAVAILABLE",
            message: "Layanan provider AI sedang tidak tersedia",
        }
    }

    return {
        code: "PROVIDER_REQUEST_FAILED",
        message: `Permintaan ke provider AI gagal (HTTP ${status})`,
    }
}

function mapCryptoConfigToFailure(code: ApiKeyCryptoConfigErrorCode): AiKeyFailure {
    if (code === "CRYPTO_CONFIG_MISSING") {
        return {
            code,
            message: "Konfigurasi enkripsi API key belum diatur",
        }
    }

    if (code === "CRYPTO_CONFIG_EMPTY") {
        return {
            code,
            message: "Konfigurasi enkripsi API key kosong",
        }
    }

    if (code === "CRYPTO_CONFIG_MALFORMED") {
        return {
            code,
            message: "Format konfigurasi enkripsi API key tidak valid",
        }
    }

    return {
        code,
        message: "Panjang konfigurasi enkripsi API key tidak valid",
    }
}

function mapFailureToHttpStatus(failure: AiKeyFailure): number {
    if (failure.code === "PROVIDER_KEY_INVALID") return 400
    if (failure.code === "PROVIDER_BASE_URL_INVALID") return 400
    if (failure.code === "PROVIDER_MODEL_UNAVAILABLE") return 400
    if (failure.code === "PROVIDER_REQUEST_FAILED") return 400
    if (failure.code === "PROVIDER_RATE_LIMITED") return 429
    if (failure.code.startsWith("CRYPTO_CONFIG_")) return 500
    if (failure.code === "NETWORK_TIMEOUT") return 504
    return 502
}

export function toAiKeyFailureHttpStatus(failure: AiKeyFailure): number {
    return mapFailureToHttpStatus(failure)
}

function inferGeminiHttpStatusFromMessage(message: string): number | null {
    const match = message.match(/Gemini\s+HTTP\s+(\d{3})/i)
    if (!match) return null

    const status = Number(match[1])
    if (!Number.isInteger(status) || status < 100 || status > 599) return null
    return status
}

/** Matches the "Provider HTTP 401: ..." shape emitted by the OpenAI-compatible client. */
function inferProviderHttpStatusFromMessage(message: string): number | null {
    const match = message.match(/Provider(?:\s+image)?\s+HTTP\s+(\d{3})/i)
    if (!match) return null

    const status = Number(match[1])
    if (!Number.isInteger(status) || status < 100 || status > 599) return null
    return status
}

/**
 * Classifies an error raised while talking to a custom (non-Gemini) provider, so the
 * dashboard never shows a Gemini-flavoured message for an OpenAI-compatible gateway.
 */
export function classifyProviderFailure(error: unknown): AiKeyFailure {
    const errorLike = toErrorLike(error)

    if (errorLike.name === "OpenAiCompatibleError") {
        const status = (error as { status?: unknown }).status
        if (typeof status === "number") {
            return classifyOpenAiCompatibleHttpStatus(status)
        }
    }

    const baseFailure = classifyAiKeyFailure(error)

    // classifyAiKeyFailure only knows the Gemini message shape; re-map provider messages.
    const providerStatus = inferProviderHttpStatusFromMessage(
        sanitizeAiKeyErrorMessage(errorLike.message || "")
    )

    if (providerStatus) {
        return classifyOpenAiCompatibleHttpStatus(providerStatus)
    }

    return baseFailure
}

export function classifyAiKeyFailure(error: unknown): AiKeyFailure {
    const errorLike = toErrorLike(error)

    if (error instanceof UrlGuardError) {
        return {
            code: "PROVIDER_BASE_URL_INVALID",
            message: sanitizeAiKeyErrorMessage(error.message),
        }
    }

    if (errorLike.name === "OpenAiCompatibleError") {
        const status = (error as { status?: unknown }).status
        if (typeof status === "number") {
            return classifyOpenAiCompatibleHttpStatus(status)
        }
    }

    if (errorLike.name === "ApiKeyCryptoConfigError") {
        const code = errorLike.code && isCryptoConfigCode(errorLike.code)
            ? errorLike.code
            : "CRYPTO_CONFIG_MALFORMED"
        return mapCryptoConfigToFailure(code)
    }

    if (errorLike.name === "ApiKeyCryptoError") {
        return {
            code: "CRYPTO_DECRYPT_FAILED",
            message: "Gagal memproses API key terenkripsi",
        }
    }

    if (errorLike.name === "AbortError") {
        // safeExternalFetch embeds the configured budget in the message when the deadline
        // was ours; surface it so the operator can raise AI_TEXT_TIMEOUT_MS knowingly.
        const budgetMatch = errorLike.message?.match(/dalam (\d[\d_.]*) ms/)
        const detail = budgetMatch ? ` (${budgetMatch[1]} ms)` : ""

        return {
            code: "NETWORK_TIMEOUT",
            message: `Koneksi ke provider AI timeout${detail}. Gateway lambat merespons — coba lagi, turunkan target kata, atau naikkan AI_TEXT_TIMEOUT_MS.`,
        }
    }

    const message = sanitizeAiKeyErrorMessage(
        errorLike.message || (typeof error === "string" ? error : "Unknown error")
    )

    // Custom-provider messages are checked first so a non-Gemini failure is never
    // reported with a Gemini label.
    const providerStatus = inferProviderHttpStatusFromMessage(message)
    if (providerStatus) {
        return classifyOpenAiCompatibleHttpStatus(providerStatus)
    }

    const inferredStatus = inferGeminiHttpStatusFromMessage(message)
    if (inferredStatus) {
        return classifyGeminiHttpStatus(inferredStatus)
    }

    if (/fetch failed|network|econn|enotfound|eai_again|socket|dns/i.test(message)) {
        return {
            code: "NETWORK_ERROR",
            message: "Koneksi jaringan ke provider AI gagal",
        }
    }

    return {
        code: "UNKNOWN_ERROR",
        message,
    }
}

export async function verifyGeminiApiKey(apiKey: string): Promise<VerifyGeminiApiKeyResult> {
    const normalizedKey = apiKey.trim()
    if (!normalizedKey) {
        return {
            ok: false,
            status: 400,
            failure: {
                code: "PROVIDER_KEY_INVALID",
                message: "API key Gemini wajib diisi",
            },
        }
    }

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(normalizedKey)}`
    const controller = new AbortController()
    const timeoutHandle = setTimeout(() => controller.abort(), 12_000)

    try {
        const response = await fetch(endpoint, {
            method: "GET",
            headers: {
                Accept: "application/json",
            },
            cache: "no-store",
            signal: controller.signal,
        })

        if (response.ok) {
            return { ok: true }
        }

        const failure = classifyGeminiHttpStatus(response.status)
        return {
            ok: false,
            status: mapFailureToHttpStatus(failure),
            failure,
        }
    } catch (error) {
        const failure = classifyAiKeyFailure(error)
        return {
            ok: false,
            status: mapFailureToHttpStatus(failure),
            failure,
        }
    } finally {
        clearTimeout(timeoutHandle)
    }
}

/**
 * Reads the optional operator allowlist for custom AI providers. Re-exported from the URL
 * guard so provider verification and provider calls share one policy source.
 */
export { getAiProviderGuardOptions } from "@/lib/security/url-guard"

export type OpenAiCompatibleModel = {
    id: string
    ownedBy: string | null
}

export type VerifyOpenAiCompatibleResult =
    | {
        ok: true
        models: OpenAiCompatibleModel[]
        authStyle: AuthStyle
        chatVerified: boolean
        modelsEndpointAvailable: boolean
    }
    | { ok: false; status: number; failure: AiKeyFailure }

/**
 * Verifies a custom OpenAI-compatible provider.
 *
 * Verification is intentionally lenient about provider quirks: the auth header style is
 * probed (Bearer / raw / x-api-key), and a real chat completion is attempted because some
 * gateways leave /models unauthenticated or omit it entirely. The model name is only
 * rejected when the provider actually published a model list that excludes it.
 */
export async function verifyOpenAiCompatibleApiKey(input: {
    baseUrl: string
    apiKey: string
    model?: string | null
    authStyle?: AuthStyle | null
}): Promise<VerifyOpenAiCompatibleResult> {
    const normalizedKey = input.apiKey.trim()
    if (!normalizedKey) {
        return {
            ok: false,
            status: 400,
            failure: {
                code: "PROVIDER_KEY_INVALID",
                message: "API key provider wajib diisi",
            },
        }
    }

    try {
        const probe = await probeProvider({
            baseUrl: input.baseUrl,
            apiKey: normalizedKey,
            model: input.model,
            authStyle: input.authStyle,
        })

        const requestedModel = input.model?.trim()

        // Only enforce the model name when the provider published a list AND the chat
        // probe did not already succeed with that exact model.
        if (requestedModel && !probe.chatVerified && probe.models.length > 0) {
            const hasModel = probe.models.some((model) => model.id === requestedModel)

            if (!hasModel) {
                return {
                    ok: false,
                    status: 400,
                    failure: {
                        code: "PROVIDER_MODEL_UNAVAILABLE",
                        message: `Model "${requestedModel}" tidak tersedia pada provider ini`,
                    },
                }
            }
        }

        return {
            ok: true,
            models: probe.models,
            authStyle: probe.authStyle,
            chatVerified: probe.chatVerified,
            modelsEndpointAvailable: probe.modelsEndpointAvailable,
        }
    } catch (error) {
        const failure = classifyProviderFailure(error)
        return {
            ok: false,
            status: mapFailureToHttpStatus(failure),
            failure,
        }
    }
}
