import { v2 as cloudinary, type UploadApiResponse } from "cloudinary"
import prisma from "@/lib/db/prisma"
import {
    UrlGuardError,
    readResponseWithLimit,
    safeExternalFetch,
    type UrlGuardOptions,
} from "@/lib/security/url-guard"

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
})

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024

export const ALLOWED_IMAGE_MIME_TYPES = new Set([
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
    "image/avif",
])

export type MediaSource = "upload" | "unsplash" | "pexels" | "ai"

export class MediaIngestError extends Error {
    code:
        | "IMAGE_TYPE_NOT_ALLOWED"
        | "IMAGE_TOO_LARGE"
        | "IMAGE_EMPTY"
        | "IMAGE_FETCH_FAILED"
        | "IMAGE_UPLOAD_FAILED"

    constructor(message: string, code: MediaIngestError["code"]) {
        super(message)
        this.name = "MediaIngestError"
        this.code = code
    }
}

/**
 * Verifies image bytes by magic number, so a hostile remote cannot smuggle non-image
 * content past a spoofed Content-Type header.
 */
export function detectImageMimeType(buffer: Buffer): string | null {
    if (buffer.length < 12) return null

    if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
        return "image/jpeg"
    }

    const isPng =
        buffer[0] === 0x89 &&
        buffer[1] === 0x50 &&
        buffer[2] === 0x4e &&
        buffer[3] === 0x47 &&
        buffer[4] === 0x0d &&
        buffer[5] === 0x0a &&
        buffer[6] === 0x1a &&
        buffer[7] === 0x0a
    if (isPng) {
        return "image/png"
    }

    const isGif = buffer.subarray(0, 6).toString("ascii") === "GIF87a" || buffer.subarray(0, 6).toString("ascii") === "GIF89a"
    if (isGif) {
        return "image/gif"
    }

    const isRiff = buffer.subarray(0, 4).toString("ascii") === "RIFF"
    const isWebp = isRiff && buffer.subarray(8, 12).toString("ascii") === "WEBP"
    if (isWebp) {
        return "image/webp"
    }

    const isIsoBmff = buffer.subarray(4, 8).toString("ascii") === "ftyp"
    if (isIsoBmff) {
        const brand = buffer.subarray(8, 12).toString("ascii")
        if (brand === "avif" || brand === "avis") {
            return "image/avif"
        }
    }

    return null
}

export function assertAllowedImageBuffer(buffer: Buffer): string {
    if (buffer.byteLength === 0) {
        throw new MediaIngestError("File gambar kosong", "IMAGE_EMPTY")
    }

    if (buffer.byteLength > MAX_IMAGE_BYTES) {
        throw new MediaIngestError("Ukuran gambar melebihi batas 10MB", "IMAGE_TOO_LARGE")
    }

    const detected = detectImageMimeType(buffer)
    if (!detected || !ALLOWED_IMAGE_MIME_TYPES.has(detected)) {
        throw new MediaIngestError(
            "Tipe file tidak didukung. Gunakan JPEG, PNG, WebP, GIF, atau AVIF.",
            "IMAGE_TYPE_NOT_ALLOWED"
        )
    }

    return detected
}

export type FetchedRemoteImage = {
    buffer: Buffer
    mimeType: string
    sourceUrl: string
}

/**
 * Downloads a remote image through the SSRF guard, enforcing a byte ceiling and
 * verifying the payload really is an image.
 */
export async function fetchRemoteImage(
    rawUrl: string,
    options: { guard?: UrlGuardOptions; timeoutMs?: number } = {}
): Promise<FetchedRemoteImage> {
    let response: Response

    try {
        response = await safeExternalFetch(rawUrl, {
            method: "GET",
            headers: { Accept: "image/*" },
            cache: "no-store",
            guard: options.guard,
            timeoutMs: options.timeoutMs ?? 20_000,
        })
    } catch (error) {
        if (error instanceof UrlGuardError) throw error
        throw new MediaIngestError("Gagal mengunduh gambar dari sumber eksternal", "IMAGE_FETCH_FAILED")
    }

    if (!response.ok) {
        throw new MediaIngestError(
            `Gagal mengunduh gambar (HTTP ${response.status})`,
            "IMAGE_FETCH_FAILED"
        )
    }

    const buffer = await readResponseWithLimit(response, MAX_IMAGE_BYTES)
    const mimeType = assertAllowedImageBuffer(buffer)

    return { buffer, mimeType, sourceUrl: rawUrl }
}

export type CloudinaryUploadResult = {
    url: string
    publicId: string
    width: number | null
    height: number | null
    format: string | null
    bytes: number
}

export async function uploadImageBuffer(
    buffer: Buffer,
    options: { folder?: string; publicId?: string } = {}
): Promise<CloudinaryUploadResult> {
    const uploadResult = await new Promise<UploadApiResponse>((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                folder: options.folder || "mumnhun/posts",
                resource_type: "image",
                format: "webp",
                ...(options.publicId ? { public_id: options.publicId } : {}),
            },
            (error, result) => {
                if (error || !result) {
                    reject(error ?? new Error("Cloudinary tidak mengembalikan hasil upload"))
                    return
                }
                resolve(result)
            }
        )

        uploadStream.end(buffer)
    }).catch(() => {
        throw new MediaIngestError("Gagal mengunggah gambar ke Cloudinary", "IMAGE_UPLOAD_FAILED")
    })

    return {
        url: uploadResult.secure_url,
        publicId: uploadResult.public_id,
        width: uploadResult.width ?? null,
        height: uploadResult.height ?? null,
        format: uploadResult.format ?? null,
        bytes: uploadResult.bytes ?? buffer.byteLength,
    }
}

export type IngestImageInput = {
    buffer: Buffer
    mimeType: string
    filename: string
    source: MediaSource
    alt?: string | null
    caption?: string | null
    attribution?: string | null
    sourceRef?: string | null
    aiPrompt?: string | null
    folder?: string
}

export type IngestedMedia = {
    mediaId: string
    url: string
    publicId: string
    width: number | null
    height: number | null
    mimeType: string
}

function sanitizeFilename(filename: string): string {
    const base = filename.split(/[\\/]/).pop() || "image"
    const normalized = base.trim().replace(/[^A-Za-z0-9._-]/g, "-").replace(/-+/g, "-")

    return normalized.slice(0, 200) || "image"
}

/**
 * Uploads validated image bytes to Cloudinary and records the Media row, including
 * provenance and licensing attribution required by free stock providers.
 */
export async function ingestImage(input: IngestImageInput): Promise<IngestedMedia> {
    const upload = await uploadImageBuffer(input.buffer, { folder: input.folder })

    const media = await prisma.media.create({
        data: {
            url: upload.url,
            publicId: upload.publicId,
            filename: sanitizeFilename(input.filename),
            mimeType: input.mimeType,
            size: upload.bytes,
            width: upload.width,
            height: upload.height,
            alt: input.alt?.trim() ? input.alt.trim().slice(0, 500) : null,
            caption: input.caption?.trim() ? input.caption.trim().slice(0, 500) : null,
            source: input.source,
            sourceRef: input.sourceRef?.trim() ? input.sourceRef.trim().slice(0, 500) : null,
            attribution: input.attribution?.trim() ? input.attribution.trim().slice(0, 500) : null,
            aiPrompt: input.aiPrompt?.trim() ? input.aiPrompt.trim().slice(0, 2000) : null,
        },
        select: { id: true },
    })

    return {
        mediaId: media.id,
        url: upload.url,
        publicId: upload.publicId,
        width: upload.width,
        height: upload.height,
        mimeType: input.mimeType,
    }
}
