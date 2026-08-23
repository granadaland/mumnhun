import { NextRequest } from "next/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/db/prisma", () => ({ default: {} }))

const mockRequireAdminMutationApi = vi.fn()
vi.mock("@/lib/security/admin", () => ({
    requireAdminMutationApi: mockRequireAdminMutationApi,
    requireAdminApi: vi.fn(),
}))

vi.mock("@/lib/security/ai-key-status", () => ({
    classifyProviderFailure: vi.fn(() => ({ code: "UNKNOWN_ERROR", message: "error" })),
    toAiKeyFailureHttpStatus: vi.fn(() => 502),
}))

vi.mock("@/lib/observability/admin-log", () => ({
    logAdminError: vi.fn(),
    logAdminInfo: vi.fn(),
    logAdminWarn: vi.fn(),
}))

const mockGenerateRoleJson = vi.fn()
const mockGenerateRoleText = vi.fn()

class FakeRoleNotConfigured extends Error {
    role: string
    constructor(role: string) {
        super("not configured")
        this.role = role
    }
}

vi.mock("@/lib/ai/task-models", () => ({
    RoleModelNotConfiguredError: FakeRoleNotConfigured,
    generateRoleJson: mockGenerateRoleJson,
    generateRoleText: mockGenerateRoleText,
}))

// Real class so instanceof checks inside the route match what provider throws.
const { AiJsonFormatError } = await import("@/lib/ai/provider")
const { POST: assistPost } = await import("@/app/api/admin/ai/assist/route")

const adminIdentity = {
    id: "admin-salvage-1",
    email: "admin@example.com",
    role: "ADMIN" as const,
    source: "database" as const,
}

function buildRequest(body: unknown) {
    return new NextRequest("http://localhost/api/admin/ai/assist", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
    })
}

const MARKDOWN_ARTICLE = [
    "## Cara Menyimpan ASI Perah dengan Benar",
    "",
    "ASI perah adalah rezeki yang berharga untuk si Kecil. Banyak Mums bingung soal cara penyimpanannya yang aman.",
    "",
    "### Suhu Penyimpanan",
    "",
    "Suhu ruang, kulkas, dan freezer punya batas waktu berbeda. Berikut panduannya.",
    "",
    "- Suhu ruang hingga 4 jam",
    "- Kulkas hingga 4 hari",
    "- Freezer hingga 6 bulan",
    "",
    "Selalu gunakan wadah steril dan beri label tanggal perah agar mudah diputar stok.",
].join("\n")

describe("POST /api/admin/ai/assist: salvage dari output non-JSON", () => {
    beforeEach(() => {
        vi.clearAllMocks()
        mockRequireAdminMutationApi.mockResolvedValue({ ok: true, identity: adminIdentity })
    })

    it("generate_content menyelamatkan artikel Markdown tanpa panggilan kedua", async () => {
        mockGenerateRoleJson.mockRejectedValueOnce(
            new AiJsonFormatError("Output AI tidak dapat diparse sebagai JSON pada percobaan panjang.", MARKDOWN_ARTICLE, 57_000)
        )

        const response = await assistPost(
            buildRequest({
                action: "generate_content",
                payload: {
                    title: "Cara Menyimpan ASI Perah",
                    outline: "<h2>Penyimpanan</h2>",
                    targetWordCount: 800,
                },
            })
        )
        const body = await response.json()

        expect(response.status).toBe(200)
        expect(body.success).toBe(true)
        expect(body.data.contentHtml).toContain("<h2>")
        expect(body.data.contentHtml).toContain("<li>Suhu ruang hingga 4 jam</li>")
        // Salvage means no second model call is needed.
        expect(mockGenerateRoleText).not.toHaveBeenCalled()
    })

    it("generate_content jatuh ke reprompt Markdown bila raw tidak bisa diselamatkan", async () => {
        mockGenerateRoleJson.mockRejectedValueOnce(
            new AiJsonFormatError("bukan json", "maaf, saya tidak bisa.", 40_000)
        )
        mockGenerateRoleText.mockResolvedValueOnce({
            value: MARKDOWN_ARTICLE,
            roleModelId: "role-text",
        })

        const response = await assistPost(
            buildRequest({
                action: "generate_content",
                payload: {
                    title: "Cara Menyimpan ASI Perah",
                    outline: "<h2>Penyimpanan</h2>",
                },
            })
        )
        const body = await response.json()

        expect(response.status).toBe(200)
        expect(body.data.contentHtml).toContain("<h2>")
        expect(mockGenerateRoleText).toHaveBeenCalledTimes(1)
    })

    it("generate_outline menyelamatkan outline Markdown", async () => {
        const markdownOutline = [
            "## Pendahuluan ASI Perah",
            "Poin pembuka tentang pentingnya ASI perah bagi Mums bekerja.",
            "### Peralatan Wajib",
            "### Suhu dan Durasi",
            "## Kesimpulan Praktis",
        ].join("\n")

        mockGenerateRoleJson.mockRejectedValueOnce(
            new AiJsonFormatError("bukan json", markdownOutline, 50_000)
        )

        const response = await assistPost(
            buildRequest({
                action: "generate_outline",
                payload: { title: "Menyimpan ASI Perah" },
            })
        )
        const body = await response.json()

        expect(response.status).toBe(200)
        expect(body.data.outlineHtml).toContain("<h2>Pendahuluan ASI Perah</h2>")
        expect(body.data.outlineHtml).toContain("<h3>Peralatan Wajib</h3>")
    })

    it("error non-format tetap diteruskan ke handler luar", async () => {
        mockGenerateRoleJson.mockRejectedValueOnce(new FakeRoleNotConfigured("text"))

        const response = await assistPost(
            buildRequest({
                action: "generate_outline",
                payload: { title: "Menyimpan ASI Perah" },
            })
        )
        const body = await response.json()

        expect(response.status).toBe(400)
        expect(body.errorCode).toBe("AI_ROLE_NOT_CONFIGURED")
    })
})
