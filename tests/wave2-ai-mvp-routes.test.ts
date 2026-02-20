import { NextRequest, NextResponse } from "next/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

const mockRequireAdminApi = vi.fn()
const mockRequireAdminMutationApi = vi.fn()
const mockDecryptStoredApiKey = vi.fn()
const mockClassifyAiKeyFailure = vi.fn((error: unknown) => {
    if (error instanceof Error && /Gemini HTTP 503/.test(error.message)) {
        return { code: "PROVIDER_UNAVAILABLE", message: "Layanan Gemini sedang tidak tersedia" }
    }

    if (error && typeof error === "object" && "code" in error) {
        const code = (error as { code?: unknown }).code
        if (typeof code === "string") {
            return { code, message: "error" }
        }
    }

    return { code: "UNKNOWN_ERROR", message: "Unknown error" }
})
const mockSummarizeUnknownError = vi.fn((error: unknown) => {
    if (error instanceof Error) return error.message
    if (typeof error === "string") return error
    return "Unknown error"
})

const mockFetch = vi.fn()
vi.stubGlobal("fetch", mockFetch)

const mockPrisma = {
    aiTask: {
        create: vi.fn(),
        update: vi.fn(),
        findMany: vi.fn(),
        findFirst: vi.fn(),
    },
    aiApiKey: {
        findMany: vi.fn(),
        update: vi.fn(),
    },
    post: {
        findUnique: vi.fn(),
        create: vi.fn(),
    },
    user: {
        findUnique: vi.fn(),
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
        if (failure.code === "PROVIDER_RATE_LIMITED") return 429
        if (failure.code === "PROVIDER_KEY_INVALID") return 400
        if (failure.code === "NETWORK_TIMEOUT") return 504
        return 502
    }),
}))

vi.mock("@/lib/security/admin-helpers", () => ({
    summarizeUnknownError: mockSummarizeUnknownError,
}))

vi.mock("@/lib/observability/admin-log", () => ({
    logAdminError: vi.fn(),
    logAdminInfo: vi.fn(),
    logAdminWarn: vi.fn(),
}))

const { POST: createAiDraftPost } = await import("@/app/api/admin/ai/generate/route")
const { GET: listAiTasks } = await import("@/app/api/admin/ai/tasks/route")
const { GET: getAiTaskDetail } = await import("@/app/api/admin/ai/tasks/[id]/route")

const adminIdentity = {
    id: "admin-wave2",
    email: "qa-wave2@example.com",
    role: "ADMIN" as const,
    source: "metadata" as const,
}

function buildValidAiOutputJson() {
    return {
        title: "Panduan Lengkap Strategi SEO Lokal untuk UMKM",
        contentHtml:
            `<p>${"Optimasi visibilitas bisnis lokal secara konsisten. ".repeat(18)}</p>` +
            "<h2>Langkah Implementasi</h2>" +
            "<p>Mulai dari Google Business Profile, riset intent lokal, dan konten terstruktur.</p>" +
            "<ul><li>Optimasi profil</li><li>Konsistensi NAP</li><li>Evaluasi performa</li></ul>",
        excerpt: "Panduan ini membahas langkah praktis SEO lokal untuk meningkatkan visibilitas UMKM.",
        metaTitle: "Strategi SEO Lokal untuk UMKM | Panduan Praktis",
        metaDescription: "Pelajari strategi SEO lokal untuk UMKM dengan langkah implementasi, checklist optimasi, dan evaluasi performa.",
        focusKeyword: "seo lokal umkm",
        slugSuggestion: "strategi-seo-lokal-untuk-umkm",
    }
}

