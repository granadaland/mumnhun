import { beforeEach, describe, expect, it, vi } from "vitest"

const mockGetAdminCsrfToken = vi.fn<() => Promise<string>>()

vi.mock("@/lib/security/csrf-client", () => ({
    ADMIN_CSRF_HEADER: "x-csrf-token",
    getAdminCsrfToken: mockGetAdminCsrfToken,
    CsrfTokenRequestError: class CsrfTokenRequestError extends Error {
        status: number | null
        payload: unknown
        code: "CSRF_HTTP_ERROR" | "CSRF_INVALID_RESPONSE" | "CSRF_NETWORK_ERROR"

        constructor(
            message: string,
            options: {
                status?: number | null
                payload?: unknown
                code?: "CSRF_HTTP_ERROR" | "CSRF_INVALID_RESPONSE" | "CSRF_NETWORK_ERROR"
            } = {}
        ) {
            super(message)
            this.name = "CsrfTokenRequestError"
            this.status = options.status ?? null
            this.payload = options.payload
            this.code = options.code ?? "CSRF_NETWORK_ERROR"
        }
    },
}))

const mockFetch = vi.fn()
vi.stubGlobal("fetch", mockFetch)

describe("admin-client CSRF init failure classification", () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it("mengklasifikasikan kegagalan CSRF 403 sebagai HTTP_ERROR dengan status+payload", async () => {
        const csrfModule = await import("@/lib/security/csrf-client")
        const { adminPost } = await import("@/lib/api/admin-client")

        mockGetAdminCsrfToken.mockRejectedValueOnce(
            new csrfModule.CsrfTokenRequestError("Forbidden", {
                status: 403,
                payload: {
                    success: false,
                    error: "Forbidden",
                    errorCode: "CSRF_SESSION_INVALID",
                },
                code: "CSRF_HTTP_ERROR",
            })
        )

        await expect(
            adminPost("/api/admin/ai/keys", {
                body: { label: "A", apiKey: "AIza-test-key" },
            })
        ).rejects.toMatchObject({
            name: "AdminClientError",
            code: "HTTP_ERROR",
            status: 403,
            payload: {
                success: false,
                error: "Forbidden",
                errorCode: "CSRF_SESSION_INVALID",
            },
        })

        expect(mockFetch).not.toHaveBeenCalled()
    })

    it("mengklasifikasikan kegagalan CSRF network murni sebagai NETWORK_ERROR dengan pesan spesifik", async () => {
        const csrfModule = await import("@/lib/security/csrf-client")
        const { adminPost } = await import("@/lib/api/admin-client")

        mockGetAdminCsrfToken.mockRejectedValueOnce(
            new csrfModule.CsrfTokenRequestError("Gagal menginisialisasi token keamanan admin.", {
                code: "CSRF_NETWORK_ERROR",
            })
        )

        await expect(
            adminPost("/api/admin/ai/keys", {
                body: { label: "B", apiKey: "AIza-test-key" },
            })
        ).rejects.toMatchObject({
            name: "AdminClientError",
            code: "NETWORK_ERROR",
            status: null,
            message: "Gagal menginisialisasi token keamanan admin. Periksa koneksi lalu coba lagi.",
        })

        expect(mockFetch).not.toHaveBeenCalled()
    })
})
