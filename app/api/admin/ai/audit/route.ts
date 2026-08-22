import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import prisma from "@/lib/db/prisma"
import { requireAdminApi, requireAdminMutationApi } from "@/lib/security/admin"
import { logAdminError, logAdminInfo, logAdminWarn } from "@/lib/observability/admin-log"
import { summarizeUnknownError } from "@/lib/security/admin-helpers"
import { classifyProviderFailure, toAiKeyFailureHttpStatus } from "@/lib/security/ai-key-status"
import { SITE_URL } from "@/lib/constants"
import {
    RoleModelNotConfiguredError,
    generateRoleJson,
} from "@/lib/ai/task-models"
import {
    HAIBUNDA_VOICE,
    buildContentAuditPrompt,
    contentAuditOutputSchema,
    type AuditPostSummary,
} from "@/lib/ai/prompts"

/**
 * Content audit: one pass of the scanning model over every published article.
 *
 * Produces three persisted artefacts:
 *  1. a gap summary,
 *  2. content ideas mapped onto a real 30-day calendar (ContentIdea.scheduledFor),
 *  3. internal link suggestions between existing posts (InternalLinkSuggestion).
 *
 * Link suggestions are verified against the real source content before being stored, so a
 * hallucinated phrase can never be applied to an article.
 */

// Scanning the whole archive with one large model call is slow; allow up to 5 minutes so
// Vercel does not terminate the function before the model responds. Capped by plan limit.
export const maxDuration = 300

const auditRequestSchema = z.object({
    ideaCount: z.coerce.number().int().min(5).max(30).default(30),
    /** First publish date of the plan. Defaults to tomorrow. */
    startDate: z.string().trim().max(40).optional(),
    /** Local hour of day used for every scheduled slot. */
    publishHour: z.coerce.number().int().min(0).max(23).default(9),
})

const MAX_AUDIT_POSTS = 200
const MAX_LINKS_PER_SOURCE = 3

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
            errorCode: "CONTENT_AUDIT_VALIDATION_FAILED",
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

function stripHtml(value: string): string {
    return value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim()
}

function parseStartDate(raw: string | undefined, publishHour: number): Date {
    const base = raw ? new Date(raw) : null
    const valid = base && !Number.isNaN(base.getTime()) ? base : new Date(Date.now() + 24 * 60 * 60 * 1000)

    const start = new Date(valid)
    start.setHours(publishHour, 0, 0, 0)
    return start
}

/** Maps a 1-based day slot onto a concrete publish timestamp. */
function resolveScheduledFor(startDate: Date, dayOffset: number): Date {
    const scheduled = new Date(startDate)
    scheduled.setDate(scheduled.getDate() + (dayOffset - 1))
    return scheduled
}

function buildInternalLinkHtml(targetUrl: string, phrase: string): string {
    const escapedPhrase = phrase
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
    return `<a href="${targetUrl}">${escapedPhrase}</a>`
}

// GET: latest audit with its ideas and link suggestions
export async function GET() {
    const adminCheck = await requireAdminApi()
    if (!adminCheck.ok) return adminCheck.response

    try {
        const audit = await prisma.contentAudit.findFirst({
            orderBy: { createdAt: "desc" },
            include: {
                ideas: { orderBy: [{ scheduledFor: "asc" }, { order: "asc" }] },
                linkSuggestions: {
                    orderBy: { createdAt: "asc" },
                    include: {
                        sourcePost: { select: { id: true, title: true, slug: true } },
                        targetPost: { select: { id: true, title: true, slug: true } },
                    },
                },
            },
        })

        return NextResponse.json({ success: true, data: audit })
    } catch (error) {
        return errorJson(
            "Gagal memuat hasil audit konten",
            "CONTENT_AUDIT_LIST_FAILED",
            500,
            { reason: summarizeUnknownError(error) }
        )
    }
}

