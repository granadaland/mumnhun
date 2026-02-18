import { NextResponse } from "next/server"
import { requireAdminApi } from "@/lib/security/admin"
import { createCsrfTokenForUser } from "@/lib/security/csrf"
import { checkRateLimit, createRateLimitExceededResponse } from "@/lib/security/rate-limit"

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
        console.error("[csrf] failed to create token", {
            userId: adminCheck.identity.id,
            error: error instanceof Error ? error.message : "Unknown error",
        })
        return NextResponse.json({ error: "Failed to initialize security token" }, { status: 500 })
    }
}
