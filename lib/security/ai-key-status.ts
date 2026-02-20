import type { ApiKeyCryptoConfigErrorCode } from "@/lib/security/api-key-crypto"

export type AiKeyConnectionStatus = "connected" | "failed" | "not_tested"

export type AiKeyErrorCode =
    | ApiKeyCryptoConfigErrorCode
    | "CRYPTO_DECRYPT_FAILED"
    | "PROVIDER_KEY_INVALID"
    | "PROVIDER_RATE_LIMITED"
    | "PROVIDER_UNAVAILABLE"
    | "PROVIDER_REQUEST_FAILED"
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
    const maskedGeminiKey = collapsed.replace(/AIza[0-9A-Za-z\-_]{16,}/g, "AIza***")

    if (!maskedGeminiKey) {
        return "Terjadi kesalahan koneksi API key AI"
    }

    return maskedGeminiKey.slice(0, MAX_ERROR_MESSAGE_LENGTH)
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

function classifyGeminiHttpStatus(status: number): AiKeyFailure {
    if (status === 400 || status === 401 || status === 403) {
        return {
            code: "PROVIDER_KEY_INVALID",
            message: "API key Gemini tidak valid atau tidak memiliki izin akses",
        }
    }

    if (status === 429) {
        return {
            code: "PROVIDER_RATE_LIMITED",
            message: "API key Gemini terkena rate limit",
        }
    }

    if (status >= 500) {
        return {
            code: "PROVIDER_UNAVAILABLE",
            message: "Layanan Gemini sedang tidak tersedia",
        }
    }

    return {
        code: "PROVIDER_REQUEST_FAILED",
        message: `Permintaan ke Gemini gagal (HTTP ${status})`,
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

export function classifyAiKeyFailure(error: unknown): AiKeyFailure {
    const errorLike = toErrorLike(error)

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
        return {
            code: "NETWORK_TIMEOUT",
            message: "Koneksi ke provider AI timeout",
        }
    }

    const message = sanitizeAiKeyErrorMessage(
        errorLike.message || (typeof error === "string" ? error : "Unknown error")
    )

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
