import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import prisma from "@/lib/db/prisma"
import { requireAdminApi, requireAdminMutationApi } from "@/lib/security/admin"
import { adminJsonValidationError } from "@/lib/security/admin-helpers"

const imageUrlSchema = z
    .string()
    .trim()
    .url("imageUrl must be a valid absolute URL")
    .refine((value) => /^https?:\/\//i.test(value), {
        message: "imageUrl must use http or https",
    })

const ctaLinkSchema = z
    .string()
    .trim()
    .min(1)
    .max(512)
    .refine((value) => value.startsWith("/") || /^https?:\/\//i.test(value), {
        message: "CTA link must be relative path or absolute http/https URL",
    })

const createHeroSchema = z.object({
    title: z.string().trim().min(1, "title is required").max(160),
    subtitle: z.string().trim().max(500).optional().nullable(),
    imageUrl: imageUrlSchema.optional().nullable(),
    ctaPrimaryText: z.string().trim().min(1).max(120).optional().nullable(),
    ctaPrimaryLink: ctaLinkSchema.optional().nullable(),
    ctaSecondaryText: z.string().trim().max(120).optional().nullable(),
    ctaSecondaryLink: ctaLinkSchema.optional().nullable(),
    isActive: z.boolean().optional(),
})

const updateHeroSchema = createHeroSchema.extend({
    id: z.string().trim().min(1, "ID is required"),
    order: z.coerce.number().int().min(0).max(1000).optional(),
})

const deleteHeroSchema = z.object({
    id: z.string().trim().min(1, "ID is required"),
})

// GET: List hero slides
export async function GET() {
    const adminCheck = await requireAdminApi()
    if (!adminCheck.ok) return adminCheck.response

    const slides = await prisma.heroSection.findMany({
        orderBy: { order: "asc" },
    })

    return NextResponse.json({ success: true, data: slides })
}

// POST: Create hero slide
export async function POST(request: NextRequest) {
    const adminCheck = await requireAdminMutationApi(request, { action: "hero:create" })
    if (!adminCheck.ok) return adminCheck.response

    let payload: z.infer<typeof createHeroSchema>

    try {
        const body = await request.json()
        const parsedBody = createHeroSchema.safeParse(body)
        if (!parsedBody.success) {
            return adminJsonValidationError(parsedBody.error)
        }
        payload = parsedBody.data
    } catch (error) {
        return adminJsonValidationError(error)
    }

    const count = await prisma.heroSection.count()

    const slide = await prisma.heroSection.create({
        data: {
            title: payload.title,
            subtitle: payload.subtitle || null,
            imageUrl: payload.imageUrl || null,
            ctaPrimaryText: payload.ctaPrimaryText || "Cek Harga Sewa",
            ctaPrimaryLink: payload.ctaPrimaryLink || "/#pricing",
            ctaSecondaryText: payload.ctaSecondaryText || null,
            ctaSecondaryLink: payload.ctaSecondaryLink || null,
            isActive: payload.isActive ?? true,
            order: count,
        },
    })

    return NextResponse.json({ success: true, data: slide })
}

// PUT: Update hero slide
export async function PUT(request: NextRequest) {
    const adminCheck = await requireAdminMutationApi(request, { action: "hero:update" })
    if (!adminCheck.ok) return adminCheck.response

    let payload: z.infer<typeof updateHeroSchema>

    try {
        const body = await request.json()
        const parsedBody = updateHeroSchema.safeParse(body)
        if (!parsedBody.success) {
            return adminJsonValidationError(parsedBody.error)
        }
        payload = parsedBody.data
    } catch (error) {
        return adminJsonValidationError(error)
    }

    const slide = await prisma.heroSection.update({
        where: { id: payload.id },
        data: {
            title: payload.title,
            subtitle: payload.subtitle,
            imageUrl: payload.imageUrl,
            ctaPrimaryText: payload.ctaPrimaryText ?? undefined,
            ctaPrimaryLink: payload.ctaPrimaryLink ?? undefined,
            ctaSecondaryText: payload.ctaSecondaryText,
            ctaSecondaryLink: payload.ctaSecondaryLink,
            isActive: payload.isActive,
            order: payload.order,
        },
    })

    return NextResponse.json({ success: true, data: slide })
}

// DELETE: Delete hero slide
export async function DELETE(request: NextRequest) {
    const adminCheck = await requireAdminMutationApi(request, { action: "hero:delete" })
    if (!adminCheck.ok) return adminCheck.response

    let payload: z.infer<typeof deleteHeroSchema>

    try {
        const body = await request.json()
        const parsedBody = deleteHeroSchema.safeParse(body)
        if (!parsedBody.success) {
            return adminJsonValidationError(parsedBody.error)
        }
        payload = parsedBody.data
    } catch (error) {
        return adminJsonValidationError(error)
    }

    await prisma.heroSection.delete({ where: { id: payload.id } })
    return NextResponse.json({ success: true })
}
