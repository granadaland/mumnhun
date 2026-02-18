type AlertLevel = "warn" | "error"

type AdminOperationalEvent = {
    status?: number
    action?: string
    requestId?: string
}

type AlertConfig = {
    windowMs: number
    authSpikeThreshold: number
    serverErrorSpikeThreshold: number
    cooldownMs: number
}

type AlertBucket = {
    timestamps: number[]
    lastAlertAt: number
}

type AdminAlertGlobalState = {
    __adminAlertBuckets?: Map<string, AlertBucket>
    __adminMonitoringEvents?: MonitoringEvent[]
}

type MonitoringEvent = {
    ts: number
    action: string
    status?: number
    kind: "request" | "ai_task_failure"
}

export type AdminMonitoringSnapshot = {
    windowMs: number
    fromIso: string
    toIso: string
    totalEvents: number
    unauthorizedCount: number
    serverErrorCount: number
    aiTaskFailureCount: number
    topEndpoints: Array<{
        action: string
        count: number
    }>
}

type SlackPayload = {
    text: string
    blocks: Array<{
        type: "section"
        text: {
            type: "mrkdwn"
            text: string
        }
    }>
}

function getNumberEnv(name: string, fallback: number): number {
    const raw = process.env[name]?.trim()
    if (!raw) return fallback
    const parsed = Number(raw)
    if (!Number.isFinite(parsed) || parsed <= 0) return fallback
    return Math.floor(parsed)
}

function getAlertConfig(): AlertConfig {
    return {
        windowMs: getNumberEnv("ADMIN_ALERT_WINDOW_MS", 300_000),
        authSpikeThreshold: getNumberEnv("ADMIN_ALERT_AUTH_SPIKE_THRESHOLD", 10),
        serverErrorSpikeThreshold: getNumberEnv("ADMIN_ALERT_ERROR_SPIKE_THRESHOLD", 5),
        cooldownMs: getNumberEnv("ADMIN_ALERT_COOLDOWN_MS", 300_000),
    }
}

function getBuckets(): Map<string, AlertBucket> {
    const globalState = globalThis as AdminAlertGlobalState
    if (!globalState.__adminAlertBuckets) {
        globalState.__adminAlertBuckets = new Map<string, AlertBucket>()
    }
    return globalState.__adminAlertBuckets
}

function pruneBucket(bucket: AlertBucket, now: number, windowMs: number) {
    const minTs = now - windowMs
    bucket.timestamps = bucket.timestamps.filter((ts) => ts > minTs)
}

function getOrCreateBucket(key: string): AlertBucket {
    const buckets = getBuckets()
    const existing = buckets.get(key)
    if (existing) return existing

    const created: AlertBucket = {
        timestamps: [],
        lastAlertAt: 0,
    }
    buckets.set(key, created)
    return created
}

function getMonitoringEvents(): MonitoringEvent[] {
    const globalState = globalThis as AdminAlertGlobalState
    if (!globalState.__adminMonitoringEvents) {
        globalState.__adminMonitoringEvents = []
    }
    return globalState.__adminMonitoringEvents
}

function recordMonitoringEvent(event: MonitoringEvent) {
    const events = getMonitoringEvents()
    events.push(event)
}

function pruneMonitoringEvents(events: MonitoringEvent[], now: number, windowMs: number) {
    const minTs = now - windowMs
    let writeIdx = 0
    for (let readIdx = 0; readIdx < events.length; readIdx += 1) {
        const item = events[readIdx]
        if (item.ts > minTs) {
            events[writeIdx] = item
            writeIdx += 1
        }
    }
    events.length = writeIdx
}

function isSlackWebhookUrl(url: string): boolean {
    return /hooks\.slack(?:-gov)?\.com\/services\//.test(url)
}

function formatValueForSlack(value: unknown): string {
    if (value === null || value === undefined || value === "") return "-"
    if (typeof value === "object") {
        try {
            return JSON.stringify(value)
        } catch {
            return "[unserializable]"
        }
    }
    return String(value)
}

function buildSlackPayload(level: AlertLevel, event: Record<string, unknown>): SlackPayload {
    const icon = level === "error" ? "🚨" : "⚠️"
    const headline = `${icon} *Admin Alert ${level.toUpperCase()}*`

    const detailLines = Object.entries(event)
        .filter(([key]) => key !== "scope")
        .map(([key, value]) => `• *${key}*: ${formatValueForSlack(value)}`)

    return {
        text: `${icon} admin alert ${formatValueForSlack(event.kind)}`,
        blocks: [
            {
                type: "section",
                text: {
                    type: "mrkdwn",
                    text: headline,
                },
            },
            {
                type: "section",
                text: {
                    type: "mrkdwn",
                    text: detailLines.join("\n") || "No details",
                },
            },
        ],
    }
}

