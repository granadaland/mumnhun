import { NextRequest, NextResponse } from "next/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

/**
 * Content audit route: verifies the safety rails around AI-produced link suggestions and
 * the mapping of day offsets onto real calendar dates.
 */

const mockRequireAdminApi = vi.fn()
const mockRequireAdminMutationApi = vi.fn()
const mockGenerateRoleJson = vi.fn()

class FakeRoleModelNotConfiguredError extends Error {
    role: string

    constructor(role: string) {
        super(`Model AI untuk role "${role}" belum dikonfigurasi atau tidak aktif.`)
        this.name = "RoleModelNotConfiguredError"
        this.role = role
    }
}

const mockPrisma = {
    post: { findMany: vi.fn() },
    category: { findMany: vi.fn() },
    contentAudit: { create: vi.fn(), update: vi.fn(), findFirst: vi.fn() },
    contentIdea: { createMany: vi.fn() },
    internalLinkSuggestion: { createMany: vi.fn() },
}

vi.mock("@/lib/db/prisma", () => ({ default: mockPrisma }))

vi.mock("@/lib/security/admin", () => ({
    requireAdminApi: mockRequireAdminApi,
    requireAdminMutationApi: mockRequireAdminMutationApi,
}))

vi.mock("@/lib/ai/task-models", () => ({
    generateRoleJson: mockGenerateRoleJson,
    RoleModelNotConfiguredError: FakeRoleModelNotConfiguredError,
}))

vi.mock("@/lib/observability/admin-log", () => ({
    logAdminError: vi.fn(),
    logAdminInfo: vi.fn(),
    logAdminWarn: vi.fn(),
}))

vi.mock("@/lib/security/ai-key-status", () => ({
    classifyProviderFailure: vi.fn(() => ({ code: "UNKNOWN_ERROR", message: "error" })),
    sanitizeAiKeyErrorMessage: vi.fn((message: string) => message),
    toAiKeyFailureHttpStatus: vi.fn(() => 502),
}))

const adminIdentity = {
    id: "admin-1",
    email: "admin@example.com",
    role: "ADMIN" as const,
    source: "database" as const,
}

const { POST: runAudit } = await import("@/app/api/admin/ai/audit/route")

function buildRequest(body: unknown) {
    return new NextRequest("http://localhost/api/admin/ai/audit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
    })
}

const SOURCE_CONTENT = "<p>Mums bisa menyimpan ASI perah di freezer khusus supaya lebih awet.</p>"

