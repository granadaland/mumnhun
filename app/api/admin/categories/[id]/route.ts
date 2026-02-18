import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import prisma from "@/lib/db/prisma"
import { requireAdminApi, requireAdminMutationApi } from "@/lib/security/admin"
import { logAdminError, logAdminInfo, logAdminWarn } from "@/lib/observability/admin-log"
import { adminJsonValidationError, getPrismaErrorCode, summarizeUnknownError } from "@/lib/security/admin-helpers"

const routeParamsSchema = z.object({
    id: z.string().min(1, "Category ID is required"),
})

const updateCategorySchema = z.object({
    name: z.string().trim().min(1, "Name is required"),
    description: z.string().optional().nullable(),
})

function slugify(text: string): string {
    return text.toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").replace(/^-+|-+$/g, "")
}

// PUT: Update category
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const adminCheck = await requireAdminMutationApi(request, { action: "categories:update" })
    if (!adminCheck.ok) return adminCheck.response

    const requestId = crypto.randomUUID()

    const parsedParams = routeParamsSchema.safeParse(await params)
    if (!parsedParams.success) {
        logAdminWarn({
            requestId,
            action: "categories:update",
            userId: adminCheck.identity.id,
            role: adminCheck.identity.role,
            roleSource: adminCheck.identity.source,
            status: 400,
            validation: { ok: false, reason: "invalid_params" },
        })
        return adminJsonValidationError(parsedParams.error)
    }

    let payload: z.infer<typeof updateCategorySchema>

    try {
        const body = await request.json()
        const parsedBody = updateCategorySchema.safeParse(body)
        if (!parsedBody.success) {
            logAdminWarn({
                requestId,
                action: "categories:update",
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
            action: "categories:update",
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
        const slug = slugify(payload.name)
        const existing = await prisma.category.findFirst({
            where: { slug, id: { not: id } },
        })
        if (existing) {
            logAdminWarn({
                requestId,
                action: "categories:update",
                userId: adminCheck.identity.id,
                role: adminCheck.identity.role,
                roleSource: adminCheck.identity.source,
                status: 400,
                validation: { ok: false, reason: "slug_exists" },
            })
            return NextResponse.json(
                {
                    error: "Validation failed",
                    issues: [{ path: "name", code: "custom", message: "Category slug already exists" }],
                },
                { status: 400 }
            )
        }

        const category = await prisma.category.update({
            where: { id },
            data: { name: payload.name.trim(), slug, description: payload.description },
        })

        logAdminInfo({
            requestId,
            action: "categories:update",
            userId: adminCheck.identity.id,
            role: adminCheck.identity.role,
            roleSource: adminCheck.identity.source,
            status: 200,
            payloadSummary: { id: category.id, slug: category.slug },
            validation: { ok: true },
        })

        return NextResponse.json({ success: true, data: category })
    } catch (error) {
        logAdminError({
            requestId,
            action: "categories:update",
            userId: adminCheck.identity.id,
            role: adminCheck.identity.role,
            roleSource: adminCheck.identity.source,
            status: 500,
            prismaCode: getPrismaErrorCode(error),
            error: summarizeUnknownError(error),
        })
        return NextResponse.json({ error: "Failed to update category" }, { status: 500 })
    }
}

// DELETE: Delete category
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const adminCheck = await requireAdminMutationApi(request, { action: "categories:delete" })
    if (!adminCheck.ok) return adminCheck.response

    const { id } = await params

    // Remove category associations first
    await prisma.categoriesOnPosts.deleteMany({ where: { categoryId: id } })
    await prisma.category.delete({ where: { id } })

    return NextResponse.json({ success: true })
}
