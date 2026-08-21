import { NextRequest } from "next/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

const mockRequireAgentToken = vi.fn()
const mockRevalidatePath = vi.fn()
const mockLoadActiveAiKeys = vi.fn()
const mockGenerateArticleWithRotary = vi.fn()
const mockResolveImageProvider = vi.fn()

const mockPrisma = {
    post: { findUnique: vi.fn(), create: vi.fn() },
    category: { findMany: vi.fn() },
    tag: { findMany: vi.fn() },
    aiTask: { create: vi.fn(), update: vi.fn() },
    aiApiKey: { update: vi.fn() },
}

vi.mock("@/lib/db/prisma", () => ({ default: mockPrisma }))

vi.mock("next/cache", () => ({
    revalidatePath: mockRevalidatePath,
    revalidateTag: vi.fn(),
    unstable_cache: (fn: unknown) => fn,
}))

vi.mock("@/lib/security/agent-token", async () => {
    const actual = await vi.importActual<typeof import("@/lib/security/agent-token")>(
        "@/lib/security/agent-token"
    )
    return {
        ...actual,
        requireAgentToken: mockRequireAgentToken,
    }
})

vi.mock("@/lib/ai/key-rotary", async () => {
    const actual = await vi.importActual<typeof import("@/lib/ai/key-rotary")>("@/lib/ai/key-rotary")
    return {
        ...actual,
        loadActiveAiKeys: mockLoadActiveAiKeys,
        generateArticleWithRotary: mockGenerateArticleWithRotary,
        resolveImageProvider: mockResolveImageProvider,
    }
})

vi.mock("@/lib/observability/admin-log", () => ({
    logAdminError: vi.fn(),
    logAdminInfo: vi.fn(),
    logAdminWarn: vi.fn(),
}))

const { POST: createAgentArticle } = await import("@/app/api/agent/articles/route")

function buildRequest(body: unknown) {
    return new NextRequest("http://localhost/api/agent/articles", {
        method: "POST",
        headers: {
            "content-type": "application/json",
            authorization: "Bearer mnh_agent_test-token",
        },
        body: JSON.stringify(body),
    })
}

function agentIdentity(scopes: string[]) {
    return { tokenId: "token-1", name: "OpenClaw", scopes }
}

function longContent(times: number): string {
    return `<p>${"Tips memilih layanan sewa yang tepat untuk keluarga muda. ".repeat(times)}</p>`
}

describe("POST /api/agent/articles: authentication and scopes", () => {
    beforeEach(() => {
        vi.clearAllMocks()

        mockRequireAgentToken.mockResolvedValue({
            ok: true,
            identity: agentIdentity(["article:create", "article:publish", "article:generate"]),
        })
        mockPrisma.post.findUnique.mockResolvedValue(null)
        mockPrisma.category.findMany.mockResolvedValue([])
        mockPrisma.tag.findMany.mockResolvedValue([])
        mockPrisma.aiTask.create.mockResolvedValue({ id: "task-agent-1" })
        mockPrisma.aiTask.update.mockResolvedValue({})
    })

    it("returns the guard response when the token is rejected", async () => {
        const { NextResponse } = await import("next/server")
        mockRequireAgentToken.mockResolvedValueOnce({
            ok: false,
            response: NextResponse.json(
                { success: false, error: "Invalid agent token", errorCode: "AGENT_TOKEN_INVALID" },
                { status: 401 }
            ),
        })

        const response = await createAgentArticle(
            buildRequest({ mode: "content", title: "Judul", contentHtml: longContent(5) })
        )

        expect(response.status).toBe(401)
        expect(mockPrisma.post.create).not.toHaveBeenCalled()
    })

    it("authenticates before validating the payload", async () => {
        const { NextResponse } = await import("next/server")
        mockRequireAgentToken.mockResolvedValueOnce({
            ok: false,
            response: NextResponse.json(
                { success: false, error: "Missing bearer token", errorCode: "AGENT_TOKEN_MISSING" },
                { status: 401 }
            ),
        })

        const response = await createAgentArticle(buildRequest({ mode: "bogus" }))

        expect(response.status).toBe(401)
        await expect(response.json()).resolves.toMatchObject({ errorCode: "AGENT_TOKEN_MISSING" })
    })

    it("requires article:create for content mode", async () => {
        mockRequireAgentToken.mockResolvedValueOnce({
            ok: true,
            identity: agentIdentity(["article:generate"]),
        })

        const response = await createAgentArticle(
            buildRequest({ mode: "content", title: "Judul artikel", contentHtml: longContent(30) })
        )

        expect(response.status).toBe(403)
        await expect(response.json()).resolves.toMatchObject({ errorCode: "AGENT_SCOPE_INSUFFICIENT" })
        expect(mockPrisma.post.create).not.toHaveBeenCalled()
    })

    it("requires article:publish to publish directly", async () => {
        mockRequireAgentToken.mockResolvedValueOnce({
            ok: true,
            identity: agentIdentity(["article:create"]),
        })

        const response = await createAgentArticle(
            buildRequest({
                mode: "content",
                title: "Judul artikel panjang",
                contentHtml: longContent(30),
                status: "PUBLISHED",
            })
        )

        expect(response.status).toBe(403)
        await expect(response.json()).resolves.toMatchObject({ errorCode: "AGENT_SCOPE_INSUFFICIENT" })
        expect(mockPrisma.post.create).not.toHaveBeenCalled()
    })

    it("requires image:generate for image generation", async () => {
        mockRequireAgentToken.mockResolvedValueOnce({
            ok: true,
            identity: agentIdentity(["article:generate"]),
        })

        const response = await createAgentArticle(
            buildRequest({ mode: "generate", topic: "sewa bus pariwisata", generateImage: true })
        )

        expect(response.status).toBe(403)
        await expect(response.json()).resolves.toMatchObject({ errorCode: "AGENT_SCOPE_INSUFFICIENT" })
    })
})

