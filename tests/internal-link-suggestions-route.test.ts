import { NextRequest, NextResponse } from "next/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

/**
 * Internal link application: rewriting live article HTML is the riskiest write in this
 * feature, so re-verification and grouping behaviour are pinned here.
 */

const mockRequireAdminApi = vi.fn()
const mockRequireAdminMutationApi = vi.fn()
const mockRevalidatePath = vi.fn()

const mockPrisma = {
    internalLinkSuggestion: { findMany: vi.fn(), updateMany: vi.fn() },
    post: { update: vi.fn() },
}

vi.mock("@/lib/db/prisma", () => ({ default: mockPrisma }))

vi.mock("next/cache", () => ({ revalidatePath: mockRevalidatePath }))

vi.mock("@/lib/security/admin", () => ({
    requireAdminApi: mockRequireAdminApi,
    requireAdminMutationApi: mockRequireAdminMutationApi,
}))

vi.mock("@/lib/observability/admin-log", () => ({
    logAdminError: vi.fn(),
    logAdminInfo: vi.fn(),
    logAdminWarn: vi.fn(),
}))

const adminIdentity = {
    id: "admin-1",
    email: "admin@example.com",
    role: "ADMIN" as const,
    source: "database" as const,
}

const { POST: applyLinks } = await import("@/app/api/admin/internal-link-suggestions/route")

function buildRequest(body: unknown) {
    return new NextRequest("http://localhost/api/admin/internal-link-suggestions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
    })
}

