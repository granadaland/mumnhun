import { NextRequest, NextResponse } from "next/server"
import { PostStatus } from "@prisma/client"
import { z } from "zod"
import prisma from "@/lib/db/prisma"
import { requireAdminApi, requireAdminMutationApi } from "@/lib/security/admin"
import { logAdminError, logAdminInfo, logAdminWarn } from "@/lib/observability/admin-log"
import { adminJsonValidationError, getPrismaErrorCode, summarizeUnknownError } from "@/lib/security/admin-helpers"

const routeParamsSchema = z.object({
    id: z.string().min(1, "Page ID is required"),
})

const updatePageSchema = z.object({
    title: z.string().optional(),
    slug: z.string().optional(),
    content: z.string().optional(),
    metaTitle: z.string().optional().nullable(),
    metaDescription: z.string().optional().nullable(),
    status: z.nativeEnum(PostStatus).optional(),
    focusKeyword: z.string().optional().nullable(),
    ogImage: z.string().optional().nullable(),
    ogTitle: z.string().optional().nullable(),
    ogDescription: z.string().optional().nullable(),
    canonicalUrl: z.string().optional().nullable(),
    schemaType: z.string().optional().nullable(),
    schemaData: z.string().optional().nullable(),
})

// GET: Single page
export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const adminCheck = await requireAdminApi()
    if (!adminCheck.ok) return adminCheck.response

    const { id } = await params
    const page = await prisma.page.findUnique({ where: { id } })
    if (!page) return NextResponse.json({ error: "Page not found" }, { status: 404 })

    return NextResponse.json({ success: true, data: page })
}

// PUT: Update page
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const adminCheck = await requireAdminMutationApi(request, { action: "pages:update" })
    if (!adminCheck.ok) return adminCheck.response

    const requestId = crypto.randomUUID()

    const parsedParams = routeParamsSchema.safeParse(await params)
    if (!parsedParams.success) {
        logAdminWarn({
            requestId,
            action: "pages:update",
            userId: adminCheck.identity.id,
            role: adminCheck.identity.role,
            roleSource: adminCheck.identity.source,
            status: 400,
            validation: { ok: false, reason: "invalid_params" },
        })
        return adminJsonValidationError(parsedParams.error)
    }

    let payload: z.infer<typeof updatePageSchema>

    try {
        const body = await request.json()
        const parsedBody = updatePageSchema.safeParse(body)

        if (!parsedBody.success) {
            logAdminWarn({
                requestId,
                action: "pages:update",
                userId: adminCheck.identity.id,
                role: adminCheck.identity.role,
                roleSource: adminCheck.identity.source,
                status: 400,
                validation: { ok: false, reason: "invalid_payload" },
            })
            return adminJsonValidationError(parsedBody.error)
        }

        payload = parsedBody.data
    } catch (error) {
        logAdminWarn({
            requestId,
            action: "pages:update",
            userId: adminCheck.identity.id,
            role: adminCheck.identity.role,
            roleSource: adminCheck.identity.source,
            status: 400,
            validation: { ok: false, reason: "malformed_json" },
        })
        return adminJsonValidationError(error)
    }

    const { id } = parsedParams.data

    try {
        if (payload.slug) {
            const existing = await prisma.page.findFirst({ where: { slug: payload.slug, id: { not: id } } })
            if (existing) {
                logAdminWarn({
                    requestId,
                    action: "pages:update",
                    userId: adminCheck.identity.id,
                    role: adminCheck.identity.role,
                    roleSource: adminCheck.identity.source,
                    status: 400,
                    validation: { ok: false, reason: "slug_exists" },
                })
                return NextResponse.json(
                    {
                        error: "Validation failed",
                        issues: [{ path: "slug", code: "custom", message: "Slug already exists" }],
                    },
                    { status: 400 }
                )
            }
        }

        // Set publishedAt when publishing for the first time
        const currentPage = await prisma.page.findUnique({ where: { id } })
        const publishedAt = payload.status === "PUBLISHED" && currentPage?.status !== "PUBLISHED"
            ? new Date()
            : payload.status !== "PUBLISHED"
                ? null
                : undefined

        const page = await prisma.page.update({
            where: { id },
            data: {
                title: payload.title,
                slug: payload.slug,
                content: payload.content,
                metaTitle: payload.metaTitle,
                metaDescription: payload.metaDescription,
                status: payload.status,
                focusKeyword: payload.focusKeyword,
                ogImage: payload.ogImage,
                ogTitle: payload.ogTitle,
                ogDescription: payload.ogDescription,
                canonicalUrl: payload.canonicalUrl,
                schemaType: payload.schemaType,
                schemaData: payload.schemaData,
                ...(publishedAt !== undefined ? { publishedAt } : {}),
            },
        })

        logAdminInfo({
            requestId,
            action: "pages:update",
            userId: adminCheck.identity.id,
            role: adminCheck.identity.role,
            roleSource: adminCheck.identity.source,
            status: 200,
            payloadSummary: { id, status: page.status },
            validation: { ok: true },
        })

        return NextResponse.json({ success: true, data: page })
    } catch (error) {
        logAdminError({
            requestId,
            action: "pages:update",
            userId: adminCheck.identity.id,
            role: adminCheck.identity.role,
            roleSource: adminCheck.identity.source,
            status: 500,
            prismaCode: getPrismaErrorCode(error),
            error: summarizeUnknownError(error),
        })

        return NextResponse.json({ error: "Failed to update page" }, { status: 500 })
    }
}

// DELETE: Delete page
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const adminCheck = await requireAdminMutationApi(request, { action: "pages:delete" })
    if (!adminCheck.ok) return adminCheck.response

    const { id } = await params
    await prisma.page.delete({ where: { id } })

    return NextResponse.json({ success: true })
}