describe("POST /api/agent/articles: content mode", () => {
    beforeEach(() => {
        vi.clearAllMocks()

        mockRequireAgentToken.mockResolvedValue({
            ok: true,
            identity: agentIdentity(["article:create", "article:publish"]),
        })
        mockPrisma.post.findUnique.mockResolvedValue(null)
        mockPrisma.category.findMany.mockResolvedValue([])
        mockPrisma.tag.findMany.mockResolvedValue([])
        mockPrisma.post.create.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
            id: "post-agent-1",
            slug: data.slug,
            title: data.title,
            status: data.status,
            featuredImage: data.featuredImage ?? null,
        }))
    })

    it("sanitizes agent-provided HTML", async () => {
        const response = await createAgentArticle(
            buildRequest({
                mode: "content",
                title: "Tips memilih layanan sewa",
                contentHtml:
                    `${longContent(30)}<script>alert(1)</script><img src=x onerror=alert(1)>` +
                    '<a href="javascript:alert(1)">x</a>',
            })
        )

        expect(response.status).toBe(200)

        const storedContent = mockPrisma.post.create.mock.calls[0][0].data.content as string
        expect(storedContent).not.toContain("<script")
        expect(storedContent).not.toContain("onerror")
        expect(storedContent).not.toContain("javascript:")
    })

    it("records agent provenance and defaults to DRAFT", async () => {
        const response = await createAgentArticle(
            buildRequest({
                mode: "content",
                title: "Tips memilih layanan sewa",
                contentHtml: longContent(30),
            })
        )

        const body = await response.json()
        expect(body.data.status).toBe("DRAFT")

        const createData = mockPrisma.post.create.mock.calls[0][0].data
        expect(createData.source).toBe("agent")
        expect(createData.createdVia).toBe("token-1")
        expect(createData.publishedAt).toBeNull()
        expect(mockRevalidatePath).not.toHaveBeenCalled()
    })

    it("publishes and revalidates when permitted", async () => {
        const response = await createAgentArticle(
            buildRequest({
                mode: "content",
                title: "Tips memilih layanan sewa keluarga",
                contentHtml: longContent(30),
                excerpt: "Ringkasan tips memilih layanan sewa untuk keluarga muda dengan aman.",
                status: "PUBLISHED",
            })
        )

        const body = await response.json()

        expect(response.status).toBe(200)
        expect(body.data.status).toBe("PUBLISHED")
        expect(body.data.publicUrl).toContain(body.data.slug)
        expect(mockPrisma.post.create.mock.calls[0][0].data.publishedAt).toBeInstanceOf(Date)
        expect(mockRevalidatePath).toHaveBeenCalledWith("/")
    })

    it("rejects publishing thin content with 422", async () => {
        const response = await createAgentArticle(
            buildRequest({
                mode: "content",
                title: "Judul singkat sekali",
                contentHtml: "<p>Konten ini terlalu pendek untuk dipublikasikan secara langsung.</p>",
                status: "PUBLISHED",
            })
        )

        expect(response.status).toBe(422)
        await expect(response.json()).resolves.toMatchObject({ errorCode: "ARTICLE_NOT_PUBLISHABLE" })
        expect(mockPrisma.post.create).not.toHaveBeenCalled()
    })

    it("reports unknown taxonomy slugs as warnings instead of failing", async () => {
        mockPrisma.category.findMany.mockResolvedValueOnce([{ id: "cat-1", slug: "parenting" }])
        mockPrisma.tag.findMany.mockResolvedValueOnce([])

        const response = await createAgentArticle(
            buildRequest({
                mode: "content",
                title: "Tips memilih layanan sewa",
                contentHtml: longContent(30),
                categorySlugs: ["parenting", "tidak-ada"],
                tagSlugs: ["hilang"],
            })
        )

        const body = await response.json()

        expect(response.status).toBe(200)
        expect(body.data.warnings.unknownTaxonomy).toEqual(
            expect.arrayContaining(["category:tidak-ada", "tag:hilang"])
        )
    })

    it("rejects malformed payloads with structured issues", async () => {
        const response = await createAgentArticle(buildRequest({ mode: "content", title: "ab" }))

        expect(response.status).toBe(400)
        await expect(response.json()).resolves.toMatchObject({
            errorCode: "AGENT_ARTICLE_VALIDATION_FAILED",
        })
    })
})

