import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import prisma from "@/lib/db/prisma"
import { requireAdminApi, requireAdminMutationApi } from "@/lib/security/admin"
import { logAdminError, logAdminInfo, logAdminWarn } from "@/lib/observability/admin-log"
import { summarizeUnknownError } from "@/lib/security/admin-helpers"
import { AGENT_SCOPES, generateAgentToken, parseAgentScopes } from "@/lib/security/agent-token"

const MAX_AGENT_TOKENS = 20

const createTokenSchema = z.object({
    name: z.string().trim().min(3, "Nama token minimal 3 karakter").max(80),
    scopes: z.array(z.enum(AGENT_SCOPES)).min(1, "Minimal satu scope wajib dipilih").max(AGENT_SCOPES.length),
    expiresInDays: z.coerce.number().int().min(1).max(365).optional(),
})

const updateTokenSchema = z.object({
    id: z.string().trim().min(1, "Token ID is required"),
    isActive: z.boolean().optional(),
    revoke: z.boolean().optional(),
})

const deleteTokenSchema = z.object({
    id: z.string().trim().min(1, "Token ID is required"),
})

function errorJson(error: string, errorCode: string, status: number, details?: Record<string, unknown>) {
    return NextResponse.json(
        {
            success: false,
            error,
            errorCode,
            ...(details ? { details } : {}),
        },
        { status }
    )
}

function validationErrorJson(zodError: z.ZodError) {
    return NextResponse.json(
        {
            success: false,
            error: "Validation failed",
            errorCode: "AGENT_TOKEN_VALIDATION_FAILED",
            details: {
                issues: zodError.issues.map((issue) => ({
                    path: issue.path.join("."),
                    code: issue.code,
                    message: issue.message,
                })),
            },
        },
        { status: 400 }
    )
}

function sanitizeTokenRecord(record: {
    id: string
    name: string
    tokenPrefix: string
    scopes: string
    isActive: boolean
    lastUsedAt: Date | null
    expiresAt: Date | null
    revokedAt: Date | null
    createdAt: Date
}) {
    const isExpired = Boolean(record.expiresAt && record.expiresAt.getTime() <= Date.now())

    return {
        id: record.id,
        name: record.name,
        tokenPrefix: record.tokenPrefix,
        scopes: parseAgentScopes(record.scopes),
        isActive: record.isActive && !record.revokedAt && !isExpired,
        revoked: Boolean(record.revokedAt),
        expired: isExpired,
        lastUsedAt: record.lastUsedAt,
        expiresAt: record.expiresAt,
        createdAt: record.createdAt,
    }
}

// GET: List agent tokens (never returns plaintext tokens)
export async function GET() {
    const adminCheck = await requireAdminApi()
    if (!adminCheck.ok) return adminCheck.response

    const requestId = crypto.randomUUID()

    try {
        const tokens = await prisma.agentApiToken.findMany({
            orderBy: { createdAt: "desc" },
        })

        logAdminInfo({
            requestId,
            action: "agent-tokens:list",
            userId: adminCheck.identity.id,
            role: adminCheck.identity.role,
            roleSource: adminCheck.identity.source,
            status: 200,
            payloadSummary: { total: tokens.length },
            validation: { ok: true },
        })

        return NextResponse.json({ success: true, data: tokens.map(sanitizeTokenRecord) })
    } catch (error) {
        logAdminError({
            requestId,
            action: "agent-tokens:list",
            userId: adminCheck.identity.id,
            role: adminCheck.identity.role,
            roleSource: adminCheck.identity.source,
            status: 500,
            error: summarizeUnknownError(error),
        })

        return errorJson("Failed to load agent tokens", "AGENT_TOKENS_LIST_FAILED", 500)
    }
}

