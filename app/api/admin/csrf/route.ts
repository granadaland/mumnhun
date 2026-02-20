import { NextResponse } from "next/server"
import { requireAdminApi } from "@/lib/security/admin"
import { createCsrfTokenForUser } from "@/lib/security/csrf"
import { checkRateLimit, createRateLimitExceededResponse } from "@/lib/security/rate-limit"

type CsrfRouteErrorPayload = {
    success: false
    error: string
    errorCode: "CSRF_CONFIG_MISSING" | "CSRF_TOKEN_INIT_FAILED"
}

function createCsrfRouteErrorResponse(payload: CsrfRouteErrorPayload, status = 500) {
    return NextResponse.json(payload, { status })
}

export async function GET() {
    const adminCheck = await requireAdminApi()
    if (!adminCheck.ok) return adminCheck.response

    const rateLimitResult = checkRateLimit(`admin-csrf:${adminCheck.identity.id}`, {
        limit: 30,
        windowMs: 60_000,
    })

    if (!rateLimitResult.ok) {
        return createRateLimitExceededResponse(rateLimitResult)
    }

    try {
        const csrfToken = createCsrfTokenForUser(adminCheck.identity.id)
        return NextResponse.json({ success: true, data: { csrfToken } })
    } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error"
        const isMissingConfig = typeof message === "string" && message.includes("CSRF_SECRET")

        console.error("[csrf] failed to create token", {
            userId: adminCheck.identity.id,
            error: message,
            errorCode: isMissingConfig ? "CSRF_CONFIG_MISSING" : "CSRF_TOKEN_INIT_FAILED",
        })

        if (isMissingConfig) {
            return createCsrfRouteErrorResponse(
                {
                    success: false,
                    error: "Konfigurasi CSRF server belum lengkap.",
                    errorCode: "CSRF_CONFIG_MISSING",
                },
                500
            )
        }

        return createCsrfRouteErrorResponse(
            {
                success: false,
                error: "Gagal menginisialisasi token keamanan.",
                errorCode: "CSRF_TOKEN_INIT_FAILED",
            },
            500
        )
    }
}
