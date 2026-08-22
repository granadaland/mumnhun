import { NextRequest } from "next/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

const mockRequireAdminApi = vi.fn()
const mockRequireAdminMutationApi = vi.fn()
const mockDecryptStoredApiKey = vi.fn()

const mockClassifyProviderFailure = vi.fn((error: unknown) => {
    if (error instanceof Error && /HTTP 401/.test(error.message)) {
        return {
            code: "PROVIDER_KEY_INVALID",
            message: "API key provider tidak valid atau tidak memiliki izin akses",
        }
    }

    if (error && typeof error === "object" && "code" in error) {
        const code = (error as { code?: unknown }).code
        if (typeof code === "string") {
            return { code, message: "error" }
        }
    }

    return { code: "UNKNOWN_ERROR", message: "Unknown error" }
})

const mockFetch = vi.fn()
vi.stubGlobal("fetch", mockFetch)

// The SSRF guard resolves DNS before every outbound call; keep it deterministic.
vi.mock("node:dns/promises", () => ({
    lookup: vi.fn(async () => [{ address: "93.184.216.34", family: 4 }]),
}))

const mockPrisma = {
    aiApiKey: {
        findMany: vi.fn(),
        update: vi.fn(),
    },
    aiChatMessage: {
        create: vi.fn(),
        findMany: vi.fn(),
    },
}

vi.mock("@/lib/security/admin", () => ({
    requireAdminApi: mockRequireAdminApi,
    requireAdminMutationApi: mockRequireAdminMutationApi,
}))

vi.mock("@/lib/db/prisma", () => ({
    default: mockPrisma,
}))

vi.mock("@/lib/security/api-key-crypto", () => ({
    decryptStoredApiKey: mockDecryptStoredApiKey,
}))

vi.mock("@/lib/security/ai-key-status", () => ({
    classifyAiKeyFailure: mockClassifyProviderFailure,
    classifyProviderFailure: mockClassifyProviderFailure,
    formatStoredAiKeyFailure: vi.fn(({ code, message }: { code: string; message: string }) => `${code}::${message}`),
    toAiKeyFailureHttpStatus: vi.fn((failure: { code: string }) => {
        if (failure.code === "PROVIDER_KEY_INVALID") return 400
        if (failure.code === "NETWORK_TIMEOUT") return 504
        if (failure.code === "PROVIDER_RATE_LIMITED") return 429
        return 502
    }),
}))

vi.mock("@/lib/security/admin-helpers", () => ({
    summarizeUnknownError: vi.fn((error: unknown) => {
        if (error instanceof Error) return error.message
        return "Unknown error"
    }),
}))

vi.mock("@/lib/observability/admin-log", () => ({
    logAdminError: vi.fn(),
    logAdminInfo: vi.fn(),
    logAdminWarn: vi.fn(),
}))

const { POST: sendAdminChat } = await import("@/app/api/admin/chat/route")

const adminIdentity = {
    id: "admin-chat-1",
    email: "admin-chat@example.com",
    role: "ADMIN" as const,
    source: "metadata" as const,
}

function buildRequest(body: unknown) {
    return new NextRequest("http://localhost/api/admin/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
    })
}

describe("POST /api/admin/chat", () => {
    beforeEach(() => {
        vi.clearAllMocks()

        mockRequireAdminApi.mockResolvedValue({ ok: true, identity: adminIdentity })
        mockRequireAdminMutationApi.mockResolvedValue({ ok: true, identity: adminIdentity })
        mockPrisma.aiApiKey.update.mockResolvedValue({})
        mockPrisma.aiChatMessage.create.mockResolvedValue({ id: "u-1" })
        mockPrisma.aiChatMessage.findMany.mockResolvedValue([{ role: "user", content: "Halo" }])

        mockDecryptStoredApiKey.mockImplementation((value: string) => `dec:${value}`)
    })

    it("mengembalikan error terstruktur saat tidak ada key aktif", async () => {
        mockPrisma.aiApiKey.findMany.mockResolvedValueOnce([])

        const response = await sendAdminChat(buildRequest({ message: "Halo", sessionId: "session-1" }))
        const body = await response.json()

        expect(response.status).toBe(503)
        expect(body).toMatchObject({
            success: false,
            errorCode: "AI_KEY_NOT_AVAILABLE",
        })
    })

    it("meng-update lastError terstruktur + return status sesuai klasifikasi provider (Gemini)", async () => {
        mockPrisma.aiApiKey.findMany.mockResolvedValueOnce([
            {
                id: "key-1",
                provider: "gemini",
                apiKey: "enc-key-1",
                baseUrl: null,
                model: null,
                capability: "text",
                authStyle: null,
            },
        ])

        mockFetch.mockResolvedValue({
            ok: false,
            status: 401,
            text: async () => "invalid key",
        })

        const response = await sendAdminChat(
            buildRequest({ message: "Tolong ide artikel", sessionId: "session-1" })
        )
        const body = await response.json()

        expect(response.status).toBe(400)
        expect(body).toMatchObject({
            success: false,
            errorCode: "PROVIDER_KEY_INVALID",
        })

        expect(mockPrisma.aiApiKey.update).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { id: "key-1" },
                data: expect.objectContaining({
                    lastError: expect.stringContaining("PROVIDER_KEY_INVALID::"),
                }),
            })
        )
    })

    it("menggunakan custom OpenAI-compatible provider dan menyimpan balasan", async () => {
        mockPrisma.aiApiKey.findMany.mockResolvedValueOnce([
            {
                id: "key-custom",
                provider: "openai_compatible",
                apiKey: "enc-custom",
                baseUrl: "https://ai.example.com/v1",
                model: "moonshotai/Kimi-K2.6",
                capability: "text",
                authStyle: "bearer",
            },
        ])

        mockFetch.mockResolvedValueOnce({
            ok: true,
            status: 200,
            headers: new Headers({ "content-type": "application/json" }),
            json: async () => ({
                choices: [{ message: { content: "Tentu, ini beberapa ide artikel." } }],
            }),
            text: async () => "",
        })

        mockPrisma.aiChatMessage.create
            .mockResolvedValueOnce({ id: "u-2" })
            .mockResolvedValueOnce({
                id: "a-2",
                role: "assistant",
                content: "Tentu, ini beberapa ide artikel.",
                createdAt: new Date("2026-08-22T00:00:00.000Z"),
            })

        const response = await sendAdminChat(
            buildRequest({ message: "Beri ide artikel", sessionId: "session-2" })
        )
        const body = await response.json()

        expect(response.status).toBe(200)
        expect(body.data.content).toBe("Tentu, ini beberapa ide artikel.")

        // The custom provider must be called at its own chat/completions endpoint.
        const calledUrl = String(mockFetch.mock.calls[0][0])
        expect(calledUrl).toContain("https://ai.example.com/v1/chat/completions")
        expect(calledUrl).not.toContain("generativelanguage.googleapis.com")

        const headers = new Headers(mockFetch.mock.calls[0][1]?.headers)
        expect(headers.get("authorization")).toBe("Bearer dec:enc-custom")
    })
})
