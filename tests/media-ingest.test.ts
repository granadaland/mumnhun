import { describe, expect, it, vi } from "vitest"

const mockPrisma = {
    media: {
        create: vi.fn(),
    },
}

const mockUploadStream = vi.fn()

vi.mock("@/lib/db/prisma", () => ({
    default: mockPrisma,
}))

vi.mock("cloudinary", () => ({
    v2: {
        config: vi.fn(),
        uploader: {
            upload_stream: mockUploadStream,
        },
    },
}))

const {
    ALLOWED_IMAGE_MIME_TYPES,
    MAX_IMAGE_BYTES,
    MediaIngestError,
    assertAllowedImageBuffer,
    detectImageMimeType,
    fetchRemoteImage,
    ingestImage,
} = await import("@/lib/media/ingest")

function buildJpeg(): Buffer {
    const buffer = Buffer.alloc(32)
    buffer[0] = 0xff
    buffer[1] = 0xd8
    buffer[2] = 0xff
    return buffer
}

function buildPng(): Buffer {
    const buffer = Buffer.alloc(32)
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(buffer)
    return buffer
}

function buildWebp(): Buffer {
    const buffer = Buffer.alloc(32)
    buffer.write("RIFF", 0, "ascii")
    buffer.write("WEBP", 8, "ascii")
    return buffer
}

function buildGif(): Buffer {
    const buffer = Buffer.alloc(32)
    buffer.write("GIF89a", 0, "ascii")
    return buffer
}

function buildAvif(): Buffer {
    const buffer = Buffer.alloc(32)
    buffer.write("ftyp", 4, "ascii")
    buffer.write("avif", 8, "ascii")
    return buffer
}

describe("media ingest: magic-byte detection", () => {
    it("detects supported formats from bytes", () => {
        expect(detectImageMimeType(buildJpeg())).toBe("image/jpeg")
        expect(detectImageMimeType(buildPng())).toBe("image/png")
        expect(detectImageMimeType(buildWebp())).toBe("image/webp")
        expect(detectImageMimeType(buildGif())).toBe("image/gif")
        expect(detectImageMimeType(buildAvif())).toBe("image/avif")
    })

    it("rejects payloads that only claim to be images", () => {
        const svgLike = Buffer.from('<svg onload="alert(1)"></svg>', "utf8")
        const htmlLike = Buffer.from("<!doctype html><script>alert(1)</script>", "utf8")

        expect(detectImageMimeType(svgLike)).toBeNull()
        expect(detectImageMimeType(htmlLike)).toBeNull()
    })

    it("keeps SVG outside the allowlist", () => {
        expect(ALLOWED_IMAGE_MIME_TYPES.has("image/svg+xml")).toBe(false)
    })
})

describe("media ingest: assertAllowedImageBuffer", () => {
    it("returns the detected mime type for valid images", () => {
        expect(assertAllowedImageBuffer(buildPng())).toBe("image/png")
    })

    it("rejects empty buffers", () => {
        expect(() => assertAllowedImageBuffer(Buffer.alloc(0))).toThrowError(MediaIngestError)
        try {
            assertAllowedImageBuffer(Buffer.alloc(0))
        } catch (error) {
            expect((error as InstanceType<typeof MediaIngestError>).code).toBe("IMAGE_EMPTY")
        }
    })

    it("rejects oversized buffers", () => {
        const oversized = Buffer.alloc(MAX_IMAGE_BYTES + 1)
        buildPng().copy(oversized)

        try {
            assertAllowedImageBuffer(oversized)
            throw new Error("expected rejection")
        } catch (error) {
            expect((error as InstanceType<typeof MediaIngestError>).code).toBe("IMAGE_TOO_LARGE")
        }
    })

    it("rejects disallowed content", () => {
        try {
            assertAllowedImageBuffer(Buffer.from("not an image at all, just text bytes", "utf8"))
            throw new Error("expected rejection")
        } catch (error) {
            expect((error as InstanceType<typeof MediaIngestError>).code).toBe("IMAGE_TYPE_NOT_ALLOWED")
        }
    })
})

describe("media ingest: fetchRemoteImage host allowlist", () => {
    it("blocks hosts outside the provider allowlist", async () => {
        await expect(
            fetchRemoteImage("https://attacker.example.com/photo.jpg", {
                guard: { allowedHosts: ["images.unsplash.com"] },
            })
        ).rejects.toMatchObject({ code: "URL_HOST_NOT_ALLOWLISTED" })
    })

    it("blocks internal hosts even without an allowlist", async () => {
        await expect(fetchRemoteImage("https://metadata.google.internal/photo.jpg")).rejects.toMatchObject({
            code: "URL_HOST_BLOCKED",
        })
    })

    it("blocks literal private IPs", async () => {
        await expect(fetchRemoteImage("https://169.254.169.254/latest/meta-data")).rejects.toMatchObject({
            code: "URL_PRIVATE_ADDRESS_BLOCKED",
        })
    })
})

describe("media ingest: ingestImage", () => {
    it("persists provenance and Cloudinary public_id", async () => {
        mockUploadStream.mockImplementation((_options, callback) => {
            callback(null, {
                secure_url: "https://res.cloudinary.com/demo/image/upload/v1/mumnhun/stock/photo.jpg",
                public_id: "mumnhun/stock/photo",
                width: 1600,
                height: 900,
                format: "jpg",
                bytes: 2048,
            })

            return { end: vi.fn() }
        })

        mockPrisma.media.create.mockResolvedValueOnce({ id: "media-1" })

        const result = await ingestImage({
            buffer: buildJpeg(),
            mimeType: "image/jpeg",
            filename: "../../etc/passwd photo.jpg",
            source: "unsplash",
            alt: "Ibu menyusui",
            attribution: "Foto oleh X di Unsplash",
            sourceRef: "abc123",
            folder: "mumnhun/stock",
        })

        expect(result).toMatchObject({
            mediaId: "media-1",
            publicId: "mumnhun/stock/photo",
            width: 1600,
            height: 900,
        })

        const createArg = mockPrisma.media.create.mock.calls[0][0]
        expect(createArg.data).toMatchObject({
            publicId: "mumnhun/stock/photo",
            source: "unsplash",
            sourceRef: "abc123",
            attribution: "Foto oleh X di Unsplash",
            mimeType: "image/jpeg",
            size: 2048,
        })

        // Path separators must never survive into the stored filename.
        expect(createArg.data.filename).not.toContain("/")
        expect(createArg.data.filename).not.toContain("\\")
    })

    it("wraps Cloudinary failures in MediaIngestError", async () => {
        mockUploadStream.mockImplementation((_options, callback) => {
            callback(new Error("cloudinary down"), undefined)
            return { end: vi.fn() }
        })

        await expect(
            ingestImage({
                buffer: buildPng(),
                mimeType: "image/png",
                filename: "x.png",
                source: "ai",
            })
        ).rejects.toMatchObject({ code: "IMAGE_UPLOAD_FAILED" })
    })
})
