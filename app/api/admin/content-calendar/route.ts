import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import prisma from "@/lib/db/prisma"
import { requireAdminApi, requireAdminMutationApi } from "@/lib/security/admin"
import { logAdminError, logAdminInfo } from "@/lib/observability/admin-log"
import { summarizeUnknownError } from "@/lib/security/admin-helpers"
import { classifyProviderFailure, toAiKeyFailureHttpStatus } from "@/lib/security/ai-key-status"
import { SITE_URL } from "@/lib/constants"
import {
    ensureUniquePostSlug,
    sanitizeArticleHtml,
    estimateReadingTime,
} from "@/lib/content/post-publishing"
import { RoleModelNotConfiguredError, generateRoleJson } from "@/lib/ai/task-models"
import {
    HAIBUNDA_VOICE,
    buildFullContentPrompt,
    buildOutlinePrompt,
    fullContentStructuredSchema,
    outlineStructuredSchema,
} from "@/lib/ai/prompts"
import { renderArticleHtml, renderOutlineHtml } from "@/lib/ai/article-format"

// Generating a full article from an idea (outline + content) is a multi-minute call.
export const maxDuration = 300

/**
 * Content calendar operations over ContentIdea rows.
 *
 * GET    - list ideas in a date window (drives the 30-day calendar view)
 * PATCH  - reschedule / dismiss / reorder a single idea
 * POST   - turn an idea into a real Post (DRAFT or SCHEDULED) using the text role model
 */

const listQuerySchema = z.object({
    from: z.string().trim().max(40).optional(),
    to: z.string().trim().max(40).optional(),
    status: z.enum(["pending", "scheduled", "drafted", "published", "dismissed"]).optional(),
})

const patchIdeaSchema = z.object({
    id: z.string().trim().min(1),
    scheduledFor: z.string().trim().max(40).optional().nullable(),
    status: z.enum(["pending", "scheduled", "drafted", "published", "dismissed"]).optional(),
    title: z.string().trim().min(5).max(180).optional(),
    focusKeyword: z.string().trim().max(120).optional().nullable(),
})

const materializeSchema = z.object({
    ideaId: z.string().trim().min(1),
    /**
     * SCHEDULED writes Post.scheduledAt from the idea slot so the cron publisher can pick
     * it up. DRAFT keeps it invisible until an editor publishes manually.
     */
    targetStatus: z.enum(["DRAFT", "SCHEDULED"]).default("SCHEDULED"),
    targetWordCount: z.coerce.number().int().min(400).max(3000).optional(),
})

function errorJson(error: string, errorCode: string, status: number, details?: Record<string, unknown>) {
    return NextResponse.json(
        { success: false, error, errorCode, ...(details ? { details } : {}) },
        { status }
    )
}

function validationErrorJson(zodError: z.ZodError) {
    return NextResponse.json(
        {
            success: false,
            error: "Validation failed",
            errorCode: "CONTENT_CALENDAR_VALIDATION_FAILED",
            details: {
                issues: zodError.issues.map((issue) => ({
                    path: issue.path.join("."),
                    code: issue.code,
                    message: issue.message,
                })),
            },
        },
        { status: 400 }
    )
}

function parseDate(value: string | null | undefined): Date | null {
    if (!value) return null
    const parsed = new Date(value)
    return Number.isNaN(parsed.getTime()) ? null : parsed
}

// GET: ideas within a window
export async function GET(request: NextRequest) {
    const adminCheck = await requireAdminApi()
    if (!adminCheck.ok) return adminCheck.response

    const { searchParams } = new URL(request.url)
    const parsed = listQuerySchema.safeParse({
        from: searchParams.get("from") || undefined,
        to: searchParams.get("to") || undefined,
        status: searchParams.get("status") || undefined,
    })

    if (!parsed.success) return validationErrorJson(parsed.error)

    const from = parseDate(parsed.data.from)
    const to = parseDate(parsed.data.to)

    try {
        const ideas = await prisma.contentIdea.findMany({
            where: {
                ...(parsed.data.status ? { status: parsed.data.status } : {}),
                ...(from || to
                    ? {
                        scheduledFor: {
                            ...(from ? { gte: from } : {}),
                            ...(to ? { lte: to } : {}),
                        },
                    }
                    : {}),
            },
            orderBy: [{ scheduledFor: "asc" }, { order: "asc" }],
            include: {
                post: { select: { id: true, slug: true, status: true, scheduledAt: true } },
            },
        })

        return NextResponse.json({ success: true, data: ideas })
    } catch (error) {
        return errorJson("Gagal memuat kalender konten", "CONTENT_CALENDAR_LIST_FAILED", 500, {
            reason: summarizeUnknownError(error),
        })
    }
}

