import { beforeEach, describe, expect, it, vi } from "vitest"

/**
 * Scheduled publisher: the piece that finally makes SCHEDULED posts go live.
 *
 * The publish-readiness gate is exercised for real (not mocked) so a regression that lets
 * thin content auto-publish would fail here.
 */

const mockPrisma = {
    post: {
        findMany: vi.fn(),
        updateMany: vi.fn(),
    },
    contentIdea: {
        updateMany: vi.fn(),
    },
}

vi.mock("@/lib/db/prisma", () => ({ default: mockPrisma }))

const { publishDueScheduledPosts } = await import("@/lib/content/scheduled-publisher")

const LONG_BODY = `<p>${"kata ".repeat(200)}</p>`

function buildPost(overrides: Partial<Record<string, unknown>> = {}) {
    return {
        id: "post-1",
        slug: "artikel-satu",
        title: "Panduan Menyimpan ASI Perah",
        content: LONG_BODY,
        excerpt: "Ringkasan yang cukup panjang untuk lolos gate publish.",
        metaDescription: null,
        ...overrides,
    }
}

describe("publishDueScheduledPosts", () => {
    beforeEach(() => {
        vi.clearAllMocks()
        mockPrisma.post.updateMany.mockResolvedValue({ count: 1 })
        mockPrisma.contentIdea.updateMany.mockResolvedValue({ count: 0 })
    })

    it("queries only SCHEDULED posts whose scheduledAt has passed", async () => {
        mockPrisma.post.findMany.mockResolvedValueOnce([])

        const now = new Date("2026-08-22T10:00:00.000Z")
        await publishDueScheduledPosts(now)

        expect(mockPrisma.post.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { status: "SCHEDULED", scheduledAt: { not: null, lte: now } },
            })
        )
    })

    it("publishes a due post and clears its schedule", async () => {
        mockPrisma.post.findMany.mockResolvedValueOnce([buildPost()])

        const now = new Date("2026-08-22T10:00:00.000Z")
        const result = await publishDueScheduledPosts(now)

        expect(result.published).toEqual([{ id: "post-1", slug: "artikel-satu" }])
        expect(result.skipped).toEqual([])
        expect(mockPrisma.post.updateMany).toHaveBeenCalledWith({
            where: { id: "post-1", status: "SCHEDULED" },
            data: { status: "PUBLISHED", publishedAt: now, scheduledAt: null },
        })
    })

    it("guards the transition on status so a concurrent run cannot double-publish", async () => {
        mockPrisma.post.findMany.mockResolvedValueOnce([buildPost()])
        // Another worker already flipped it: updateMany matches zero rows.
        mockPrisma.post.updateMany.mockResolvedValueOnce({ count: 0 })

        const result = await publishDueScheduledPosts(new Date())

        expect(result.published).toEqual([])
        expect(mockPrisma.contentIdea.updateMany).not.toHaveBeenCalled()
    })

    it("refuses to publish content that fails the readiness gate", async () => {
        mockPrisma.post.findMany.mockResolvedValueOnce([
            buildPost({ id: "thin", slug: "thin", content: "<p>terlalu pendek</p>" }),
        ])

        const result = await publishDueScheduledPosts(new Date())

        expect(result.published).toEqual([])
        expect(result.skipped).toHaveLength(1)
        expect(result.skipped[0].reason).toContain("120 kata")
        expect(mockPrisma.post.updateMany).not.toHaveBeenCalled()
    })

    it("requires a title of at least 10 characters", async () => {
        mockPrisma.post.findMany.mockResolvedValueOnce([buildPost({ title: "Pendek" })])

        const result = await publishDueScheduledPosts(new Date())

        expect(result.published).toEqual([])
        expect(result.skipped[0].reason).toContain("Judul minimal 10 karakter")
    })

    it("requires an excerpt or metaDescription", async () => {
        mockPrisma.post.findMany.mockResolvedValueOnce([
            buildPost({ excerpt: null, metaDescription: null }),
        ])

        const result = await publishDueScheduledPosts(new Date())

        expect(result.published).toEqual([])
        expect(result.skipped[0].reason).toContain("Excerpt atau metaDescription")
    })

    it("accepts metaDescription as the summary when excerpt is empty", async () => {
        mockPrisma.post.findMany.mockResolvedValueOnce([
            buildPost({ excerpt: null, metaDescription: "Deskripsi meta yang memadai." }),
        ])

        const result = await publishDueScheduledPosts(new Date())

        expect(result.published).toHaveLength(1)
    })

    it("marks the originating content idea as published", async () => {
        mockPrisma.post.findMany.mockResolvedValueOnce([buildPost()])

        await publishDueScheduledPosts(new Date())

        expect(mockPrisma.contentIdea.updateMany).toHaveBeenCalledWith({
            where: { postId: "post-1" },
            data: { status: "published" },
        })
    })

    it("keeps publishing the rest of the batch when one post is skipped", async () => {
        mockPrisma.post.findMany.mockResolvedValueOnce([
            buildPost({ id: "bad", slug: "bad", content: "<p>pendek</p>" }),
            buildPost({ id: "good", slug: "good" }),
        ])

        const result = await publishDueScheduledPosts(new Date())

        expect(result.checked).toBe(2)
        expect(result.published).toEqual([{ id: "good", slug: "good" }])
        expect(result.skipped.map((entry) => entry.id)).toEqual(["bad"])
    })
})
