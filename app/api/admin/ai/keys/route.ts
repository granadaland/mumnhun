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
    formatStoredAiKeyFailure,
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
import {
    AI_CAPABILITIES,
    AI_PROVIDERS,
    AI_PROVIDER_GEMINI,
    AI_PROVIDER_OPENAI_COMPATIBLE,
} from "@/lib/ai/provider"
import { isAuthStyle, type AuthStyle, type DiscoveredModel } from "@/lib/ai/openai-compatible"

const MAX_API_KEYS = 5

type ApiKeyErrorResponse = {
    success: false
    error: string
    errorCode: string
    details?: Record<string, unknown>
}

const createKeySchema = z.object({
    label: z.string().trim().max(120).optional().nullable(),
    apiKey: z.string().trim().min(1, "API key is required"),
    provider: z.enum(AI_PROVIDERS).optional(),
    baseUrl: z.string().trim().max(2000).optional().nullable(),
    model: z.string().trim().max(200).optional().nullable(),
    capability: z.enum(AI_CAPABILITIES).optional(),
})
const updateKeySchema = z.object({
    id: z.string().trim().min(1, "Key ID is required"),
    isActive: z.boolean().optional(),
    apiKey: z.string().trim().optional(),
    label: z.string().trim().max(120).optional().nullable(),
    baseUrl: z.string().trim().max(2000).optional().nullable(),
    model: z.string().trim().max(200).optional().nullable(),
    capability: z.enum(AI_CAPABILITIES).optional(),
    /** Force a fresh connection test without changing anything else. */
    retest: z.boolean().optional(),
})

const deleteKeySchema = z.object({
    id: z.string().trim().min(1, "Key ID is required"),
})

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
    baseUrl?: string | null
    model?: string | null
    capability?: string | null
    authStyle?: string | null
}) {
    const connectionState = deriveAiKeyConnectionState({
        lastError: key.lastError,
        lastUsedAt: key.lastUsedAt,
    })

    return {
        id: key.id,
        provider: key.provider,
        label: key.label,
        isActive: key.isActive,
        usageCount: key.usageCount,
        order: key.order,
        lastUsedAt: key.lastUsedAt,
        baseUrl: key.baseUrl ?? null,
        model: key.model ?? null,
        capability: key.capability ?? "text",
        authStyle: key.authStyle ?? null,
        connectionStatus: connectionState.connectionStatus,
        lastError: connectionState.lastError,
        lastErrorCode: connectionState.lastErrorCode,
        apiKeyMasked: maskStoredApiKey(key.apiKey),
    }
}

