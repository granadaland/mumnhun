import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import prisma from "@/lib/db/prisma"
import { requireAdminApi, requireAdminMutationApi } from "@/lib/security/admin"
import { adminJsonValidationError } from "@/lib/security/admin-helpers"
import { logAdminError, logAdminInfo, logAdminWarn } from "@/lib/observability/admin-log"
import { updateSettings as updateSettingsStore } from "@/lib/settings"

const settingsGroupSchema = z
    .string()
    .trim()
    .min(1)
    .max(64)
    .regex(/^[a-z0-9_-]+$/i, "group contains invalid characters")

const settingsKeySchema = z
    .string()
    .trim()
    .min(1)
    .max(120)
    .regex(/^[a-z0-9_.-]+$/i, "Invalid settings key format")

const settingsValueSchema = z
    .union([z.string(), z.number(), z.boolean()])
    .transform((value) => String(value).trim())
    .refine((value) => value.length > 0, {
        message: "Setting value cannot be empty",
    })
    .refine((value) => value.length <= 10000, {
        message: "Setting value is too long",
    })

const listSettingsQuerySchema = z.object({
    group: settingsGroupSchema.optional(),
})

const updateSettingsPayloadSchema = z.object({
    group: settingsGroupSchema.optional(),
    settings: z
        .record(settingsKeySchema, settingsValueSchema)
        .refine((settings) => Object.keys(settings).length > 0, {
            message: "At least one setting is required",
            path: ["settings"],
        })
        .refine((settings) => Object.keys(settings).length <= 200, {
            message: "Too many settings in one request",
            path: ["settings"],
        }),
})

// GET: Fetch settings by group (or all)
export async function GET(request: NextRequest) {
    const adminCheck = await requireAdminApi()
    if (!adminCheck.ok) return adminCheck.response

    const requestId = crypto.randomUUID()

    const { searchParams } = new URL(request.url)
    const parsedQuery = listSettingsQuerySchema.safeParse({
        group: searchParams.get("group")?.trim() || undefined,
    })

    if (!parsedQuery.success) {
        return adminJsonValidationError(parsedQuery.error)
    }

    const { group } = parsedQuery.data

    try {
        const settings = await prisma.siteSetting.findMany({
            where: group ? { group } : undefined,
            orderBy: { key: "asc" },
        })

        logAdminInfo({
            requestId,
            action: "settings:list",
            userId: adminCheck.identity.id,
            role: adminCheck.identity.role,
            roleSource: adminCheck.identity.source,
            status: 200,
            payloadSummary: { group: group || "all", total: settings.length },
            validation: { ok: true },
        })

        return NextResponse.json({ success: true, data: settings })
    } catch (error) {
        logAdminError({
            requestId,
            action: "settings:list",
            userId: adminCheck.identity.id,
            role: adminCheck.identity.role,
            roleSource: adminCheck.identity.source,
            status: 500,
            error: error instanceof Error ? error.message : "Unknown error",
        })
        return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 })
    }
}

// PUT: Update settings (batch)
export async function PUT(request: NextRequest) {
    const adminCheck = await requireAdminMutationApi(request, { action: "settings:update" })
    if (!adminCheck.ok) return adminCheck.response

    const requestId = crypto.randomUUID()

    let payload: z.infer<typeof updateSettingsPayloadSchema>

    try {
        const body = await request.json()
        const parsedBody = updateSettingsPayloadSchema.safeParse(body)
        if (!parsedBody.success) {
            logAdminWarn({
                requestId,
                action: "settings:update",
                userId: adminCheck.identity.id,
                role: adminCheck.identity.role,
                roleSource: adminCheck.identity.source,
                status: 400,
                validation: { ok: false, reason: "invalid_settings_data" },
            })
            return adminJsonValidationError(parsedBody.error)
        }

        payload = parsedBody.data
    } catch (error) {
        logAdminWarn({
            requestId,
            action: "settings:update",
            userId: adminCheck.identity.id,
            role: adminCheck.identity.role,
            roleSource: adminCheck.identity.source,
            status: 400,
            validation: { ok: false, reason: "malformed_json" },
        })
        return adminJsonValidationError(error)
    }

    try {
        const entries = Object.entries(payload.settings)
        const normalizedSettings = Object.fromEntries(entries.map(([key, value]) => [key, value]))
        const resolvedGroup = payload.group || "general"
        const results = await updateSettingsStore(normalizedSettings, { group: resolvedGroup })

        logAdminInfo({
            requestId,
            action: "settings:update",
            userId: adminCheck.identity.id,
            role: adminCheck.identity.role,
            roleSource: adminCheck.identity.source,
            status: 200,
            payloadSummary: { group: resolvedGroup, totalKeys: entries.length },
            validation: { ok: true },
        })

        return NextResponse.json({ success: true, data: results })
    } catch (error) {
        logAdminError({
            requestId,
            action: "settings:update",
            userId: adminCheck.identity.id,
            role: adminCheck.identity.role,
            roleSource: adminCheck.identity.source,
            status: 500,
            error: error instanceof Error ? error.message : "Unknown error",
        })
        return NextResponse.json({ error: "Failed to update settings" }, { status: 500 })
    }
}
