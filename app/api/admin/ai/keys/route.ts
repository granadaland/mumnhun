import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/db/prisma"
import { requireAdminApi, requireAdminMutationApi } from "@/lib/security/admin"
import {
    ApiKeyCryptoConfigError,
    decryptStoredApiKey,
    encryptApiKey,
} from "@/lib/security/api-key-crypto"
import {
    classifyAiKeyFailure,
    deriveAiKeyConnectionState,
    formatStoredAiKeyFailure,
    toAiKeyFailureHttpStatus,
    verifyGeminiApiKey,
} from "@/lib/security/ai-key-status"
import { logAdminError, logAdminInfo, logAdminWarn } from "@/lib/observability/admin-log"

type ApiKeyErrorResponse = {
    success: false
    error: string
    errorCode: string
    details?: Record<string, unknown>
}

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

async function validateGeminiKey(apiKey: string) {
    const verifyResult = await verifyGeminiApiKey(apiKey)
    if (verifyResult.ok) {
        return { ok: true as const }
    }

    return {
        ok: false as const,
        status: verifyResult.status,
        failure: verifyResult.failure,
    }
}

function getVerificationFailureMessage(errorCode: string): string {
    if (errorCode === "PROVIDER_KEY_INVALID") {
        return "API key tidak valid"
    }

    return "Gagal memverifikasi API key"
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
            return errorJson("API key is required", "AI_KEY_REQUIRED", 400)
        }

        // Check max 5 keys
        const count = await prisma.aiApiKey.count()
        if (count >= 5) {
            return errorJson("Maximum 5 API keys allowed", "AI_KEYS_LIMIT_REACHED", 400)
        }

        const normalizedApiKey = apiKey.trim()
        const verification = await validateGeminiKey(normalizedApiKey)
        if (!verification.ok) {
            logAdminWarn({
                requestId,
                action: "ai-keys:create",
                userId: adminCheck.identity.id,
                role: adminCheck.identity.role,
                roleSource: adminCheck.identity.source,
                status: verification.status,
                validation: {
                    ok: false,
                    reason: verification.failure.code,
                },
            })

            return errorJson(getVerificationFailureMessage(verification.failure.code), verification.failure.code, verification.status, {
                provider: "gemini",
                reason: verification.failure.message,
            })
        }

        const newKey = await prisma.aiApiKey.create({
            data: {
                label: label?.trim() ? label.trim() : null,
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
            payloadSummary: { createdId: newKey.id },
            validation: { ok: true },
        })

        return NextResponse.json({ success: true, data: sanitizeKeyRecord(newKey) })
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

        const failure = classifyAiKeyFailure(error)
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

// PUT: Update API key (toggle active status)
export async function PUT(request: NextRequest) {
    const adminCheck = await requireAdminMutationApi(request, { action: "ai-keys:update" })
    if (!adminCheck.ok) return adminCheck.response

    const requestId = crypto.randomUUID()

    try {
        const body = await request.json()
        const { id, isActive, apiKey } = body as { id?: string; isActive?: boolean; apiKey?: string }

        if (!id) {
            return errorJson("Key ID is required", "AI_KEY_ID_REQUIRED", 400)
        }

        const existingKey = await prisma.aiApiKey.findUnique({ where: { id } })
        if (!existingKey) {
            return errorJson("API key not found", "AI_KEY_NOT_FOUND", 404)
        }

        const updateData: {
            isActive?: boolean
            apiKey?: string
            lastUsedAt?: Date | null
            lastError?: string | null
        } = {}

        if (typeof isActive === "boolean") {
            updateData.isActive = isActive
        }

        const shouldVerifyActivationWithExistingKey =
            typeof isActive === "boolean" && isActive === true && typeof apiKey !== "string" && !existingKey.isActive

        if (shouldVerifyActivationWithExistingKey) {
            try {
                const decryptedExistingKey = decryptStoredApiKey(existingKey.apiKey)
                const verification = await validateGeminiKey(decryptedExistingKey)

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
                            provider: "gemini",
                            reason: verification.failure.message,
                        }
                    )
                }

                updateData.lastError = null
                updateData.lastUsedAt = new Date()
            } catch (error) {
                const failure = classifyAiKeyFailure(error)

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
                        provider: "gemini",
                        reason: failure.message,
                    }
                )
            }
        }

        if (typeof apiKey === "string") {
            if (!apiKey.trim()) {
                return errorJson("API key cannot be empty", "AI_KEY_EMPTY", 400)
            }

            const normalizedApiKey = apiKey.trim()
            const verification = await validateGeminiKey(normalizedApiKey)
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
                        provider: "gemini",
                        reason: verification.failure.message,
                    }
                )
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

        const failure = classifyAiKeyFailure(error)
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
        const { id } = body as { id?: string }

        if (!id) {
            return errorJson("Key ID is required", "AI_KEY_ID_REQUIRED", 400)
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

        return errorJson("Failed to delete API key", "AI_KEY_DELETE_FAILED", 500)
    }
}
