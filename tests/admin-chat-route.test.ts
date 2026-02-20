import { NextRequest } from "next/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

const mockRequireAdminApi = vi.fn()
const mockRequireAdminMutationApi = vi.fn()
const mockDecryptStoredApiKey = vi.fn()

const mockClassifyAiKeyFailure = vi.fn((error: unknown) => {
    if (error instanceof Error && /Gemini HTTP 401/.test(error.message)) {
        return {
            code: "PROVIDER_KEY_INVALID",
            message: "API key Gemini tidak valid atau tidak memiliki izin akses",
        }
    }

    if (error && typeof error === "object" && "code" in error) {
        const code = (error as { code?: unknown }).code
        if (typeof code === "string") {
            return { code, message: "error" }
        }
    }

    return {
        code: "UNKNOWN_ERROR",
        message: "Unknown error",
    }
})

const mockFetch = vi.fn()
vi.stubGlobal("fetch", mockFetch)

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
    classifyAiKeyFailure: mockClassifyAiKeyFailure,
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

describe("POST /api/admin/chat", () => {
    beforeEach(() => {
        vi.clearAllMocks()

        mockRequireAdminApi.mockResolvedValue({ ok: true, identity: adminIdentity })
        mockRequireAdminMutationApi.mockResolvedValue({ ok: true, identity: adminIdentity })
        mockPrisma.aiApiKey.update.mockResolvedValue({})

        mockDecryptStoredApiKey.mockImplementation((value: string) => `dec:${value}`)
    })

    it("mengembalikan error terstruktur saat tidak ada key aktif", async () => {
        mockPrisma.aiApiKey.findMany.mockResolvedValueOnce([])

        const request = new NextRequest("http://localhost/api/admin/chat", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ message: "Halo", sessionId: "session-1" }),
        })

        const response = await sendAdminChat(request)
        const body = await response.json()

        expect(response.status).toBe(503)
        expect(body).toMatchObject({
            success: false,
            errorCode: "AI_KEY_NOT_AVAILABLE",
        })
    })

    it("meng-update lastError terstruktur + return status sesuai klasifikasi provider", async () => {
        mockPrisma.aiApiKey.findMany.mockResolvedValueOnce([
            {
                id: "key-1",
                apiKey: "enc-key-1",
                isActive: true,
                usageCount: 0,
                order: 0,
            },
        ])

        mockPrisma.aiChatMessage.create.mockResolvedValueOnce({ id: "u-1" })
        mockPrisma.aiChatMessage.findMany.mockResolvedValueOnce([
            {
                role: "user",
                content: "Tolong ide artikel",
            },
        ])

        mockFetch.mockResolvedValueOnce({
            ok: false,
            status: 401,
            text: async () => "invalid key",
        })

        const request = new NextRequest("http://localhost/api/admin/chat", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ message: "Tolong ide artikel", sessionId: "session-1" }),
        })

        const response = await sendAdminChat(request)
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
})
