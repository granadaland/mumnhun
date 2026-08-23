import { NextRequest, NextResponse } from "next/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

const mockRequireAdminApi = vi.fn()
const mockRequireAdminMutationApi = vi.fn()
const mockVerifyGeminiApiKey = vi.fn()
const mockVerifyOpenAiCompatibleApiKey = vi.fn()
const mockAssertSafeProviderBaseUrl = vi.fn()

const mockPrisma = {
    aiApiKey: {
        findMany: vi.fn(),
        count: vi.fn(),
        create: vi.fn(),
        findUnique: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
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

vi.mock("@/lib/db/prisma", () => ({
    default: mockPrisma,
}))

vi.mock("@/lib/security/admin", () => ({
    requireAdminApi: mockRequireAdminApi,
    requireAdminMutationApi: mockRequireAdminMutationApi,
}))

vi.mock("@/lib/security/url-guard", () => ({
    assertSafeProviderBaseUrl: mockAssertSafeProviderBaseUrl,
    getAiProviderGuardOptions: vi.fn(() => ({ allowHttp: false })),
    UrlGuardError: FakeUrlGuardError,
}))

vi.mock("@/lib/security/ai-key-status", () => ({
    verifyGeminiApiKey: mockVerifyGeminiApiKey,
    verifyOpenAiCompatibleApiKey: mockVerifyOpenAiCompatibleApiKey,
    deriveAiKeyConnectionState: vi.fn(({ lastError, lastUsedAt }: { lastError: string | null; lastUsedAt: Date | null }) => {
        if (lastError) {
            return { connectionStatus: "failed", lastError: "Error koneksi", lastErrorCode: "UNKNOWN_ERROR" }
        }
        if (lastUsedAt) {
            return { connectionStatus: "connected", lastError: null, lastErrorCode: null }
        }
        return { connectionStatus: "not_tested", lastError: null, lastErrorCode: null }
    }),
    classifyAiKeyFailure: vi.fn((error: unknown) => {
        if (error instanceof FakeUrlGuardError) {
            return { code: "PROVIDER_BASE_URL_INVALID", message: error.message }
        }
        return { code: "UNKNOWN_ERROR", message: "error" }
    }),
    classifyProviderFailure: vi.fn((error: unknown) => {
        if (error instanceof FakeUrlGuardError) {
            return { code: "PROVIDER_BASE_URL_INVALID", message: error.message }
        }
        return { code: "UNKNOWN_ERROR", message: "error" }
    }),
    formatStoredAiKeyFailure: vi.fn(({ code, message }: { code: string; message: string }) => `${code}::${message}`),
    toAiKeyFailureHttpStatus: vi.fn((failure: { code: string }) => {
        if (failure.code === "PROVIDER_BASE_URL_INVALID") return 400
        if (failure.code === "PROVIDER_KEY_INVALID") return 400
        if (failure.code === "PROVIDER_MODEL_UNAVAILABLE") return 400
        if (failure.code === "PROVIDER_REQUEST_FAILED") return 400
        return 502
    }),
}))

vi.mock("@/lib/ai/openai-compatible", () => ({
    isAuthStyle: (value: unknown) =>
        typeof value === "string" && ["bearer", "raw", "x-api-key"].includes(value),
}))

vi.mock("@/lib/observability/admin-log", () => ({
    logAdminError: vi.fn(),
    logAdminInfo: vi.fn(),
    logAdminWarn: vi.fn(),
}))

const adminIdentity = {
    id: "admin-provider-1",
    email: "admin@example.com",
    role: "ADMIN" as const,
    source: "database" as const,
}

const { POST: createAiKey, PUT: updateAiKey, GET: listAiKeys } = await import("@/app/api/admin/ai/keys/route")

function buildRequest(method: "POST" | "PUT", body: unknown) {
    return new NextRequest("http://localhost/api/admin/ai/keys", {
        method,
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
    })
}

describe("POST /api/admin/ai/keys: custom OpenAI-compatible provider", () => {
    beforeEach(() => {
        vi.clearAllMocks()
        process.env.API_KEYS_ENCRYPTION_SECRET = "unit-test-secret-for-ai-keys"

        mockRequireAdminApi.mockResolvedValue({ ok: true, identity: adminIdentity })
        mockRequireAdminMutationApi.mockResolvedValue({ ok: true, identity: adminIdentity })
        mockPrisma.aiApiKey.count.mockResolvedValue(0)
        mockVerifyGeminiApiKey.mockResolvedValue({ ok: true })
        mockVerifyOpenAiCompatibleApiKey.mockResolvedValue({
            ok: true,
            models: [{ id: "gpt-4o-mini", ownedBy: null }],
            authStyle: "bearer",
            chatVerified: true,
            modelsEndpointAvailable: true,
        })
        mockAssertSafeProviderBaseUrl.mockImplementation(async (raw: string) => raw.replace(/\/+$/, ""))
    })

    it("rejects a custom provider without baseUrl", async () => {
        const response = await createAiKey(
            buildRequest("POST", {
                provider: "openai_compatible",
                apiKey: "sk-test-1234567890abcdef",
                model: "gpt-4o-mini",
            })
        )

        expect(response.status).toBe(400)
        await expect(response.json()).resolves.toMatchObject({
            errorCode: "PROVIDER_BASE_URL_INVALID",
        })
        expect(mockPrisma.aiApiKey.create).not.toHaveBeenCalled()
    })

    it("rejects a custom provider without model", async () => {
        const response = await createAiKey(
            buildRequest("POST", {
                provider: "openai_compatible",
                apiKey: "sk-test-1234567890abcdef",
                baseUrl: "https://api.openai.com/v1",
            })
        )

        expect(response.status).toBe(400)
        await expect(response.json()).resolves.toMatchObject({
            errorCode: "AI_KEY_MODEL_REQUIRED",
        })
        expect(mockPrisma.aiApiKey.create).not.toHaveBeenCalled()
    })

    it("rejects a base URL blocked by the SSRF guard before any provider call", async () => {
        mockAssertSafeProviderBaseUrl.mockRejectedValueOnce(
            new FakeUrlGuardError("Host mengarah ke alamat internal yang diblokir", "URL_PRIVATE_ADDRESS_BLOCKED")
        )

        const response = await createAiKey(
            buildRequest("POST", {
                provider: "openai_compatible",
                apiKey: "sk-test-1234567890abcdef",
                baseUrl: "https://169.254.169.254/v1",
                model: "gpt-4o-mini",
            })
        )

        expect(response.status).toBe(400)
        await expect(response.json()).resolves.toMatchObject({
            errorCode: "PROVIDER_BASE_URL_INVALID",
        })
        expect(mockVerifyOpenAiCompatibleApiKey).not.toHaveBeenCalled()
        expect(mockPrisma.aiApiKey.create).not.toHaveBeenCalled()
    })

    it("propagates an unavailable model as 400", async () => {
        mockVerifyOpenAiCompatibleApiKey.mockResolvedValueOnce({
            ok: false,
            status: 400,
            failure: { code: "PROVIDER_MODEL_UNAVAILABLE", message: 'Model "ghost" tidak tersedia' },
        })

        const response = await createAiKey(
            buildRequest("POST", {
                provider: "openai_compatible",
                apiKey: "sk-test-1234567890abcdef",
                baseUrl: "https://api.openai.com/v1",
                model: "ghost",
            })
        )

        expect(response.status).toBe(400)
        await expect(response.json()).resolves.toMatchObject({
            errorCode: "PROVIDER_MODEL_UNAVAILABLE",
        })
        expect(mockPrisma.aiApiKey.create).not.toHaveBeenCalled()
    })

    it("stores an encrypted key with normalized baseUrl and never returns plaintext", async () => {
        mockAssertSafeProviderBaseUrl.mockResolvedValueOnce("https://openrouter.ai/api/v1")
        mockPrisma.aiApiKey.create.mockImplementationOnce(async ({ data }: { data: Record<string, unknown> }) => ({
            id: "key-custom-1",
            provider: data.provider,
            capability: data.capability,
            baseUrl: data.baseUrl,
            model: data.model,
            authStyle: data.authStyle,
            label: data.label,
            isActive: true,
            usageCount: 0,
            order: 0,
            lastUsedAt: new Date("2026-08-21T00:00:00.000Z"),
            lastError: null,
            apiKey: data.apiKey,
        }))

        const response = await createAiKey(
            buildRequest("POST", {
                provider: "openai_compatible",
                apiKey: "sk-secret-value-1234567890",
                baseUrl: "https://openrouter.ai/api/v1/",
                model: "meta-llama/llama-3.1-70b-instruct",
                label: " Router ",
            })
        )

        expect(response.status).toBe(200)
        const body = await response.json()

        expect(body.data).toMatchObject({
            id: "key-custom-1",
            provider: "openai_compatible",
            baseUrl: "https://openrouter.ai/api/v1",
            model: "meta-llama/llama-3.1-70b-instruct",
            capability: "text",
            connectionStatus: "connected",
        })

        expect(JSON.stringify(body)).not.toContain("sk-secret-value-1234567890")

        const createArg = mockPrisma.aiApiKey.create.mock.calls[0][0]
        expect(createArg.data.apiKey).toMatch(/^enc:v1:/)
        expect(createArg.data.apiKey).not.toContain("sk-secret-value-1234567890")
        expect(createArg.data.label).toBe("Router")
        // The verified auth style is cached so later calls skip the probing.
        expect(createArg.data.authStyle).toBe("bearer")
    })

    it("accepts a model that the provider does not list when chat verification succeeded", async () => {
        // Some gateways expose /models without the model actually used (e.g. "auto" routers).
        mockVerifyOpenAiCompatibleApiKey.mockResolvedValueOnce({
            ok: true,
            models: [{ id: "some-other-model", ownedBy: null }],
            authStyle: "raw",
            chatVerified: true,
            modelsEndpointAvailable: true,
        })
        mockPrisma.aiApiKey.create.mockImplementationOnce(async ({ data }: { data: Record<string, unknown> }) => ({
            id: "key-auto",
            provider: data.provider,
            capability: data.capability,
            baseUrl: data.baseUrl,
            model: data.model,
            authStyle: data.authStyle,
            label: null,
            isActive: true,
            usageCount: 0,
            order: 0,
            lastUsedAt: new Date(),
            lastError: null,
            apiKey: data.apiKey,
        }))

        const response = await createAiKey(
            buildRequest("POST", {
                provider: "openai_compatible",
                apiKey: "sk-test-1234567890abcdef",
                baseUrl: "https://ai.tioo.example/v1",
                model: "auto",
            })
        )

        expect(response.status).toBe(200)
        await expect(response.json()).resolves.toMatchObject({
            data: { model: "auto", authStyle: "raw" },
        })
    })

    it("keeps the Gemini path working without baseUrl/model", async () => {
        mockPrisma.aiApiKey.create.mockImplementationOnce(async ({ data }: { data: Record<string, unknown> }) => ({
            id: "key-gemini-1",
            provider: data.provider,
            capability: data.capability,
            baseUrl: data.baseUrl,
            model: data.model,
            label: data.label,
            isActive: true,
            usageCount: 0,
            order: 0,
            lastUsedAt: new Date(),
            lastError: null,
            apiKey: data.apiKey,
        }))

        const response = await createAiKey(
            buildRequest("POST", { apiKey: "AIzaSy-valid-key-1234567890" })
        )

        expect(response.status).toBe(200)
        await expect(response.json()).resolves.toMatchObject({
            data: { provider: "gemini", baseUrl: null, model: null },
        })
        expect(mockVerifyGeminiApiKey).toHaveBeenCalledWith("AIzaSy-valid-key-1234567890")
        expect(mockVerifyOpenAiCompatibleApiKey).not.toHaveBeenCalled()
    })

    it("accepts image capability on Gemini (Imagen via @google/genai)", async () => {
        mockPrisma.aiApiKey.create.mockImplementationOnce(async ({ data }: { data: Record<string, unknown> }) => ({
            id: "key-gemini-image",
            provider: data.provider,
            capability: data.capability,
            baseUrl: data.baseUrl,
            model: data.model,
            authStyle: data.authStyle,
            label: null,
            isActive: true,
            usageCount: 0,
            order: 0,
            lastUsedAt: new Date(),
            lastError: null,
            apiKey: data.apiKey,
        }))

        const response = await createAiKey(
            buildRequest("POST", { apiKey: "AIzaSy-valid-key-1234567890", capability: "image" })
        )

        expect(response.status).toBe(200)
        await expect(response.json()).resolves.toMatchObject({
            data: { provider: "gemini", capability: "image" },
        })
        expect(mockVerifyGeminiApiKey).toHaveBeenCalledWith("AIzaSy-valid-key-1234567890")
    })
})

describe("PUT /api/admin/ai/keys: provider config updates", () => {
    beforeEach(() => {
        vi.clearAllMocks()
        process.env.API_KEYS_ENCRYPTION_SECRET = "unit-test-secret-for-ai-keys"

        mockRequireAdminMutationApi.mockResolvedValue({ ok: true, identity: adminIdentity })
        mockVerifyGeminiApiKey.mockResolvedValue({ ok: true })
        mockVerifyOpenAiCompatibleApiKey.mockResolvedValue({
            ok: true,
            models: [],
            authStyle: "bearer",
            chatVerified: true,
            modelsEndpointAvailable: false,
        })
        mockAssertSafeProviderBaseUrl.mockImplementation(async (raw: string) => raw.replace(/\/+$/, ""))
    })

    it("rejects baseUrl updates on a Gemini key", async () => {
        mockPrisma.aiApiKey.findUnique.mockResolvedValueOnce({
            id: "key-gemini",
            provider: "gemini",
            isActive: true,
            apiKey: "AIza-existing",
            baseUrl: null,
            model: null,
        })

        const response = await updateAiKey(
            buildRequest("PUT", { id: "key-gemini", baseUrl: "https://api.openai.com/v1" })
        )

        expect(response.status).toBe(400)
        await expect(response.json()).resolves.toMatchObject({
            errorCode: "AI_KEY_BASE_URL_NOT_APPLICABLE",
        })
    })

    it("re-verifies the stored key when the custom base URL changes", async () => {
        mockPrisma.aiApiKey.findUnique.mockResolvedValueOnce({
            id: "key-custom",
            provider: "openai_compatible",
            isActive: true,
            apiKey: "sk-existing-plaintext-for-test",
            baseUrl: "https://old.example.com/v1",
            model: "gpt-4o-mini",
            authStyle: "bearer",
        })
        mockAssertSafeProviderBaseUrl.mockResolvedValueOnce("https://new.example.com/v1")
        mockPrisma.aiApiKey.update.mockResolvedValueOnce({
            id: "key-custom",
            provider: "openai_compatible",
            capability: "text",
            baseUrl: "https://new.example.com/v1",
            model: "gpt-4o-mini",
            authStyle: "bearer",
            label: null,
            isActive: true,
            usageCount: 1,
            order: 0,
            lastUsedAt: new Date(),
            lastError: null,
            apiKey: "sk-existing-plaintext-for-test",
        })

        const response = await updateAiKey(
            buildRequest("PUT", { id: "key-custom", baseUrl: "https://new.example.com/v1" })
        )

        expect(response.status).toBe(200)
        expect(mockVerifyOpenAiCompatibleApiKey).toHaveBeenCalledWith(
            expect.objectContaining({
                baseUrl: "https://new.example.com/v1",
                model: "gpt-4o-mini",
                authStyle: "bearer",
            })
        )
    })

    it("re-tests the connection on demand without changing configuration", async () => {
        mockPrisma.aiApiKey.findUnique.mockResolvedValueOnce({
            id: "key-retest",
            provider: "openai_compatible",
            isActive: true,
            apiKey: "sk-existing-plaintext-for-test",
            baseUrl: "https://ai.example.com/v1",
            model: "auto",
            authStyle: null,
        })
        mockVerifyOpenAiCompatibleApiKey.mockResolvedValueOnce({
            ok: true,
            models: [],
            authStyle: "x-api-key",
            chatVerified: true,
            modelsEndpointAvailable: false,
        })
        mockPrisma.aiApiKey.update.mockResolvedValueOnce({
            id: "key-retest",
            provider: "openai_compatible",
            capability: "text",
            baseUrl: "https://ai.example.com/v1",
            model: "auto",
            authStyle: "x-api-key",
            label: null,
            isActive: true,
            usageCount: 0,
            order: 0,
            lastUsedAt: new Date(),
            lastError: null,
            apiKey: "sk-existing-plaintext-for-test",
        })

        const response = await updateAiKey(buildRequest("PUT", { id: "key-retest", retest: true }))

        expect(response.status).toBe(200)
        expect(mockVerifyOpenAiCompatibleApiKey).toHaveBeenCalledTimes(1)

        // The freshly detected auth style must be persisted.
        const updateArg = mockPrisma.aiApiKey.update.mock.calls.at(-1)?.[0]
        expect(updateArg?.data).toMatchObject({ authStyle: "x-api-key", lastError: null })
    })

    it("blocks activation when the custom provider fails verification", async () => {
        mockPrisma.aiApiKey.findUnique.mockResolvedValueOnce({
            id: "key-broken",
            provider: "openai_compatible",
            isActive: false,
            apiKey: "sk-existing-plaintext-for-test",
            baseUrl: "https://api.example.com/v1",
            model: "gpt-4o-mini",
        })
        mockVerifyOpenAiCompatibleApiKey.mockResolvedValueOnce({
            ok: false,
            status: 400,
            failure: { code: "PROVIDER_KEY_INVALID", message: "API key tidak valid" },
        })

        const response = await updateAiKey(buildRequest("PUT", { id: "key-broken", isActive: true }))

        expect(response.status).toBe(400)
        await expect(response.json()).resolves.toMatchObject({
            errorCode: "PROVIDER_KEY_INVALID",
        })
        expect(mockPrisma.aiApiKey.update).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { id: "key-broken" },
                data: expect.objectContaining({
                    lastError: expect.stringContaining("PROVIDER_KEY_INVALID::"),
                }),
            })
        )
    })
})

