import prisma from "@/lib/db/prisma"
import { validatePublishReadiness } from "@/lib/content/post-publishing"

export type PublishScheduledResult = {
    checked: number
    published: Array<{ id: string; slug: string }>
    skipped: Array<{ id: string; slug: string; reason: string }>
}

const MAX_BATCH = 50

/**
 * Publishes every SCHEDULED post whose `scheduledAt` has passed.
 *
 * Each post is still put through `validatePublishReadiness`, so a thin or malformed
 * article cannot become publicly visible just because its timer expired. Posts that fail
 * the gate stay SCHEDULED and are reported, rather than being silently published or
 * silently dropped.
 */
export async function publishDueScheduledPosts(now: Date = new Date()): Promise<PublishScheduledResult> {
    const due = await prisma.post.findMany({
        where: {
            status: "SCHEDULED",
            scheduledAt: { not: null, lte: now },
        },
        orderBy: { scheduledAt: "asc" },
        take: MAX_BATCH,
        select: {
            id: true,
            slug: true,
            title: true,
            content: true,
            excerpt: true,
            metaDescription: true,
        },
    })

    const published: PublishScheduledResult["published"] = []
    const skipped: PublishScheduledResult["skipped"] = []

    for (const post of due) {
        const issues = validatePublishReadiness({
            title: post.title,
            contentHtml: post.content,
            excerpt: post.excerpt,
            metaDescription: post.metaDescription,
        })

        if (issues.length > 0) {
            skipped.push({
                id: post.id,
                slug: post.slug,
                reason: issues.map((issue) => issue.message).join("; "),
            })
            continue
        }

        // Guard the transition on status so two concurrent runs cannot both publish.
        const updated = await prisma.post.updateMany({
            where: { id: post.id, status: "SCHEDULED" },
            data: {
                status: "PUBLISHED",
                publishedAt: now,
                scheduledAt: null,
            },
        })

        if (updated.count === 0) continue

        await prisma.contentIdea
            .updateMany({
                where: { postId: post.id },
                data: { status: "published" },
            })
            .catch(() => undefined)

        published.push({ id: post.id, slug: post.slug })
    }

    return { checked: due.length, published, skipped }
}
