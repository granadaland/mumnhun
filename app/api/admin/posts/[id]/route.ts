import { NextRequest, NextResponse } from "next/server"
import { PostStatus, Prisma } from "@prisma/client"
import { z } from "zod"
import prisma from "@/lib/db/prisma"
import { requireAdminApi, requireAdminMutationApi } from "@/lib/security/admin"
import { logAdminError, logAdminInfo, logAdminWarn } from "@/lib/observability/admin-log"
import { adminJsonValidationError, getPrismaErrorCode, summarizeUnknownError } from "@/lib/security/admin-helpers"

const routeParamsSchema = z.object({
    id: z.string().min(1, "Post ID is required"),
})

const updatePostSchema = z.object({
    title: z.string().trim().min(1, "Title cannot be empty").optional(),
    slug: z.string().trim().min(1, "Slug cannot be empty").optional(),
    content: z.string().optional(),
    excerpt: z.string().optional().nullable(),
    featuredImage: z.string().optional().nullable(),
    status: z.nativeEnum(PostStatus).optional(),
    publishedAt: z.string().optional().nullable(),
    scheduledAt: z.string().optional().nullable(),
    categoryIds: z.array(z.string()).optional(),
    tagIds: z.array(z.string()).optional(),
    metaTitle: z.string().optional().nullable(),
    metaDescription: z.string().optional().nullable(),
    focusKeyword: z.string().optional().nullable(),
    focusKeywords: z.string().optional().nullable(),
    canonicalUrl: z.string().optional().nullable(),
    ogImage: z.string().optional().nullable(),
    ogTitle: z.string().optional().nullable(),
    ogDescription: z.string().optional().nullable(),
    schemaType: z.string().optional().nullable(),
    schemaData: z.string().optional().nullable(),
})

function parseDateInput(value?: string | null): Date | null {
    if (!value) return null
    const parsed = new Date(value)
    if (Number.isNaN(parsed.getTime())) return null
    return parsed
}