describe("POST /api/admin/internal-link-suggestions", () => {
    beforeEach(() => {
        vi.clearAllMocks()
        mockRequireAdminApi.mockResolvedValue({ ok: true, identity: adminIdentity })
        mockRequireAdminMutationApi.mockResolvedValue({ ok: true, identity: adminIdentity })
        mockPrisma.post.update.mockResolvedValue({ id: "post-a" })
        mockPrisma.internalLinkSuggestion.updateMany.mockResolvedValue({ count: 1 })
    })

    it("applies a suggestion and rewrites the source article", async () => {
        mockPrisma.internalLinkSuggestion.findMany.mockResolvedValueOnce([
            {
                id: "sug-1",
                sourcePostId: "post-a",
                exactPhrase: "freezer khusus",
                replacementHtml: '<a href="https://mumnhun.id/sewa-freezer-asi">freezer khusus</a>',
                sourcePost: {
                    id: "post-a",
                    slug: "menyimpan-asi",
                    status: "PUBLISHED",
                    content: "<p>Simpan ASI di freezer khusus agar awet.</p>",
                },
            },
        ])

        const response = await applyLinks(buildRequest({ ids: ["sug-1"], action: "apply" }))

        expect(response.status).toBe(200)
        await expect(response.json()).resolves.toMatchObject({ data: { applied: 1 } })

        const updateArg = mockPrisma.post.update.mock.calls[0][0]
        expect(updateArg.where).toEqual({ id: "post-a" })
        expect(updateArg.data.content).toContain('<a href="https://mumnhun.id/sewa-freezer-asi">freezer khusus</a>')

        expect(mockPrisma.internalLinkSuggestion.updateMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { id: { in: ["sug-1"] } },
                data: expect.objectContaining({ status: "applied" }),
            })
        )
        expect(mockRevalidatePath).toHaveBeenCalledWith("/menyimpan-asi")
    })

    it("skips a suggestion whose phrase no longer exists in the article", async () => {
        mockPrisma.internalLinkSuggestion.findMany.mockResolvedValueOnce([
            {
                id: "sug-stale",
                sourcePostId: "post-a",
                exactPhrase: "frasa lama yang sudah dihapus",
                replacementHtml: '<a href="https://mumnhun.id/x">frasa lama yang sudah dihapus</a>',
                sourcePost: {
                    id: "post-a",
                    slug: "menyimpan-asi",
                    status: "PUBLISHED",
                    content: "<p>Artikel ini sudah diedit total.</p>",
                },
            },
        ])

        const response = await applyLinks(buildRequest({ ids: ["sug-stale"], action: "apply" }))

        const body = await response.json()
        expect(body.data.applied).toBe(0)
        expect(body.data.skipped).toHaveLength(1)
        expect(mockPrisma.post.update).not.toHaveBeenCalled()
    })

    it("groups multiple suggestions for one article into a single update", async () => {
        mockPrisma.internalLinkSuggestion.findMany.mockResolvedValueOnce([
            {
                id: "sug-1",
                sourcePostId: "post-a",
                exactPhrase: "freezer khusus",
                replacementHtml: '<a href="https://mumnhun.id/a">freezer khusus</a>',
                sourcePost: {
                    id: "post-a",
                    slug: "menyimpan-asi",
                    status: "PUBLISHED",
                    content: "<p>Gunakan freezer khusus dan kantong ASI steril.</p>",
                },
            },
            {
                id: "sug-2",
                sourcePostId: "post-a",
                exactPhrase: "kantong ASI",
                replacementHtml: '<a href="https://mumnhun.id/b">kantong ASI</a>',
                sourcePost: {
                    id: "post-a",
                    slug: "menyimpan-asi",
                    status: "PUBLISHED",
                    content: "<p>Gunakan freezer khusus dan kantong ASI steril.</p>",
                },
            },
        ])

        await applyLinks(buildRequest({ ids: ["sug-1", "sug-2"], action: "apply" }))

        expect(mockPrisma.post.update).toHaveBeenCalledTimes(1)
        const content = mockPrisma.post.update.mock.calls[0][0].data.content as string
        expect(content).toContain('href="https://mumnhun.id/a"')
        expect(content).toContain('href="https://mumnhun.id/b"')
    })

    it("does not revalidate a draft article", async () => {
        mockPrisma.internalLinkSuggestion.findMany.mockResolvedValueOnce([
            {
                id: "sug-1",
                sourcePostId: "post-draft",
                exactPhrase: "freezer khusus",
                replacementHtml: '<a href="https://mumnhun.id/a">freezer khusus</a>',
                sourcePost: {
                    id: "post-draft",
                    slug: "draft-artikel",
                    status: "DRAFT",
                    content: "<p>Simpan di freezer khusus.</p>",
                },
            },
        ])

        await applyLinks(buildRequest({ ids: ["sug-1"], action: "apply" }))

        expect(mockRevalidatePath).not.toHaveBeenCalled()
    })

    it("dismisses without touching article content", async () => {
        mockPrisma.internalLinkSuggestion.findMany.mockResolvedValueOnce([
            {
                id: "sug-1",
                sourcePostId: "post-a",
                exactPhrase: "freezer khusus",
                replacementHtml: "<a>freezer khusus</a>",
                sourcePost: { id: "post-a", slug: "s", status: "PUBLISHED", content: "<p>freezer khusus</p>" },
            },
        ])

        const response = await applyLinks(buildRequest({ ids: ["sug-1"], action: "dismiss" }))

        await expect(response.json()).resolves.toMatchObject({ data: { dismissed: 1, applied: 0 } })
        expect(mockPrisma.post.update).not.toHaveBeenCalled()
        expect(mockPrisma.internalLinkSuggestion.updateMany).toHaveBeenCalledWith({
            where: { id: { in: ["sug-1"] } },
            data: { status: "dismissed" },
        })
    })

    it("returns 404 when nothing pending matches", async () => {
        mockPrisma.internalLinkSuggestion.findMany.mockResolvedValueOnce([])

        const response = await applyLinks(buildRequest({ ids: ["missing"], action: "apply" }))

        expect(response.status).toBe(404)
        await expect(response.json()).resolves.toMatchObject({
            errorCode: "INTERNAL_LINK_NONE_PENDING",
        })
    })

    it("returns the guard response for non-admins", async () => {
        mockRequireAdminMutationApi.mockResolvedValueOnce({
            ok: false,
            response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
        })

        const response = await applyLinks(buildRequest({ ids: ["sug-1"] }))

        expect(response.status).toBe(403)
        expect(mockPrisma.internalLinkSuggestion.findMany).not.toHaveBeenCalled()
    })
})
