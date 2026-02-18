import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import prisma from "@/lib/db/prisma"
import { requireAdminApi, requireAdminMutationApi } from "@/lib/security/admin"
import { logAdminError, logAdminInfo, logAdminWarn } from "@/lib/observability/admin-log"
import { adminJsonValidationError, getPrismaErrorCode, summarizeUnknownError } from "@/lib/security/admin-helpers"

const routeParamsSchema = z.object({
    id: z.string().min(1, "Tag ID is required"),
})

const updateTagSchema = z.object({
    name: z.string().trim().min(1, "Name is required"),
})

function slugify(text: string): string {
    return text.toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").replace(/^-+|-+$/g, "")
}

// PUT: Update tag
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const adminCheck = await requireAdminMutationApi(request, { action: "tags:update" })
    if (!adminCheck.ok) return adminCheck.response

    const requestId = crypto.randomUUID()

    const parsedParams = routeParamsSchema.safeParse(await params)
    if (!parsedParams.success) {
        logAdminWarn({
            requestId,
            action: "tags:update",
            userId: adminCheck.identity.id,
            role: adminCheck.identity.role,
            roleSource: adminCheck.identity.source,
            status: 400,
            validation: { ok: false, reason: "invalid_params" },
        })
        return adminJsonValidationError(parsedParams.error)
    }

    let payload: z.infer<typeof updateTagSchema>

    try {
        const body = await request.json()
        const parsedBody = updateTagSchema.safeParse(body)
        if (!parsedBody.success) {
            logAdminWarn({
                requestId,
                action: "tags:update",
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
            action: "tags:update",
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
        const existing = await prisma.tag.findFirst({
            where: { slug, id: { not: id } },
        })
        if (existing) {
            logAdminWarn({
                requestId,
                action: "tags:update",
                userId: adminCheck.identity.id,
                role: adminCheck.identity.role,
                roleSource: adminCheck.identity.source,
                status: 400,
                validation: { ok: false, reason: "slug_exists" },
            })
            return NextResponse.json(
                {
                    error: "Validation failed",
                    issues: [{ path: "name", code: "custom", message: "Tag slug already exists" }],
                },
                { status: 400 }
            )
        }

        const tag = await prisma.tag.update({
            where: { id },
            data: { name: payload.name.trim(), slug },
        })

        logAdminInfo({
            requestId,
            action: "tags:update",
            userId: adminCheck.identity.id,
            role: adminCheck.identity.role,
            roleSource: adminCheck.identity.source,
            status: 200,
            payloadSummary: { id: tag.id, slug: tag.slug },
            validation: { ok: true },
        })

        return NextResponse.json({ success: true, data: tag })
    } catch (error) {
        logAdminError({
            requestId,
            action: "tags:update",
            userId: adminCheck.identity.id,
            role: adminCheck.identity.role,
            roleSource: adminCheck.identity.source,
            status: 500,
            prismaCode: getPrismaErrorCode(error),
            error: summarizeUnknownError(error),
        })
        return NextResponse.json({ error: "Failed to update tag" }, { status: 500 })
    }
}

// DELETE: Delete tag
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const adminCheck = await requireAdminMutationApi(request, { action: "tags:delete" })
    if (!adminCheck.ok) return adminCheck.response

    const { id } = await params

    await prisma.tagsOnPosts.deleteMany({ where: { tagId: id } })
    await prisma.tag.delete({ where: { id } })

    return NextResponse.json({ success: true })
}
