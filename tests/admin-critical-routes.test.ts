import { NextRequest, NextResponse } from "next/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

const mockCheckRateLimit = vi.fn()
const mockCreateRateLimitExceededResponse = vi.fn()

const mockRequireAdminApi = vi.fn()
const mockRequireAdminMutationApi = vi.fn()
const mockRequireAdminPage = vi.fn()
const mockUpdateSettingsStore = vi.fn()

const mockPrisma = {
    aiApiKey: {
        findMany: vi.fn(),
    },
    media: {
        findMany: vi.fn(),
        count: vi.fn(),
        create: vi.fn(),
        delete: vi.fn(),
    },
    heroSection: {
        findMany: vi.fn(),
        count: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
    },
    post: {
        findUnique: vi.fn(),
        create: vi.fn(),
    },
    siteSetting: {
        upsert: vi.fn(),
    },
}

vi.mock("@/lib/security/admin", () => ({
    requireAdminApi: mockRequireAdminApi,
    requireAdminMutationApi: mockRequireAdminMutationApi,
    requireAdminPage: mockRequireAdminPage,
}))

vi.mock("@/lib/settings", () => ({
    updateSettings: mockUpdateSettingsStore,
}))

vi.mock("@/lib/security/rate-limit", () => ({
    checkRateLimit: mockCheckRateLimit,
    createRateLimitExceededResponse: mockCreateRateLimitExceededResponse,
}))