describe("GET /api/admin/ai/keys: response shape", () => {
    beforeEach(() => {
        vi.clearAllMocks()
        process.env.API_KEYS_ENCRYPTION_SECRET = "unit-test-secret-for-ai-keys"
        mockRequireAdminApi.mockResolvedValue({ ok: true, identity: adminIdentity })
    })

    it("exposes provider config but masks the key", async () => {
        mockPrisma.aiApiKey.findMany.mockResolvedValueOnce([
            {
                id: "key-1",
                provider: "openai_compatible",
                capability: "text",
                baseUrl: "https://api.openai.com/v1",
                model: "gpt-4o-mini",
                label: "Primary",
                isActive: true,
                usageCount: 2,
                order: 0,
                lastUsedAt: new Date("2026-08-21T00:00:00.000Z"),
                lastError: null,
                apiKey: "sk-plaintext-should-be-masked-123",
            },
        ])

        const response = await listAiKeys()
        const body = await response.json()

        expect(response.status).toBe(200)
        expect(body.data[0]).toMatchObject({
            provider: "openai_compatible",
            baseUrl: "https://api.openai.com/v1",
            model: "gpt-4o-mini",
            capability: "text",
        })
        expect(JSON.stringify(body)).not.toContain("sk-plaintext-should-be-masked-123")
        expect(body.data[0].apiKeyMasked).toContain("•")
    })

    it("returns the guard response for non-admins", async () => {
        mockRequireAdminApi.mockResolvedValueOnce({
            ok: false,
            response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
        })

        const response = await listAiKeys()
        expect(response.status).toBe(403)
        expect(mockPrisma.aiApiKey.findMany).not.toHaveBeenCalled()
    })
})
