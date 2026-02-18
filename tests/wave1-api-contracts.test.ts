import { NextRequest } from "next/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

const mockRequireAdminMutationApi = vi.fn()

const mockPrisma = {
    $transaction: vi.fn(),
    post: {
        findFirst: vi.fn(),
        update: vi.fn(),
    },
    page: {
        findUnique: vi.fn(),
        create: vi.fn(),
    },
}

vi.mock("@/lib/security/admin", () => ({
    requireAdminApi: vi.fn(),
    requireAdminMutationApi: mockRequireAdminMutationApi,
}))

vi.mock("@/lib/db/prisma", () => ({
    default: mockPrisma,
}))

vi.mock("@/lib/observability/admin-log", () => ({
    logAdminError: vi.fn(),
    logAdminInfo: vi.fn(),
    logAdminWarn: vi.fn(),
}))

const adminIdentity = {
    id: "admin-qa-1",
    email: "qa-admin@example.com",
    role: "ADMIN" as const,
    source: "metadata" as const,
}

const { PUT: updatePost } = await import("@/app/api/admin/posts/[id]/route")
const { POST: createPage } = await import("@/app/api/admin/pages/route")

describe("Wave 1 API contract: Post/Page parity fields + date/status validation", () => {
    beforeEach(() => {
        vi.clearAllMocks()
        mockPrisma.$transaction.mockImplementation(async (callback: (tx: unknown) => unknown) =>
            callback({
                post: { update: mockPrisma.post.update },
                categoriesOnPosts: {
                    deleteMany: vi.fn(),
                    createMany: vi.fn(),
                },
                tagsOnPosts: {
                    deleteMany: vi.fn(),
                    createMany: vi.fn(),
                },
            })
        )
    })

    describe("PUT /api/admin/posts/[id]", () => {
        it("menerima field parity penting dan memproses scheduled publish dengan benar", async () => {
            mockRequireAdminMutationApi.mockResolvedValueOnce({
                ok: true,
                identity: adminIdentity,
            })
            mockPrisma.post.findFirst.mockResolvedValueOnce(null)
            mockPrisma.post.update.mockResolvedValueOnce({
                id: "post-1",
                status: "SCHEDULED",
                categories: [],
                tags: [],
            })

            const scheduledAt = "2026-12-20T10:00:00.000Z"

            const request = new NextRequest("http://localhost/api/admin/posts/post-1", {
                method: "PUT",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({
                    status: "SCHEDULED",
                    scheduledAt,
                    focusKeywords: "seo wave 1, parity",
                    ogTitle: "OG Judul Post",
                    ogDescription: "OG Deskripsi Post",
                    schemaType: "Article",
                    schemaData: '{"@context":"https://schema.org","@type":"Article"}',
                }),
            })

            const response = await updatePost(request, {
                params: Promise.resolve({ id: "post-1" }),
            })
            const body = await response.json()

            expect(response.status).toBe(200)
            expect(body).toMatchObject({ success: true })
            expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1)
            expect(mockPrisma.post.update).toHaveBeenCalledTimes(1)

            const updateInput = mockPrisma.post.update.mock.calls[0][0]
            expect(updateInput.where).toEqual({ id: "post-1" })
            expect(updateInput.data).toMatchObject({
                status: "SCHEDULED",
                publishedAt: null,
                focusKeywords: "seo wave 1, parity",
                ogTitle: "OG Judul Post",
                ogDescription: "OG Deskripsi Post",
                schemaType: "Article",
                schemaData: '{"@context":"https://schema.org","@type":"Article"}',
            })
            expect(updateInput.data.scheduledAt).toBeInstanceOf(Date)
            expect((updateInput.data.scheduledAt as Date).toISOString()).toBe(scheduledAt)
        })

        it("mengembalikan 400 saat scheduledAt bukan tanggal valid", async () => {
            mockRequireAdminMutationApi.mockResolvedValueOnce({
                ok: true,
                identity: adminIdentity,
            })

            const request = new NextRequest("http://localhost/api/admin/posts/post-1", {
                method: "PUT",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({
                    status: "SCHEDULED",
                    scheduledAt: "tanggal-tidak-valid",
                }),
            })

            const response = await updatePost(request, {
                params: Promise.resolve({ id: "post-1" }),
            })
            const body = await response.json()

            expect(response.status).toBe(400)
            expect(body).toEqual({
                error: "Validation failed",
                issues: [{ path: "scheduledAt", code: "custom", message: "Invalid scheduledAt" }],
            })
            expect(mockPrisma.post.findFirst).not.toHaveBeenCalled()
            expect(mockPrisma.post.update).not.toHaveBeenCalled()
        })

        it("mengembalikan 400 saat status SCHEDULED tanpa scheduledAt", async () => {
            mockRequireAdminMutationApi.mockResolvedValueOnce({
                ok: true,
                identity: adminIdentity,
            })

            const request = new NextRequest("http://localhost/api/admin/posts/post-1", {
                method: "PUT",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({
                    status: "SCHEDULED",
                }),
            })

            const response = await updatePost(request, {
                params: Promise.resolve({ id: "post-1" }),
            })
            const body = await response.json()

            expect(response.status).toBe(400)
            expect(body).toEqual({
                error: "Validation failed",
                issues: [
                    {
                        path: "scheduledAt",
                        code: "custom",
                        message: "scheduledAt is required for SCHEDULED status",
                    },
                ],
            })
            expect(mockPrisma.post.findFirst).not.toHaveBeenCalled()
            expect(mockPrisma.post.update).not.toHaveBeenCalled()
        })
    })

    describe("POST /api/admin/pages", () => {
        it("menerima field parity SEO lanjutan saat create page", async () => {
            mockRequireAdminMutationApi.mockResolvedValueOnce({
                ok: true,
                identity: adminIdentity,
            })
            mockPrisma.page.findUnique.mockResolvedValueOnce(null)
            mockPrisma.page.create.mockResolvedValueOnce({
                id: "page-1",
                status: "DRAFT",
            })

            const request = new NextRequest("http://localhost/api/admin/pages", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({
                    title: "Landing QA",
                    slug: "landing-qa",
                    metaTitle: "Meta Landing QA",
                    metaDescription: "Meta description landing QA",
                    focusKeyword: "landing qa",
                    ogImage: "https://cdn.example.com/og.jpg",
                    ogTitle: "OG Landing QA",
                    ogDescription: "OG description landing QA",
                    canonicalUrl: "https://example.com/landing-qa",
                    schemaType: "WebPage",
                    schemaData: '{"@context":"https://schema.org","@type":"WebPage"}',
                }),
            })

            const response = await createPage(request)
            const body = await response.json()

            expect(response.status).toBe(200)
            expect(body).toMatchObject({ success: true })
            expect(mockPrisma.page.create).toHaveBeenCalledTimes(1)

            const createInput = mockPrisma.page.create.mock.calls[0][0]
            expect(createInput.data).toMatchObject({
                title: "Landing QA",
                slug: "landing-qa",
                content: "",
                status: "DRAFT",
                publishedAt: null,
                metaTitle: "Meta Landing QA",
                metaDescription: "Meta description landing QA",
                focusKeyword: "landing qa",
                ogImage: "https://cdn.example.com/og.jpg",
                ogTitle: "OG Landing QA",
                ogDescription: "OG description landing QA",
                canonicalUrl: "https://example.com/landing-qa",
                schemaType: "WebPage",
                schemaData: '{"@context":"https://schema.org","@type":"WebPage"}',
            })
        })
    })
})