// PATCH: reschedule or update a single idea
export async function PATCH(request: NextRequest) {
    const adminCheck = await requireAdminMutationApi(request, { action: "content-calendar:update" })
    if (!adminCheck.ok) return adminCheck.response

    let payload: z.infer<typeof patchIdeaSchema>
    try {
        const body = await request.json()
        const parsed = patchIdeaSchema.safeParse(body)
        if (!parsed.success) return validationErrorJson(parsed.error)
        payload = parsed.data
    } catch {
        return errorJson("Invalid request payload", "CONTENT_CALENDAR_INVALID_JSON", 400)
    }

    const existing = await prisma.contentIdea.findUnique({
        where: { id: payload.id },
        select: { id: true, postId: true },
    })

    if (!existing) {
        return errorJson("Ide konten tidak ditemukan", "CONTENT_IDEA_NOT_FOUND", 404)
    }

    const updateData: {
        scheduledFor?: Date | null
        status?: string
        title?: string
        focusKeyword?: string | null
    } = {}

    if (payload.scheduledFor !== undefined) {
        if (payload.scheduledFor === null) {
            updateData.scheduledFor = null
        } else {
            const parsedDate = parseDate(payload.scheduledFor)
            if (!parsedDate) {
                return errorJson("Tanggal jadwal tidak valid", "CONTENT_IDEA_INVALID_DATE", 400)
            }
            updateData.scheduledFor = parsedDate
        }
    }

    if (payload.status !== undefined) updateData.status = payload.status
    if (payload.title !== undefined) updateData.title = payload.title
    if (payload.focusKeyword !== undefined) {
        updateData.focusKeyword = payload.focusKeyword?.trim() ? payload.focusKeyword.trim() : null
    }

    if (Object.keys(updateData).length === 0) {
        return errorJson("Tidak ada perubahan yang dikirim", "CONTENT_IDEA_NO_UPDATES", 400)
    }

    const updated = await prisma.contentIdea.update({
        where: { id: existing.id },
        data: updateData,
    })

    // Keep an already-materialized post in sync when its calendar slot moves.
    if (existing.postId && updateData.scheduledFor) {
        await prisma.post
            .updateMany({
                where: { id: existing.postId, status: "SCHEDULED" },
                data: { scheduledAt: updateData.scheduledFor },
            })
            .catch(() => undefined)
    }

    return NextResponse.json({ success: true, data: updated })
}