function emitAlert(level: AlertLevel, payload: Record<string, unknown>) {
    const event = {
        ts: new Date().toISOString(),
        scope: "admin-alert",
        ...payload,
    }

    const serialized = JSON.stringify(event)
    if (level === "error") {
        console.error(serialized)
    } else {
        console.warn(serialized)
    }

    const slackWebhookUrl = process.env.SLACK_ALERT_WEBHOOK_URL?.trim()
    const genericWebhookUrl = process.env.ADMIN_ALERT_WEBHOOK_URL?.trim()
    const webhookUrl = slackWebhookUrl || genericWebhookUrl

    if (webhookUrl && typeof fetch === "function") {
        const shouldUseSlackPayload =
            Boolean(slackWebhookUrl) || isSlackWebhookUrl(webhookUrl)

        const body = shouldUseSlackPayload
            ? JSON.stringify(buildSlackPayload(level, event))
            : serialized

        void fetch(webhookUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body,
        }).catch((error) => {
            console.error(
                JSON.stringify({
                    ts: new Date().toISOString(),
                    scope: "admin-alert",
                    kind: "alert_delivery_failed",
                    error: error instanceof Error ? error.message : "Unknown error",
                })
            )
        })
    }
}

function recordSpikeEvent(
    bucketKey: string,
    threshold: number,
    level: AlertLevel,
    kind: "auth_spike" | "server_error_spike",
    event: AdminOperationalEvent,
    config: AlertConfig
) {
    const now = Date.now()
    const bucket = getOrCreateBucket(bucketKey)
    pruneBucket(bucket, now, config.windowMs)
    bucket.timestamps.push(now)

    if (bucket.timestamps.length < threshold) {
        return
    }

    if (now - bucket.lastAlertAt < config.cooldownMs) {
        return
    }

    bucket.lastAlertAt = now

    emitAlert(level, {
        kind,
        action: event.action,
        requestId: event.requestId,
        currentCount: bucket.timestamps.length,
        threshold,
        windowMs: config.windowMs,
        cooldownMs: config.cooldownMs,
        status: event.status,
    })
}

export function observeAdminOperationalEvent(event: AdminOperationalEvent) {
    const now = Date.now()
    const action =
        typeof event.action === "string" && event.action.trim().length > 0
            ? event.action.trim()
            : "unknown"

    recordMonitoringEvent({
        ts: now,
        action,
        status: typeof event.status === "number" ? event.status : undefined,
        kind: "request",
    })

    const status = event.status
    if (typeof status !== "number") return

    const config = getAlertConfig()

    if (status === 401 || status === 403) {
        recordSpikeEvent(
            "admin-auth-4xx",
            config.authSpikeThreshold,
            "warn",
            "auth_spike",
            event,
            config
        )
        return
    }

    if (status >= 500) {
        recordSpikeEvent(
            "admin-server-5xx",
            config.serverErrorSpikeThreshold,
            "error",
            "server_error_spike",
            event,
            config
        )
    }
}

export function notifyAiTaskFailure(params: {
    taskId: string
    action: string
    requestId?: string
    userId?: string | null
    error?: string | null
}) {
    recordMonitoringEvent({
        ts: Date.now(),
        action: params.action,
        kind: "ai_task_failure",
    })

    emitAlert("error", {
        kind: "ai_task_failure",
        action: params.action,
        requestId: params.requestId,
        taskId: params.taskId,
        userId: params.userId,
        error: params.error,
    })
}

export function getAdminMonitoringSnapshot(
    params: {
        windowMs?: number
        topEndpointsLimit?: number
    } = {}
): AdminMonitoringSnapshot {
    const now = Date.now()
    const windowMs =
        typeof params.windowMs === "number" && params.windowMs > 0
            ? Math.floor(params.windowMs)
            : getNumberEnv("ADMIN_MONITORING_WINDOW_MS", 86_400_000)

    const topEndpointsLimit =
        typeof params.topEndpointsLimit === "number" && params.topEndpointsLimit > 0
            ? Math.floor(params.topEndpointsLimit)
            : getNumberEnv("ADMIN_MONITORING_TOP_ENDPOINTS_LIMIT", 5)

    const events = getMonitoringEvents()
    pruneMonitoringEvents(events, now, windowMs)

    let unauthorizedCount = 0
    let serverErrorCount = 0
    let aiTaskFailureCount = 0

    const endpointCounter = new Map<string, number>()

    for (const event of events) {
        if (event.kind === "ai_task_failure") {
            aiTaskFailureCount += 1
            continue
        }

        if (event.status === 401 || event.status === 403) {
            unauthorizedCount += 1
        }

        if (typeof event.status === "number" && event.status >= 500) {
            serverErrorCount += 1
        }

        endpointCounter.set(event.action, (endpointCounter.get(event.action) ?? 0) + 1)
    }

    const topEndpoints = Array.from(endpointCounter.entries())
        .map(([action, count]) => ({ action, count }))
        .sort((a, b) => {
            if (b.count !== a.count) return b.count - a.count
            return a.action.localeCompare(b.action)
        })
        .slice(0, topEndpointsLimit)

    return {
        windowMs,
        fromIso: new Date(now - windowMs).toISOString(),
        toIso: new Date(now).toISOString(),
        totalEvents: events.length,
        unauthorizedCount,
        serverErrorCount,
        aiTaskFailureCount,
        topEndpoints,
    }
}

export function __resetAdminAlertStateForTests() {
    getBuckets().clear()
    getMonitoringEvents().length = 0
}