vi.mock("@/components/admin/sidebar", () => ({
    AdminSidebar: () => null,
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
    id: "admin-1",
    email: "admin@example.com",
    role: "ADMIN" as const,
    source: "metadata" as const,
}

const { GET: getAiKeys } = await import("@/app/api/admin/ai/keys/route")
const { POST: createPost } = await import("@/app/api/admin/posts/route")
const { GET: listMedia, POST: createMedia, DELETE: deleteMedia } = await import("@/app/api/admin/media/route")
const { POST: createHero, PUT: updateHero, DELETE: deleteHero } = await import("@/app/api/admin/hero/route")
const { PUT: updateSettings } = await import("@/app/api/admin/settings/route")
const { GET: listSettings } = await import("@/app/api/admin/settings/route")
const { GET: getCsrfToken } = await import("@/app/api/admin/csrf/route")
const { default: AdminLayout } = await import("@/app/admin/layout")

function findFormSubmitHandler(node: unknown): ((event: { preventDefault: () => void }) => unknown) | null {
    if (!node || typeof node !== "object") return null

    const candidate = node as { type?: unknown; props?: { onSubmit?: unknown; children?: unknown } }
    if (candidate.type === "form" && typeof candidate.props?.onSubmit === "function") {
        return candidate.props.onSubmit as (event: { preventDefault: () => void }) => unknown
    }

    const children = candidate.props?.children
    if (Array.isArray(children)) {
        for (const child of children) {
            const handler = findFormSubmitHandler(child)
            if (handler) return handler
        }
        return null
    }

    return findFormSubmitHandler(children)
}

describe("Critical admin routes: authz and payload validation", () => {
    beforeEach(() => {
        vi.clearAllMocks()
        mockCheckRateLimit.mockReturnValue({
            ok: true,
            limit: 60,
            remaining: 59,
            resetAt: Date.now() + 60_000,
        })
        mockCreateRateLimitExceededResponse.mockImplementation((result) =>
            NextResponse.json(
                {
                    error: "Too Many Requests",
                    retryAfterSec: result.retryAfterSec,
                },
                {
                    status: 429,
                    headers: {
                        "Retry-After": String(result.retryAfterSec),
                    },
                }
            )
        )
    })

    describe("app/admin/layout", () => {
        it("selalu menjalankan guard requireAdminPage sebelum render layout", async () => {
            mockRequireAdminPage.mockResolvedValueOnce(adminIdentity)

            await AdminLayout({ children: null })

            expect(mockRequireAdminPage).toHaveBeenCalledTimes(1)
        })
    })

    describe("GET /api/admin/ai/keys", () => {
        it("menolak user non-admin (403) dari guard", async () => {
            mockRequireAdminApi.mockResolvedValueOnce({
                ok: false,
                response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
            })

            const response = await getAiKeys()
            const body = await response.json()

            expect(response.status).toBe(403)
            expect(body).toEqual({ error: "Forbidden" })
            expect(mockPrisma.aiApiKey.findMany).not.toHaveBeenCalled()
        })

        it("menolak user unauthorized (401) dari guard", async () => {
            mockRequireAdminApi.mockResolvedValueOnce({
                ok: false,
                response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
            })

            const response = await getAiKeys()
            const body = await response.json()

            expect(response.status).toBe(401)
            expect(body).toEqual({ error: "Unauthorized" })
            expect(mockPrisma.aiApiKey.findMany).not.toHaveBeenCalled()
        })
    })

    describe("POST /api/admin/posts", () => {
        it("mengembalikan 400 + body validasi terstruktur saat payload invalid", async () => {
            mockRequireAdminMutationApi.mockResolvedValueOnce({
                ok: true,
                identity: adminIdentity,
            })

            const request = new NextRequest("http://localhost/api/admin/posts", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ slug: "slug-only-without-title" }),
            })

            const response = await createPost(request)
            const body = await response.json()

            expect(response.status).toBe(400)
            expect(body).toMatchObject({
                error: "Validation failed",
                issues: expect.any(Array),
            })
            expect(body.issues).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({
                        path: "title",
                        code: expect.any(String),
                        message: expect.any(String),
                    }),
                ])
            )
            expect(mockPrisma.post.findUnique).not.toHaveBeenCalled()
            expect(mockPrisma.post.create).not.toHaveBeenCalled()
        })
    })

    describe("PUT /api/admin/settings", () => {
        it("mengembalikan 400 + error invalid settings saat payload tidak valid", async () => {
            mockRequireAdminMutationApi.mockResolvedValueOnce({
                ok: true,
                identity: adminIdentity,
            })

            const request = new NextRequest("http://localhost/api/admin/settings", {
                method: "PUT",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ settings: null, group: "general" }),
            })

            const response = await updateSettings(request)
            const body = await response.json()

            expect(response.status).toBe(400)
            expect(body).toMatchObject({
                error: "Validation failed",
                issues: expect.arrayContaining([
                    expect.objectContaining({
                        path: "settings",
                    }),
                ]),
            })
            expect(mockPrisma.siteSetting.upsert).not.toHaveBeenCalled()
        })

        it("menggunakan single write path ke lib/settings + normalisasi value ke string", async () => {
            mockRequireAdminMutationApi.mockResolvedValueOnce({
                ok: true,
                identity: adminIdentity,
            })
            mockUpdateSettingsStore.mockResolvedValueOnce([{ key: "site_name", value: "Mum N Hun" }])

            const request = new NextRequest("http://localhost/api/admin/settings", {
                method: "PUT",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({
                    settings: {
                        site_name: "Mum N Hun",
                        posts_per_page: 10,
                        maintenance_mode: false,
                    },
                    group: "general",
                }),
            })

            const response = await updateSettings(request)
            const body = await response.json()

            expect(response.status).toBe(200)
            expect(body).toMatchObject({ success: true })
            expect(mockUpdateSettingsStore).toHaveBeenCalledTimes(1)
            expect(mockUpdateSettingsStore).toHaveBeenCalledWith(
                {
                    site_name: "Mum N Hun",
                    posts_per_page: "10",
                    maintenance_mode: "false",
                },
                { group: "general" }
            )
            expect(mockPrisma.siteSetting.upsert).not.toHaveBeenCalled()
        })

        it("mengembalikan 400 saat key settings invalid", async () => {
            mockRequireAdminMutationApi.mockResolvedValueOnce({
                ok: true,
                identity: adminIdentity,
            })

            const request = new NextRequest("http://localhost/api/admin/settings", {
                method: "PUT",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({
                    settings: {
                        "bad key": "oops",
                    },
                    group: "general",
                }),
            })

            const response = await updateSettings(request)
            const body = await response.json()

            expect(response.status).toBe(400)
            expect(body).toMatchObject({
                error: "Validation failed",
                issues: expect.arrayContaining([
                    expect.objectContaining({
                        path: "settings.bad key",
                    }),
                ]),
            })
            expect(mockUpdateSettingsStore).not.toHaveBeenCalled()
        })
    })

    describe("GET /api/admin/settings", () => {
        it("mengembalikan 400 saat query group berisi karakter invalid", async () => {
            mockRequireAdminApi.mockResolvedValueOnce({
                ok: true,
                identity: adminIdentity,
            })

            const request = new NextRequest("http://localhost/api/admin/settings?group=../../etc", {
                method: "GET",
            })

            const response = await listSettings(request)
            const body = await response.json()

            expect(response.status).toBe(400)
            expect(body).toMatchObject({
                error: "Validation failed",
            })
        })
    })

    describe("GET /api/admin/csrf rate limiting", () => {
        it("mengembalikan 429 saat limit CSRF token terlampaui", async () => {
            mockRequireAdminApi.mockResolvedValueOnce({
                ok: true,
                identity: adminIdentity,
            })
            mockCheckRateLimit.mockReturnValueOnce({
                ok: false,
                limit: 30,
                remaining: 0,
                resetAt: Date.now() + 30_000,
                retryAfterSec: 30,
            })

            const response = await getCsrfToken()
            const body = await response.json()

            expect(response.status).toBe(429)
            expect(body).toEqual({ error: "Too Many Requests", retryAfterSec: 30 })
            expect(mockCreateRateLimitExceededResponse).toHaveBeenCalledTimes(1)
        })
    })

    describe("/api/admin/media hardening", () => {
        it("GET mengembalikan 400 saat query page invalid", async () => {
            mockRequireAdminApi.mockResolvedValueOnce({
                ok: true,
                identity: adminIdentity,
            })

            const request = new NextRequest("http://localhost/api/admin/media?page=0&limit=30", {
                method: "GET",
            })

            const response = await listMedia(request)
            const body = await response.json()

            expect(response.status).toBe(400)
            expect(body).toMatchObject({ error: "Validation failed" })
            expect(mockPrisma.media.findMany).not.toHaveBeenCalled()
            expect(mockPrisma.media.count).not.toHaveBeenCalled()
        })

        it("POST mengembalikan 400 saat URL media invalid", async () => {
            mockRequireAdminMutationApi.mockResolvedValueOnce({
                ok: true,
                identity: adminIdentity,
            })

            const request = new NextRequest("http://localhost/api/admin/media", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({
                    url: "not-a-url",
                }),
            })

            const response = await createMedia(request)
            const body = await response.json()

            expect(response.status).toBe(400)
            expect(body).toMatchObject({ error: "Validation failed" })
            expect(mockPrisma.media.create).not.toHaveBeenCalled()
        })

        it("DELETE mengembalikan 400 saat id kosong", async () => {
            mockRequireAdminMutationApi.mockResolvedValueOnce({
                ok: true,
                identity: adminIdentity,
            })

            const request = new NextRequest("http://localhost/api/admin/media", {
                method: "DELETE",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ id: "" }),
            })

            const response = await deleteMedia(request)
            const body = await response.json()

            expect(response.status).toBe(400)
            expect(body).toMatchObject({ error: "Validation failed" })
            expect(mockPrisma.media.delete).not.toHaveBeenCalled()
        })
    })

    describe("/api/admin/hero hardening", () => {
        it("POST mengembalikan 400 saat title kosong", async () => {
            mockRequireAdminMutationApi.mockResolvedValueOnce({
                ok: true,
                identity: adminIdentity,
            })

            const request = new NextRequest("http://localhost/api/admin/hero", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({
                    title: "",
                }),
            })

            const response = await createHero(request)
            const body = await response.json()

            expect(response.status).toBe(400)
            expect(body).toMatchObject({ error: "Validation failed" })
            expect(mockPrisma.heroSection.create).not.toHaveBeenCalled()
        })

        it("PUT mengembalikan 400 saat ctaPrimaryLink invalid", async () => {
            mockRequireAdminMutationApi.mockResolvedValueOnce({
                ok: true,
                identity: adminIdentity,
            })

            const request = new NextRequest("http://localhost/api/admin/hero", {
                method: "PUT",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({
                    id: "hero-1",
                    title: "Hero utama",
                    ctaPrimaryLink: "ftp://invalid-link",
                }),
            })

            const response = await updateHero(request)
            const body = await response.json()

            expect(response.status).toBe(400)
            expect(body).toMatchObject({ error: "Validation failed" })
            expect(mockPrisma.heroSection.update).not.toHaveBeenCalled()
        })

        it("DELETE mengembalikan 400 saat id kosong", async () => {
            mockRequireAdminMutationApi.mockResolvedValueOnce({
                ok: true,
                identity: adminIdentity,
            })

            const request = new NextRequest("http://localhost/api/admin/hero", {
                method: "DELETE",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ id: "" }),
            })

            const response = await deleteHero(request)
            const body = await response.json()

            expect(response.status).toBe(400)
            expect(body).toMatchObject({ error: "Validation failed" })
            expect(mockPrisma.heroSection.delete).not.toHaveBeenCalled()
        })
    })

    describe("lib/settings cache invalidation", () => {
        it("batch updateSettings melakukan revalidateTag setelah seluruh upsert", async () => {
            vi.resetModules()

            const upsert = vi.fn().mockResolvedValue({ key: "k", value: "v" })
            const revalidateTag = vi.fn()

            vi.doMock("@/lib/db/prisma", () => ({
                default: {
                    siteSetting: {
                        upsert,
                        findUnique: vi.fn(),
                        findMany: vi.fn(),
                    },
                },
            }))

            vi.doMock("next/cache", () => ({
                revalidateTag,
                unstable_cache: (fn: (...args: unknown[]) => unknown) => fn,
            }))

            const { SETTINGS_CACHE_TAG, updateSettings: updateSettingsLib } = await vi.importActual<typeof import("@/lib/settings")>(
                "@/lib/settings"
            )

            const result = await updateSettingsLib(
                {
                    site_name: "Mum N Hun",
                    posts_per_page: "12",
                },
                { group: "general" }
            )

            expect(result).toHaveLength(2)
            expect(upsert).toHaveBeenCalledTimes(2)
            expect(revalidateTag).toHaveBeenCalledWith(SETTINGS_CACHE_TAG, "max")
        })
    })

    describe("app/login redirect sanitization", () => {
        it("memaksa fallback /admin untuk redirect absolut berbahaya", async () => {
            vi.resetModules()

            const push = vi.fn()
            const refresh = vi.fn()
            const signInWithPassword = vi.fn().mockResolvedValue({ error: null })

            vi.doMock("react", async () => {
                const actual = await vi.importActual<typeof import("react")>("react")
                return {
                    ...actual,
                    useState: vi.fn((initial: unknown) => [initial, vi.fn()]),
                }
            })

            vi.doMock("@/lib/supabase/client", () => ({
                createClient: () => ({
                    auth: {
                        signInWithPassword,
                    },
                }),
            }))

            vi.doMock("next/navigation", () => ({
                useRouter: () => ({ push, refresh }),
                useSearchParams: () => ({
                    get: (key: string) => (key === "redirect" ? "https://evil.example/phish" : null),
                }),
            }))

            vi.doMock("next/image", () => ({
                default: () => null,
            }))

            const loginModule = await vi.importActual<typeof import("@/app/login/page")>("@/app/login/page")
            const tree = loginModule.default()
            const onSubmit = findFormSubmitHandler(tree)

            expect(typeof onSubmit).toBe("function")
            await onSubmit?.({ preventDefault: vi.fn() })

            expect(signInWithPassword).toHaveBeenCalledWith({ email: "", password: "" })
            expect(push).toHaveBeenCalledWith("/admin")
            expect(refresh).toHaveBeenCalledTimes(1)
        })
    })
})
