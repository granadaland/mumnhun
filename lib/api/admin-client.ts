"use client"

import { ADMIN_CSRF_HEADER, CsrfTokenRequestError, getAdminCsrfToken } from "@/lib/security/csrf-client"

export type AdminRequestMethod = "GET" | "POST" | "PUT" | "DELETE"

type AdminClientErrorCode = "HTTP_ERROR" | "TIMEOUT" | "ABORTED" | "NETWORK_ERROR"

type JsonObject = Record<string, unknown>

const DEFAULT_TIMEOUT_MS = 10000
const DEFAULT_GET_RETRIES = 1
const MAX_GET_RETRIES = 2
const RETRYABLE_STATUS_CODES = new Set([408, 429, 500, 502, 503, 504])

export class AdminClientError extends Error {
    status: number | null
    payload: unknown
    code: AdminClientErrorCode

    constructor(
        message: string,
        options: { status?: number | null; payload?: unknown; code?: AdminClientErrorCode } = {}
    ) {
        super(message)
        this.name = "AdminClientError"
        this.status = options.status ?? null
        this.payload = options.payload
        this.code = options.code ?? "NETWORK_ERROR"
    }
}

export type AdminClientOptions<TBody = unknown> = {
    method?: AdminRequestMethod
    body?: TBody
    headers?: HeadersInit
    timeoutMs?: number
    retries?: number
    signal?: AbortSignal
}

function isJsonObject(value: unknown): value is JsonObject {
    return typeof value === "object" && value !== null && !Array.isArray(value)
}

function normalizeRetries(retries: number | undefined): number {
    if (typeof retries !== "number" || Number.isNaN(retries)) return DEFAULT_GET_RETRIES
    return Math.max(0, Math.min(Math.floor(retries), MAX_GET_RETRIES))
}

function getRetryDelayMs(attempt: number): number {
    return 200 * 2 ** attempt
}

function isRetryableHttpStatus(status: number): boolean {
    return RETRYABLE_STATUS_CODES.has(status)
}

function shouldRetryGet(error: unknown): boolean {
    if (!(error instanceof AdminClientError)) return false
    if (error.code === "ABORTED") return false
    if (error.code === "TIMEOUT" || error.code === "NETWORK_ERROR") return true
    if (error.code === "HTTP_ERROR" && typeof error.status === "number") {
        return isRetryableHttpStatus(error.status)
    }
    return false
}

