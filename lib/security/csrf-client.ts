"use client"

export const ADMIN_CSRF_HEADER = "x-csrf-token"

type JsonObject = Record<string, unknown>

export type CsrfTokenRequestErrorCode = "CSRF_HTTP_ERROR" | "CSRF_INVALID_RESPONSE" | "CSRF_NETWORK_ERROR"

export class CsrfTokenRequestError extends Error {
    status: number | null
    payload: unknown
    code: CsrfTokenRequestErrorCode

    constructor(
        message: string,
        options: { status?: number | null; payload?: unknown; code?: CsrfTokenRequestErrorCode } = {}
    ) {
        super(message)
        this.name = "CsrfTokenRequestError"
        this.status = options.status ?? null
        this.payload = options.payload
        this.code = options.code ?? "CSRF_NETWORK_ERROR"
    }
}

let csrfTokenCache: string | null = null
let csrfTokenRequest: Promise<string> | null = null

function isJsonObject(value: unknown): value is JsonObject {
    return typeof value === "object" && value !== null && !Array.isArray(value)
}

async function parseResponseSafely(response: Response): Promise<unknown> {
    const rawText = await response.text()
    if (!rawText) return null

    try {
        return JSON.parse(rawText) as unknown
    } catch {
        return { message: rawText }
    }
}

function extractPayloadMessage(payload: unknown): string | null {
    if (!isJsonObject(payload)) return null

    const message = payload.message
    if (typeof message === "string" && message.trim().length > 0) return message

    const error = payload.error
    if (typeof error === "string" && error.trim().length > 0) return error

    return null
}

function getCsrfHttpErrorMessage(payload: unknown, status: number, statusText: string): string {
    const payloadMessage = extractPayloadMessage(payload)
    if (payloadMessage) return payloadMessage
    if (statusText) return `Gagal mengambil token keamanan (${status} ${statusText})`
    return `Gagal mengambil token keamanan (${status})`
}

async function requestCsrfToken(): Promise<string> {
    let response: Response

    try {
        response = await fetch("/api/admin/csrf", {
            method: "GET",
            headers: { "Content-Type": "application/json" },
        })
    } catch {
        throw new CsrfTokenRequestError("Gagal menginisialisasi token keamanan admin.", {
            code: "CSRF_NETWORK_ERROR",
        })
    }

    const payload = await parseResponseSafely(response)

    if (!response.ok) {
        throw new CsrfTokenRequestError(getCsrfHttpErrorMessage(payload, response.status, response.statusText), {
            status: response.status,
            payload,
            code: "CSRF_HTTP_ERROR",
        })
    }

    if (!isJsonObject(payload) || payload.success !== true) {
        throw new CsrfTokenRequestError("Respons token keamanan admin tidak valid.", {
            status: response.status,
            payload,
            code: "CSRF_INVALID_RESPONSE",
        })
    }

    const data = payload.data
    if (!isJsonObject(data) || typeof data.csrfToken !== "string" || data.csrfToken.trim().length === 0) {
        throw new CsrfTokenRequestError("Respons token keamanan admin tidak valid.", {
            status: response.status,
            payload,
            code: "CSRF_INVALID_RESPONSE",
        })
    }

    return data.csrfToken
}

export async function getAdminCsrfToken(): Promise<string> {
    if (csrfTokenCache) return csrfTokenCache

    if (!csrfTokenRequest) {
        csrfTokenRequest = requestCsrfToken()
            .then((token) => {
                csrfTokenCache = token
                return token
            })
            .finally(() => {
                csrfTokenRequest = null
            })
    }

    return csrfTokenRequest
}
