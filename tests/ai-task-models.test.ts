import { beforeEach, describe, expect, it, vi } from "vitest"

/**
 * Role models must never rotate: exactly one pinned credential per task role, and a
 * failure must surface rather than silently falling through to another model.
 */

const mockDecryptStoredApiKey = vi.fn((value: string) => value.replace("enc:", ""))
const mockGenerateJson = vi.fn()
const mockGenerateText = vi.fn()

const mockPrisma = {
    aiRoleModel: { findFirst: vi.fn(), update: vi.fn() },
}

vi.mock("@/lib/db/prisma", () => ({ default: mockPrisma }))

vi.mock("@/lib/security/api-key-crypto", () => ({
    decryptStoredApiKey: mockDecryptStoredApiKey,
}))

vi.mock("@/lib/security/ai-key-status", () => ({
    classifyProviderFailure: vi.fn(() => ({ code: "PROVIDER_KEY_INVALID", message: "invalid" })),
    formatStoredAiKeyFailure: vi.fn(({ code, message }: { code: string; message: string }) => `${code}::${message}`),
}))

vi.mock("@/lib/ai/provider", () => ({
    AI_PROVIDER_OPENAI_COMPATIBLE: "openai_compatible",
    generateJson: mockGenerateJson,
    generateText: mockGenerateText,
}))

vi.mock("@/lib/ai/openai-compatible", () => ({
    isAuthStyle: (value: unknown) =>
        typeof value === "string" && ["bearer", "raw", "x-api-key"].includes(value),
}))

const {
    AI_ROLES,
    RoleModelNotConfiguredError,
    generateRoleJson,
    generateRoleText,
    resolveImageRoleModel,
    runWithRoleModel,
} = await import("@/lib/ai/task-models")

