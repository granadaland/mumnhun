import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import prisma from "@/lib/db/prisma"
import { requireAdminMutationApi } from "@/lib/security/admin"
import { logAdminError, logAdminInfo, logAdminWarn } from "@/lib/observability/admin-log"
import { summarizeUnknownError } from "@/lib/security/admin-helpers"
import { classifyAiKeyFailure, formatStoredAiKeyFailure, toAiKeyFailureHttpStatus } from "@/lib/security/ai-key-status"
import { resolveImageProvider } from "@/lib/ai/key-rotary"
import { generateImageWithProvider } from "@/lib/ai/provider"
import { MAX_IMAGE_BYTES, MediaIngestError, assertAllowedImageBuffer, ingestImage } from "@/lib/media/ingest"
import { slugifyTitle } from "@/lib/content/post-publishing"

const generateImageSchema = z.object({
    prompt: z.string().trim().min(10, "Prompt minimal 10 karakter").max(1000),
    alt: z.string().trim().max(500).optional().nullable(),
    filenameHint: z.string().trim().max(120).optional().nullable(),
    providerKeyId: z.string().trim().min(1).max(60).optional(),
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

/**
 * Generates an image via an OpenAI-compatible image endpoint and stores it in Cloudinary.
 * Requires an active AiApiKey with capability="image".
 */
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

    const provider = await resolveImageProvider(payload.providerKeyId)
    if (!provider) {
        return errorJson(
            "Tidak ada provider gambar AI aktif. Tambahkan API key dengan capability image.",
            "AI_IMAGE_PROVIDER_NOT_CONFIGURED",
            400
        )
    }

    try {
        const generated = await generateImageWithProvider(
            { apiKey: provider.apiKey, baseUrl: provider.baseUrl, model: provider.model },
            payload.prompt,
            { maxBytes: MAX_IMAGE_BYTES }
        )

        const mimeType = assertAllowedImageBuffer(generated.buffer)
        const extension = mimeType.split("/")[1] || "png"
        const filenameBase = slugifyTitle(payload.filenameHint || payload.prompt.slice(0, 60)) || "ai-image"

        const media = await ingestImage({
            buffer: generated.buffer,
            mimeType,
            filename: `${filenameBase}.${extension}`,
            source: "ai",
            alt: payload.alt ?? null,
            aiPrompt: payload.prompt,
            folder: "mumnhun/ai",
        })

        await prisma.aiApiKey.update({
            where: { id: provider.keyId },
            data: {
                usageCount: { increment: 1 },
                lastUsedAt: new Date(),
                lastError: null,
            },
        })

        logAdminInfo({
            requestId,
            action: "ai-image:create",
            userId: adminCheck.identity.id,
            role: adminCheck.identity.role,
            roleSource: adminCheck.identity.source,
            status: 200,
            payloadSummary: { mediaId: media.mediaId, usedKeyId: provider.keyId },
            validation: { ok: true },
        })

        return NextResponse.json({ success: true, data: media })
    } catch (error) {
        const failure = classifyAiKeyFailure(error)

        await prisma.aiApiKey
            .update({
                where: { id: provider.keyId },
                data: {
                    lastUsedAt: new Date(),
                    lastError: formatStoredAiKeyFailure(failure),
                },
            })
            .catch(() => undefined)

        logAdminError({
            requestId,
            action: "ai-image:create",
            userId: adminCheck.identity.id,
            role: adminCheck.identity.role,
            roleSource: adminCheck.identity.source,
            status: 502,
            error: summarizeUnknownError(error),
        })

        if (error instanceof MediaIngestError) {
            const status = error.code === "IMAGE_UPLOAD_FAILED" ? 502 : 400
            return errorJson(error.message, error.code, status)
        }

        return errorJson("Gagal generate gambar AI", failure.code, toAiKeyFailureHttpStatus(failure), {
            reason: failure.message,
        })
    }
}
