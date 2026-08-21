import { NextRequest, NextResponse } from "next/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

const mockCheckRateLimit = vi.fn()
const mockCreateRateLimitExceededResponse = vi.fn()

const mockPrisma = {
    agentApiToken: {
        findUnique: vi.fn(),
        update: vi.fn(),
    },
}

vi.mock("@/lib/db/prisma", () => ({
    default: mockPrisma,
}))

vi.mock("@/lib/security/rate-limit", () => ({
    checkRateLimit: mockCheckRateLimit,
    createRateLimitExceededResponse: mockCreateRateLimitExceededResponse,
}))

const {
    AGENT_TOKEN_PREFIX,
    generateAgentToken,
    hashAgentToken,
    parseAgentScopes,
    requireAgentToken,
} = await import("@/lib/security/agent-token")

function buildRequest(token?: string) {
    return new NextRequest("http://localhost/api/agent/articles", {
        method: "POST",
        headers: token ? { authorization: `Bearer ${token}` } : {},
    })
}

describe("agent-token: token generation", () => {
    it("produces a prefixed token and stores only its hash", () => {
        const generated = generateAgentToken()

        expect(generated.token.startsWith(AGENT_TOKEN_PREFIX)).toBe(true)
        expect(generated.tokenPrefix).toBe(generated.token.slice(0, 12))
        expect(generated.tokenHash).toBe(hashAgentToken(generated.token))
        expect(generated.tokenHash).toMatch(/^[0-9a-f]{64}$/)
        expect(generated.tokenHash).not.toContain(generated.token)
    })

    it("generates distinct tokens", () => {
        expect(generateAgentToken().token).not.toBe(generateAgentToken().token)
    })
})

describe("agent-token: scope parsing", () => {
    it("keeps only known scopes", () => {
        expect(parseAgentScopes('["article:create","bogus:scope","article:publish"]')).toEqual([
            "article:create",
            "article:publish",
        ])
    })

    it("returns an empty list for malformed JSON", () => {
        expect(parseAgentScopes("not-json")).toEqual([])
        expect(parseAgentScopes('{"scopes":[]}')).toEqual([])
    })
})