async function wait(ms: number): Promise<void> {
    await new Promise((resolve) => {
        setTimeout(resolve, ms)
    })
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

function extractResponseMessage(payload: unknown): string | null {
    if (!isJsonObject(payload)) return null

    const message = payload.message
    if (typeof message === "string" && message.trim().length > 0) return message

    const error = payload.error
    if (typeof error === "string" && error.trim().length > 0) return error

    const issues = payload.issues
    if (Array.isArray(issues) && issues.length > 0) {
        const firstIssue = issues[0]
        if (isJsonObject(firstIssue) && typeof firstIssue.message === "string" && firstIssue.message.trim().length > 0) {
            return firstIssue.message
        }
    }

    return null
}

function getHttpErrorMessage(payload: unknown, status: number, statusText: string): string {
    const payloadMessage = extractResponseMessage(payload)
    if (payloadMessage) return payloadMessage
    if (statusText) return `Request gagal (${status} ${statusText})`
    return `Request gagal (${status})`
}

function mapCsrfInitFailureToAdminError(error: unknown): AdminClientError | null {
    if (!(error instanceof CsrfTokenRequestError)) return null

    const hasServerContext = typeof error.status === "number" || typeof error.payload !== "undefined"

    if (hasServerContext) {
        return new AdminClientError(error.message, {
            status: error.status,
            payload: error.payload,
            code: "HTTP_ERROR",
        })
    }

    return new AdminClientError("Gagal menginisialisasi token keamanan admin. Periksa koneksi lalu coba lagi.", {
        code: "NETWORK_ERROR",
    })
}

async function performRequest<TResponse, TBody>(
    endpoint: string,
    method: AdminRequestMethod,
    options: AdminClientOptions<TBody>,
    timeoutMs: number
): Promise<TResponse> {
    const controller = new AbortController()
    const externalSignal = options.signal
    let timeoutReached = false

    const timeoutHandle = setTimeout(() => {
        timeoutReached = true
        controller.abort()
    }, timeoutMs)

    const onExternalAbort = () => {
        controller.abort()
    }

    if (externalSignal) {
        if (externalSignal.aborted) {
            controller.abort()
        } else {
            externalSignal.addEventListener("abort", onExternalAbort, { once: true })
        }
    }

    try {
        const headers = new Headers(options.headers)
        const hasBody = typeof options.body !== "undefined"

        if (hasBody && !headers.has("Content-Type")) {
            headers.set("Content-Type", "application/json")
        }

        if (method !== "GET" && !headers.has(ADMIN_CSRF_HEADER)) {
            const csrfToken = await getAdminCsrfToken().catch((csrfError) => {
                const mappedError = mapCsrfInitFailureToAdminError(csrfError)
                if (mappedError) {
                    throw mappedError
                }

                throw csrfError
            })
            headers.set(ADMIN_CSRF_HEADER, csrfToken)
        }

        const response = await fetch(endpoint, {
            method,
            headers,
            body: hasBody ? JSON.stringify(options.body) : undefined,
            signal: controller.signal,
        })

        const payload = await parseResponseSafely(response)

        if (!response.ok) {
            throw new AdminClientError(getHttpErrorMessage(payload, response.status, response.statusText), {
                status: response.status,
                payload,
                code: "HTTP_ERROR",
            })
        }

        if (isJsonObject(payload) && payload.success === false) {
            throw new AdminClientError(getHttpErrorMessage(payload, response.status, response.statusText), {
                status: response.status,
                payload,
                code: "HTTP_ERROR",
            })
        }

        return payload as TResponse
    } catch (error) {
        if (error instanceof AdminClientError) {
            throw error
        }

        if (error instanceof DOMException && error.name === "AbortError") {
            if (timeoutReached) {
                throw new AdminClientError(`Request timeout setelah ${timeoutMs}ms`, {
                    code: "TIMEOUT",
                })
            }

            throw new AdminClientError("Request dibatalkan", {
                code: "ABORTED",
            })
        }

        throw new AdminClientError("Terjadi kesalahan jaringan saat menghubungi server admin", {
            code: "NETWORK_ERROR",
        })
    } finally {
        clearTimeout(timeoutHandle)
        if (externalSignal) {
            externalSignal.removeEventListener("abort", onExternalAbort)
        }
    }
}

export async function adminClient<TResponse = unknown, TBody = unknown>(
    endpoint: string,
    options: AdminClientOptions<TBody> = {}
): Promise<TResponse> {
    const method = options.method ?? "GET"
    const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS
    const retries = method === "GET" ? normalizeRetries(options.retries) : 0

    let attempt = 0
    while (true) {
        try {
            return await performRequest<TResponse, TBody>(endpoint, method, options, timeoutMs)
        } catch (error) {
            const canRetry = method === "GET" && attempt < retries && shouldRetryGet(error)
            if (!canRetry) {
                throw error
            }

            await wait(getRetryDelayMs(attempt))
            attempt += 1
        }
    }
}

export function adminGet<TResponse>(
    endpoint: string,
    options?: Omit<AdminClientOptions<never>, "method" | "body">
): Promise<TResponse> {
    return adminClient<TResponse>(endpoint, {
        ...(options ?? {}),
        method: "GET",
    })
}

export function adminPost<TResponse, TBody = unknown>(
    endpoint: string,
    options?: Omit<AdminClientOptions<TBody>, "method">
): Promise<TResponse> {
    return adminClient<TResponse, TBody>(endpoint, {
        ...(options ?? {}),
        method: "POST",
    })
}

export function adminPut<TResponse, TBody = unknown>(
    endpoint: string,
    options?: Omit<AdminClientOptions<TBody>, "method">
): Promise<TResponse> {
    return adminClient<TResponse, TBody>(endpoint, {
        ...(options ?? {}),
        method: "PUT",
    })
}

export function adminDelete<TResponse, TBody = unknown>(
    endpoint: string,
    options?: Omit<AdminClientOptions<TBody>, "method">
): Promise<TResponse> {
    return adminClient<TResponse, TBody>(endpoint, {
        ...(options ?? {}),
        method: "DELETE",
    })
}
