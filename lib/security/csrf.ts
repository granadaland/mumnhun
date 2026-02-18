import { createHmac, timingSafeEqual } from "node:crypto"
import { NextRequest, NextResponse } from "next/server"

export const ADMIN_CSRF_HEADER = "x-csrf-token"

type CsrfCheckResult =
    | { ok: true }
    | { ok: false; response: NextResponse }

type CsrfLogContext = {
    action?: string
    userId?: string
}

function getCsrfSecret(): string | null {
    const secret = process.env.CSRF_SECRET?.trim()
    return secret ? secret : null
}

function normalizeOrigin(value: string): string | null {
    try {
        const origin = new URL(value)
        return `${origin.protocol}//${origin.host}`.toLowerCase()
    } catch {
        return null
    }
}

function getExpectedRequestOrigin(request: NextRequest): string | null {
    const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim()
    const host = (forwardedHost || request.headers.get("host") || "").trim()
    if (!host) return null

    const forwardedProto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim().toLowerCase()
    const protocol = (forwardedProto || request.nextUrl.protocol.replace(":", "")).trim()
    if (!protocol) return null

    return `${protocol}://${host}`.toLowerCase()
}

function getAllowedOrigins(request: NextRequest): Set<string> {
    const allowed = new Set<string>()

    const runtimeOrigin = normalizeOrigin(request.nextUrl.origin)
    if (runtimeOrigin) allowed.add(runtimeOrigin)

    const expectedOrigin = getExpectedRequestOrigin(request)
    if (expectedOrigin) allowed.add(expectedOrigin)

    const configuredOrigin = process.env.NEXT_PUBLIC_SITE_URL ? normalizeOrigin(process.env.NEXT_PUBLIC_SITE_URL) : null
    if (configuredOrigin) allowed.add(configuredOrigin)

    return allowed
}

function createCsrfHmac(secret: string, userId: string): string {
    return createHmac("sha256", secret).update(userId).digest("base64url")
}

function safeEqualText(a: string, b: string): boolean {
    const aBuffer = Buffer.from(a)
    const bBuffer = Buffer.from(b)
    if (aBuffer.length !== bBuffer.length) return false
    return timingSafeEqual(aBuffer, bBuffer)
}

function logRejectedCsrfRequest(request: NextRequest, reason: string, context?: CsrfLogContext) {
    console.warn("[csrf] blocked admin mutation", {
        reason,
        method: request.method,
        path: request.nextUrl.pathname,
        action: context?.action,
        userId: context?.userId,
    })
}

function forbiddenCsrfResponse() {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
}

export function createCsrfTokenForUser(userId: string): string {
    const secret = getCsrfSecret()
    if (!secret) {
        throw new Error("CSRF_SECRET is required")
    }

    return createCsrfHmac(secret, userId)
}

export function verifyAdminCsrf(request: NextRequest, userId: string, context?: CsrfLogContext): CsrfCheckResult {
    const secret = getCsrfSecret()
    if (!secret) {
        logRejectedCsrfRequest(request, "missing_csrf_secret", context)
        return { ok: false, response: forbiddenCsrfResponse() }
    }

    const originHeader = request.headers.get("origin")
    if (!originHeader) {
        logRejectedCsrfRequest(request, "missing_origin", context)
        return { ok: false, response: forbiddenCsrfResponse() }
    }

    const requestOrigin = normalizeOrigin(originHeader)
    if (!requestOrigin) {
        logRejectedCsrfRequest(request, "invalid_origin", context)
        return { ok: false, response: forbiddenCsrfResponse() }
    }

    const allowedOrigins = getAllowedOrigins(request)
    if (!allowedOrigins.has(requestOrigin)) {
        logRejectedCsrfRequest(request, "origin_mismatch", context)
        return { ok: false, response: forbiddenCsrfResponse() }
    }

    const csrfHeaderToken = request.headers.get(ADMIN_CSRF_HEADER)?.trim()
    if (!csrfHeaderToken) {
        logRejectedCsrfRequest(request, "missing_csrf_header", context)
        return { ok: false, response: forbiddenCsrfResponse() }
    }

    const expectedToken = createCsrfHmac(secret, userId)
    if (!safeEqualText(csrfHeaderToken, expectedToken)) {
        logRejectedCsrfRequest(request, "token_mismatch", context)
        return { ok: false, response: forbiddenCsrfResponse() }
    }

    return { ok: true }
}