describe("agent-token: requireAgentToken", () => {
    beforeEach(() => {
        vi.clearAllMocks()

        mockCheckRateLimit.mockReturnValue({
            ok: true,
            limit: 30,
            remaining: 29,
            resetAt: Date.now() + 60_000,
        })
        mockCreateRateLimitExceededResponse.mockImplementation((result) =>
            NextResponse.json({ error: "Too Many Requests", retryAfterSec: result.retryAfterSec }, { status: 429 })
        )
        mockPrisma.agentApiToken.update.mockResolvedValue({})
    })

    it("rejects a missing bearer token with 401", async () => {
        const result = await requireAgentToken(buildRequest(), "article:create")

        expect(result.ok).toBe(false)
        if (result.ok) return

        expect(result.response.status).toBe(401)
        await expect(result.response.json()).resolves.toMatchObject({
            errorCode: "AGENT_TOKEN_MISSING",
        })
        expect(mockPrisma.agentApiToken.findUnique).not.toHaveBeenCalled()
    })

    it("rejects an unknown token with 401 and never leaks existence details", async () => {
        mockPrisma.agentApiToken.findUnique.mockResolvedValueOnce(null)

        const result = await requireAgentToken(buildRequest("mnh_agent_unknown"), "article:create")

        expect(result.ok).toBe(false)
        if (result.ok) return

        expect(result.response.status).toBe(401)
        await expect(result.response.json()).resolves.toMatchObject({
            errorCode: "AGENT_TOKEN_INVALID",
        })
    })

    it("looks up the token by hash, never by plaintext", async () => {
        const generated = generateAgentToken()

        mockPrisma.agentApiToken.findUnique.mockResolvedValueOnce({
            id: "token-1",
            name: "OpenClaw",
            scopes: '["article:create"]',
            isActive: true,
            expiresAt: null,
            revokedAt: null,
            tokenHash: generated.tokenHash,
        })

        const result = await requireAgentToken(buildRequest(generated.token), "article:create")

        expect(result.ok).toBe(true)
        expect(mockPrisma.agentApiToken.findUnique).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { tokenHash: generated.tokenHash },
            })
        )

        const lookupArg = JSON.stringify(mockPrisma.agentApiToken.findUnique.mock.calls[0][0])
        expect(lookupArg).not.toContain(generated.token)
    })

    it("rejects a revoked token", async () => {
        const generated = generateAgentToken()

        mockPrisma.agentApiToken.findUnique.mockResolvedValueOnce({
            id: "token-revoked",
            name: "Old",
            scopes: '["article:create"]',
            isActive: false,
            expiresAt: null,
            revokedAt: new Date("2026-01-01T00:00:00.000Z"),
            tokenHash: generated.tokenHash,
        })

        const result = await requireAgentToken(buildRequest(generated.token), "article:create")

        expect(result.ok).toBe(false)
        if (result.ok) return
        expect(result.response.status).toBe(401)
        await expect(result.response.json()).resolves.toMatchObject({
            errorCode: "AGENT_TOKEN_REVOKED",
        })
    })

    it("rejects an expired token", async () => {
        const generated = generateAgentToken()

        mockPrisma.agentApiToken.findUnique.mockResolvedValueOnce({
            id: "token-expired",
            name: "Expired",
            scopes: '["article:create"]',
            isActive: true,
            expiresAt: new Date(Date.now() - 1000),
            revokedAt: null,
            tokenHash: generated.tokenHash,
        })

        const result = await requireAgentToken(buildRequest(generated.token), "article:create")

        expect(result.ok).toBe(false)
        if (result.ok) return
        expect(result.response.status).toBe(401)
        await expect(result.response.json()).resolves.toMatchObject({
            errorCode: "AGENT_TOKEN_EXPIRED",
        })
    })

    it("rejects insufficient scope with 403", async () => {
        const generated = generateAgentToken()

        mockPrisma.agentApiToken.findUnique.mockResolvedValueOnce({
            id: "token-scope",
            name: "Draft only",
            scopes: '["article:create"]',
            isActive: true,
            expiresAt: null,
            revokedAt: null,
            tokenHash: generated.tokenHash,
        })

        const result = await requireAgentToken(buildRequest(generated.token), "article:publish")

        expect(result.ok).toBe(false)
        if (result.ok) return
        expect(result.response.status).toBe(403)
        await expect(result.response.json()).resolves.toMatchObject({
            errorCode: "AGENT_SCOPE_INSUFFICIENT",
        })
    })

    it("applies a per-token rate limit", async () => {
        const generated = generateAgentToken()

        mockPrisma.agentApiToken.findUnique.mockResolvedValueOnce({
            id: "token-rl",
            name: "Busy",
            scopes: '["article:create"]',
            isActive: true,
            expiresAt: null,
            revokedAt: null,
            tokenHash: generated.tokenHash,
        })
        mockCheckRateLimit.mockReturnValueOnce({
            ok: false,
            limit: 30,
            remaining: 0,
            resetAt: Date.now() + 30_000,
            retryAfterSec: 30,
        })

        const result = await requireAgentToken(buildRequest(generated.token), "article:create", {
            action: "agent-articles:create",
        })

        expect(result.ok).toBe(false)
        if (result.ok) return
        expect(result.response.status).toBe(429)
        expect(mockCheckRateLimit).toHaveBeenCalledWith(
            "agent:token-rl:agent-articles:create",
            expect.objectContaining({ limit: 30 })
        )
    })

    it("returns identity and records lastUsedAt on success", async () => {
        const generated = generateAgentToken()

        mockPrisma.agentApiToken.findUnique.mockResolvedValueOnce({
            id: "token-ok",
            name: "Hermes",
            scopes: '["article:create","article:publish"]',
            isActive: true,
            expiresAt: new Date(Date.now() + 60_000),
            revokedAt: null,
            tokenHash: generated.tokenHash,
        })

        const result = await requireAgentToken(buildRequest(generated.token), "article:publish")

        expect(result.ok).toBe(true)
        if (!result.ok) return

        expect(result.identity).toEqual({
            tokenId: "token-ok",
            name: "Hermes",
            scopes: ["article:create", "article:publish"],
        })
        expect(mockPrisma.agentApiToken.update).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { id: "token-ok" },
                data: { lastUsedAt: expect.any(Date) },
            })
        )
    })

    it("authenticates without enforcing a scope when requiredScope is null", async () => {
        const generated = generateAgentToken()

        mockPrisma.agentApiToken.findUnique.mockResolvedValueOnce({
            id: "token-any",
            name: "Any",
            scopes: '["article:create"]',
            isActive: true,
            expiresAt: null,
            revokedAt: null,
            tokenHash: generated.tokenHash,
        })

        const result = await requireAgentToken(buildRequest(generated.token), null)

        expect(result.ok).toBe(true)
    })
})
