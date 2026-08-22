import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { requireAdminMutationApi } from "@/lib/security/admin"
import { logAdminError, logAdminInfo, logAdminWarn } from "@/lib/observability/admin-log"
import { summarizeUnknownError } from "@/lib/security/admin-helpers"
import { classifyProviderFailure, toAiKeyFailureHttpStatus } from "@/lib/security/ai-key-status"
import { generateImageWithRotary, NoActiveAiKeyError, AllAiKeysFailedError } from "@/lib/ai/key-rotary"
import { ImageGenerationUnsupportedError } from "@/lib/ai/openai-compatible"
import { MAX_IMAGE_BYTES, MediaIngestError, assertAllowedImageBuffer, ingestImage } from "@/lib/media/ingest"
import { slugifyTitle } from "@/lib/content/post-publishing"

// Image generation plus Cloudinary upload can take a while; extend the platform timeout.
export const maxDuration = 180

/**
 * Generates an image on the dedicated "image" role model and stores it in Cloudinary.
 *
 * Alt text and caption are accepted from the caller (normally produced by the
 * `generate_image_meta` assist action) and persisted on the Media row, so an image never
 * lands in an article without accessible text.
 */

const generateImageSchema = z.object({
    prompt: z.string().trim().min(10, "Prompt minimal 10 karakter").max(1000),
    alt: z.string().trim().max(500).optional().nullable(),
    caption: z.string().trim().max(500).optional().nullable(),
    filenameHint: z.string().trim().max(120).optional().nullable(),
})

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
            errorCode: "AI_IMAGE_VALIDATION_FAILED",
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

export async function POST(request: NextRequest) {
    const adminCheck = await requireAdminMutationApi(request, { action: "ai-image:create" })
    if (!adminCheck.ok) return adminCheck.response

    const requestId = crypto.randomUUID()

    let payload: z.infer<typeof generateImageSchema>
    try {
        const body = await request.json()
        const parsed = generateImageSchema.safeParse(body)

        if (!parsed.success) {
            logAdminWarn({
                requestId,
                action: "ai-image:create",
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
        return errorJson("Invalid request payload", "AI_IMAGE_INVALID_JSON", 400)
    }

    try {
        const generated = await generateImageWithRotary({
            payload: {
                prompt: payload.prompt,
                options: { maxBytes: MAX_IMAGE_BYTES, aspectRatio: "4:3" }
            }
        })

        const mimeType = assertAllowedImageBuffer(generated.image.buffer)
        const extension = mimeType.split("/")[1] || "png"
        const filenameBase = slugifyTitle(payload.filenameHint || payload.prompt.slice(0, 60)) || "ai-image"

        const media = await ingestImage({
            buffer: generated.image.buffer,
            mimeType,
            filename: `${filenameBase}.${extension}`,
            source: "ai",
            alt: payload.alt ?? null,
            caption: payload.caption ?? null,
            aiPrompt: payload.prompt,
            folder: "mumnhun/ai",
        })

        logAdminInfo({
            requestId,
            action: "ai-image:create",
            userId: adminCheck.identity.id,
            role: adminCheck.identity.role,
            roleSource: adminCheck.identity.source,
            status: 200,
            payloadSummary: { mediaId: media.mediaId, roleModelId: generated.usedKeyId },
            validation: { ok: true },
        })

        return NextResponse.json({
            success: true,
            data: { ...media, alt: payload.alt ?? null, caption: payload.caption ?? null },
        })
    } catch (error) {
        let failure = classifyProviderFailure(error)
        let status = toAiKeyFailureHttpStatus(failure)
        
        if (error instanceof AllAiKeysFailedError) {
            failure = error.failure
            status = toAiKeyFailureHttpStatus(failure)
        } else if (error instanceof NoActiveAiKeyError) {
            return errorJson(
                "API Key untuk Generate Gambar belum dikonfigurasi. Atur di Settings > AI Configuration (capability Image).",
                "AI_ROLE_NOT_CONFIGURED",
                400,
                { role: "image" }
            )
        }

        logAdminError({
            requestId,
            action: "ai-image:create",
            userId: adminCheck.identity.id,
            role: adminCheck.identity.role,
            roleSource: adminCheck.identity.source,
            status: status,
            error: summarizeUnknownError(error),
        })

        if (error instanceof MediaIngestError) {
            const status = error.code === "IMAGE_UPLOAD_FAILED" ? 502 : 400
            return errorJson(error.message, error.code, status)
        }

        // The gateway has no image endpoint at all: tell the operator to repoint the role
        // rather than reporting an opaque HTTP 404.
        if (error instanceof ImageGenerationUnsupportedError) {
            return errorJson(
                `${error.message} Ganti model role Image ke model image-generation (mis. gpt-image-1, dall-e-3, flux) atau pakai provider lain di Settings > AI Models.`,
                "AI_IMAGE_ENDPOINT_UNSUPPORTED",
                400,
                { reason: error.detail || undefined }
            )
        }

        return errorJson("Gagal generate gambar AI", failure.code, status, {
            reason: failure.message,
        })
    }
}