// POST: generate the article for an idea and create the Post row
export async function POST(request: NextRequest) {
    const adminCheck = await requireAdminMutationApi(request, { action: "content-calendar:materialize" })
    if (!adminCheck.ok) return adminCheck.response

    const requestId = crypto.randomUUID()

    let payload: z.infer<typeof materializeSchema>
    try {
        const body = await request.json()
        const parsed = materializeSchema.safeParse(body)
        if (!parsed.success) return validationErrorJson(parsed.error)
        payload = parsed.data
    } catch {
        return errorJson("Invalid request payload", "CONTENT_CALENDAR_INVALID_JSON", 400)
    }

    const idea = await prisma.contentIdea.findUnique({ where: { id: payload.ideaId } })
    if (!idea) {
        return errorJson("Ide konten tidak ditemukan", "CONTENT_IDEA_NOT_FOUND", 404)
    }

    if (idea.postId) {
        return errorJson(
            "Ide ini sudah pernah dibuat menjadi artikel.",
            "CONTENT_IDEA_ALREADY_MATERIALIZED",
            409,
            { postId: idea.postId }
        )
    }

    if (payload.targetStatus === "SCHEDULED" && !idea.scheduledFor) {
        return errorJson(
            "Ide ini belum punya tanggal jadwal. Atur jadwal dulu atau buat sebagai draft.",
            "CONTENT_IDEA_NO_SCHEDULE",
            400
        )
    }

    try {
        // Reuse the stored outline when the audit produced one; otherwise generate it first
        // so the article always has a deliberate structure.
        let outlineHtml = idea.outlineHtml?.trim() || ""

        if (!outlineHtml) {
            const outlineResult = await generateRoleJson(
                "text",
                {
                    system: `${HAIBUNDA_VOICE}`,
                    prompt: buildOutlinePrompt({
                        title: idea.title,
                        keyword: idea.focusKeyword,
                        angle: idea.angle,
                    }),
                    temperature: 0.6,
                    maxTokens: 2048,
                    timeoutMs: 150_000,
                },
                outlineStructuredSchema
            )
            outlineHtml = renderOutlineHtml(outlineResult.value)
        }

        const contentResult = await generateRoleJson(
            "text",
            {
                system: `${HAIBUNDA_VOICE}`,
                prompt: buildFullContentPrompt({
                    title: idea.title,
                    outline: outlineHtml,
                    keyword: idea.focusKeyword,
                    targetWordCount: payload.targetWordCount,
                }),
                temperature: 0.75,
                maxTokens: 8192,
                timeoutMs: 240_000,
            },
            fullContentStructuredSchema
        )

        const safeContent = sanitizeArticleHtml(renderArticleHtml(contentResult.value))
        if (!safeContent) {
            return errorJson(
                "Konten hasil AI kosong setelah sanitasi HTML",
                "CONTENT_IDEA_EMPTY_CONTENT",
                502
            )
        }

        const slug = await ensureUniquePostSlug(idea.title)
        const categoryId = idea.categorySlug
            ? (await prisma.category.findUnique({
                where: { slug: idea.categorySlug },
                select: { id: true },
            }))?.id ?? null
            : null

        const post = await prisma.post.create({
            data: {
                title: idea.title,
                slug,
                content: safeContent,
                excerpt: contentResult.value.excerpt ?? null,
                status: payload.targetStatus,
                publishedAt: null,
                scheduledAt: payload.targetStatus === "SCHEDULED" ? idea.scheduledFor : null,
                readingTime: estimateReadingTime(safeContent),
                focusKeyword: idea.focusKeyword,
                focusKeywords: idea.secondaryKeywords,
                canonicalUrl: `${SITE_URL}/${slug}`,
                source: "ai_dashboard",
                createdVia: "content-calendar",
                author: { connect: { id: adminCheck.identity.id } },
                ...(categoryId
                    ? { categories: { create: [{ category: { connect: { id: categoryId } } }] } }
                    : {}),
            },
            select: { id: true, slug: true, title: true, status: true, scheduledAt: true },
        })

        await prisma.contentIdea.update({
            where: { id: idea.id },
            data: {
                postId: post.id,
                outlineHtml,
                status: payload.targetStatus === "SCHEDULED" ? "scheduled" : "drafted",
            },
        })

        logAdminInfo({
            requestId,
            action: "content-calendar:materialize",
            userId: adminCheck.identity.id,
            role: adminCheck.identity.role,
            roleSource: adminCheck.identity.source,
            status: 200,
            payloadSummary: { ideaId: idea.id, postId: post.id, targetStatus: payload.targetStatus },
            validation: { ok: true },
        })

        return NextResponse.json({
            success: true,
            data: { ...post, editUrl: `/admin/posts/${post.id}/edit` },
        })
    } catch (error) {
        const failure = classifyProviderFailure(error)

        logAdminError({
            requestId,
            action: "content-calendar:materialize",
            userId: adminCheck.identity.id,
            role: adminCheck.identity.role,
            roleSource: adminCheck.identity.source,
            status: toAiKeyFailureHttpStatus(failure),
            error: summarizeUnknownError(error).slice(0, 800),
        })

        if (error instanceof RoleModelNotConfiguredError) {
            return errorJson(
                "Model Generate Teks belum dikonfigurasi. Atur di Settings > AI Models.",
                "AI_ROLE_NOT_CONFIGURED",
                400,
                { role: error.role }
            )
        }

        return errorJson(
            "Gagal membuat artikel dari ide konten",
            failure.code,
            toAiKeyFailureHttpStatus(failure),
            { reason: failure.message }
        )
    }
}
