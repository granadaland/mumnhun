import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/db/prisma"
import { createClient } from "@/lib/supabase/server"
import { observeAdminOperationalEvent } from "@/lib/observability/admin-alerts"
import { verifyAdminCsrf } from "@/lib/security/csrf"
import { checkRateLimit, createRateLimitExceededResponse } from "@/lib/security/rate-limit"
import { redirect } from "next/navigation"

type AdminRoleSource = "metadata" | "env" | "database"

export type AdminIdentity = {
    id: string
    email: string | null
    role: "ADMIN"
    source: AdminRoleSource
}

type AdminCheckResult =
    | { ok: true; identity: AdminIdentity }
    | { ok: false; response: NextResponse }

function parseAdminEmails(): Set<string> {
    return new Set(
        (process.env.ADMIN_EMAILS || "")
            .split(",")
            .map((email) => email.trim().toLowerCase())
            .filter(Boolean)
    )
}

function isAdminMetadataRole(role: unknown): boolean {
    return typeof role === "string" && role.toUpperCase() === "ADMIN"
}

async function resolveAdminIdentity(): Promise<{
    authenticated: boolean
    identity: AdminIdentity | null
}> {
    const supabase = await createClient()
    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        return { authenticated: false, identity: null }
    }

    const appRole = user.app_metadata?.role
    const userRole = user.user_metadata?.role

    if (isAdminMetadataRole(appRole) || isAdminMetadataRole(userRole)) {
        return {
            authenticated: true,
            identity: {
                id: user.id,
                email: user.email ?? null,
                role: "ADMIN",
                source: "metadata",
            },
        }
    }

    const normalizedEmail = user.email?.toLowerCase() ?? null
    const adminEmails = parseAdminEmails()

    if (normalizedEmail && adminEmails.has(normalizedEmail)) {
        return {
            authenticated: true,
            identity: {
                id: user.id,
                email: normalizedEmail,
                role: "ADMIN",
                source: "env",
            },
        }
    }

    if (normalizedEmail) {
        const dbUser = await prisma.user.findUnique({
            where: { email: normalizedEmail },
            select: { role: true },
        })

        if (dbUser?.role === "ADMIN") {
            return {
                authenticated: true,
                identity: {
                    id: user.id,
                    email: normalizedEmail,
                    role: "ADMIN",
                    source: "database",
                },
            }
        }
    }

    return { authenticated: true, identity: null }
}

export async function requireAdminApi(): Promise<AdminCheckResult> {
    const resolved = await resolveAdminIdentity()

    if (!resolved.authenticated) {
        observeAdminOperationalEvent({ status: 401, action: "admin-auth" })
        return {
            ok: false,
            response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
        }
    }

    if (resolved.identity) {
        return {
            ok: true,
            identity: resolved.identity,
        }
    }

    observeAdminOperationalEvent({ status: 403, action: "admin-auth" })
    return {
        ok: false,
        response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    }
}

export async function requireAdminPage(): Promise<AdminIdentity> {
    const resolved = await resolveAdminIdentity()

    if (!resolved.authenticated) {
        redirect("/login")
    }

    if (!resolved.identity) {
        // User is authenticated but not admin — redirect to homepage
        // (redirecting to /login would cause an infinite loop with middleware)
        redirect("/")
    }

    return resolved.identity
}

export async function requireAdminMutationApi(
    request: NextRequest,
    options?: { action?: string }
): Promise<AdminCheckResult> {
    const adminCheck = await requireAdminApi()
    if (!adminCheck.ok) return adminCheck

    const csrfCheck = verifyAdminCsrf(request, adminCheck.identity.id, {
        action: options?.action,
        userId: adminCheck.identity.id,
    })

    if (!csrfCheck.ok) {
        return { ok: false, response: csrfCheck.response }
    }

    const action = options?.action || request.nextUrl.pathname
    const rateLimitResult = checkRateLimit(`admin-mutation:${adminCheck.identity.id}:${action}`, {
        limit: 60,
        windowMs: 60_000,
    })

    if (!rateLimitResult.ok) {
        return {
            ok: false,
            response: createRateLimitExceededResponse(rateLimitResult),
        }
    }

    return adminCheck
}
