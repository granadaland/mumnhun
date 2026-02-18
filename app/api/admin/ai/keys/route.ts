import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/db/prisma"
import { requireAdminApi, requireAdminMutationApi } from "@/lib/security/admin"
import {
    ApiKeyCryptoConfigError,
    decryptStoredApiKey,
    encryptApiKey,
} from "@/lib/security/api-key-crypto"
import { logAdminError, logAdminInfo, logAdminWarn } from "@/lib/observability/admin-log"

function maskApiKey(value: string): string {
    if (!value) return ""
    if (value.length <= 8) return "••••••••"
    return `${value.slice(0, 4)}${"•".repeat(Math.max(0, value.length - 8))}${value.slice(-4)}`
}

function maskStoredApiKey(storedValue: string): string {
    try {
        return maskApiKey(decryptStoredApiKey(storedValue))
    } catch {
        return "••••••••"
    }
}

function sanitizeKeyRecord(key: {
    id: string
    provider: string
    label: string | null
    isActive: boolean
    usageCount: number
    order: number
    lastUsedAt: Date | null
    lastError: string | null
    apiKey: string
}) {
    return {
        id: key.id,
        provider: key.provider,
        label: key.label,
        isActive: key.isActive,
        usageCount: key.usageCount,
        order: key.order,
        lastUsedAt: key.lastUsedAt,
        lastError: key.lastError,
        apiKeyMasked: maskStoredApiKey(key.apiKey),
    }
}

// GET: List all API keys (never return plaintext key)
export async function GET() {
    const adminCheck = await requireAdminApi()
    if (!adminCheck.ok) return adminCheck.response

    const requestId = crypto.randomUUID()

    try {
        const keys = await prisma.aiApiKey.findMany({
            orderBy: { order: "asc" },
        })

        logAdminInfo({
            requestId,
            action: "ai-keys:list",
            userId: adminCheck.identity.id,
            role: adminCheck.identity.role,
            roleSource: adminCheck.identity.source,
            status: 200,
            payloadSummary: { total: keys.length },
            validation: { ok: true },
        })

        return NextResponse.json({ success: true, data: keys.map(sanitizeKeyRecord) })
    } catch (error) {
        logAdminError({
            requestId,
            action: "ai-keys:list",
            userId: adminCheck.identity.id,
            role: adminCheck.identity.role,
            roleSource: adminCheck.identity.source,
            status: 500,
            error: error instanceof Error ? error.message : "Unknown error",
        })

        return NextResponse.json({ error: "Failed to load API keys" }, { status: 500 })
    }
}

// POST: Add new API key
export async function POST(request: NextRequest) {
    const adminCheck = await requireAdminMutationApi(request, { action: "ai-keys:create" })
    if (!adminCheck.ok) return adminCheck.response

    const requestId = crypto.randomUUID()

    try {
        const body = await request.json()
        const { label, apiKey } = body as { label?: string; apiKey?: string }

        if (!apiKey?.trim()) {
            logAdminWarn({
                requestId,
                action: "ai-keys:create",
                userId: adminCheck.identity.id,
                role: adminCheck.identity.role,
                roleSource: adminCheck.identity.source,
                status: 400,
                validation: { ok: false, reason: "missing_api_key" },
            })
            return NextResponse.json({ error: "API key is required" }, { status: 400 })
        }

        // Check max 5 keys
        const count = await prisma.aiApiKey.count()
        if (count >= 5) {
            return NextResponse.json({ error: "Maximum 5 API keys allowed" }, { status: 400 })
        }

        const newKey = await prisma.aiApiKey.create({
            data: {
                label: label?.trim() ? label.trim() : null,
                apiKey: encryptApiKey(apiKey.trim()),
                order: count,
            },
        })

        logAdminInfo({
            requestId,
            action: "ai-keys:create",
            userId: adminCheck.identity.id,
            role: adminCheck.identity.role,
            roleSource: adminCheck.identity.source,
            status: 200,
            payloadSummary: { createdId: newKey.id },
            validation: { ok: true },
        })

        return NextResponse.json({ success: true, data: sanitizeKeyRecord(newKey) })
    } catch (error) {
        if (error instanceof ApiKeyCryptoConfigError) {
            logAdminError({
                requestId,
                action: "ai-keys:create",
                userId: adminCheck.identity.id,
                role: adminCheck.identity.role,
                roleSource: adminCheck.identity.source,
                status: 500,
                error: error.message,
            })

            return NextResponse.json({ error: "Failed to add API key" }, { status: 500 })
        }

        logAdminError({
            requestId,
            action: "ai-keys:create",
            userId: adminCheck.identity.id,
            role: adminCheck.identity.role,
            roleSource: adminCheck.identity.source,
            status: 500,
            error: error instanceof Error ? error.message : "Unknown error",
        })
        return NextResponse.json({ error: "Failed to add API key" }, { status: 500 })
    }
}