// GET: Single post by ID
export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const adminCheck = await requireAdminApi()
    if (!adminCheck.ok) return adminCheck.response

    const { id } = await params

    const post = await prisma.post.findUnique({
        where: { id },
        include: {
            categories: { select: { category: true } },
            tags: { select: { tag: true } },
            author: { select: { id: true, name: true, email: true } },
        },
    })

    if (!post) {
        return NextResponse.json({ error: "Post not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: post })
}

// PUT: Update post
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const adminCheck = await requireAdminMutationApi(request, { action: "posts:update" })
    if (!adminCheck.ok) return adminCheck.response

    const requestId = crypto.randomUUID()

    const parsedParams = routeParamsSchema.safeParse(await params)
    if (!parsedParams.success) {
        logAdminWarn({
            requestId,
            action: "posts:update",
            userId: adminCheck.identity.id,
            role: adminCheck.identity.role,
            roleSource: adminCheck.identity.source,
            status: 400,
            validation: { ok: false, reason: "invalid_params" },
        })
        return adminJsonValidationError(parsedParams.error)
    }

    let payload: z.infer<typeof updatePostSchema>

    try {
        const body = await request.json()
        const parsedBody = updatePostSchema.safeParse(body)

        if (!parsedBody.success) {
            logAdminWarn({
                requestId,
                action: "posts:update",
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
            action: "posts:update",
            userId: adminCheck.identity.id,
            role: adminCheck.identity.role,
            roleSource: adminCheck.identity.source,
            status: 400,
            validation: { ok: false, reason: "malformed_json" },
        })
        return adminJsonValidationError(error)
    }

    const { id } = parsedParams.data
    const parsedPublishedAt = parseDateInput(payload.publishedAt)
    if (payload.publishedAt && !parsedPublishedAt) {
        logAdminWarn({
            requestId,
            action: "posts:update",
            userId: adminCheck.identity.id,
            role: adminCheck.identity.role,
            roleSource: adminCheck.identity.source,
            status: 400,
            validation: { ok: false, reason: "invalid_published_at" },
        })
        return NextResponse.json(
            {
                error: "Validation failed",
                issues: [{ path: "publishedAt", code: "custom", message: "Invalid publishedAt" }],
            },
            { status: 400 }
        )
    }

    const parsedScheduledAt = parseDateInput(payload.scheduledAt)
    if (payload.scheduledAt && !parsedScheduledAt) {
        logAdminWarn({
            requestId,
            action: "posts:update",
            userId: adminCheck.identity.id,
            role: adminCheck.identity.role,
            roleSource: adminCheck.identity.source,
            status: 400,
            validation: { ok: false, reason: "invalid_scheduled_at" },
        })
        return NextResponse.json(
            {
                error: "Validation failed",
                issues: [{ path: "scheduledAt", code: "custom", message: "Invalid scheduledAt" }],
            },
            { status: 400 }
        )
    }

    if (payload.status === "SCHEDULED" && !parsedScheduledAt) {
        logAdminWarn({
            requestId,
            action: "posts:update",
            userId: adminCheck.identity.id,
            role: adminCheck.identity.role,
            roleSource: adminCheck.identity.source,
            status: 400,
            validation: { ok: false, reason: "missing_scheduled_at" },
        })
        return NextResponse.json(
            {
                error: "Validation failed",
                issues: [{ path: "scheduledAt", code: "custom", message: "scheduledAt is required for SCHEDULED status" }],
            },
            { status: 400 }
        )
    }

    try {
        // Check slug uniqueness (exclude current post)
        if (payload.slug) {
            const existing = await prisma.post.findFirst({
                where: { slug: payload.slug, id: { not: id } },
            })
            if (existing) {
                logAdminWarn({
                    requestId,
                    action: "posts:update",
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

        let readingTime: number | undefined
        if (payload.content !== undefined) {
            const wordCount = payload.content.replace(/<[^>]*>/g, "").split(/\s+/).filter(Boolean).length
            readingTime = Math.max(1, Math.ceil(wordCount / 200))
        }

        const schedulingData: {
            publishedAt?: Date | null
            scheduledAt?: Date | null
        } = {}

        if (payload.status === "PUBLISHED") {
            schedulingData.publishedAt = parsedPublishedAt || new Date()
            schedulingData.scheduledAt = null
        } else if (payload.status === "SCHEDULED") {
            schedulingData.publishedAt = null
            schedulingData.scheduledAt = parsedScheduledAt as Date
        } else if (payload.status === "DRAFT" || payload.status === "ARCHIVED") {
            schedulingData.publishedAt = null
            schedulingData.scheduledAt = null
        } else {
            if (payload.publishedAt !== undefined) {
                schedulingData.publishedAt = parsedPublishedAt
            }
            if (payload.scheduledAt !== undefined) {
                schedulingData.scheduledAt = parsedScheduledAt
            }
        }

        const updatePostWithRelations = async (tx: Prisma.TransactionClient) => {
            // Update categories
            if (payload.categoryIds !== undefined) {
                await tx.categoriesOnPosts.deleteMany({ where: { postId: id } })
                if (payload.categoryIds.length > 0) {
                    await tx.categoriesOnPosts.createMany({
                        data: payload.categoryIds.map((catId) => ({
                            postId: id,
                            categoryId: catId,
                        })),
                    })
                }
            }

            // Update tags
            if (payload.tagIds !== undefined) {
                await tx.tagsOnPosts.deleteMany({ where: { postId: id } })
                if (payload.tagIds.length > 0) {
                    await tx.tagsOnPosts.createMany({
                        data: payload.tagIds.map((tagId) => ({
                            postId: id,
                            tagId,
                        })),
                    })
                }
            }

            return tx.post.update({
                where: { id },
                data: {
                    title: payload.title,
                    slug: payload.slug,
                    content: payload.content,
                    excerpt: payload.excerpt,
                    featuredImage: payload.featuredImage,
                    status: payload.status,
                    ...schedulingData,
                    ...(readingTime !== undefined ? { readingTime } : {}),
                    metaTitle: payload.metaTitle,
                    metaDescription: payload.metaDescription,
                    focusKeyword: payload.focusKeyword,
                    focusKeywords: payload.focusKeywords,
                    canonicalUrl: payload.canonicalUrl,
                    ogImage: payload.ogImage,
                    ogTitle: payload.ogTitle,
                    ogDescription: payload.ogDescription,
                    schemaType: payload.schemaType,
                    schemaData: payload.schemaData,
                },
                include: {
                    categories: { select: { category: true } },
                    tags: { select: { tag: true } },
                },
            })
        }

        const post = await prisma.$transaction((tx) => updatePostWithRelations(tx))

        logAdminInfo({
            requestId,
            action: "posts:update",
            userId: adminCheck.identity.id,
            role: adminCheck.identity.role,
            roleSource: adminCheck.identity.source,
            status: 200,
            payloadSummary: {
                id,
                status: post.status,
                updatedCategories: payload.categoryIds !== undefined,
                updatedTags: payload.tagIds !== undefined,
            },
            validation: { ok: true },
        })

        return NextResponse.json({ success: true, data: post })
    } catch (error) {
        logAdminError({
            requestId,
            action: "posts:update",
            userId: adminCheck.identity.id,
            role: adminCheck.identity.role,
            roleSource: adminCheck.identity.source,
            status: 500,
            prismaCode: getPrismaErrorCode(error),
            error: summarizeUnknownError(error),
        })

        return NextResponse.json({ error: "Failed to update post" }, { status: 500 })
    }
}

// DELETE: Delete post
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const adminCheck = await requireAdminMutationApi(request, { action: "posts:delete" })
    if (!adminCheck.ok) return adminCheck.response

    const { id } = await params

    await prisma.post.delete({ where: { id } })

    return NextResponse.json({ success: true })
}
