import { NextRequest, NextResponse } from "next/server"
import { Prisma } from "@prisma/client"
import { z } from "zod"
import prisma from "@/lib/db/prisma"
import { requireAdminApi, requireAdminMutationApi } from "@/lib/security/admin"
import { adminJsonValidationError } from "@/lib/security/admin-helpers"

const listMediaQuerySchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(30),
    search: z.string().trim().min(1).max(200).optional(),
})

const mediaUrlSchema = z
    .string()
    .trim()
    .url("URL must be a valid absolute URL")
    .refine((value) => /^https?:\/\//i.test(value), {
        message: "URL must use http or https",
    })

const createMediaSchema = z.object({
    url: mediaUrlSchema,
    alt: z.string().trim().max(500).optional().nullable(),
    width: z.coerce.number().int().min(1).max(10000).optional().nullable(),
    height: z.coerce.number().int().min(1).max(10000).optional().nullable(),
    mimeType: z
        .string()
        .trim()
        .toLowerCase()
        .regex(/^image\/[a-z0-9.+-]+$/, "mimeType must be a valid image/* value")
        .optional()
        .nullable(),
    filename: z
        .string()
        .trim()
        .min(1)
        .max(255)
        .regex(/^[^\\/]+$/, "filename must not contain path separators")
        .optional()
        .nullable(),
    size: z.coerce.number().int().min(0).max(209_715_200).optional().nullable(),
})

const deleteMediaSchema = z.object({
    id: z.string().trim().min(1, "ID is required"),
})

// GET: List media
export async function GET(request: NextRequest) {
    const adminCheck = await requireAdminApi()
    if (!adminCheck.ok) return adminCheck.response

    const { searchParams } = new URL(request.url)
    const parsedQuery = listMediaQuerySchema.safeParse({
        page: searchParams.get("page") || "1",
        limit: searchParams.get("limit") || "30",
        search: searchParams.get("search")?.trim() ? searchParams.get("search") : undefined,
    })

    if (!parsedQuery.success) {
        return adminJsonValidationError(parsedQuery.error)
    }

    const { page, limit, search } = parsedQuery.data
    const skip = (page - 1) * limit

    const where: Prisma.MediaWhereInput = {}
    if (search) {
        where.OR = [
            { alt: { contains: search, mode: "insensitive" } },
            { url: { contains: search, mode: "insensitive" } },
        ]
    }

    const [media, total] = await Promise.all([
        prisma.media.findMany({ where, orderBy: { createdAt: "desc" }, skip, take: limit }),
        prisma.media.count({ where }),
    ])

    return NextResponse.json({
        success: true,
        data: media,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    })
}

// POST: Add media record (URL-based, e.g. from Cloudinary)
export async function POST(request: NextRequest) {
    const adminCheck = await requireAdminMutationApi(request, { action: "media:create" })
    if (!adminCheck.ok) return adminCheck.response

    let payload: z.infer<typeof createMediaSchema>

    try {
        const body = await request.json()
        const parsedBody = createMediaSchema.safeParse(body)
        if (!parsedBody.success) {
            return adminJsonValidationError(parsedBody.error)
        }
        payload = parsedBody.data
    } catch (error) {
        return adminJsonValidationError(error)
    }

    const resolvedFilenameFromUrl = (() => {
        try {
            const pathname = new URL(payload.url).pathname
            const rawFilename = pathname.split("/").pop() || ""
            return decodeURIComponent(rawFilename).trim()
        } catch {
            return ""
        }
    })()

    const resolvedFilename = payload.filename || resolvedFilenameFromUrl || "unnamed"

    const media = await prisma.media.create({
        data: {
            url: payload.url,
            alt: payload.alt || null,
            width: payload.width || null,
            height: payload.height || null,
            mimeType: payload.mimeType || "image/jpeg",
            filename: resolvedFilename,
            size: payload.size || 0,
        },
    })

    return NextResponse.json({ success: true, data: media })
}

// DELETE: Delete media record
export async function DELETE(request: NextRequest) {
    const adminCheck = await requireAdminMutationApi(request, { action: "media:delete" })
    if (!adminCheck.ok) return adminCheck.response

    let payload: z.infer<typeof deleteMediaSchema>

    try {
        const body = await request.json()
        const parsedBody = deleteMediaSchema.safeParse(body)
        if (!parsedBody.success) {
            return adminJsonValidationError(parsedBody.error)
        }
        payload = parsedBody.data
    } catch (error) {
        return adminJsonValidationError(error)
    }

    await prisma.media.delete({ where: { id: payload.id } })
    return NextResponse.json({ success: true })
}
