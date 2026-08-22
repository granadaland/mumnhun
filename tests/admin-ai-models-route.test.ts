import { NextRequest, NextResponse } from "next/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

const mockRequireAdminMutationApi = vi.fn()
const mockAssertSafeProviderBaseUrl = vi.fn()
const mockListModels = vi.fn()
const mockGeminiListModels = vi.fn()
const mockDecryptStoredApiKey = vi.fn()

const mockPrisma = {
    aiApiKey: {
        findUnique: vi.fn(),
        update: vi.fn(),
    },
}

class FakeUrlGuardError extends Error {
    code: string
    constructor(message: string, code: string) {
        super(message)
        this.name = "UrlGuardError"
        this.code = code
    }
}

vi.mock("@/lib/db/prisma", () => ({ default: mockPrisma }))

vi.mock("@/lib/security/admin", () => ({
    requireAdminApi: vi.fn(),
    requireAdminMutationApi: mockRequireAdminMutationApi,
}))

vi.mock("@/lib/security/api-key-crypto", () => ({
    decryptStoredApiKey: mockDecryptStoredApiKey,
}))

vi.mock("@/lib/security/url-guard", () => ({
    assertSafeProviderBaseUrl: mockAssertSafeProviderBaseUrl,
    getAiProviderGuardOptions: vi.fn(() => ({ allowHttp: false })),
    UrlGuardError: FakeUrlGuardError,
}))

vi.mock("@/lib/security/ai-key-status", () => ({
    classifyProviderFailure: vi.fn((error: unknown) => {
        const status = (error as { status?: number })?.status
        if (status === 401 || status === 403) {
            return { code: "PROVIDER_KEY_INVALID", message: "API key provider tidak valid" }
        }
        if (status === 404) {
            return { code: "PROVIDER_MODEL_UNAVAILABLE", message: "Endpoint tidak ditemukan" }
        }
        return { code: "UNKNOWN_ERROR", message: "error" }
    }),
    toAiKeyFailureHttpStatus: vi.fn((failure: { code: string }) => {
        if (failure.code === "PROVIDER_KEY_INVALID") return 400
        if (failure.code === "PROVIDER_MODEL_UNAVAILABLE") return 400
        return 502
    }),
}))

vi.mock("@/lib/ai/openai-compatible", () => ({
    listModels: mockListModels,
    isAuthStyle: (value: unknown) =>
        typeof value === "string" && ["bearer", "raw", "x-api-key"].includes(value),
}))

vi.mock("@/lib/ai/gemini", () => ({
    geminiListModels: mockGeminiListModels,
}))

vi.mock("@/lib/observability/admin-log", () => ({
    logAdminError: vi.fn(),
    logAdminInfo: vi.fn(),
    logAdminWarn: vi.fn(),
}))

const adminIdentity = {
    id: "admin-models-1",
    email: "admin@example.com",
    role: "ADMIN" as const,
    source: "database" as const,
}

const { POST: discoverModels } = await import("@/app/api/admin/ai/models/route")

function buildRequest(body: unknown) {
    return new NextRequest("http://localhost/api/admin/ai/models", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
    })
}