describe("AI role models", () => {
    beforeEach(() => {
        vi.clearAllMocks()
        mockPrisma.aiRoleModel.update.mockResolvedValue({})
    })

    it("exposes exactly three roles", () => {
        expect(AI_ROLES).toEqual(["scanning", "text", "image"])
    })

    it("loads only the active credential for the requested role", async () => {
        mockPrisma.aiRoleModel.findFirst.mockResolvedValueOnce({
            id: "role-text",
            role: "text",
            provider: "openai_compatible",
            apiKey: "enc:sk-secret",
            baseUrl: "https://api.example.com/v1",
            model: "gpt-4o-mini",
            authStyle: "bearer",
        })

        await runWithRoleModel("text", async () => ({ value: "ok" }))

        expect(mockPrisma.aiRoleModel.findFirst).toHaveBeenCalledWith(
            expect.objectContaining({ where: { role: "text", isActive: true } })
        )
    })

    it("throws RoleModelNotConfiguredError instead of falling back to another role", async () => {
        mockPrisma.aiRoleModel.findFirst.mockResolvedValueOnce(null)

        await expect(runWithRoleModel("scanning", async () => ({ value: 1 }))).rejects.toThrow(
            RoleModelNotConfiguredError
        )

        // No second lookup: there is deliberately no cross-role fallback.
        expect(mockPrisma.aiRoleModel.findFirst).toHaveBeenCalledTimes(1)
    })

    it("records success with usage increment and clears lastError", async () => {
        mockPrisma.aiRoleModel.findFirst.mockResolvedValueOnce({
            id: "role-text",
            role: "text",
            provider: "openai_compatible",
            apiKey: "enc:sk-secret",
            baseUrl: "https://api.example.com/v1",
            model: "gpt-4o-mini",
            authStyle: null,
        })

        await runWithRoleModel("text", async () => ({ value: "ok", authStyle: "x-api-key" as const }))

        const updateArg = mockPrisma.aiRoleModel.update.mock.calls[0][0]
        expect(updateArg.where).toEqual({ id: "role-text" })
        expect(updateArg.data).toMatchObject({
            usageCount: { increment: 1 },
            lastError: null,
            // A newly discovered auth style is cached so later calls skip probing.
            authStyle: "x-api-key",
        })
    })

    it("records the failure and rethrows so the caller can report it", async () => {
        mockPrisma.aiRoleModel.findFirst.mockResolvedValueOnce({
            id: "role-scan",
            role: "scanning",
            provider: "openai_compatible",
            apiKey: "enc:sk-secret",
            baseUrl: "https://api.example.com/v1",
            model: "gpt-4o-mini",
            authStyle: "bearer",
        })

        const boom = new Error("provider rejected")
        await expect(runWithRoleModel("scanning", async () => { throw boom })).rejects.toThrow(boom)

        const updateArg = mockPrisma.aiRoleModel.update.mock.calls[0][0]
        expect(updateArg.data.lastError).toContain("PROVIDER_KEY_INVALID::")
        expect(updateArg.data).not.toHaveProperty("usageCount")
    })

    it("decrypts the stored key before handing it to the provider", async () => {
        mockPrisma.aiRoleModel.findFirst.mockResolvedValueOnce({
            id: "role-text",
            role: "text",
            provider: "openai_compatible",
            apiKey: "enc:sk-plain-value",
            baseUrl: "https://api.example.com/v1",
            model: "gpt-4o-mini",
            authStyle: "bearer",
        })

        let seenApiKey: string | null = null
        await runWithRoleModel("text", async (provider) => {
            seenApiKey = provider.apiKey
            return { value: null }
        })

        expect(seenApiKey).toBe("sk-plain-value")
    })

    it("generateRoleJson delegates to generateJson with jsonMode handled upstream", async () => {
        mockPrisma.aiRoleModel.findFirst.mockResolvedValueOnce({
            id: "role-text",
            role: "text",
            provider: "openai_compatible",
            apiKey: "enc:sk",
            baseUrl: "https://api.example.com/v1",
            model: "gpt-4o-mini",
            authStyle: "bearer",
        })
        mockGenerateJson.mockResolvedValueOnce({ data: { ok: true }, authStyle: "bearer" })

        const result = await generateRoleJson("text", { prompt: "hi" }, {} as never)

        expect(result.value).toEqual({ ok: true })
        expect(result.roleModelId).toBe("role-text")
        expect(mockGenerateJson).toHaveBeenCalledTimes(1)
    })

    it("generateRoleText returns the raw text", async () => {
        mockPrisma.aiRoleModel.findFirst.mockResolvedValueOnce({
            id: "role-text",
            role: "text",
            provider: "gemini",
            apiKey: "enc:AIza",
            baseUrl: null,
            model: null,
            authStyle: null,
        })
        mockGenerateText.mockResolvedValueOnce({ text: "hasil", model: "gemini-2.5-flash" })

        const result = await generateRoleText("text", { prompt: "hi" })

        expect(result.value).toBe("hasil")
    })

    describe("resolveImageRoleModel", () => {
        it("returns null when the image role is not configured", async () => {
            mockPrisma.aiRoleModel.findFirst.mockResolvedValueOnce(null)
            await expect(resolveImageRoleModel()).resolves.toBeNull()
        })

        it("rejects a Gemini credential because it has no images endpoint", async () => {
            mockPrisma.aiRoleModel.findFirst.mockResolvedValueOnce({
                id: "role-image",
                role: "image",
                provider: "gemini",
                apiKey: "enc:AIza",
                baseUrl: null,
                model: null,
                authStyle: null,
            })

            await expect(resolveImageRoleModel()).resolves.toBeNull()
        })

        it("rejects a credential missing baseUrl or model", async () => {
            mockPrisma.aiRoleModel.findFirst.mockResolvedValueOnce({
                id: "role-image",
                role: "image",
                provider: "openai_compatible",
                apiKey: "enc:sk",
                baseUrl: "https://api.example.com/v1",
                model: "   ",
                authStyle: null,
            })

            await expect(resolveImageRoleModel()).resolves.toBeNull()
        })

        it("returns a decrypted, fully configured image credential", async () => {
            mockPrisma.aiRoleModel.findFirst.mockResolvedValueOnce({
                id: "role-image",
                role: "image",
                provider: "openai_compatible",
                apiKey: "enc:sk-image",
                baseUrl: "https://api.example.com/v1",
                model: "gpt-image-1",
                authStyle: "bearer",
            })

            await expect(resolveImageRoleModel()).resolves.toEqual({
                roleModelId: "role-image",
                apiKey: "sk-image",
                baseUrl: "https://api.example.com/v1",
                model: "gpt-image-1",
                authStyle: "bearer",
            })
        })
    })
})
