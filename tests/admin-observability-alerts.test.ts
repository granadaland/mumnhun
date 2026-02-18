import { beforeEach, describe, expect, it, vi } from "vitest"

describe("Admin operational monitoring alerts", () => {
    beforeEach(async () => {
        vi.resetModules()
        vi.restoreAllMocks()
        delete process.env.ADMIN_ALERT_WINDOW_MS
        delete process.env.ADMIN_ALERT_AUTH_SPIKE_THRESHOLD
        delete process.env.ADMIN_ALERT_ERROR_SPIKE_THRESHOLD
        delete process.env.ADMIN_ALERT_COOLDOWN_MS
        delete process.env.ADMIN_ALERT_WEBHOOK_URL
        delete process.env.SLACK_ALERT_WEBHOOK_URL
    })

    it("trigger alert saat lonjakan 401/403 melewati threshold", async () => {
        process.env.ADMIN_ALERT_WINDOW_MS = "60000"
        process.env.ADMIN_ALERT_AUTH_SPIKE_THRESHOLD = "2"
        process.env.ADMIN_ALERT_COOLDOWN_MS = "60000"

        const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => { })

        const alerts = await vi.importActual<typeof import("@/lib/observability/admin-alerts")>(
            "@/lib/observability/admin-alerts"
        )

        alerts.__resetAdminAlertStateForTests()
        alerts.observeAdminOperationalEvent({ status: 401, action: "admin-auth" })
        alerts.observeAdminOperationalEvent({ status: 403, action: "admin-auth" })

        expect(warnSpy).toHaveBeenCalled()
        const serialized = warnSpy.mock.calls.find(([line]) => typeof line === "string")?.[0] as string
        const parsed = JSON.parse(serialized)
        expect(parsed.kind).toBe("auth_spike")
        expect(parsed.threshold).toBe(2)
    })

    it("trigger alert saat lonjakan 500 melewati threshold", async () => {
        process.env.ADMIN_ALERT_WINDOW_MS = "60000"
        process.env.ADMIN_ALERT_ERROR_SPIKE_THRESHOLD = "2"
        process.env.ADMIN_ALERT_COOLDOWN_MS = "60000"

        const errorSpy = vi.spyOn(console, "error").mockImplementation(() => { })

        const alerts = await vi.importActual<typeof import("@/lib/observability/admin-alerts")>(
            "@/lib/observability/admin-alerts"
        )

        alerts.__resetAdminAlertStateForTests()
        alerts.observeAdminOperationalEvent({ status: 500, action: "settings:update" })
        alerts.observeAdminOperationalEvent({ status: 500, action: "settings:update" })

        expect(errorSpy).toHaveBeenCalled()
        const serialized = errorSpy.mock.calls.find(([line]) => typeof line === "string")?.[0] as string
        const parsed = JSON.parse(serialized)
        expect(parsed.kind).toBe("server_error_spike")
        expect(parsed.threshold).toBe(2)
    })

    it("trigger alert khusus untuk kegagalan task AI", async () => {
        const errorSpy = vi.spyOn(console, "error").mockImplementation(() => { })

        const alerts = await vi.importActual<typeof import("@/lib/observability/admin-alerts")>(
            "@/lib/observability/admin-alerts"
        )

        alerts.notifyAiTaskFailure({
            taskId: "task-123",
            action: "ai-generate:create",
            requestId: "req-1",
            userId: "admin-1",
            error: "provider timeout",
        })

        expect(errorSpy).toHaveBeenCalled()
        const serialized = errorSpy.mock.calls.find(([line]) => typeof line === "string")?.[0] as string
        const parsed = JSON.parse(serialized)
        expect(parsed.kind).toBe("ai_task_failure")
        expect(parsed.taskId).toBe("task-123")
    })

    it("kirim payload Slack blocks saat SLACK_ALERT_WEBHOOK_URL terpasang", async () => {
        process.env.SLACK_ALERT_WEBHOOK_URL = "https://hooks.slack.com/services/T000/B000/XXX"

        const fetchSpy = vi
            .spyOn(globalThis, "fetch")
            .mockResolvedValue(new Response(null, { status: 200 }))
        vi.spyOn(console, "error").mockImplementation(() => { })

        const alerts = await vi.importActual<typeof import("@/lib/observability/admin-alerts")>(
            "@/lib/observability/admin-alerts"
        )

        alerts.notifyAiTaskFailure({
            taskId: "task-slack-1",
            action: "ai-generate:create",
            error: "provider timeout",
        })

        expect(fetchSpy).toHaveBeenCalledTimes(1)
        const [url, init] = fetchSpy.mock.calls[0] ?? []
        expect(url).toBe("https://hooks.slack.com/services/T000/B000/XXX")

        const body = typeof init?.body === "string" ? JSON.parse(init.body) : null
        expect(body?.text).toContain("admin alert")
        expect(Array.isArray(body?.blocks)).toBe(true)
        expect(body?.blocks?.[0]?.text?.text).toContain("Admin Alert")
    })

    it("fallback ke payload JSON generic saat hanya ADMIN_ALERT_WEBHOOK_URL terpasang", async () => {
        process.env.ADMIN_ALERT_WEBHOOK_URL = "https://example.com/webhooks/admin-alert"

        const fetchSpy = vi
            .spyOn(globalThis, "fetch")
            .mockResolvedValue(new Response(null, { status: 200 }))
        vi.spyOn(console, "error").mockImplementation(() => { })

        const alerts = await vi.importActual<typeof import("@/lib/observability/admin-alerts")>(
            "@/lib/observability/admin-alerts"
        )

        alerts.notifyAiTaskFailure({
            taskId: "task-generic-1",
            action: "ai-generate:create",
            error: "provider timeout",
        })

        expect(fetchSpy).toHaveBeenCalledTimes(1)
        const [url, init] = fetchSpy.mock.calls[0] ?? []
        expect(url).toBe("https://example.com/webhooks/admin-alert")

        const body = typeof init?.body === "string" ? JSON.parse(init.body) : null
        expect(body?.scope).toBe("admin-alert")
        expect(body?.kind).toBe("ai_task_failure")
        expect(body?.blocks).toBeUndefined()
    })
})
