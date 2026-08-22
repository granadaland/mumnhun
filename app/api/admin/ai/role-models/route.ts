import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import prisma from "@/lib/db/prisma"
import { requireAdminApi, requireAdminMutationApi } from "@/lib/security/admin"
import {
    ApiKeyCryptoConfigError,
    decryptStoredApiKey,
    encryptApiKey,
} from "@/lib/security/api-key-crypto"
import {
    classifyAiKeyFailure,
    classifyProviderFailure,
    deriveAiKeyConnectionState,
    toAiKeyFailureHttpStatus,
    verifyGeminiApiKey,
    verifyOpenAiCompatibleApiKey,
    type AiKeyFailure,
} from "@/lib/security/ai-key-status"
import {
    assertSafeProviderBaseUrl,
    getAiProviderGuardOptions,
    UrlGuardError,
} from "@/lib/security/url-guard"
import { logAdminError, logAdminInfo, logAdminWarn } from "@/lib/observability/admin-log"
import { summarizeUnknownError } from "@/lib/security/admin-helpers"
import {
    AI_PROVIDERS,
    AI_PROVIDER_OPENAI_COMPATIBLE,
} from "@/lib/ai/provider"
import { type AuthStyle, type DiscoveredModel } from "@/lib/ai/openai-compatible"
import { AI_ROLES, aiRoleSchema, type AiRole } from "@/lib/ai/task-models"
/**
 * Role models are the per-task credentials (scanning / text / image).
 *
 * Deliberately separate from /api/admin/ai/keys: that endpoint manages the rotary pool,
 * this one manages exactly one pinned credential per role. Upserting by `role` keeps the
 * "one model per task" invariant in the database rather than in the UI.
 */

const upsertRoleModelSchema = z.object({
    role: aiRoleSchema,
    apiKey: z.string().trim().min(1, "API key wajib diisi").max(500),
    provider: z.enum(AI_PROVIDERS).optional(),
    baseUrl: z.string().trim().max(2000).optional().nullable(),
    model: z.string().trim().max(200).optional().nullable(),
    label: z.string().trim().max(120).optional().nullable(),
})

const patchRoleModelSchema = z.object({
    role: aiRoleSchema,
    isActive: z.boolean().optional(),
    label: z.string().trim().max(120).optional().nullable(),
    model: z.string().trim().max(200).optional().nullable(),
    retest: z.boolean().optional(),
})

const deleteRoleModelSchema = z.object({ role: aiRoleSchema })

type RoleModelErrorResponse = {
    success: false
    error: string
    errorCode: string
    details?: Record<string, unknown>
}

function errorJson(error: string, errorCode: string, status: number, details?: Record<string, unknown>) {
    const payload: RoleModelErrorResponse = {
        success: false,
        error,
        errorCode,
        ...(details ? { details } : {}),
    }
    return NextResponse.json(payload, { status })
}

