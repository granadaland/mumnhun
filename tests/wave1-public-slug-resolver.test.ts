import { beforeEach, describe, expect, it, vi } from "vitest"

const mockPrisma = {
    post: {
        findFirst: vi.fn(),
    },
    page: {
        findFirst: vi.fn(),
    },
}

vi.mock("@/lib/db/prisma", () => ({
    default: mockPrisma,
}))

const { resolvePublicSlug } = await import("@/lib/db/queries")

describe("Wave 1 public slug resolver contract", () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it("prioritas deterministik: Post dipilih lebih dulu walau Page juga ada", async () => {
        mockPrisma.post.findFirst.mockResolvedValueOnce({
            id: "post-1",
            slug: "slug-sama",
            title: "Post Prioritas",
            content: "isi",
            excerpt: "ringkas",
            featuredImage: null,
            status: "PUBLISHED",
            publishedAt: new Date("2026-01-01T00:00:00.000Z"),
            updatedAt: new Date("2026-01-02T00:00:00.000Z"),
            readingTime: 3,
            metaTitle: null,
            metaDescription: null,
            focusKeyword: null,
            canonicalUrl: null,
            ogImage: null,
            author: { name: "Admin" },
            categories: [],
            tags: [],
        })
        mockPrisma.page.findFirst.mockResolvedValueOnce({
            id: "page-1",
            slug: "slug-sama",
            title: "Page Konflik",
            content: "isi page",
            status: "PUBLISHED",
            publishedAt: new Date("2026-01-01T00:00:00.000Z"),
            updatedAt: new Date("2026-01-02T00:00:00.000Z"),
            metaTitle: null,
            metaDescription: null,
            canonicalUrl: null,
            ogImage: null,
            ogTitle: null,
            ogDescription: null,
        })

        const resolved = await resolvePublicSlug("slug-sama")

        expect(resolved).not.toBeNull()
        expect(resolved).toMatchObject({
            kind: "post",
            post: { id: "post-1", slug: "slug-sama" },
        })
        expect(mockPrisma.post.findFirst).toHaveBeenCalledWith(
            expect.objectContaining({
                where: expect.objectContaining({ slug: "slug-sama", status: "PUBLISHED" }),
            })
        )
        expect(mockPrisma.page.findFirst).toHaveBeenCalledWith(
            expect.objectContaining({
                where: expect.objectContaining({ slug: "slug-sama", status: "PUBLISHED" }),
            })
        )
    })

    it("fallback ke Page ketika Post tidak ditemukan", async () => {
        mockPrisma.post.findFirst.mockResolvedValueOnce(null)
        mockPrisma.page.findFirst.mockResolvedValueOnce({
            id: "page-2",
            slug: "tentang-kami",
            title: "Tentang Kami",
            content: "isi page",
            status: "PUBLISHED",
            publishedAt: new Date("2026-01-03T00:00:00.000Z"),
            updatedAt: new Date("2026-01-04T00:00:00.000Z"),
            metaTitle: "Tentang",
            metaDescription: "Deskripsi",
            canonicalUrl: null,
            ogImage: null,
            ogTitle: null,
            ogDescription: null,
        })

        const resolved = await resolvePublicSlug("tentang-kami")

        expect(resolved).toMatchObject({
            kind: "page",
            page: { id: "page-2", slug: "tentang-kami" },
        })
    })

    it("slug unresolved mengembalikan null (kontrak untuk not-found behavior)", async () => {
        mockPrisma.post.findFirst.mockResolvedValueOnce(null)
        mockPrisma.page.findFirst.mockResolvedValueOnce(null)

        const resolved = await resolvePublicSlug("slug-tidak-ada")

        expect(resolved).toBeNull()
    })
})