// PUT: Update API key (toggle active status)
export async function PUT(request: NextRequest) {
    const adminCheck = await requireAdminMutationApi(request, { action: "ai-keys:update" })
    if (!adminCheck.ok) return adminCheck.response

    const requestId = crypto.randomUUID()

    try {
        const body = await request.json()
        const { id, isActive, apiKey } = body as { id?: string; isActive?: boolean; apiKey?: string }

        if (!id) {
            return NextResponse.json({ error: "Key ID is required" }, { status: 400 })
        }

        const updateData: {
            isActive?: boolean
            apiKey?: string
        } = {}

        if (typeof isActive === "boolean") {
            updateData.isActive = isActive
        }

        if (typeof apiKey === "string") {
            if (!apiKey.trim()) {
                return NextResponse.json({ error: "API key cannot be empty" }, { status: 400 })
            }

            updateData.apiKey = encryptApiKey(apiKey.trim())
        }

        if (Object.keys(updateData).length === 0) {
            return NextResponse.json({ error: "No fields to update" }, { status: 400 })
        }

        const updated = await prisma.aiApiKey.update({
            where: { id },
            data: updateData,
        })

        logAdminInfo({
            requestId,
            action: "ai-keys:update",
            userId: adminCheck.identity.id,
            role: adminCheck.identity.role,
            roleSource: adminCheck.identity.source,
            status: 200,
            payloadSummary: { id, updatedFields: Object.keys(updateData) },
            validation: { ok: true },
        })

        return NextResponse.json({ success: true, data: sanitizeKeyRecord(updated) })
    } catch (error) {
        if (error instanceof ApiKeyCryptoConfigError) {
            logAdminError({
                requestId,
                action: "ai-keys:update",
                userId: adminCheck.identity.id,
                role: adminCheck.identity.role,
                roleSource: adminCheck.identity.source,
                status: 500,
                error: error.message,
            })

            return NextResponse.json({ error: "Failed to update API key" }, { status: 500 })
        }

        logAdminError({
            requestId,
            action: "ai-keys:update",
            userId: adminCheck.identity.id,
            role: adminCheck.identity.role,
            roleSource: adminCheck.identity.source,
            status: 500,
            error: error instanceof Error ? error.message : "Unknown error",
        })
        return NextResponse.json({ error: "Failed to update API key" }, { status: 500 })
    }
}

// DELETE: Remove API key
export async function DELETE(request: NextRequest) {
    const adminCheck = await requireAdminMutationApi(request, { action: "ai-keys:delete" })
    if (!adminCheck.ok) return adminCheck.response

    const requestId = crypto.randomUUID()

    try {
        const body = await request.json()
        const { id } = body as { id?: string }

        if (!id) {
            return NextResponse.json({ error: "Key ID is required" }, { status: 400 })
        }

        await prisma.aiApiKey.delete({ where: { id } })

        logAdminInfo({
            requestId,
            action: "ai-keys:delete",
            userId: adminCheck.identity.id,
            role: adminCheck.identity.role,
            roleSource: adminCheck.identity.source,
            status: 200,
            payloadSummary: { id },
            validation: { ok: true },
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        logAdminError({
            requestId,
            action: "ai-keys:delete",
            userId: adminCheck.identity.id,
            role: adminCheck.identity.role,
            roleSource: adminCheck.identity.source,
            status: 500,
            error: error instanceof Error ? error.message : "Unknown error",
        })

        return NextResponse.json({ error: "Failed to delete API key" }, { status: 500 })
    }
}
