import { NextRequest, NextResponse } from "next/server"
import { PostStatus } from "@prisma/client"
import { z } from "zod"
import prisma from "@/lib/db/prisma"
import { requireAdminApi, requireAdminMutationApi } from "@/lib/security/admin"
import { logAdminError, logAdminInfo, logAdminWarn } from "@/lib/observability/admin-log"
import { adminJsonValidationError, getPrismaErrorCode, summarizeUnknownError } from "@/lib/security/admin-helpers"

const createPageSchema = z.object({
    title: z.string().trim().min(1, "Title is required"),
    slug: z.string().trim().min(1, "Slug is required"),
    content: z.string().optional().nullable(),
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

const createPageDataSchema = z.object({
    title: z.string(),
    slug: z.string(),
    content: z.string(),
    metaTitle: z.string().nullable().optional(),
    metaDescription: z.string().nullable().optional(),
    status: z.nativeEnum(PostStatus),
    publishedAt: z.date().nullable().optional(),
    focusKeyword: z.string().nullable().optional(),
    ogImage: z.string().nullable().optional(),
    ogTitle: z.string().nullable().optional(),
    ogDescription: z.string().nullable().optional(),
    canonicalUrl: z.string().nullable().optional(),
    schemaType: z.string().nullable().optional(),
    schemaData: z.string().nullable().optional(),
})

// GET: List pages
export async function GET() {
    const adminCheck = await requireAdminApi()
    if (!adminCheck.ok) return adminCheck.response

    const pages = await prisma.page.findMany({
        orderBy: { updatedAt: "desc" },
        select: {
            id: true,
            title: true,
            slug: true,
            status: true,
            publishedAt: true,
            updatedAt: true,
        },
    })

    return NextResponse.json({ success: true, data: pages })
}

// POST: Create page
export async function POST(request: NextRequest) {
    const adminCheck = await requireAdminMutationApi(request, { action: "pages:create" })
    if (!adminCheck.ok) return adminCheck.response

    const requestId = crypto.randomUUID()

    let payload: z.infer<typeof createPageSchema>
    try {
        const body = await request.json()
        const parsedBody = createPageSchema.safeParse(body)
        if (!parsedBody.success) {
            logAdminWarn({
                requestId,
                action: "pages:create",
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
            action: "pages:create",
            userId: adminCheck.identity.id,
            role: adminCheck.identity.role,
            roleSource: adminCheck.identity.source,
            status: 400,
            validation: { ok: false, reason: "malformed_json" },
        })
        return adminJsonValidationError(error)
    }

    try {
        const existing = await prisma.page.findUnique({ where: { slug: payload.slug } })
        if (existing) {
            logAdminWarn({
                requestId,
                action: "pages:create",
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

        const status = payload.status || "DRAFT"
        const rawData = {
            title: payload.title,
            slug: payload.slug,
            content: payload.content || "",
            metaTitle: payload.metaTitle,
            metaDescription: payload.metaDescription,
            status,
            publishedAt: status === "PUBLISHED" ? new Date() : null,
            focusKeyword: payload.focusKeyword,
            ogImage: payload.ogImage,
            ogTitle: payload.ogTitle,
            ogDescription: payload.ogDescription,
            canonicalUrl: payload.canonicalUrl,
            schemaType: payload.schemaType,
            schemaData: payload.schemaData,
        }

        const data = createPageDataSchema.parse(rawData)
        const page = await prisma.page.create({ data })

        logAdminInfo({
            requestId,
            action: "pages:create",
            userId: adminCheck.identity.id,
            role: adminCheck.identity.role,
            roleSource: adminCheck.identity.source,
            status: 200,
            payloadSummary: { id: page.id, status: page.status },
            validation: { ok: true },
        })

        return NextResponse.json({ success: true, data: page })
    } catch (error) {
        logAdminError({
            requestId,
            action: "pages:create",
            userId: adminCheck.identity.id,
            role: adminCheck.identity.role,
            roleSource: adminCheck.identity.source,
            status: 500,
            prismaCode: getPrismaErrorCode(error),
            error: summarizeUnknownError(error),
        })
        return NextResponse.json({ error: "Failed to create page" }, { status: 500 })
    }
}