describe("POST /api/admin/ai/audit", () => {
    beforeEach(() => {
        vi.clearAllMocks()

        mockRequireAdminApi.mockResolvedValue({ ok: true, identity: adminIdentity })
        mockRequireAdminMutationApi.mockResolvedValue({ ok: true, identity: adminIdentity })

        mockPrisma.post.findMany.mockResolvedValue([
            {
                id: "post-a",
                slug: "menyimpan-asi-perah",
                title: "Menyimpan ASI Perah",
                content: SOURCE_CONTENT,
                excerpt: "Cara menyimpan ASI",
                focusKeyword: "menyimpan asi perah",
                categories: [{ category: { slug: "asi" } }],
            },
            {
                id: "post-b",
                slug: "sewa-freezer-asi",
                title: "Sewa Freezer ASI",
                content: "<p>Layanan sewa freezer ASI di Jabodetabek.</p>",
                excerpt: null,
                focusKeyword: "sewa freezer asi",
                categories: [],
            },
        ])

        mockPrisma.category.findMany.mockResolvedValue([{ slug: "asi", name: "ASI" }])
        mockPrisma.contentAudit.create.mockResolvedValue({ id: "audit-1" })
        mockPrisma.contentAudit.update.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
            id: "audit-1",
            status: data.status,
            scannedPosts: 2,
            ideaCount: data.ideaCount ?? 0,
            linkCount: data.linkCount ?? 0,
            gapSummary: data.gapSummary ?? null,
        }))
        mockPrisma.contentIdea.createMany.mockResolvedValue({ count: 1 })
        mockPrisma.internalLinkSuggestion.createMany.mockResolvedValue({ count: 1 })
    })

    it("rejects the run when no published posts exist", async () => {
        mockPrisma.post.findMany.mockResolvedValueOnce([])

        const response = await runAudit(buildRequest({}))

        expect(response.status).toBe(400)
        await expect(response.json()).resolves.toMatchObject({ errorCode: "CONTENT_AUDIT_NO_POSTS" })
        expect(mockGenerateRoleJson).not.toHaveBeenCalled()
    })

    it("runs on the scanning role, never the text role", async () => {
        mockGenerateRoleJson.mockResolvedValueOnce({
            value: { gapSummary: "Ada celah pada topik MPASI dan pumping di kantor.", ideas: [], linkSuggestions: [] },
            roleModelId: "role-scan",
        })

        await runAudit(buildRequest({ ideaCount: 5 }))

        expect(mockGenerateRoleJson).toHaveBeenCalledTimes(1)
        expect(mockGenerateRoleJson.mock.calls[0][0]).toBe("scanning")
    })

    it("maps dayOffset onto real dates from the requested start date", async () => {
        mockGenerateRoleJson.mockResolvedValueOnce({
            value: {
                gapSummary: "Topik pumping di kantor belum tergarap sama sekali.",
                ideas: [
                    {
                        title: "Cara Pumping Nyaman di Kantor",
                        angle: null,
                        focusKeyword: "pumping di kantor",
                        secondaryKeywords: ["jadwal pumping"],
                        categorySlug: "asi",
                        rationale: "Belum ada artikel tentang ini",
                        dayOffset: 3,
                    },
                ],
                linkSuggestions: [],
            },
            roleModelId: "role-scan",
        })

        await runAudit(buildRequest({ ideaCount: 5, startDate: "2026-09-01", publishHour: 9 }))

        const createArg = mockPrisma.contentIdea.createMany.mock.calls[0][0]
        const scheduled = createArg.data[0].scheduledFor as Date

        // Day offset 3 from Sept 1 lands on Sept 3.
        expect(scheduled.getDate()).toBe(3)
        expect(scheduled.getMonth()).toBe(8)
        expect(scheduled.getHours()).toBe(9)
    })

    it("nulls a hallucinated category instead of inventing one", async () => {
        mockGenerateRoleJson.mockResolvedValueOnce({
            value: {
                gapSummary: "Ringkasan gap konten yang cukup panjang untuk lolos validasi.",
                ideas: [
                    {
                        title: "Topik Baru Yang Menarik",
                        angle: null,
                        focusKeyword: "topik baru",
                        secondaryKeywords: [],
                        categorySlug: "kategori-tidak-ada",
                        rationale: null,
                        dayOffset: 1,
                    },
                ],
                linkSuggestions: [],
            },
            roleModelId: "role-scan",
        })

        await runAudit(buildRequest({ ideaCount: 5 }))

        const createArg = mockPrisma.contentIdea.createMany.mock.calls[0][0]
        expect(createArg.data[0].categorySlug).toBeNull()
    })

    it("discards a link suggestion whose phrase is absent from the source article", async () => {
        mockGenerateRoleJson.mockResolvedValueOnce({
            value: {
                gapSummary: "Ringkasan gap konten yang cukup panjang untuk lolos validasi.",
                ideas: [],
                linkSuggestions: [
                    {
                        sourceSlug: "menyimpan-asi-perah",
                        targetSlug: "sewa-freezer-asi",
                        exactPhrase: "frasa yang tidak pernah ada di artikel",
                        rationale: null,
                    },
                ],
            },
            roleModelId: "role-scan",
        })

        const response = await runAudit(buildRequest({ ideaCount: 5 }))

        expect(mockPrisma.internalLinkSuggestion.createMany).not.toHaveBeenCalled()
        await expect(response.json()).resolves.toMatchObject({
            data: { discardedLinkSuggestions: 1 },
        })
    })

    it("keeps a link suggestion whose phrase really occurs in the source", async () => {
        mockGenerateRoleJson.mockResolvedValueOnce({
            value: {
                gapSummary: "Ringkasan gap konten yang cukup panjang untuk lolos validasi.",
                ideas: [],
                linkSuggestions: [
                    {
                        sourceSlug: "menyimpan-asi-perah",
                        targetSlug: "sewa-freezer-asi",
                        exactPhrase: "freezer khusus",
                        rationale: "Relevan dengan layanan sewa",
                    },
                ],
            },
            roleModelId: "role-scan",
        })

        await runAudit(buildRequest({ ideaCount: 5 }))

        const createArg = mockPrisma.internalLinkSuggestion.createMany.mock.calls[0][0]
        expect(createArg.data).toHaveLength(1)
        expect(createArg.data[0]).toMatchObject({
            sourcePostId: "post-a",
            targetPostId: "post-b",
            exactPhrase: "freezer khusus",
            status: "pending",
        })
        expect(createArg.data[0].replacementHtml).toContain("<a href=")
        expect(createArg.data[0].replacementHtml).toContain("freezer khusus")
    })

    it("drops a self-referencing suggestion", async () => {
        mockGenerateRoleJson.mockResolvedValueOnce({
            value: {
                gapSummary: "Ringkasan gap konten yang cukup panjang untuk lolos validasi.",
                ideas: [],
                linkSuggestions: [
                    {
                        sourceSlug: "menyimpan-asi-perah",
                        targetSlug: "menyimpan-asi-perah",
                        exactPhrase: "freezer khusus",
                        rationale: null,
                    },
                ],
            },
            roleModelId: "role-scan",
        })

        await runAudit(buildRequest({ ideaCount: 5 }))

        expect(mockPrisma.internalLinkSuggestion.createMany).not.toHaveBeenCalled()
    })

    it("marks the audit failed and returns a role-config error when the model is missing", async () => {
        mockGenerateRoleJson.mockRejectedValueOnce(new FakeRoleModelNotConfiguredError("scanning"))

        const response = await runAudit(buildRequest({ ideaCount: 5 }))

        expect(response.status).toBe(400)
        await expect(response.json()).resolves.toMatchObject({ errorCode: "AI_ROLE_NOT_CONFIGURED" })
        expect(mockPrisma.contentAudit.update).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { id: "audit-1" },
                data: expect.objectContaining({ status: "failed" }),
            })
        )
    })
})

describe("guard behaviour", () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it("returns the guard response for non-admins", async () => {
        mockRequireAdminMutationApi.mockResolvedValueOnce({
            ok: false,
            response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
        })

        const response = await runAudit(buildRequest({}))

        expect(response.status).toBe(403)
        expect(mockPrisma.post.findMany).not.toHaveBeenCalled()
    })
})
