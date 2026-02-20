import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { v2 as cloudinary } from 'cloudinary'
import prisma from "@/lib/db/prisma"
import { requireAdminMutationApi } from "@/lib/security/admin"

// Configure Cloudinary (re-configured in case it wasn't already)
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
})

export async function POST(request: NextRequest) {
    const adminCheck = await requireAdminMutationApi(request, { action: "media:upload" })
    if (!adminCheck.ok) return adminCheck.response

    try {
        const formData = await request.formData()
        const file = formData.get("file") as File | null
        const folder = (formData.get("folder") as string) || "mumnhun/posts"
        const publicId = formData.get("publicId") as string | null

        if (!file) {
            return NextResponse.json(
                { success: false, error: "File is required" },
                { status: 400 }
            )
        }

        const bytes = await file.arrayBuffer()
        const buffer = Buffer.from(bytes)

        // Upload to Cloudinary using upload_stream
        const uploadResult = await new Promise<any>((resolve, reject) => {
            const options: any = {
                folder,
                resource_type: "auto",
            }
            if (publicId) options.public_id = publicId

            const uploadStream = cloudinary.uploader.upload_stream(
                options,
                (error, result) => {
                    if (error) reject(error)
                    else resolve(result)
                }
            )

            uploadStream.end(buffer)
        })

        const resolvedFilename = file.name || "unnamed"

        // Save to Media table as well
        const media = await prisma.media.create({
            data: {
                url: uploadResult.secure_url,
                alt: null,
                width: uploadResult.width,
                height: uploadResult.height,
                mimeType: file.type || uploadResult.format,
                filename: resolvedFilename,
                size: file.size,
            },
        })

        return NextResponse.json({
            success: true,
            data: {
                url: uploadResult.secure_url,
                public_id: uploadResult.public_id,
                width: uploadResult.width,
                height: uploadResult.height,
                format: uploadResult.format,
                mediaId: media.id,
            },
        })
    } catch (error: any) {
        console.error("Upload error:", error)
        return NextResponse.json(
            { success: false, error: error.message || "Failed to upload file" },
            { status: 500 }
        )
    }
}