describe("POST /api/admin/ai/models", () => {
    beforeEach(() => {
        vi.clearAllMocks()

        mockRequireAdminMutationApi.mockResolvedValue({ ok: true, identity: adminIdentity })
        mockAssertSafeProviderBaseUrl.mockImplementation(async (raw: string) => raw.replace(/\/+$/, ""))
        mockDecryptStoredApiKey.mockImplementation((value: string) => `dec:${value}`)
        mockPrisma.aiApiKey.update.mockResolvedValue({})
    })

    it("requires the admin mutation guard", async () => {
        mockRequireAdminMutationApi.mockResolvedValueOnce({
            ok: false,
            response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
        })

        const response = await discoverModels(
            buildRequest({ baseUrl: "https://ai.example.com/v1", apiKey: "sk-test" })
        )

        expect(response.status).toBe(403)
        expect(mockListModels).not.toHaveBeenCalled()
    })

    it("lists models for unsaved form credentials", async () => {
        mockListModels.mockResolvedValueOnce({
            models: [
                { id: "moonshotai/Kimi-K2.6", ownedBy: "moonshot" },
                { id: "auto", ownedBy: null },
            ],
            authStyle: "bearer",
        })

        const response = await discoverModels(
            buildRequest({ baseUrl: "https://ai.example.com/v1/", apiKey: "sk-test-key" })
        )
        const body = await response.json()

        expect(response.status).toBe(200)
        expect(body.data.models.map((m: { id: string }) => m.id)).toEqual([
            "moonshotai/Kimi-K2.6",
            "auto",
        ])
        expect(body.data.authStyle).toBe("bearer")

        // Base URL must be normalized and SSRF-validated before the outbound call.
        expect(mockAssertSafeProviderBaseUrl).toHaveBeenCalledWith(
            "https://ai.example.com/v1/",
            expect.anything()
        )
        expect(mockListModels).toHaveBeenCalledWith(
            expect.objectContaining({ baseUrl: "https://ai.example.com/v1", apiKey: "sk-test-key" })
        )

        // The submitted key must never be echoed back.
        expect(JSON.stringify(body)).not.toContain("sk-test-key")
    })

    it("rejects a base URL blocked by the SSRF guard", async () => {
        mockAssertSafeProviderBaseUrl.mockRejectedValueOnce(
            new FakeUrlGuardError("Host mengarah ke alamat internal", "URL_PRIVATE_ADDRESS_BLOCKED")
        )

        const response = await discoverModels(
            buildRequest({ baseUrl: "https://169.254.169.254/v1", apiKey: "sk-test" })
        )
        const body = await response.json()

        expect(response.status).toBe(400)
        expect(body.errorCode).toBe("PROVIDER_BASE_URL_INVALID")
        expect(mockListModels).not.toHaveBeenCalled()
    })

    it("requires a base URL for custom providers", async () => {
        const response = await discoverModels(buildRequest({ apiKey: "sk-test" }))
        const body = await response.json()

        expect(response.status).toBe(400)
        expect(body.errorCode).toBe("PROVIDER_BASE_URL_INVALID")
    })

    it("uses the stored credential when given a keyId, and caches the auth style", async () => {
        mockPrisma.aiApiKey.findUnique.mockResolvedValueOnce({
            id: "key-1",
            provider: "openai_compatible",
            apiKey: "enc-stored",
            baseUrl: "https://ai.example.com/v1",
            authStyle: "bearer",
        })
        mockListModels.mockResolvedValueOnce({
            models: [{ id: "m1", ownedBy: null }],
            authStyle: "raw",
        })

        const response = await discoverModels(buildRequest({ keyId: "key-1" }))

        expect(response.status).toBe(200)
        expect(mockListModels).toHaveBeenCalledWith(
            expect.objectContaining({ apiKey: "dec:enc-stored", authStyle: "bearer" })
        )

        // A newly discovered style is persisted so later calls skip the probe.
        expect(mockPrisma.aiApiKey.update).toHaveBeenCalledWith({
            where: { id: "key-1" },
            data: { authStyle: "raw" },
        })
    })

    it("returns 404 for an unknown keyId", async () => {
        mockPrisma.aiApiKey.findUnique.mockResolvedValueOnce(null)

        const response = await discoverModels(buildRequest({ keyId: "missing" }))

        expect(response.status).toBe(404)
        await expect(response.json()).resolves.toMatchObject({ errorCode: "AI_KEY_NOT_FOUND" })
    })

    it("lists Gemini models through the native endpoint", async () => {
        mockGeminiListModels.mockResolvedValueOnce(["gemini-2.5-flash", "gemini-1.5-flash"])

        const response = await discoverModels(
            buildRequest({ provider: "gemini", apiKey: "AIza-test-key" })
        )
        const body = await response.json()

        expect(response.status).toBe(200)
        expect(body.data.models.map((m: { id: string }) => m.id)).toEqual([
            "gemini-2.5-flash",
            "gemini-1.5-flash",
        ])
        expect(mockListModels).not.toHaveBeenCalled()
        expect(mockAssertSafeProviderBaseUrl).not.toHaveBeenCalled()
    })

    it("maps a provider rejection to a classified error code", async () => {
        const providerError = Object.assign(new Error("Provider HTTP 401"), {
            name: "OpenAiCompatibleError",
            status: 401,
        })
        mockListModels.mockRejectedValueOnce(providerError)

        const response = await discoverModels(
            buildRequest({ baseUrl: "https://ai.example.com/v1", apiKey: "sk-bad" })
        )
        const body = await response.json()

        expect(response.status).toBe(400)
        expect(body.errorCode).toBe("PROVIDER_KEY_INVALID")
    })

    it("rejects an empty API key at validation time", async () => {
        const response = await discoverModels(
            buildRequest({ baseUrl: "https://ai.example.com/v1", apiKey: "" })
        )

        expect(response.status).toBe(400)
        await expect(response.json()).resolves.toMatchObject({
            errorCode: "AI_MODELS_VALIDATION_FAILED",
        })
    })
})