// POST: Issue a new agent token. The plaintext value is returned exactly once.
export async function POST(request: NextRequest) {
    const adminCheck = await requireAdminMutationApi(request, { action: "agent-tokens:create" })
    if (!adminCheck.ok) return adminCheck.response

    const requestId = crypto.randomUUID()

    try {
        const body = await request.json()
        const parsed = createTokenSchema.safeParse(body)

        if (!parsed.success) {
            logAdminWarn({
                requestId,
                action: "agent-tokens:create",
                userId: adminCheck.identity.id,
                role: adminCheck.identity.role,
                roleSource: adminCheck.identity.source,
                status: 400,
                validation: { ok: false, reason: "invalid_payload" },
            })
            return validationErrorJson(parsed.error)
        }

        const payload = parsed.data

        const activeCount = await prisma.agentApiToken.count({ where: { revokedAt: null } })
        if (activeCount >= MAX_AGENT_TOKENS) {
            return errorJson(
                `Maksimal ${MAX_AGENT_TOKENS} token aktif. Cabut token lama terlebih dahulu.`,
                "AGENT_TOKENS_LIMIT_REACHED",
                400
            )
        }

        const generated = generateAgentToken()
        const expiresAt = payload.expiresInDays
            ? new Date(Date.now() + payload.expiresInDays * 24 * 60 * 60 * 1000)
            : null

        const created = await prisma.agentApiToken.create({
            data: {
                name: payload.name,
                tokenHash: generated.tokenHash,
                tokenPrefix: generated.tokenPrefix,
                scopes: JSON.stringify(payload.scopes),
                expiresAt,
                createdById: adminCheck.identity.id,
            },
        })

        logAdminInfo({
            requestId,
            action: "agent-tokens:create",
            userId: adminCheck.identity.id,
            role: adminCheck.identity.role,
            roleSource: adminCheck.identity.source,
            status: 200,
            payloadSummary: {
                createdId: created.id,
                scopes: payload.scopes.length,
                hasExpiry: Boolean(expiresAt),
            },
            validation: { ok: true },
        })

        return NextResponse.json({
            success: true,
            data: {
                ...sanitizeTokenRecord(created),
                // Shown once: the plaintext is never recoverable from the database.
                token: generated.token,
            },
        })
    } catch (error) {
        logAdminError({
            requestId,
            action: "agent-tokens:create",
            userId: adminCheck.identity.id,
            role: adminCheck.identity.role,
            roleSource: adminCheck.identity.source,
            status: 500,
            error: summarizeUnknownError(error),
        })

        return errorJson("Failed to create agent token", "AGENT_TOKEN_CREATE_FAILED", 500)
    }
}

// PUT: Toggle or revoke an agent token
export async function PUT(request: NextRequest) {
    const adminCheck = await requireAdminMutationApi(request, { action: "agent-tokens:update" })
    if (!adminCheck.ok) return adminCheck.response

    const requestId = crypto.randomUUID()

    try {
        const body = await request.json()
        const parsed = updateTokenSchema.safeParse(body)

        if (!parsed.success) {
            return validationErrorJson(parsed.error)
        }

        const payload = parsed.data

        const existing = await prisma.agentApiToken.findUnique({ where: { id: payload.id } })
        if (!existing) {
            return errorJson("Agent token not found", "AGENT_TOKEN_NOT_FOUND", 404)
        }

        const updateData: { isActive?: boolean; revokedAt?: Date | null } = {}

        if (payload.revoke === true) {
            updateData.isActive = false
            updateData.revokedAt = new Date()
        } else if (typeof payload.isActive === "boolean") {
            if (existing.revokedAt) {
                return errorJson(
                    "Token sudah dicabut dan tidak dapat diaktifkan kembali",
                    "AGENT_TOKEN_REVOKED",
                    400
                )
            }
            updateData.isActive = payload.isActive
        }

        if (Object.keys(updateData).length === 0) {
            return errorJson("No fields to update", "AGENT_TOKEN_NO_UPDATES", 400)
        }

        const updated = await prisma.agentApiToken.update({
            where: { id: payload.id },
            data: updateData,
        })

        logAdminInfo({
            requestId,
            action: "agent-tokens:update",
            userId: adminCheck.identity.id,
            role: adminCheck.identity.role,
            roleSource: adminCheck.identity.source,
            status: 200,
            payloadSummary: { id: payload.id, updatedFields: Object.keys(updateData) },
            validation: { ok: true },
        })

        return NextResponse.json({ success: true, data: sanitizeTokenRecord(updated) })
    } catch (error) {
        logAdminError({
            requestId,
            action: "agent-tokens:update",
            userId: adminCheck.identity.id,
            role: adminCheck.identity.role,
            roleSource: adminCheck.identity.source,
            status: 500,
            error: summarizeUnknownError(error),
        })

        return errorJson("Failed to update agent token", "AGENT_TOKEN_UPDATE_FAILED", 500)
    }
}

// DELETE: Permanently remove an agent token record
export async function DELETE(request: NextRequest) {
    const adminCheck = await requireAdminMutationApi(request, { action: "agent-tokens:delete" })
    if (!adminCheck.ok) return adminCheck.response

    const requestId = crypto.randomUUID()

    try {
        const body = await request.json()
        const parsed = deleteTokenSchema.safeParse(body)

        if (!parsed.success) {
            return errorJson("Token ID is required", "AGENT_TOKEN_ID_REQUIRED", 400)
        }

        await prisma.agentApiToken.delete({ where: { id: parsed.data.id } })

        logAdminInfo({
            requestId,
            action: "agent-tokens:delete",
            userId: adminCheck.identity.id,
            role: adminCheck.identity.role,
            roleSource: adminCheck.identity.source,
            status: 200,
            payloadSummary: { id: parsed.data.id },
            validation: { ok: true },
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        logAdminError({
            requestId,
            action: "agent-tokens:delete",
            userId: adminCheck.identity.id,
            role: adminCheck.identity.role,
            roleSource: adminCheck.identity.source,
            status: 500,
            error: summarizeUnknownError(error),
        })

        return errorJson("Failed to delete agent token", "AGENT_TOKEN_DELETE_FAILED", 500)
    }
}
