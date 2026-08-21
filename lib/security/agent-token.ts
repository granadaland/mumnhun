import { createHash, randomBytes, timingSafeEqual } from "node:crypto"
import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/db/prisma"
import { checkRateLimit, createRateLimitExceededResponse } from "@/lib/security/rate-limit"

export const AGENT_TOKEN_PREFIX = "mnh_agent_"
const AGENT_TOKEN_PREFIX_LENGTH = 12
const AGENT_TOKEN_BYTES = 32

export const AGENT_SCOPES = [
    "article:create",
    "article:publish",
    "article:generate",
    "image:generate",
] as const

export type AgentScope = (typeof AGENT_SCOPES)[number]

export type AgentIdentity = {
    tokenId: string
    name: string
    scopes: AgentScope[]
}

type AgentCheckResult =
    | { ok: true; identity: AgentIdentity }
    | { ok: false; response: NextResponse }

export function isAgentScope(value: string): value is AgentScope {
    return (AGENT_SCOPES as readonly string[]).includes(value)
}

export function hashAgentToken(token: string): string {
    return createHash("sha256").update(token.trim(), "utf8").digest("hex")
}

export type GeneratedAgentToken = {
    token: string
    tokenHash: string
    tokenPrefix: string
}

/**
 * Generates a new agent token. Only the SHA-256 hash is persisted; the plaintext is
 * returned once so it can be shown to the operator and never stored server-side.
 */
export function generateAgentToken(): GeneratedAgentToken {
    const token = `${AGENT_TOKEN_PREFIX}${randomBytes(AGENT_TOKEN_BYTES).toString("base64url")}`

    return {
        token,
        tokenHash: hashAgentToken(token),
        tokenPrefix: token.slice(0, AGENT_TOKEN_PREFIX_LENGTH),
    }
}

export function parseAgentScopes(rawScopes: string): AgentScope[] {
    try {
        const parsed = JSON.parse(rawScopes) as unknown
        if (!Array.isArray(parsed)) return []

        return parsed.filter((scope): scope is AgentScope => typeof scope === "string" && isAgentScope(scope))
    } catch {
        return []
    }
}

function extractBearerToken(request: NextRequest): string | null {
    const header = request.headers.get("authorization")
    if (!header) return null

    const match = header.match(/^Bearer\s+(.+)$/i)
    const token = match?.[1]?.trim()

    return token ? token : null
}

function agentErrorJson(error: string, errorCode: string, status: number) {
    return NextResponse.json({ success: false, error, errorCode }, { status })
}

function safeEqualHex(a: string, b: string): boolean {
    const aBuffer = Buffer.from(a, "hex")
    const bBuffer = Buffer.from(b, "hex")

    if (aBuffer.length === 0 || aBuffer.length !== bBuffer.length) return false
    return timingSafeEqual(aBuffer, bBuffer)
}

/**
 * Authenticates an external agent by Bearer token, optionally enforcing one required scope.
 *
 * Cookie-based CSRF does not apply here because the credential is not ambient, so this
 * guard replaces requireAdminMutationApi for machine-to-machine calls. Rate limiting is
 * keyed per token to bound abuse from a single leaked credential.
 */
export async function requireAgentToken(
    request: NextRequest,
    requiredScope: AgentScope | null,
    options?: { action?: string; limit?: number; windowMs?: number }
): Promise<AgentCheckResult> {
    const token = extractBearerToken(request)
    if (!token) {
        return {
            ok: false,
            response: agentErrorJson("Missing bearer token", "AGENT_TOKEN_MISSING", 401),
        }
    }

    const tokenHash = hashAgentToken(token)

    const record = await prisma.agentApiToken.findUnique({
        where: { tokenHash },
        select: {
            id: true,
            name: true,
            scopes: true,
            isActive: true,
            expiresAt: true,
            revokedAt: true,
            tokenHash: true,
        },
    })

    if (!record || !safeEqualHex(record.tokenHash, tokenHash)) {
        return {
            ok: false,
            response: agentErrorJson("Invalid agent token", "AGENT_TOKEN_INVALID", 401),
        }
    }

    if (!record.isActive || record.revokedAt) {
        return {
            ok: false,
            response: agentErrorJson("Agent token is revoked", "AGENT_TOKEN_REVOKED", 401),
        }
    }

    if (record.expiresAt && record.expiresAt.getTime() <= Date.now()) {
        return {
            ok: false,
            response: agentErrorJson("Agent token has expired", "AGENT_TOKEN_EXPIRED", 401),
        }
    }

    const action = options?.action || request.nextUrl.pathname
    const rateLimitResult = checkRateLimit(`agent:${record.id}:${action}`, {
        limit: options?.limit ?? 30,
        windowMs: options?.windowMs ?? 60_000,
    })

    if (!rateLimitResult.ok) {
        return {
            ok: false,
            response: createRateLimitExceededResponse(rateLimitResult),
        }
    }

    const scopes = parseAgentScopes(record.scopes)
    if (requiredScope && !scopes.includes(requiredScope)) {
        return {
            ok: false,
            response: agentErrorJson(
                `Token lacks required scope: ${requiredScope}`,
                "AGENT_SCOPE_INSUFFICIENT",
                403
            ),
        }
    }

    await prisma.agentApiToken
        .update({
            where: { id: record.id },
            data: { lastUsedAt: new Date() },
        })
        .catch(() => undefined)

    return {
        ok: true,
        identity: {
            tokenId: record.id,
            name: record.name,
            scopes,
        },
    }
}
