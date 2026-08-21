import { NextRequest, NextResponse } from "next/server"
import { requireAdminMutationApi } from "@/lib/security/admin"
import { logAdminError, logAdminInfo, logAdminWarn } from "@/lib/observability/admin-log"
import { summarizeUnknownError } from "@/lib/security/admin-helpers"
import { MAX_IMAGE_BYTES, MediaIngestError, assertAllowedImageBuffer, ingestImage } from "@/lib/media/ingest"

const ALLOWED_FOLDERS = new Set(["mumnhun/posts", "mumnhun/pages", "mumnhun/hero", "mumnhun/media"])

function errorJson(error: string, errorCode: string, status: number) {
    return NextResponse.json({ success: false, error, errorCode }, { status })
}

export async function POST(request: NextRequest) {
    const adminCheck = await requireAdminMutationApi(request, { action: "media:upload" })
    if (!adminCheck.ok) return adminCheck.response

    const requestId = crypto.randomUUID()

    try {
        const formData = await request.formData()
        const file = formData.get("file")
        const requestedFolder = formData.get("folder")
        const alt = formData.get("alt")

        if (!(file instanceof File)) {
            logAdminWarn({
                requestId,
                action: "media:upload",
                userId: adminCheck.identity.id,
                role: adminCheck.identity.role,
                roleSource: adminCheck.identity.source,
                status: 400,
                validation: { ok: false, reason: "missing_file" },
            })
            return errorJson("File is required", "MEDIA_FILE_REQUIRED", 400)
        }

        if (file.size > MAX_IMAGE_BYTES) {
            return errorJson("Ukuran gambar melebihi batas 10MB", "IMAGE_TOO_LARGE", 400)
        }

        const folder =
            typeof requestedFolder === "string" && ALLOWED_FOLDERS.has(requestedFolder)
                ? requestedFolder
                : "mumnhun/posts"

        const buffer = Buffer.from(await file.arrayBuffer())

        // Trust the bytes, not the client-declared content type.
        const mimeType = assertAllowedImageBuffer(buffer)

        const media = await ingestImage({
            buffer,
            mimeType,
            filename: file.name || "unnamed",
            source: "upload",
            alt: typeof alt === "string" ? alt : null,
            folder,
        })

        logAdminInfo({
            requestId,
            action: "media:upload",
            userId: adminCheck.identity.id,
            role: adminCheck.identity.role,
            roleSource: adminCheck.identity.source,
            status: 200,
            payloadSummary: { mediaId: media.mediaId, folder },
            validation: { ok: true },
        })

        return NextResponse.json({
            success: true,
            data: {
                url: media.url,
                public_id: media.publicId,
                width: media.width,
                height: media.height,
                format: media.mimeType.split("/")[1] || null,
                mediaId: media.mediaId,
            },
        })
    } catch (error) {
        if (error instanceof MediaIngestError) {
            const status = error.code === "IMAGE_UPLOAD_FAILED" ? 502 : 400

            logAdminWarn({
                requestId,
                action: "media:upload",
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
            action: "media:upload",
            userId: adminCheck.identity.id,
            role: adminCheck.identity.role,
            roleSource: adminCheck.identity.source,
            status: 500,
            error: summarizeUnknownError(error),
        })

        return errorJson("Failed to upload file", "MEDIA_UPLOAD_FAILED", 500)
    }
}
