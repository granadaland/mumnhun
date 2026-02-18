import { NextRequest, NextResponse } from "next/server"
import { Prisma } from "@prisma/client"
import { z } from "zod"
import prisma from "@/lib/db/prisma"
import { requireAdminApi, requireAdminMutationApi } from "@/lib/security/admin"
import { logAdminError, logAdminInfo, logAdminWarn } from "@/lib/observability/admin-log"
import { adminJsonValidationError, getPrismaErrorCode, summarizeUnknownError } from "@/lib/security/admin-helpers"

const listPostsQuerySchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    status: z.enum(["DRAFT", "PUBLISHED", "SCHEDULED", "ARCHIVED"]).optional(),
    search: z.string().trim().min(1).max(200).optional(),
    category: z.string().trim().min(1).max(200).optional(),
})

const createPostSchema = z.object({
    title: z.string().trim().min(1, "Title is required"),
    slug: z.string().trim().min(1, "Slug is required"),
    content: z.string().optional().nullable(),
    excerpt: z.string().optional().nullable(),
    featuredImage: z.string().optional().nullable(),
    status: z.enum(["DRAFT", "PUBLISHED", "SCHEDULED", "ARCHIVED"]).optional(),
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

const createPostDataSchema = z.object({
    title: z.string(),
    slug: z.string(),
    content: z.string(),
    excerpt: z.string().nullable().optional(),
    featuredImage: z.string().nullable().optional(),
    status: z.enum(["DRAFT", "PUBLISHED", "SCHEDULED", "ARCHIVED"]),
    publishedAt: z.date().nullable().optional(),
    scheduledAt: z.date().nullable().optional(),
    readingTime: z.number().int().nullable().optional(),
    metaTitle: z.string().nullable().optional(),
    metaDescription: z.string().nullable().optional(),
    focusKeyword: z.string().nullable().optional(),
    focusKeywords: z.string().nullable().optional(),
    canonicalUrl: z.string().nullable().optional(),
    ogImage: z.string().nullable().optional(),
    ogTitle: z.string().nullable().optional(),
    ogDescription: z.string().nullable().optional(),
    schemaType: z.string().nullable().optional(),
    schemaData: z.string().nullable().optional(),
    categories: z
        .object({
            create: z.array(
                z.object({
                    category: z.object({ connect: z.object({ id: z.string() }) }),
                })
            ),
        })
        .optional(),
    tags: z
        .object({
            create: z.array(
                z.object({
                    tag: z.object({ connect: z.object({ id: z.string() }) }),
                })
            ),
        })
        .optional(),
})

function parseDateInput(value?: string | null): Date | null {
    if (!value) return null
    const parsed = new Date(value)
    if (Number.isNaN(parsed.getTime())) return null
    return parsed
}

// GET: List posts with pagination, filtering, search
export async function GET(request: NextRequest) {
    const adminCheck = await requireAdminApi()
    if (!adminCheck.ok) return adminCheck.response

    const requestId = crypto.randomUUID()

    const { searchParams } = new URL(request.url)
    const parsedQuery = listPostsQuerySchema.safeParse({
        page: searchParams.get("page") || "1",
        limit: searchParams.get("limit") || "20",
        status: searchParams.get("status") || undefined,
        search: searchParams.get("search") || undefined,
        category: searchParams.get("category") || undefined,
    })

    if (!parsedQuery.success) {
        logAdminWarn({
            requestId,
            action: "posts:list",
            userId: adminCheck.identity.id,
            role: adminCheck.identity.role,
            roleSource: adminCheck.identity.source,
            status: 400,
            validation: { ok: false, reason: "invalid_query" },
        })
        return adminJsonValidationError(parsedQuery.error)
    }

    const { page, limit, status, search, category } = parsedQuery.data
    const skip = (page - 1) * limit

    const where: Prisma.PostWhereInput = {}
    if (status) where.status = status
    if (search) {
        where.OR = [
            { title: { contains: search, mode: "insensitive" } },
            { slug: { contains: search, mode: "insensitive" } },
        ]
    }
    if (category) {
        where.categories = { some: { category: { slug: category } } }
    }

    try {
        const [posts, total] = await Promise.all([
            prisma.post.findMany({
                where,
                orderBy: { updatedAt: "desc" },
                skip,
                take: limit,
                select: {
                    id: true,
                    title: true,
                    slug: true,
                    status: true,
                    featuredImage: true,
                    publishedAt: true,
                    scheduledAt: true,
                    updatedAt: true,
                    readingTime: true,
                    categories: {
                        select: { category: { select: { id: true, name: true, slug: true } } },
                    },
                    author: { select: { id: true, name: true, email: true } },
                },
            }),
            prisma.post.count({ where }),
        ])

        logAdminInfo({
            requestId,
            action: "posts:list",
            userId: adminCheck.identity.id,
            role: adminCheck.identity.role,
            roleSource: adminCheck.identity.source,
            status: 200,
            payloadSummary: { page, limit, total, status: status || "ALL" },
            validation: { ok: true },
        })

        return NextResponse.json({
            success: true,
            data: posts,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        })
    } catch (error) {
        logAdminError({
            requestId,
            action: "posts:list",
            userId: adminCheck.identity.id,
            role: adminCheck.identity.role,
            roleSource: adminCheck.identity.source,
            status: 500,
            prismaCode: getPrismaErrorCode(error),
            error: summarizeUnknownError(error),
        })
        return NextResponse.json({ error: "Failed to fetch posts" }, { status: 500 })
    }
}

// POST: Create new post
export async function POST(request: NextRequest) {
    const adminCheck = await requireAdminMutationApi(request, { action: "posts:create" })
    if (!adminCheck.ok) return adminCheck.response

    const requestId = crypto.randomUUID()

    let payload: z.infer<typeof createPostSchema>
    try {
        const body = await request.json()
        const parsedBody = createPostSchema.safeParse(body)
        if (!parsedBody.success) {
            logAdminWarn({
                requestId,
                action: "posts:create",
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
            action: "posts:create",
            userId: adminCheck.identity.id,
            role: adminCheck.identity.role,
            roleSource: adminCheck.identity.source,
            status: 400,
            validation: { ok: false, reason: "malformed_json" },
        })
        return adminJsonValidationError(error)
    }

    const parsedPublishedAt = parseDateInput(payload.publishedAt)
    if (payload.publishedAt && !parsedPublishedAt) {
        return NextResponse.json({ error: "Invalid publishedAt" }, { status: 400 })
    }

    const parsedScheduledAt = parseDateInput(payload.scheduledAt)
    if (payload.scheduledAt && !parsedScheduledAt) {
        return NextResponse.json({ error: "Invalid scheduledAt" }, { status: 400 })
    }

    try {
        // Check slug uniqueness
        const existing = await prisma.post.findUnique({ where: { slug: payload.slug } })
        if (existing) {
            return NextResponse.json({ error: "Slug already exists" }, { status: 400 })
        }

        const status = payload.status || "DRAFT"

        // Calculate reading time
        const wordCount = (payload.content || "").replace(/<[^>]*>/g, "").split(/\s+/).filter(Boolean).length
        const readingTime = Math.max(1, Math.ceil(wordCount / 200))

        const rawData = {
            title: payload.title,
            slug: payload.slug,
            content: payload.content || "",
            excerpt: payload.excerpt,
            featuredImage: payload.featuredImage,
            status,
            publishedAt: status === "PUBLISHED" ? (parsedPublishedAt || new Date()) : null,
            scheduledAt: status === "SCHEDULED" ? parsedScheduledAt : null,
            readingTime,
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
            categories: payload.categoryIds?.length
                ? {
                    create: payload.categoryIds.map((catId) => ({
                        category: { connect: { id: catId } },
                    })),
                }
                : undefined,
            tags: payload.tagIds?.length
                ? {
                    create: payload.tagIds.map((tagId) => ({
                        tag: { connect: { id: tagId } },
                    })),
                }
                : undefined,
        }

        const data = createPostDataSchema.parse(rawData)

        const post = await prisma.post.create({
            data,
            include: {
                categories: { select: { category: true } },
                tags: { select: { tag: true } },
            },
        })

        logAdminInfo({
            requestId,
            action: "posts:create",
            userId: adminCheck.identity.id,
            role: adminCheck.identity.role,
            roleSource: adminCheck.identity.source,
            status: 200,
            payloadSummary: { id: post.id, status: post.status },
            validation: { ok: true },
        })

        return NextResponse.json({ success: true, data: post })
    } catch (error) {
        logAdminError({
            requestId,
            action: "posts:create",
            userId: adminCheck.identity.id,
            role: adminCheck.identity.role,
            roleSource: adminCheck.identity.source,
            status: 500,
            prismaCode: getPrismaErrorCode(error),
            error: summarizeUnknownError(error),
        })
        return NextResponse.json({ error: "Failed to create post" }, { status: 500 })
    }
}
