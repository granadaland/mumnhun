import { NextRequest } from "next/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

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

describe("Admin smoke e2e-ish flow", () => {
    beforeEach(() => {
        vi.clearAllMocks()
        vi.resetModules()
    })

    it("login success mengarahkan ke path admin internal yang aman", async () => {
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
                get: (key: string) => (key === "redirect" ? "/admin/posts" : null),
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
        expect(push).toHaveBeenCalledWith("/admin/posts")
        expect(refresh).toHaveBeenCalledTimes(1)
    })

    it("akses admin page mewajibkan guard admin", async () => {
        const mockRequireAdminPage = vi.fn().mockResolvedValue({
            id: "admin-1",
            email: "admin@example.com",
            role: "ADMIN",
            source: "metadata",
        })

        vi.doMock("@/lib/security/admin", () => ({
            requireAdminPage: mockRequireAdminPage,
        }))

        vi.doMock("@/components/admin/sidebar", () => ({
            AdminSidebar: () => null,
        }))

        const layoutModule = await vi.importActual<typeof import("@/app/admin/layout")>("@/app/admin/layout")

        await layoutModule.default({ children: null })

        expect(mockRequireAdminPage).toHaveBeenCalledTimes(1)
    })

    it("alur CSRF: bootstrap token, blokir mutasi tanpa token, dan izinkan mutasi dengan token valid", async () => {
        vi.doUnmock("@/lib/security/admin")
        process.env.CSRF_SECRET = "smoke-csrf-secret"

        const mockUpdateSettingsStore = vi.fn().mockResolvedValue([{ key: "site_name", value: "Mum N Hun" }])

        vi.doMock("@/lib/settings", () => ({
            updateSettings: mockUpdateSettingsStore,
        }))

        vi.doMock("@/lib/supabase/server", () => ({
            createClient: () =>
                Promise.resolve({
                    auth: {
                        getUser: async () => ({
                            data: {
                                user: {
                                    id: "admin-smoke-1",
                                    email: "admin@example.com",
                                    app_metadata: { role: "ADMIN" },
                                    user_metadata: {},
                                },
                            },
                        }),
                    },
                }),
        }))

        vi.doMock("@/lib/db/prisma", () => ({
            default: {
                user: {
                    findUnique: vi.fn(),
                },
                siteSetting: {
                    findMany: vi.fn(),
                },
            },
        }))

        vi.doMock("@/lib/observability/admin-log", () => ({
            logAdminError: vi.fn(),
            logAdminInfo: vi.fn(),
            logAdminWarn: vi.fn(),
        }))

        const csrfModule = await vi.importActual<typeof import("@/app/api/admin/csrf/route")>("@/app/api/admin/csrf/route")
        const settingsModule = await vi.importActual<typeof import("@/app/api/admin/settings/route")>("@/app/api/admin/settings/route")

        const csrfResponse = await csrfModule.GET()
        const csrfBody = await csrfResponse.json() as { success?: boolean; data?: { csrfToken?: string } }

        expect(csrfResponse.status).toBe(200)
        expect(csrfBody.success).toBe(true)

        const csrfToken = csrfBody.data?.csrfToken
        expect(typeof csrfToken).toBe("string")
        expect(csrfToken && csrfToken.length > 8).toBe(true)

        const mutationPayload = {
            settings: {
                site_name: "Mum N Hun",
                posts_per_page: 10,
            },
            group: "general",
        }

        const blockedRequest = new NextRequest("http://localhost/api/admin/settings", {
            method: "PUT",
            headers: {
                "content-type": "application/json",
                origin: "http://localhost",
            },
            body: JSON.stringify(mutationPayload),
        })

        const blockedResponse = await settingsModule.PUT(blockedRequest)
        const blockedBody = await blockedResponse.json()

        expect(blockedResponse.status).toBe(403)
        expect(blockedBody).toEqual({ error: "Forbidden" })
        expect(mockUpdateSettingsStore).not.toHaveBeenCalled()

        const allowedRequest = new NextRequest("http://localhost/api/admin/settings", {
            method: "PUT",
            headers: {
                "content-type": "application/json",
                origin: "http://localhost",
                "x-csrf-token": csrfToken as string,
            },
            body: JSON.stringify(mutationPayload),
        })

        const allowedResponse = await settingsModule.PUT(allowedRequest)
        const allowedBody = await allowedResponse.json()

        expect(allowedResponse.status).toBe(200)
        expect(allowedBody).toMatchObject({ success: true })
        expect(mockUpdateSettingsStore).toHaveBeenCalledTimes(1)
        expect(mockUpdateSettingsStore).toHaveBeenCalledWith(
            {
                site_name: "Mum N Hun",
                posts_per_page: "10",
            },
            { group: "general" }
        )
    })
})