function errorJson(error: string, errorCode: string, status: number, details?: Record<string, unknown>) {
    const payload: ApiKeyErrorResponse = {
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
            errorCode: "AI_KEY_VALIDATION_FAILED",
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

function getVerificationFailureMessage(errorCode: string): string {
    if (errorCode === "PROVIDER_KEY_INVALID") {
        return "API key tidak valid"
    }

    if (errorCode === "PROVIDER_BASE_URL_INVALID") {
        return "Base URL provider tidak diizinkan"
    }

    if (errorCode === "PROVIDER_MODEL_UNAVAILABLE") {
        return "Model tidak tersedia pada provider ini"
    }

    if (errorCode === "PROVIDER_REQUEST_FAILED") {
        return "Provider menolak permintaan verifikasi"
    }

    return "Gagal memverifikasi API key"
}

type VerificationOutcome =
    | { ok: true; authStyle?: AuthStyle; models?: DiscoveredModel[]; chatVerified?: boolean }
    | { ok: false; status: number; failure: AiKeyFailure }

async function verifyProviderCredentials(input: {
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
                    message: "Base URL wajib diisi untuk custom provider",
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
            return {
                ok: true,
                authStyle: result.authStyle,
                models: result.models,
                chatVerified: result.chatVerified,
            }
        }

        return { ok: false, status: result.status, failure: result.failure }
    }

    const result = await verifyGeminiApiKey(input.apiKey)
    if (result.ok) return { ok: true }
    return { ok: false, status: result.status, failure: result.failure }
}

/**
 * Validates and normalizes a custom provider base URL. Runs the SSRF guard so an operator
 * cannot point the server at internal address space or cloud metadata endpoints.
 */
async function normalizeCustomBaseUrl(rawBaseUrl: string): Promise<
    { ok: true; baseUrl: string } | { ok: false; failure: AiKeyFailure }
> {
    try {
        const baseUrl = await assertSafeProviderBaseUrl(rawBaseUrl, getAiProviderGuardOptions())
        return { ok: true, baseUrl }
    } catch (error) {
        if (error instanceof UrlGuardError) {
            return {
                ok: false,
                failure: { code: "PROVIDER_BASE_URL_INVALID", message: error.message },
            }
        }

        return { ok: false, failure: classifyProviderFailure(error) }
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

        return errorJson("Failed to load API keys", "AI_KEYS_LIST_FAILED", 500)
    }
}

// POST: Add new API key (Gemini or custom OpenAI-compatible provider)
export async function POST(request: NextRequest) {
    const adminCheck = await requireAdminMutationApi(request, { action: "ai-keys:create" })
    if (!adminCheck.ok) return adminCheck.response

    const requestId = crypto.randomUUID()

    try {
        const body = await request.json()
        const parsed = createKeySchema.safeParse(body)

        if (!parsed.success) {
            const missingApiKey = parsed.error.issues.some((issue) => issue.path[0] === "apiKey")

            logAdminWarn({
                requestId,
                action: "ai-keys:create",
                userId: adminCheck.identity.id,
                role: adminCheck.identity.role,
                roleSource: adminCheck.identity.source,
                status: 400,
                validation: { ok: false, reason: missingApiKey ? "missing_api_key" : "invalid_payload" },
            })

            if (missingApiKey) {
                return errorJson("API key is required", "AI_KEY_REQUIRED", 400)
            }

            return validationErrorJson(parsed.error)
        }

        const payload = parsed.data
        const provider = payload.provider || AI_PROVIDER_GEMINI
        const capability = payload.capability || "text"

        if (provider === AI_PROVIDER_GEMINI && capability !== "text") {
            return errorJson(
                "Provider Gemini hanya mendukung capability text",
                "AI_KEY_CAPABILITY_UNSUPPORTED",
                400
            )
        }

        const count = await prisma.aiApiKey.count()
        if (count >= MAX_API_KEYS) {
            return errorJson(`Maximum ${MAX_API_KEYS} API keys allowed`, "AI_KEYS_LIMIT_REACHED", 400)
        }

        let normalizedBaseUrl: string | null = null
        let normalizedModel: string | null = null

        if (provider === AI_PROVIDER_OPENAI_COMPATIBLE) {
            if (!payload.baseUrl?.trim()) {
                return errorJson(
                    "Base URL wajib diisi untuk custom provider",
                    "PROVIDER_BASE_URL_INVALID",
                    400
                )
            }

            if (!payload.model?.trim()) {
                return errorJson("Model wajib dipilih untuk custom provider", "AI_KEY_MODEL_REQUIRED", 400)
            }

            const baseUrlCheck = await normalizeCustomBaseUrl(payload.baseUrl)
            if (!baseUrlCheck.ok) {
                logAdminWarn({
                    requestId,
                    action: "ai-keys:create",
                    userId: adminCheck.identity.id,
                    role: adminCheck.identity.role,
                    roleSource: adminCheck.identity.source,
                    status: 400,
                    validation: { ok: false, reason: baseUrlCheck.failure.code },
                })

                return errorJson(
                    getVerificationFailureMessage(baseUrlCheck.failure.code),
                    baseUrlCheck.failure.code,
                    toAiKeyFailureHttpStatus(baseUrlCheck.failure),
                    { reason: baseUrlCheck.failure.message }
                )
            }

            normalizedBaseUrl = baseUrlCheck.baseUrl
            normalizedModel = payload.model.trim()
        }

        const normalizedApiKey = payload.apiKey.trim()
        const verification = await verifyProviderCredentials({
            provider,
            apiKey: normalizedApiKey,
            baseUrl: normalizedBaseUrl,
            model: normalizedModel,
        })

        if (!verification.ok) {
            logAdminWarn({
                requestId,
                action: "ai-keys:create",
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
                {
                    provider,
                    reason: verification.failure.message,
                }
            )
        }

        const newKey = await prisma.aiApiKey.create({
            data: {
                provider,
                capability,
                baseUrl: normalizedBaseUrl,
                model: normalizedModel,
                // Cache the auth header style that verification proved works.
                authStyle: verification.ok && verification.authStyle ? verification.authStyle : null,
                label: payload.label?.trim() ? payload.label.trim() : null,
                apiKey: encryptApiKey(normalizedApiKey),
                order: count,
                lastUsedAt: new Date(),
                lastError: null,
            },
        })

        logAdminInfo({
            requestId,
            action: "ai-keys:create",
            userId: adminCheck.identity.id,
            role: adminCheck.identity.role,
            roleSource: adminCheck.identity.source,
            status: 200,
            payloadSummary: {
                createdId: newKey.id,
                provider,
                capability,
                chatVerified: verification.ok ? Boolean(verification.chatVerified) : false,
            },
            validation: { ok: true },
        })

        return NextResponse.json({
            success: true,
            data: {
                ...sanitizeKeyRecord(newKey),
                ...(verification.ok && verification.models?.length
                    ? { availableModels: verification.models.map((model) => model.id) }
                    : {}),
            },
        })
    } catch (error) {
        if (error instanceof ApiKeyCryptoConfigError) {
            const failure = classifyAiKeyFailure(error)
            logAdminError({
                requestId,
                action: "ai-keys:create",
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
            action: "ai-keys:create",
            userId: adminCheck.identity.id,
            role: adminCheck.identity.role,
            roleSource: adminCheck.identity.source,
            status: 500,
            error: failure.message,
        })
        return errorJson("Failed to add API key", failure.code, toAiKeyFailureHttpStatus(failure), {
            reason: failure.message,
        })
    }
}

// PUT: Update API key (toggle active status, rotate key, adjust provider config)
export async function PUT(request: NextRequest) {
    const adminCheck = await requireAdminMutationApi(request, { action: "ai-keys:update" })
    if (!adminCheck.ok) return adminCheck.response

    const requestId = crypto.randomUUID()

    try {
        const body = await request.json()
        const parsed = updateKeySchema.safeParse(body)

        if (!parsed.success) {
            const missingId = parsed.error.issues.some((issue) => issue.path[0] === "id")
            if (missingId) {
                return errorJson("Key ID is required", "AI_KEY_ID_REQUIRED", 400)
            }

            return validationErrorJson(parsed.error)
        }

        const payload = parsed.data
        const { id } = payload

        const existingKey = await prisma.aiApiKey.findUnique({ where: { id } })
        if (!existingKey) {
            return errorJson("API key not found", "AI_KEY_NOT_FOUND", 404)
        }

        const updateData: {
            isActive?: boolean
            apiKey?: string
            label?: string | null
            baseUrl?: string | null
            model?: string | null
            capability?: string
            authStyle?: string | null
            lastUsedAt?: Date | null
            lastError?: string | null
        } = {}

        if (typeof payload.isActive === "boolean") {
            updateData.isActive = payload.isActive
        }

        if (payload.label !== undefined) {
            updateData.label = payload.label?.trim() ? payload.label.trim() : null
        }

        if (payload.capability !== undefined) {
            if (existingKey.provider === AI_PROVIDER_GEMINI && payload.capability !== "text") {
                return errorJson(
                    "Provider Gemini hanya mendukung capability text",
                    "AI_KEY_CAPABILITY_UNSUPPORTED",
                    400
                )
            }
            updateData.capability = payload.capability
        }

        const isCustomProvider = existingKey.provider === AI_PROVIDER_OPENAI_COMPATIBLE

        if (payload.baseUrl !== undefined) {
            if (!isCustomProvider) {
                return errorJson(
                    "Base URL hanya berlaku untuk custom provider",
                    "AI_KEY_BASE_URL_NOT_APPLICABLE",
                    400
                )
            }

            if (!payload.baseUrl?.trim()) {
                return errorJson("Base URL tidak boleh kosong", "PROVIDER_BASE_URL_INVALID", 400)
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

            updateData.baseUrl = baseUrlCheck.baseUrl
        }

        if (payload.model !== undefined) {
            if (!isCustomProvider) {
                return errorJson(
                    "Model hanya berlaku untuk custom provider",
                    "AI_KEY_MODEL_NOT_APPLICABLE",
                    400
                )
            }

            if (!payload.model?.trim()) {
                return errorJson("Model tidak boleh kosong", "AI_KEY_MODEL_REQUIRED", 400)
            }

            updateData.model = payload.model.trim()
        }

        const effectiveBaseUrl = updateData.baseUrl ?? existingKey.baseUrl
        const effectiveModel = updateData.model ?? existingKey.model
        const effectiveAuthStyle = isAuthStyle(existingKey.authStyle) ? existingKey.authStyle : null

        const isRotatingKey = typeof payload.apiKey === "string"
        const isActivatingExistingKey =
            payload.isActive === true && !isRotatingKey && !existingKey.isActive
        const isChangingProviderConfig = updateData.baseUrl !== undefined || updateData.model !== undefined
        const isRetestRequested = payload.retest === true

        const shouldVerifyWithExistingKey =
            isRetestRequested || isActivatingExistingKey || (isChangingProviderConfig && !isRotatingKey)

        if (shouldVerifyWithExistingKey) {
            try {
                const decryptedExistingKey = decryptStoredApiKey(existingKey.apiKey)
                const verification = await verifyProviderCredentials({
                    provider: existingKey.provider,
                    apiKey: decryptedExistingKey,
                    baseUrl: effectiveBaseUrl,
                    model: effectiveModel,
                    authStyle: effectiveAuthStyle,
                })

                if (!verification.ok) {
                    await prisma.aiApiKey.update({
                        where: { id },
                        data: {
                            lastError: formatStoredAiKeyFailure(verification.failure),
                            lastUsedAt: new Date(),
                        },
                    })

                    logAdminWarn({
                        requestId,
                        action: "ai-keys:update",
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
                        {
                            provider: existingKey.provider,
                            reason: verification.failure.message,
                        }
                    )
                }

                if (verification.authStyle) {
                    updateData.authStyle = verification.authStyle
                }

                updateData.lastError = null
                updateData.lastUsedAt = new Date()
            } catch (error) {
                const failure = classifyProviderFailure(error)

                await prisma.aiApiKey.update({
                    where: { id },
                    data: {
                        lastError: formatStoredAiKeyFailure(failure),
                        lastUsedAt: new Date(),
                    },
                })

                return errorJson(
                    getVerificationFailureMessage(failure.code),
                    failure.code,
                    toAiKeyFailureHttpStatus(failure),
                    {
                        provider: existingKey.provider,
                        reason: failure.message,
                    }
                )
            }
        }

        if (isRotatingKey) {
            const rawApiKey = payload.apiKey ?? ""
            if (!rawApiKey.trim()) {
                return errorJson("API key cannot be empty", "AI_KEY_EMPTY", 400)
            }

            const normalizedApiKey = rawApiKey.trim()
            const verification = await verifyProviderCredentials({
                provider: existingKey.provider,
                apiKey: normalizedApiKey,
                baseUrl: effectiveBaseUrl,
                model: effectiveModel,
                authStyle: effectiveAuthStyle,
            })

            if (!verification.ok) {
                await prisma.aiApiKey.update({
                    where: { id },
                    data: {
                        lastError: formatStoredAiKeyFailure(verification.failure),
                        lastUsedAt: new Date(),
                    },
                })

                logAdminWarn({
                    requestId,
                    action: "ai-keys:update",
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
                    {
                        provider: existingKey.provider,
                        reason: verification.failure.message,
                    }
                )
            }

            if (verification.ok && verification.authStyle) {
                updateData.authStyle = verification.authStyle
            }

            updateData.apiKey = encryptApiKey(normalizedApiKey)
            updateData.lastUsedAt = new Date()
            updateData.lastError = null
        }

        if (Object.keys(updateData).length === 0) {
            return errorJson("No fields to update", "AI_KEY_NO_UPDATES", 400)
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
            payloadSummary: {
                id,
                updatedFields: Object.keys(updateData),
            },
            validation: { ok: true },
        })

        return NextResponse.json({ success: true, data: sanitizeKeyRecord(updated) })
    } catch (error) {
        if (error instanceof ApiKeyCryptoConfigError) {
            const failure = classifyAiKeyFailure(error)
            logAdminError({
                requestId,
                action: "ai-keys:update",
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
            action: "ai-keys:update",
            userId: adminCheck.identity.id,
            role: adminCheck.identity.role,
            roleSource: adminCheck.identity.source,
            status: 500,
            error: failure.message,
        })
        return errorJson("Failed to update API key", failure.code, toAiKeyFailureHttpStatus(failure), {
            reason: failure.message,
        })
    }
}

// DELETE: Remove API key
export async function DELETE(request: NextRequest) {
    const adminCheck = await requireAdminMutationApi(request, { action: "ai-keys:delete" })
    if (!adminCheck.ok) return adminCheck.response

    const requestId = crypto.randomUUID()

    try {
        const body = await request.json()
        const parsed = deleteKeySchema.safeParse(body)

        if (!parsed.success) {
            return errorJson("Key ID is required", "AI_KEY_ID_REQUIRED", 400)
        }

        await prisma.aiApiKey.delete({ where: { id: parsed.data.id } })

        logAdminInfo({
            requestId,
            action: "ai-keys:delete",
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
            action: "ai-keys:delete",
            userId: adminCheck.identity.id,
            role: adminCheck.identity.role,
            roleSource: adminCheck.identity.source,
            status: 500,
            error: error instanceof Error ? error.message : "Unknown error",
        })

        return errorJson("Failed to delete API key", "AI_KEY_DELETE_FAILED", 500)
    }
}