describe("Wave 2 AI MVP flow: generate + tasks routes", () => {
    beforeEach(() => {
        vi.clearAllMocks()

        mockRequireAdminApi.mockResolvedValue({ ok: true, identity: adminIdentity })
        mockRequireAdminMutationApi.mockResolvedValue({ ok: true, identity: adminIdentity })

        mockPrisma.aiTask.update.mockResolvedValue({})
        mockPrisma.aiApiKey.update.mockResolvedValue({})
        mockPrisma.user.findUnique.mockResolvedValue({ id: "user-1" })
        mockPrisma.post.findUnique.mockResolvedValue(null)

        mockDecryptStoredApiKey.mockImplementation((cipher: string) => `dec:${cipher}`)

        mockFetch.mockReset()
    })

    describe("POST /api/admin/ai/generate", () => {
        it("mengembalikan 400 + response validasi saat payload invalid", async () => {
            const request = new NextRequest("http://localhost/api/admin/ai/generate", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ topic: "ab" }),
            })

            const response = await createAiDraftPost(request)
            const body = await response.json()

            expect(response.status).toBe(400)
            expect(body).toMatchObject({
                success: false,
                error: "Validation failed",
                data: {
                    issues: expect.arrayContaining([
                        expect.objectContaining({
                            path: "topic",
                            code: expect.any(String),
                            message: expect.any(String),
                        }),
                    ]),
                },
            })
            expect(mockPrisma.aiTask.create).not.toHaveBeenCalled()
            expect(mockFetch).not.toHaveBeenCalled()
        })

        it("sukses minimal: create task, generate draft post, lalu complete task", async () => {
            mockPrisma.aiTask.create.mockResolvedValueOnce({ id: "task-1" })
            mockPrisma.aiApiKey.findMany.mockResolvedValueOnce([
                {
                    id: "key-1",
                    apiKey: "enc-key-1",
                    usageCount: 0,
                    order: 1,
                    createdAt: new Date("2026-02-17T00:00:00.000Z"),
                },
            ])
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    candidates: [
                        {
                            content: {
                                parts: [{ text: JSON.stringify(buildValidAiOutputJson()) }],
                            },
                        },
                    ],
                }),
            })
            mockPrisma.post.create.mockResolvedValueOnce({
                id: "post-1",
                slug: "strategi-seo-lokal-untuk-umkm",
                title: "Panduan Lengkap Strategi SEO Lokal untuk UMKM",
                status: "DRAFT",
            })

            const request = new NextRequest("http://localhost/api/admin/ai/generate", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({
                    topic: "Strategi SEO lokal untuk UMKM",
                    tone: "informatif",
                    targetWordCount: 900,
                }),
            })

            const response = await createAiDraftPost(request)
            const body = await response.json()

            expect(response.status).toBe(200)
            expect(body).toMatchObject({
                success: true,
                data: {
                    taskId: "task-1",
                    taskStatus: "completed",
                    post: {
                        id: "post-1",
                        slug: "strategi-seo-lokal-untuk-umkm",
                        title: "Panduan Lengkap Strategi SEO Lokal untuk UMKM",
                        status: "DRAFT",
                        editUrl: "/admin/posts/post-1/edit",
                    },
                },
            })

            expect(mockPrisma.aiTask.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({
                        type: "generate_article",
                        status: "pending",
                        progress: 0,
                        userId: adminIdentity.id,
                    }),
                })
            )

            expect(mockDecryptStoredApiKey).toHaveBeenCalledWith("enc-key-1")
            expect(mockFetch).toHaveBeenCalledTimes(1)
            expect(mockPrisma.post.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({
                        slug: "strategi-seo-lokal-untuk-umkm",
                        status: "DRAFT",
                        authorId: "user-1",
                    }),
                })
            )

            const completedUpdateCall = mockPrisma.aiTask.update.mock.calls.find(
                (call) => call[0]?.data?.status === "completed"
            )
            expect(completedUpdateCall, "expected aiTask.update with completed status").toBeTruthy()
            expect(completedUpdateCall?.[0]).toMatchObject({
                where: { id: "task-1" },
                data: {
                    status: "completed",
                    progress: 100,
                    error: null,
                },
            })

            const completedOutput = completedUpdateCall?.[0]?.data?.output as string
            expect(JSON.parse(completedOutput)).toMatchObject({
                postId: "post-1",
                usedKeyId: "key-1",
                attemptedKeyIds: ["key-1"],
            })
        })

        it("gagal key/AI: menandai task failed + mengembalikan error sesuai kontrak", async () => {
            mockPrisma.aiTask.create.mockResolvedValueOnce({ id: "task-failed-1" })
            mockPrisma.aiApiKey.findMany.mockResolvedValueOnce([
                {
                    id: "key-failed-1",
                    apiKey: "enc-key-failed-1",
                    usageCount: 0,
                    order: 1,
                    createdAt: new Date("2026-02-17T00:00:00.000Z"),
                },
            ])
            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 503,
                text: async () => "service unavailable",
            })

            const request = new NextRequest("http://localhost/api/admin/ai/generate", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ topic: "Konten AI saat provider sedang error" }),
            })

            const response = await createAiDraftPost(request)
            const body = await response.json()

            expect(response.status).toBe(502)
            expect(body).toEqual({
                success: false,
                error: "Gagal generate artikel AI",
                errorCode: "UNKNOWN_ERROR",
                data: { taskId: "task-failed-1" },
            })
            expect(mockPrisma.post.create).not.toHaveBeenCalled()

            expect(mockPrisma.aiApiKey.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: { id: "key-failed-1" },
                    data: expect.objectContaining({
                        lastError: expect.stringContaining("PROVIDER_UNAVAILABLE::"),
                    }),
                })
            )

            const failedUpdateCall = mockPrisma.aiTask.update.mock.calls.find(
                (call) => call[0]?.data?.status === "failed"
            )
            expect(failedUpdateCall, "expected aiTask.update with failed status").toBeTruthy()
            expect(failedUpdateCall?.[0]).toMatchObject({
                where: { id: "task-failed-1" },
                data: {
                    status: "failed",
                    progress: 100,
                    error: expect.stringContaining("Semua API key gagal"),
                },
            })
        })

        it("gagal provider saat generate mengembalikan status + errorCode terklasifikasi", async () => {
            mockPrisma.aiTask.create.mockResolvedValueOnce({ id: "task-failed-2" })
            mockPrisma.aiApiKey.findMany.mockResolvedValueOnce([
                {
                    id: "key-failed-2",
                    apiKey: "enc-key-failed-2",
                    usageCount: 0,
                    order: 1,
                    createdAt: new Date("2026-02-17T00:00:00.000Z"),
                },
            ])
            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 503,
                text: async () => "service unavailable",
            })

            const request = new NextRequest("http://localhost/api/admin/ai/generate", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ topic: "Konten AI saat provider sedang error" }),
            })

            const response = await createAiDraftPost(request)
            const body = await response.json()

            expect(response.status).toBe(502)
            expect(body).toEqual({
                success: false,
                error: "Gagal generate artikel AI",
                errorCode: "UNKNOWN_ERROR",
                data: { taskId: "task-failed-2" },
            })
        })
    })

    describe("GET /api/admin/ai/tasks + GET /api/admin/ai/tasks/[id]", () => {
        it("list tasks mengembalikan shape konsisten", async () => {
            mockPrisma.aiTask.findMany.mockResolvedValueOnce([
                {
                    id: "task-1",
                    type: "generate_article",
                    status: "completed",
                    progress: 100,
                    input: JSON.stringify({ topic: "SEO lokal" }),
                    output: JSON.stringify({ postId: "post-1" }),
                    error: null,
                    createdAt: new Date("2026-02-17T08:00:00.000Z"),
                    updatedAt: new Date("2026-02-17T08:01:00.000Z"),
                    completedAt: new Date("2026-02-17T08:02:00.000Z"),
                },
                {
                    id: "task-2",
                    type: "generate_article",
                    status: "failed",
                    progress: 100,
                    input: "raw-input",
                    output: null,
                    error: "Provider down",
                    createdAt: new Date("2026-02-17T09:00:00.000Z"),
                    updatedAt: new Date("2026-02-17T09:01:00.000Z"),
                    completedAt: new Date("2026-02-17T09:02:00.000Z"),
                },
            ])

            const request = new NextRequest("http://localhost/api/admin/ai/tasks?limit=5", {
                method: "GET",
            })

            const response = await listAiTasks(request)
            const body = await response.json()

            expect(response.status).toBe(200)
            expect(body.success).toBe(true)
            expect(body.data).toHaveLength(2)

            const requiredKeys = [
                "id",
                "type",
                "status",
                "progress",
                "input",
                "output",
                "error",
                "createdAt",
                "updatedAt",
                "completedAt",
            ]
            for (const task of body.data as Array<Record<string, unknown>>) {
                expect(Object.keys(task)).toEqual(expect.arrayContaining(requiredKeys))
            }

            expect(body.data[0]).toMatchObject({
                id: "task-1",
                status: "completed",
                progress: 100,
                input: { topic: "SEO lokal" },
                output: { postId: "post-1" },
            })
            expect(body.data[1]).toMatchObject({
                id: "task-2",
                status: "failed",
                progress: 100,
                input: "raw-input",
                output: null,
                error: "Provider down",
            })

            expect(mockPrisma.aiTask.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: { userId: adminIdentity.id },
                    orderBy: { createdAt: "desc" },
                    take: 5,
                })
            )
        })

        it("detail task by id mengembalikan status/progress yang benar", async () => {
            mockPrisma.aiTask.findFirst.mockResolvedValueOnce({
                id: "task-processing-1",
                type: "generate_article",
                status: "processing",
                progress: 45,
                input: JSON.stringify({ topic: "Konten bulanan" }),
                output: null,
                error: null,
                createdAt: new Date("2026-02-17T10:00:00.000Z"),
                updatedAt: new Date("2026-02-17T10:01:00.000Z"),
                completedAt: null,
            })

            const request = new NextRequest("http://localhost/api/admin/ai/tasks/task-processing-1", {
                method: "GET",
            })

            const response = await getAiTaskDetail(request, {
                params: Promise.resolve({ id: "task-processing-1" }),
            })
            const body = await response.json()

            expect(response.status).toBe(200)
            expect(body).toMatchObject({
                success: true,
                data: {
                    id: "task-processing-1",
                    status: "processing",
                    progress: 45,
                    input: { topic: "Konten bulanan" },
                    output: null,
                },
            })
            expect(mockPrisma.aiTask.findFirst).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: {
                        id: "task-processing-1",
                        userId: adminIdentity.id,
                    },
                })
            )
        })

        it("not found task detail mengembalikan kontrak error 404", async () => {
            mockPrisma.aiTask.findFirst.mockResolvedValueOnce(null)

            const request = new NextRequest("http://localhost/api/admin/ai/tasks/task-missing", {
                method: "GET",
            })

            const response = await getAiTaskDetail(request, {
                params: Promise.resolve({ id: "task-missing" }),
            })
            const body = await response.json()

            expect(response.status).toBe(404)
            expect(body).toEqual({
                success: false,
                error: "Task not found",
            })
        })
    })
})
