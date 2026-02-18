import { beforeEach, describe, expect, it, vi } from "vitest"

describe("Admin monitoring dashboard", () => {
    beforeEach(() => {
        vi.resetModules()
        vi.restoreAllMocks()
    })

    it("render ringkasan metrik 24 jam dari snapshot observability", async () => {
        vi.doMock("@/lib/observability/admin-alerts", () => ({
            getAdminMonitoringSnapshot: vi.fn(() => ({
                windowMs: 86_400_000,
                fromIso: "2026-02-16T00:00:00.000Z",
                toIso: "2026-02-17T00:00:00.000Z",
                totalEvents: 52,
                unauthorizedCount: 11,
                serverErrorCount: 4,
                aiTaskFailureCount: 3,
                topEndpoints: [
                    { action: "settings:update", count: 16 },
                    { action: "media:list", count: 10 },
                ],
            })),
        }))

        const pageModule = await vi.importActual<typeof import("@/app/admin/monitoring/page")>(
            "@/app/admin/monitoring/page"
        )

        const rendered = pageModule.default()
        const serialized = JSON.stringify(rendered)

        expect(serialized).toContain("Monitoring Operasional")
        expect(serialized).toContain("401/403")
        expect(serialized).toContain("500+")
        expect(serialized).toContain("AI Task Failed")
        expect(serialized).toContain("Top Endpoint (24 Jam)")
        expect(serialized).toContain("settings:update")
        expect(serialized).toContain("media:list")
    })
})
