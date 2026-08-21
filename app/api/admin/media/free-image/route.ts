import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { requireAdminApi, requireAdminMutationApi } from "@/lib/security/admin"
import { checkRateLimit, createRateLimitExceededResponse } from "@/lib/security/rate-limit"
import { logAdminError, logAdminInfo, logAdminWarn } from "@/lib/observability/admin-log"
import { summarizeUnknownError } from "@/lib/security/admin-helpers"
import { UrlGuardError } from "@/lib/security/url-guard"
import {
    FREE_IMAGE_ALLOWED_HOSTS,
    FREE_IMAGE_PROVIDERS,
    FreeImageError,
    searchFreeImages,
} from "@/lib/media/free-image"
import { MediaIngestError, fetchRemoteImage, ingestImage } from "@/lib/media/ingest"

const searchQuerySchema = z.object({
    provider: z.enum(FREE_IMAGE_PROVIDERS).default("unsplash"),
    query: z.string().trim().min(2, "Query minimal 2 karakter").max(120),
    perPage: z.coerce.number().int().min(1).max(30).optional(),
})

const importSchema = z.object({
    provider: z.enum(FREE_IMAGE_PROVIDERS),
    downloadUrl: z.string().trim().url().max(2000),
    sourceRef: z.string().trim().min(1).max(200),
    attribution: z.string().trim().min(3).max(500),
    alt: z.string().trim().max(500).optional().nullable(),
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
            errorCode: "FREE_IMAGE_VALIDATION_FAILED",
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

function mapFreeImageError(error: FreeImageError) {
    if (error.code === "PROVIDER_NOT_CONFIGURED") return 400
    if (error.code === "PROVIDER_KEY_INVALID") return 400
    if (error.code === "PROVIDER_RATE_LIMITED") return 429
    return 502
}

// GET: Search free stock images by keyword
export async function GET(request: NextRequest) {
    const adminCheck = await requireAdminApi()
    if (!adminCheck.ok) return adminCheck.response

    const requestId = crypto.randomUUID()

    // Outbound provider calls are metered per admin to avoid burning the provider quota.
    const rateLimitResult = checkRateLimit(`admin-read:${adminCheck.identity.id}:media:free-image-search`, {
        limit: 30,
        windowMs: 60_000,
    })

    if (!rateLimitResult.ok) {
        return createRateLimitExceededResponse(rateLimitResult)
    }

    const { searchParams } = new URL(request.url)

    const parsed = searchQuerySchema.safeParse({
        provider: searchParams.get("provider") || undefined,
        query: searchParams.get("query") || "",
        perPage: searchParams.get("perPage") || undefined,
    })

    if (!parsed.success) {
        return validationErrorJson(parsed.error)
    }

    try {
        const results = await searchFreeImages(parsed.data)

        logAdminInfo({
            requestId,
            action: "media:free-image-search",
            userId: adminCheck.identity.id,
            role: adminCheck.identity.role,
            roleSource: adminCheck.identity.source,
            status: 200,
            payloadSummary: { provider: parsed.data.provider, results: results.length },
            validation: { ok: true },
        })

        return NextResponse.json({ success: true, data: results })
    } catch (error) {
        if (error instanceof FreeImageError) {
            logAdminWarn({
                requestId,
                action: "media:free-image-search",
                userId: adminCheck.identity.id,
                role: adminCheck.identity.role,
                roleSource: adminCheck.identity.source,
                status: mapFreeImageError(error),
                validation: { ok: false, reason: error.code },
            })

            return errorJson(error.message, error.code, mapFreeImageError(error))
        }

        logAdminError({
            requestId,
            action: "media:free-image-search",
            userId: adminCheck.identity.id,
            role: adminCheck.identity.role,
            roleSource: adminCheck.identity.source,
            status: 500,
            error: summarizeUnknownError(error),
        })

        return errorJson("Gagal mencari gambar", "FREE_IMAGE_SEARCH_FAILED", 500)
    }
}

/**
 * POST: Re-hosts a chosen stock photo into Cloudinary.
 *
 * The download URL is constrained to the provider's own CDN hosts and fetched through the
 * SSRF guard, so an operator-supplied URL cannot be redirected into internal address space.
 */
export async function POST(request: NextRequest) {
    const adminCheck = await requireAdminMutationApi(request, { action: "media:free-image-import" })
    if (!adminCheck.ok) return adminCheck.response

    const requestId = crypto.randomUUID()

    let payload: z.infer<typeof importSchema>
    try {
        const body = await request.json()
        const parsed = importSchema.safeParse(body)

        if (!parsed.success) {
            return validationErrorJson(parsed.error)
        }

        payload = parsed.data
    } catch {
        return errorJson("Invalid request payload", "FREE_IMAGE_INVALID_JSON", 400)
    }

    try {
        const fetched = await fetchRemoteImage(payload.downloadUrl, {
            guard: { allowedHosts: FREE_IMAGE_ALLOWED_HOSTS[payload.provider] },
            timeoutMs: 25_000,
        })

        const extension = fetched.mimeType.split("/")[1] || "jpg"
        const media = await ingestImage({
            buffer: fetched.buffer,
            mimeType: fetched.mimeType,
            filename: `${payload.provider}-${payload.sourceRef}.${extension}`,
            source: payload.provider,
            alt: payload.alt ?? null,
            attribution: payload.attribution,
            sourceRef: payload.sourceRef,
            folder: "mumnhun/stock",
        })

        logAdminInfo({
            requestId,
            action: "media:free-image-import",
            userId: adminCheck.identity.id,
            role: adminCheck.identity.role,
            roleSource: adminCheck.identity.source,
            status: 200,
            payloadSummary: { provider: payload.provider, mediaId: media.mediaId },
            validation: { ok: true },
        })

        return NextResponse.json({ success: true, data: media })
    } catch (error) {
        if (error instanceof UrlGuardError) {
            logAdminWarn({
                requestId,
                action: "media:free-image-import",
                userId: adminCheck.identity.id,
                role: adminCheck.identity.role,
                roleSource: adminCheck.identity.source,
                status: 400,
                validation: { ok: false, reason: error.code },
            })

            return errorJson(error.message, error.code, 400)
        }

        if (error instanceof MediaIngestError) {
            const status = error.code === "IMAGE_UPLOAD_FAILED" ? 502 : 400

            logAdminWarn({
                requestId,
                action: "media:free-image-import",
                userId: adminCheck.identity.id,
                role: adminCheck.identity.role,
                roleSource: adminCheck.identity.source,
                status,
                validation: { ok: false, reason: error.code },
            })

            return errorJson(error.message, error.code, status)
        }

        logAdminError({
            requestId,
            action: "media:free-image-import",
            userId: adminCheck.identity.id,
            role: adminCheck.identity.role,
            roleSource: adminCheck.identity.source,
            status: 500,
            error: summarizeUnknownError(error),
        })

        return errorJson("Gagal mengimpor gambar", "FREE_IMAGE_IMPORT_FAILED", 500)
    }
}