// POST: run a new audit
export async function POST(request: NextRequest) {
    const adminCheck = await requireAdminMutationApi(request, { action: "content-audit:create" })
    if (!adminCheck.ok) return adminCheck.response

    const requestId = crypto.randomUUID()

    let payload: z.infer<typeof auditRequestSchema>
    try {
        const body = await request.json().catch(() => ({}))
        const parsed = auditRequestSchema.safeParse(body ?? {})
        if (!parsed.success) {
            logAdminWarn({
                requestId,
                action: "content-audit:create",
                userId: adminCheck.identity.id,
                role: adminCheck.identity.role,
                roleSource: adminCheck.identity.source,
                status: 400,
                validation: { ok: false, reason: "invalid_payload" },
            })
            return validationErrorJson(parsed.error)
        }
        payload = parsed.data
    } catch {
        return errorJson("Invalid request payload", "CONTENT_AUDIT_INVALID_JSON", 400)
    }

    const posts = await prisma.post.findMany({
        where: { status: "PUBLISHED" },
        orderBy: { publishedAt: "desc" },
        take: MAX_AUDIT_POSTS,
        select: {
            id: true,
            slug: true,
            title: true,
            content: true,
            excerpt: true,
            focusKeyword: true,
            categories: { select: { category: { select: { slug: true } } } },
        },
    })

    if (posts.length === 0) {
        return errorJson(
            "Belum ada artikel PUBLISHED untuk diaudit.",
            "CONTENT_AUDIT_NO_POSTS",
            400
        )
    }

    const categories = await prisma.category.findMany({ select: { slug: true, name: true } })

    const audit = await prisma.contentAudit.create({
        data: {
            status: "processing",
            scannedPosts: posts.length,
            userId: adminCheck.identity.id,
        },
        select: { id: true },
    })

    try {
        const summaries: AuditPostSummary[] = posts.map((post) => ({
            slug: post.slug,
            title: post.title,
            focusKeyword: post.focusKeyword,
            categorySlugs: post.categories.map((entry) => entry.category.slug),
            excerpt: post.excerpt || stripHtml(post.content).slice(0, 200) || null,
        }))

        const result = await generateRoleJson(
            "scanning",
            {
                system: `${HAIBUNDA_VOICE}\n\nKamu sedang bekerja sebagai content strategist, bukan penulis.`,
                prompt: buildContentAuditPrompt({
                    posts: summaries,
                    availableCategories: categories,
                    ideaCount: payload.ideaCount,
                }),
                temperature: 0.5,
                maxTokens: 8192,
                timeoutMs: 180_000,
            },
            contentAuditOutputSchema
        )

        const output = result.value
        const startDate = parseStartDate(payload.startDate, payload.publishHour)
        const validCategorySlugs = new Set(categories.map((category) => category.slug))

        const ideaRows = output.ideas.slice(0, payload.ideaCount).map((idea, index) => ({
            auditId: audit.id,
            title: idea.title,
            angle: idea.angle ?? null,
            focusKeyword: idea.focusKeyword,
            secondaryKeywords: idea.secondaryKeywords.length ? idea.secondaryKeywords.join(", ") : null,
            // Only accept a category the site actually has; the model may still hallucinate one.
            categorySlug:
                idea.categorySlug && validCategorySlugs.has(idea.categorySlug) ? idea.categorySlug : null,
            rationale: idea.rationale ?? null,
            scheduledFor: resolveScheduledFor(startDate, idea.dayOffset),
            status: "scheduled",
            order: index,
        }))

        if (ideaRows.length > 0) {
            await prisma.contentIdea.createMany({ data: ideaRows })
        }

        // Verify every suggested phrase against the real article body. A phrase the model
        // invented cannot be applied later, so it is discarded now rather than stored.
        const postBySlug = new Map(posts.map((post) => [post.slug, post]))
        const perSourceCount = new Map<string, number>()
        const linkRows: Array<{
            auditId: string
            sourcePostId: string
            targetPostId: string
            targetUrl: string
            targetTitle: string
            exactPhrase: string
            replacementHtml: string
            rationale: string | null
            status: string
        }> = []

        for (const suggestion of output.linkSuggestions) {
            const source = postBySlug.get(suggestion.sourceSlug)
            const target = postBySlug.get(suggestion.targetSlug)

            if (!source || !target || source.id === target.id) continue
            if (!source.content.includes(suggestion.exactPhrase)) continue

            // Skip a phrase that is already inside an anchor in the source article.
            const anchorPattern = new RegExp(
                `<a[^>]*>[^<]*${suggestion.exactPhrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`,
                "i"
            )
            if (anchorPattern.test(source.content)) continue

            const used = perSourceCount.get(source.id) ?? 0
            if (used >= MAX_LINKS_PER_SOURCE) continue
            perSourceCount.set(source.id, used + 1)

            const targetUrl = `${SITE_URL}/${target.slug}`
            linkRows.push({
                auditId: audit.id,
                sourcePostId: source.id,
                targetPostId: target.id,
                targetUrl,
                targetTitle: target.title,
                exactPhrase: suggestion.exactPhrase,
                replacementHtml: buildInternalLinkHtml(targetUrl, suggestion.exactPhrase),
                rationale: suggestion.rationale ?? null,
                status: "pending",
            })
        }

        if (linkRows.length > 0) {
            await prisma.internalLinkSuggestion.createMany({ data: linkRows })
        }

        const completed = await prisma.contentAudit.update({
            where: { id: audit.id },
            data: {
                status: "completed",
                ideaCount: ideaRows.length,
                linkCount: linkRows.length,
                gapSummary: output.gapSummary,
                usedRoleModelId: result.roleModelId,
                completedAt: new Date(),
            },
            select: { id: true, status: true, scannedPosts: true, ideaCount: true, linkCount: true, gapSummary: true },
        })

        logAdminInfo({
            requestId,
            action: "content-audit:create",
            userId: adminCheck.identity.id,
            role: adminCheck.identity.role,
            roleSource: adminCheck.identity.source,
            status: 200,
            payloadSummary: {
                auditId: audit.id,
                scannedPosts: posts.length,
                ideas: ideaRows.length,
                links: linkRows.length,
                discardedLinks: output.linkSuggestions.length - linkRows.length,
            },
            validation: { ok: true },
        })

        return NextResponse.json({
            success: true,
            data: {
                ...completed,
                discardedLinkSuggestions: output.linkSuggestions.length - linkRows.length,
            },
        })
    } catch (error) {
        const failure = classifyProviderFailure(error)

        await prisma.contentAudit
            .update({
                where: { id: audit.id },
                data: {
                    status: "failed",
                    error: `${failure.code}::${failure.message}`.slice(0, 500),
                    completedAt: new Date(),
                },
            })
            .catch(() => undefined)

        logAdminError({
            requestId,
            action: "content-audit:create",
            userId: adminCheck.identity.id,
            role: adminCheck.identity.role,
            roleSource: adminCheck.identity.source,
            status: toAiKeyFailureHttpStatus(failure),
            error: summarizeUnknownError(error).slice(0, 800),
        })

        if (error instanceof RoleModelNotConfiguredError) {
            return errorJson(
                "Model Scanning belum dikonfigurasi. Atur di Settings > AI Models.",
                "AI_ROLE_NOT_CONFIGURED",
                400,
                { auditId: audit.id, role: error.role }
            )
        }

        return errorJson(
            "Gagal menjalankan audit konten",
            failure.code,
            toAiKeyFailureHttpStatus(failure),
            { auditId: audit.id, reason: failure.message }
        )
    }
}