describe("POST /api/agent/articles: generate mode", () => {
    beforeEach(() => {
        vi.clearAllMocks()

        mockRequireAgentToken.mockResolvedValue({
            ok: true,
            identity: agentIdentity(["article:generate", "article:publish"]),
        })
        mockPrisma.post.findUnique.mockResolvedValue(null)
        mockPrisma.aiTask.create.mockResolvedValue({ id: "task-agent-1" })
        mockPrisma.aiTask.update.mockResolvedValue({})
        mockLoadActiveAiKeys.mockResolvedValue([
            { id: "key-1", provider: "gemini", apiKey: "enc", baseUrl: null, model: null, capability: "text" },
        ])
        mockResolveImageProvider.mockResolvedValue(null)
        mockPrisma.post.create.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
            id: "post-agent-gen",
            slug: data.slug,
            title: data.title,
            status: data.status,
            featuredImage: data.featuredImage ?? null,
        }))
    })

    it("creates a post from AI output and links the task", async () => {
        mockGenerateArticleWithRotary.mockResolvedValueOnce({
            article: {
                title: "Panduan Memilih Layanan Sewa Keluarga",
                contentHtml: longContent(30),
                excerpt: "Ringkasan panduan memilih layanan sewa keluarga yang aman dan nyaman.",
                metaTitle: "Panduan Memilih Layanan Sewa",
                metaDescription:
                    "Pelajari cara memilih layanan sewa keluarga yang aman, mulai dari verifikasi hingga evaluasi biaya.",
                focusKeyword: "layanan sewa keluarga",
                slugSuggestion: "panduan-memilih-layanan-sewa-keluarga",
            },
            usedKeyId: "key-1",
            attemptedKeyIds: ["key-1"],
        })

        const response = await createAgentArticle(
            buildRequest({ mode: "generate", topic: "memilih layanan sewa keluarga" })
        )
        const body = await response.json()

        expect(response.status).toBe(200)
        expect(body.data).toMatchObject({
            id: "post-agent-gen",
            status: "DRAFT",
            taskId: "task-agent-1",
        })
        expect(mockPrisma.post.create.mock.calls[0][0].data.source).toBe("agent")
    })

    it("surfaces AI failures with the classified provider code", async () => {
        const { AllAiKeysFailedError } = await import("@/lib/ai/key-rotary")
        mockGenerateArticleWithRotary.mockRejectedValueOnce(
            new AllAiKeysFailedError({ code: "PROVIDER_UNAVAILABLE", message: "Layanan tidak tersedia" }, ["key-1"])
        )

        const response = await createAgentArticle(
            buildRequest({ mode: "generate", topic: "memilih layanan sewa keluarga" })
        )
        const body = await response.json()

        expect(response.status).toBe(502)
        expect(body).toMatchObject({ errorCode: "PROVIDER_UNAVAILABLE" })
        expect(mockPrisma.post.create).not.toHaveBeenCalled()
    })

    it("returns 400 when no AI key is configured", async () => {
        const { NoActiveAiKeyError } = await import("@/lib/ai/key-rotary")
        mockGenerateArticleWithRotary.mockRejectedValueOnce(new NoActiveAiKeyError("Tidak ada API key AI aktif"))

        const response = await createAgentArticle(
            buildRequest({ mode: "generate", topic: "memilih layanan sewa keluarga" })
        )

        expect(response.status).toBe(400)
        await expect(response.json()).resolves.toMatchObject({ errorCode: "AI_KEYS_NOT_CONFIGURED" })
    })
})