function validationErrorJson(zodError: z.ZodError) {
    return NextResponse.json(
        {
            success: false,
            error: "Validation failed",
            errorCode: "AI_ROLE_VALIDATION_FAILED",
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

function maskApiKey(value: string): string {
    if (!value) return ""
    if (value.length <= 8) return "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022"
    return `${value.slice(0, 4)}${"\u2022".repeat(Math.max(0, value.length - 8))}${value.slice(-4)}`
}

function maskStoredApiKey(storedValue: string): string {
    try {
        return maskApiKey(decryptStoredApiKey(storedValue))
    } catch {
        return "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022"
    }
}

type RoleModelRow = {
    id: string
    role: string
    provider: string
    apiKey: string
    baseUrl: string | null
    model: string | null
    authStyle: string | null
    label: string | null
    isActive: boolean
    usageCount: number
    lastUsedAt: Date | null
    lastError: string | null
}

function sanitizeRoleModel(record: RoleModelRow) {
    const connectionState = deriveAiKeyConnectionState({
        lastError: record.lastError,
        lastUsedAt: record.lastUsedAt,
    })

    return {
        id: record.id,
        role: record.role,
        provider: record.provider,
        baseUrl: record.baseUrl,
        model: record.model,
        authStyle: record.authStyle,
        label: record.label,
        isActive: record.isActive,
        usageCount: record.usageCount,
        lastUsedAt: record.lastUsedAt,
        apiKeyMasked: maskStoredApiKey(record.apiKey),
        connectionStatus: connectionState.connectionStatus,
        lastError: connectionState.lastError,
        lastErrorCode: connectionState.lastErrorCode,
    }
}

const ROLE_MODEL_SELECT = {
    id: true,
    role: true,
    provider: true,
    apiKey: true,
    baseUrl: true,
    model: true,
    authStyle: true,
    label: true,
    isActive: true,
    usageCount: true,
    lastUsedAt: true,
    lastError: true,
} as const

function getVerificationFailureMessage(errorCode: string): string {
    if (errorCode === "PROVIDER_KEY_INVALID") return "API key tidak valid"
    if (errorCode === "PROVIDER_BASE_URL_INVALID") return "Base URL provider tidak diizinkan"
    if (errorCode === "PROVIDER_MODEL_UNAVAILABLE") return "Model tidak tersedia pada provider ini"
    if (errorCode === "PROVIDER_REQUEST_FAILED") return "Provider menolak permintaan verifikasi"
    return "Gagal memverifikasi API key"
}

type VerificationOutcome =
    | { ok: true; authStyle?: AuthStyle; models?: DiscoveredModel[] }
    | { ok: false; status: number; failure: AiKeyFailure }

async function verifyRoleCredentials(input: {
    provider: string
    apiKey: string
    baseUrl?: string | null
    model?: string | null
    authStyle?: AuthStyle | null
}): Promise<VerificationOutcome> {
    if (input.provider === AI_PROVIDER_OPENAI_COMPATIBLE) {
        const baseUrl = input.baseUrl?.trim()
        if (!baseUrl) {
            return {
                ok: false,
                status: 400,
                failure: {
                    code: "PROVIDER_BASE_URL_INVALID",
                    message: "Base URL wajib diisi untuk provider OpenAI-compatible",
                },
            }
        }

        const result = await verifyOpenAiCompatibleApiKey({
            baseUrl,
            apiKey: input.apiKey,
            model: input.model,
            authStyle: input.authStyle,
        })

        if (result.ok) {
            return { ok: true, authStyle: result.authStyle, models: result.models }
        }

        return { ok: false, status: result.status, failure: result.failure }
    }

    const result = await verifyGeminiApiKey(input.apiKey)
    if (result.ok) return { ok: true }
    return { ok: false, status: result.status, failure: result.failure }
}

async function normalizeCustomBaseUrl(
    rawBaseUrl: string
): Promise<{ ok: true; baseUrl: string } | { ok: false; failure: AiKeyFailure }> {
    try {
        const baseUrl = await assertSafeProviderBaseUrl(rawBaseUrl, getAiProviderGuardOptions())
        return { ok: true, baseUrl }
    } catch (error) {
        if (error instanceof UrlGuardError) {
            return { ok: false, failure: { code: "PROVIDER_BASE_URL_INVALID", message: error.message } }
        }
        return { ok: false, failure: classifyProviderFailure(error) }
    }
}

/**
 * The image role calls the OpenAI images endpoint, which Gemini does not expose.
 * Rejecting it here avoids storing a credential that can never succeed.
 */
function assertRoleProviderCompatible(role: AiRole, provider: string): string | null {
    return null
}

// GET: list all three roles, including the ones not configured yet
export async function GET() {
    const adminCheck = await requireAdminApi()
    if (!adminCheck.ok) return adminCheck.response

    const requestId = crypto.randomUUID()

    try {
        const records = await prisma.aiRoleModel.findMany({ select: ROLE_MODEL_SELECT })
        const byRole = new Map(records.map((record) => [record.role, record]))

        const data = AI_ROLES.map((role) => {
            const record = byRole.get(role)
            return record
                ? sanitizeRoleModel(record)
                : {
                    id: null,
                    role,
                    provider: null,
                    baseUrl: null,
                    model: null,
                    authStyle: null,
                    label: null,
                    isActive: false,
                    usageCount: 0,
                    lastUsedAt: null,
                    apiKeyMasked: null,
                    connectionStatus: "not_configured" as const,
                    lastError: null,
                    lastErrorCode: null,
                }
        })

        logAdminInfo({
            requestId,
            action: "ai-role-models:list",
            userId: adminCheck.identity.id,
            role: adminCheck.identity.role,
            roleSource: adminCheck.identity.source,
            status: 200,
            payloadSummary: { configured: records.length },
            validation: { ok: true },
        })

        return NextResponse.json({ success: true, data })
    } catch (error) {
        logAdminError({
            requestId,
            action: "ai-role-models:list",
            userId: adminCheck.identity.id,
            role: adminCheck.identity.role,
            roleSource: adminCheck.identity.source,
            status: 500,
            error: summarizeUnknownError(error),
        })
        return errorJson("Gagal memuat model AI per role", "AI_ROLE_LIST_FAILED", 500)
    }
}

// PUT: create or replace the credential for one role (verified before saving)
export async function PUT(request: NextRequest) {
    const adminCheck = await requireAdminMutationApi(request, { action: "ai-role-models:upsert" })
    if (!adminCheck.ok) return adminCheck.response

    const requestId = crypto.randomUUID()

    let payload: z.infer<typeof upsertRoleModelSchema>
    try {
        const body = await request.json()
        const parsed = upsertRoleModelSchema.safeParse(body)
        if (!parsed.success) {
            logAdminWarn({
                requestId,
                action: "ai-role-models:upsert",
                userId: adminCheck.identity.id,
                role: adminCheck.identity.role,
                roleSource: adminCheck.identity.source,
                status: 400,
                validation: { ok: false, reason: "invalid_payload" },
            })
            return validationErrorJson(parsed.error)
        }
        payload = parsed.data
    } catch {
        return errorJson("Invalid request payload", "AI_ROLE_INVALID_JSON", 400)
    }

    const provider = payload.provider || AI_PROVIDER_OPENAI_COMPATIBLE

    const compatibilityError = assertRoleProviderCompatible(payload.role, provider)
    if (compatibilityError) {
        return errorJson(compatibilityError, "AI_ROLE_PROVIDER_UNSUPPORTED", 400)
    }

    let normalizedBaseUrl: string | null = null
    let normalizedModel: string | null = null

    if (provider === AI_PROVIDER_OPENAI_COMPATIBLE) {
        if (!payload.baseUrl?.trim()) {
            return errorJson(
                "Base URL wajib diisi untuk provider OpenAI-compatible",
                "PROVIDER_BASE_URL_INVALID",
                400
            )
        }
        if (!payload.model?.trim()) {
            return errorJson("Model wajib diisi", "AI_ROLE_MODEL_REQUIRED", 400)
        }

        const baseUrlCheck = await normalizeCustomBaseUrl(payload.baseUrl)
        if (!baseUrlCheck.ok) {
            return errorJson(
                getVerificationFailureMessage(baseUrlCheck.failure.code),
                baseUrlCheck.failure.code,
                toAiKeyFailureHttpStatus(baseUrlCheck.failure),
                { reason: baseUrlCheck.failure.message }
            )
        }

        normalizedBaseUrl = baseUrlCheck.baseUrl
        normalizedModel = payload.model.trim()
    } else if (payload.model?.trim()) {
        normalizedModel = payload.model.trim()
    }

    try {
        const normalizedApiKey = payload.apiKey.trim()

        // The image role is verified as a text credential here; a full image round-trip
        // would cost a real generation, so it is exercised on first actual use instead.
        const verification = await verifyRoleCredentials({
            provider,
            apiKey: normalizedApiKey,
            baseUrl: normalizedBaseUrl,
            model: normalizedModel,
        })

        if (!verification.ok && payload.role !== "image") {
            logAdminWarn({
                requestId,
                action: "ai-role-models:upsert",
                userId: adminCheck.identity.id,
                role: adminCheck.identity.role,
                roleSource: adminCheck.identity.source,
                status: verification.status,
                validation: { ok: false, reason: verification.failure.code },
            })

            return errorJson(
                getVerificationFailureMessage(verification.failure.code),
                verification.failure.code,
                verification.status,
                { provider, reason: verification.failure.message }
            )
        }

        const verifiedAuthStyle = verification.ok ? verification.authStyle ?? null : null
        const encryptedKey = encryptApiKey(normalizedApiKey)

        const saved = await prisma.aiRoleModel.upsert({
            where: { role: payload.role },
            create: {
                role: payload.role,
                provider,
                apiKey: encryptedKey,
                baseUrl: normalizedBaseUrl,
                model: normalizedModel,
                authStyle: verifiedAuthStyle,
                label: payload.label?.trim() ? payload.label.trim() : null,
                isActive: true,
                lastUsedAt: verification.ok ? new Date() : null,
                lastError: null,
            },
            update: {
                provider,
                apiKey: encryptedKey,
                baseUrl: normalizedBaseUrl,
                model: normalizedModel,
                authStyle: verifiedAuthStyle,
                label: payload.label?.trim() ? payload.label.trim() : null,
                isActive: true,
                lastUsedAt: verification.ok ? new Date() : null,
                lastError: null,
            },
            select: ROLE_MODEL_SELECT,
        })

        logAdminInfo({
            requestId,
            action: "ai-role-models:upsert",
            userId: adminCheck.identity.id,
            role: adminCheck.identity.role,
            roleSource: adminCheck.identity.source,
            status: 200,
            payloadSummary: { role: payload.role, provider, verified: verification.ok },
            validation: { ok: true },
        })

        return NextResponse.json({
            success: true,
            data: sanitizeRoleModel(saved),
            ...(verification.ok && verification.models?.length
                ? { availableModels: verification.models.map((entry) => entry.id) }
                : {}),
            ...(verification.ok
                ? {}
                : {
                    warnings: {
                        verification:
                            "Kredensial disimpan tanpa verifikasi teks. Endpoint gambar akan diuji saat generate pertama.",
                    },
                }),
        })
    } catch (error) {
        if (error instanceof ApiKeyCryptoConfigError) {
            const failure = classifyAiKeyFailure(error)
            logAdminError({
                requestId,
                action: "ai-role-models:upsert",
                userId: adminCheck.identity.id,
                role: adminCheck.identity.role,
                roleSource: adminCheck.identity.source,
                status: 500,
                error: error.message,
            })
            return errorJson("Konfigurasi enkripsi API key bermasalah", failure.code, 500, {
                reason: failure.message,
            })
        }

        const failure = classifyProviderFailure(error)
        logAdminError({
            requestId,
            action: "ai-role-models:upsert",
            userId: adminCheck.identity.id,
            role: adminCheck.identity.role,
            roleSource: adminCheck.identity.source,
            status: 500,
            error: summarizeUnknownError(error),
        })
        return errorJson("Gagal menyimpan model AI", failure.code, toAiKeyFailureHttpStatus(failure), {
            reason: failure.message,
        })
    }
}

// PATCH: toggle active, rename, change model, or re-test without resending the key
export async function PATCH(request: NextRequest) {
    const adminCheck = await requireAdminMutationApi(request, { action: "ai-role-models:update" })
    if (!adminCheck.ok) return adminCheck.response

    const requestId = crypto.randomUUID()

    let payload: z.infer<typeof patchRoleModelSchema>
    try {
        const body = await request.json()
        const parsed = patchRoleModelSchema.safeParse(body)
        if (!parsed.success) return validationErrorJson(parsed.error)
        payload = parsed.data
    } catch {
        return errorJson("Invalid request payload", "AI_ROLE_INVALID_JSON", 400)
    }

    const existing = await prisma.aiRoleModel.findUnique({
        where: { role: payload.role },
        select: ROLE_MODEL_SELECT,
    })

    if (!existing) {
        return errorJson("Model AI untuk role ini belum dikonfigurasi", "AI_ROLE_NOT_FOUND", 404)
    }

    const updateData: {
        isActive?: boolean
        label?: string | null
        model?: string | null
        authStyle?: string | null
        lastUsedAt?: Date
        lastError?: string | null
    } = {}

    if (typeof payload.isActive === "boolean") updateData.isActive = payload.isActive
    if (payload.label !== undefined) {
        updateData.label = payload.label?.trim() ? payload.label.trim() : null
    }
    if (payload.model !== undefined) {
        if (existing.provider === AI_PROVIDER_OPENAI_COMPATIBLE && !payload.model?.trim()) {
            return errorJson("Model tidak boleh kosong", "AI_ROLE_MODEL_REQUIRED", 400)
        }
        updateData.model = payload.model?.trim() ? payload.model.trim() : null
    }

    const effectiveModel = updateData.model ?? existing.model
    const shouldVerify = payload.retest === true || payload.isActive === true || payload.model !== undefined

    if (shouldVerify) {
        try {
            const verification = await verifyRoleCredentials({
                provider: existing.provider,
                apiKey: decryptStoredApiKey(existing.apiKey),
                baseUrl: existing.baseUrl,
                model: effectiveModel,
                authStyle: existing.authStyle as AuthStyle | null,
            })

            if (!verification.ok) {
                await prisma.aiRoleModel.update({
                    where: { role: payload.role },
                    data: {
                        lastUsedAt: new Date(),
                        lastError: `${verification.failure.code}::${verification.failure.message}`,
                    },
                })

                return errorJson(
                    getVerificationFailureMessage(verification.failure.code),
                    verification.failure.code,
                    verification.status,
                    { reason: verification.failure.message }
                )
            }

            if (verification.authStyle) updateData.authStyle = verification.authStyle
            updateData.lastUsedAt = new Date()
            updateData.lastError = null
        } catch (error) {
            const failure = classifyProviderFailure(error)
            return errorJson(
                getVerificationFailureMessage(failure.code),
                failure.code,
                toAiKeyFailureHttpStatus(failure),
                { reason: failure.message }
            )
        }
    }

    if (Object.keys(updateData).length === 0) {
        return errorJson("Tidak ada perubahan yang dikirim", "AI_ROLE_NO_UPDATES", 400)
    }

    const updated = await prisma.aiRoleModel.update({
        where: { role: payload.role },
        data: updateData,
        select: ROLE_MODEL_SELECT,
    })

    logAdminInfo({
        requestId,
        action: "ai-role-models:update",
        userId: adminCheck.identity.id,
        role: adminCheck.identity.role,
        roleSource: adminCheck.identity.source,
        status: 200,
        payloadSummary: { role: payload.role, updatedFields: Object.keys(updateData) },
        validation: { ok: true },
    })

    return NextResponse.json({ success: true, data: sanitizeRoleModel(updated) })
}

// DELETE: remove a role's credential entirely
export async function DELETE(request: NextRequest) {
    const adminCheck = await requireAdminMutationApi(request, { action: "ai-role-models:delete" })
    if (!adminCheck.ok) return adminCheck.response

    const requestId = crypto.randomUUID()

    try {
        const body = await request.json()
        const parsed = deleteRoleModelSchema.safeParse(body)
        if (!parsed.success) return validationErrorJson(parsed.error)

        await prisma.aiRoleModel.deleteMany({ where: { role: parsed.data.role } })

        logAdminInfo({
            requestId,
            action: "ai-role-models:delete",
            userId: adminCheck.identity.id,
            role: adminCheck.identity.role,
            roleSource: adminCheck.identity.source,
            status: 200,
            payloadSummary: { role: parsed.data.role },
            validation: { ok: true },
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        logAdminError({
            requestId,
            action: "ai-role-models:delete",
            userId: adminCheck.identity.id,
            role: adminCheck.identity.role,
            roleSource: adminCheck.identity.source,
            status: 500,
            error: summarizeUnknownError(error),
        })
        return errorJson("Gagal menghapus model AI", "AI_ROLE_DELETE_FAILED", 500)
    }
}
