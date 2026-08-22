import { NextRequest, NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import prisma from "@/lib/db/prisma"
import { requireAdminApi, requireAdminMutationApi } from "@/lib/security/admin"
import { logAdminInfo } from "@/lib/observability/admin-log"
import { summarizeUnknownError } from "@/lib/security/admin-helpers"
import { sanitizeArticleHtml } from "@/lib/content/post-publishing"

/**
 * Internal link suggestions produced by the scanning model.
 *
 * Applying a suggestion rewrites the source article's stored HTML, replacing the first
 * occurrence of `exactPhrase` with an anchor. The phrase is re-verified against the live
 * content at apply time, because the article may have been edited since the audit ran.
 */

const listQuerySchema = z.object({
    postId: z.string().trim().min(1).optional(),
    status: z.enum(["pending", "applied", "dismissed"]).default("pending"),
    limit: z.coerce.number().int().min(1).max(200).default(100),
})

const applySchema = z.object({
    ids: z.array(z.string().trim().min(1)).min(1).max(50),
    action: z.enum(["apply", "dismiss"]).default("apply"),
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
            errorCode: "INTERNAL_LINK_VALIDATION_FAILED",
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

// GET: list stored suggestions
export async function GET(request: NextRequest) {
    const adminCheck = await requireAdminApi()
    if (!adminCheck.ok) return adminCheck.response

    const { searchParams } = new URL(request.url)
    const parsed = listQuerySchema.safeParse({
        postId: searchParams.get("postId") || undefined,
        status: searchParams.get("status") || undefined,
        limit: searchParams.get("limit") || undefined,
    })

    if (!parsed.success) return validationErrorJson(parsed.error)

    try {
        const suggestions = await prisma.internalLinkSuggestion.findMany({
            where: {
                status: parsed.data.status,
                ...(parsed.data.postId ? { sourcePostId: parsed.data.postId } : {}),
            },
            orderBy: { createdAt: "desc" },
            take: parsed.data.limit,
            include: {
                sourcePost: { select: { id: true, title: true, slug: true } },
                targetPost: { select: { id: true, title: true, slug: true } },
            },
        })

        return NextResponse.json({ success: true, data: suggestions })
    } catch (error) {
        return errorJson("Gagal memuat saran internal link", "INTERNAL_LINK_LIST_FAILED", 500, {
            reason: summarizeUnknownError(error),
        })
    }
}

// POST: apply or dismiss a batch of suggestions
export async function POST(request: NextRequest) {
    const adminCheck = await requireAdminMutationApi(request, { action: "internal-links:apply" })
    if (!adminCheck.ok) return adminCheck.response

    const requestId = crypto.randomUUID()

    let payload: z.infer<typeof applySchema>
    try {
        const body = await request.json()
        const parsed = applySchema.safeParse(body)
        if (!parsed.success) return validationErrorJson(parsed.error)
        payload = parsed.data
    } catch {
        return errorJson("Invalid request payload", "INTERNAL_LINK_INVALID_JSON", 400)
    }

    const suggestions = await prisma.internalLinkSuggestion.findMany({
        where: { id: { in: payload.ids }, status: "pending" },
        include: { sourcePost: { select: { id: true, slug: true, content: true, status: true } } },
    })

    if (suggestions.length === 0) {
        return errorJson(
            "Tidak ada saran pending yang cocok dengan permintaan.",
            "INTERNAL_LINK_NONE_PENDING",
            404
        )
    }

    if (payload.action === "dismiss") {
        await prisma.internalLinkSuggestion.updateMany({
            where: { id: { in: suggestions.map((entry) => entry.id) } },
            data: { status: "dismissed" },
        })

        return NextResponse.json({
            success: true,
            data: { dismissed: suggestions.length, applied: 0, skipped: [] },
        })
    }

    // Group by source so multiple links land in one update per article, avoiding
    // lost-update races between suggestions that touch the same post.
    const bySource = new Map<string, typeof suggestions>()
    for (const suggestion of suggestions) {
        const bucket = bySource.get(suggestion.sourcePostId)
        if (bucket) {
            bucket.push(suggestion)
        } else {
            bySource.set(suggestion.sourcePostId, [suggestion])
        }
    }

    const appliedIds: string[] = []
    const skipped: Array<{ id: string; reason: string }> = []
    const revalidateSlugs: string[] = []

    for (const [sourcePostId, group] of bySource) {
        const sourcePost = group[0].sourcePost
        let content = sourcePost.content
        let mutated = false

        for (const suggestion of group) {
            if (!content.includes(suggestion.exactPhrase)) {
                skipped.push({
                    id: suggestion.id,
                    reason: "Frasa tidak lagi ditemukan di artikel (konten sudah berubah).",
                })
                continue
            }

            content = content.replace(suggestion.exactPhrase, suggestion.replacementHtml)
            appliedIds.push(suggestion.id)
            mutated = true
        }

        if (!mutated) continue

        // Re-sanitize: the stored replacement HTML is server-generated, but running it
        // through the same allowlist as the editor keeps one invariant for post content.
        const safeContent = sanitizeArticleHtml(content)
        if (!safeContent) {
            for (const suggestion of group) {
                const index = appliedIds.indexOf(suggestion.id)
                if (index !== -1) appliedIds.splice(index, 1)
            }
            skipped.push({
                id: group[0].id,
                reason: "Hasil penerapan link kosong setelah sanitasi HTML.",
            })
            continue
        }

        await prisma.post.update({
            where: { id: sourcePostId },
            data: { content: safeContent },
        })

        if (sourcePost.status === "PUBLISHED") {
            revalidateSlugs.push(sourcePost.slug)
        }
    }

    if (appliedIds.length > 0) {
        await prisma.internalLinkSuggestion.updateMany({
            where: { id: { in: appliedIds } },
            data: { status: "applied", appliedAt: new Date() },
        })
    }

    for (const slug of revalidateSlugs) {
        revalidatePath(`/${slug}`)
    }

    logAdminInfo({
        requestId,
        action: "internal-links:apply",
        userId: adminCheck.identity.id,
        role: adminCheck.identity.role,
        roleSource: adminCheck.identity.source,
        status: 200,
        payloadSummary: { applied: appliedIds.length, skipped: skipped.length },
        validation: { ok: true },
    })

    return NextResponse.json({
        success: true,
        data: { applied: appliedIds.length, dismissed: 0, skipped },
    })
}
