import { randomUUID } from "crypto"
import { notifyAiTaskFailure, observeAdminOperationalEvent } from "@/lib/observability/admin-alerts"

type LogLevel = "info" | "warn" | "error"

type AdminLogPayload = {
    requestId?: string
    action: string
    userId?: string | null
    role?: string | null
    roleSource?: string | null
    status?: number
    payloadSummary?: Record<string, unknown>
    validation?: { ok: boolean; reason?: string }
    prismaCode?: string | null
    error?: string | null
}

function emit(level: LogLevel, payload: AdminLogPayload) {
    const event = {
        ts: new Date().toISOString(),
        requestId: payload.requestId || randomUUID(),
        level,
        scope: "admin-api",
        ...payload,
    }

    observeAdminOperationalEvent({
        status: payload.status,
        action: payload.action,
        requestId: event.requestId,
    })

    if (
        payload.action === "ai-generate:create" &&
        typeof payload.status === "number" &&
        payload.status >= 500
    ) {
        const taskId =
            typeof payload.payloadSummary?.taskId === "string"
                ? payload.payloadSummary.taskId
                : "unknown-task"

        notifyAiTaskFailure({
            taskId,
            action: payload.action,
            requestId: event.requestId,
            userId: payload.userId,
            error: payload.error || null,
        })
    }

    if (level === "error") {
        console.error(JSON.stringify(event))
        return
    }

    if (level === "warn") {
        console.warn(JSON.stringify(event))
        return
    }

    console.info(JSON.stringify(event))
}

export function logAdminInfo(payload: AdminLogPayload) {
    emit("info", payload)
}

export function logAdminWarn(payload: AdminLogPayload) {
    emit("warn", payload)
}

export function logAdminError(payload: AdminLogPayload) {
    emit("error", payload)
}
