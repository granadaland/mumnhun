"use client"

export const ADMIN_CSRF_HEADER = "x-csrf-token"

let csrfTokenCache: string | null = null
let csrfTokenRequest: Promise<string> | null = null

async function requestCsrfToken(): Promise<string> {
    const response = await fetch("/api/admin/csrf", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
    })

    if (!response.ok) {
        throw new Error("Failed to fetch CSRF token")
    }

    const payload = await response.json() as { success?: boolean; data?: { csrfToken?: string } }
    const csrfToken = payload.data?.csrfToken

    if (!payload.success || !csrfToken) {
        throw new Error("Invalid CSRF token response")
    }

    return csrfToken
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
