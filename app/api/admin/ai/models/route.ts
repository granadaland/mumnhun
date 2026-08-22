import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import prisma from "@/lib/db/prisma"
import { requireAdminMutationApi } from "@/lib/security/admin"
import { decryptStoredApiKey } from "@/lib/security/api-key-crypto"
import { logAdminError, logAdminInfo, logAdminWarn } from "@/lib/observability/admin-log"
import { summarizeUnknownError } from "@/lib/security/admin-helpers"
import {
    classifyProviderFailure,
    toAiKeyFailureHttpStatus,
} from "@/lib/security/ai-key-status"
import {
    assertSafeProviderBaseUrl,
    getAiProviderGuardOptions,
    UrlGuardError,
} from "@/lib/security/url-guard"
import { isAuthStyle, listModels, type DiscoveredModel } from "@/lib/ai/openai-compatible"
import { geminiListModels } from "@/lib/ai/gemini"
import { AI_PROVIDER_GEMINI, AI_PROVIDER_OPENAI_COMPATIBLE } from "@/lib/ai/provider"

/**
 * Model discovery.
 *
 * Two modes:
 *  - `{ keyId }`      : list models for an already-saved key (uses the stored credential)
 *  - `{ baseUrl, apiKey }` : list models for credentials being entered in the form,
 *                       before anything is persisted.
 */
const discoverSchema = z.union([
    z.object({
        keyId: z.string().trim().min(1).max(60),
    }),
    z.object({
        provider: z.enum([AI_PROVIDER_GEMINI, AI_PROVIDER_OPENAI_COMPATIBLE]).default(
            AI_PROVIDER_OPENAI_COMPATIBLE
        ),
        baseUrl: z.string().trim().max(2000).optional(),
        apiKey: z.string().trim().min(1, "API key wajib diisi").max(500),
    }),
])

function errorJson(error: string, errorCode: string, status: number, details?: Record<string, unknown>) {
    return NextResponse.json(
        { success: false, error, errorCode, ...(details ? { details } : {}) },
        { status }
    )
}

function validationErrorJson(zodError: z.ZodError) {
    return NextResponse.json(
        {
            success: false,
            error: "Validation failed",
            errorCode: "AI_MODELS_VALIDATION_FAILED",
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

type ResolvedTarget = {
    provider: string
    apiKey: string
    baseUrl: string | null
    authStyle: string | null
    keyId: string | null
}

/**
 * POST because the request body carries a secret; a GET would risk the key landing in
 * access logs or browser history. Guarded by requireAdminMutationApi for CSRF + rate limit.
 */
export async function POST(request: NextRequest) {
    const adminCheck = await requireAdminMutationApi(request, { action: "ai-models:discover" })
    if (!adminCheck.ok) return adminCheck.response

    const requestId = crypto.randomUUID()

    let parsedBody: z.infer<typeof discoverSchema>
    try {
        const body = await request.json()
        const parsed = discoverSchema.safeParse(body)

        if (!parsed.success) {
            logAdminWarn({
                requestId,
                action: "ai-models:discover",
                userId: adminCheck.identity.id,
                role: adminCheck.identity.role,
                roleSource: adminCheck.identity.source,
                status: 400,
                validation: { ok: false, reason: "invalid_payload" },
            })
            return validationErrorJson(parsed.error)
        }

        parsedBody = parsed.data
    } catch {
        return errorJson("Invalid request payload", "AI_MODELS_INVALID_JSON", 400)
    }

    let target: ResolvedTarget

    if ("keyId" in parsedBody) {
        const record = await prisma.aiApiKey.findUnique({
            where: { id: parsedBody.keyId },
            select: { id: true, provider: true, apiKey: true, baseUrl: true, authStyle: true },
        })

        if (!record) {
            return errorJson("API key tidak ditemukan", "AI_KEY_NOT_FOUND", 404)
        }

        try {
            target = {
                provider: record.provider,
                apiKey: decryptStoredApiKey(record.apiKey),
                baseUrl: record.baseUrl,
                authStyle: record.authStyle,
                keyId: record.id,
            }
        } catch (error) {
            const failure = classifyProviderFailure(error)
            return errorJson(
                "Gagal membaca API key tersimpan",
                failure.code,
                toAiKeyFailureHttpStatus(failure)
            )
        }
    } else {
        target = {
            provider: parsedBody.provider,
            apiKey: parsedBody.apiKey,
            baseUrl: parsedBody.baseUrl ?? null,
            authStyle: null,
            keyId: null,
        }
    }

    try {
        if (target.provider === AI_PROVIDER_GEMINI) {
            const models = await geminiListModels(target.apiKey)

            logAdminInfo({
                requestId,
                action: "ai-models:discover",
                userId: adminCheck.identity.id,
                role: adminCheck.identity.role,
                roleSource: adminCheck.identity.source,
                status: 200,
                payloadSummary: { provider: target.provider, models: models.length },
                validation: { ok: true },
            })

            return NextResponse.json({
                success: true,
                data: {
                    provider: target.provider,
                    models: models.map((id) => ({ id, ownedBy: "google" })),
                    authStyle: null,
                },
            })
        }

        if (!target.baseUrl?.trim()) {
            return errorJson(
                "Base URL wajib diisi untuk custom provider",
                "PROVIDER_BASE_URL_INVALID",
                400
            )
        }

        // Re-validate the base URL on every discovery call; the form value is untrusted.
        const safeBaseUrl = await assertSafeProviderBaseUrl(
            target.baseUrl,
            getAiProviderGuardOptions()
        )

        const listed = await listModels({
            baseUrl: safeBaseUrl,
            apiKey: target.apiKey,
            authStyle: isAuthStyle(target.authStyle) ? target.authStyle : null,
        })

        // Cache the working auth style so later generation calls skip the probe.
        if (target.keyId && listed.authStyle !== target.authStyle) {
            await prisma.aiApiKey
                .update({ where: { id: target.keyId }, data: { authStyle: listed.authStyle } })
                .catch(() => undefined)
        }

        logAdminInfo({
            requestId,
            action: "ai-models:discover",
            userId: adminCheck.identity.id,
            role: adminCheck.identity.role,
            roleSource: adminCheck.identity.source,
            status: 200,
            payloadSummary: {
                provider: target.provider,
                models: listed.models.length,
                authStyle: listed.authStyle,
            },
            validation: { ok: true },
        })

        return NextResponse.json({
            success: true,
            data: {
                provider: target.provider,
                models: listed.models satisfies DiscoveredModel[],
                authStyle: listed.authStyle,
            },
        })
    } catch (error) {
        if (error instanceof UrlGuardError) {
            return errorJson(error.message, "PROVIDER_BASE_URL_INVALID", 400)
        }

        const failure = classifyProviderFailure(error)

        logAdminError({
            requestId,
            action: "ai-models:discover",
            userId: adminCheck.identity.id,
            role: adminCheck.identity.role,
            roleSource: adminCheck.identity.source,
            status: toAiKeyFailureHttpStatus(failure),
            error: summarizeUnknownError(error),
        })

        return errorJson(
            "Gagal membaca daftar model dari provider",
            failure.code,
            toAiKeyFailureHttpStatus(failure),
            { reason: failure.message }
        )
    }
}
