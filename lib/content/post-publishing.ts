import prisma from "@/lib/db/prisma"
import { sanitizeHtmlContent } from "@/lib/security/sanitize-html"

export function slugifyTitle(text: string): string {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-+|-+$/g, "")
}

export function estimateReadingTime(contentHtml: string): number {
    const words = contentHtml.replace(/<[^>]*>/g, " ").split(/\s+/).filter(Boolean).length
    return Math.max(1, Math.ceil(words / 200))
}

/**
 * Resolves a collision-free slug. Falls back to a timestamp suffix so a pathological
 * collision run cannot loop indefinitely.
 */
export async function ensureUniquePostSlug(base: string): Promise<string> {
    const normalizedBase = slugifyTitle(base) || `artikel-${Date.now()}`
    let attempt = 0

    while (attempt < 50) {
        const candidate = attempt === 0 ? normalizedBase : `${normalizedBase}-${attempt + 1}`
        const existing = await prisma.post.findUnique({ where: { slug: candidate }, select: { id: true } })

        if (!existing) {
            return candidate
        }

        attempt += 1
    }

    return `${normalizedBase}-${Date.now()}`
}

export type PublishValidationIssue = {
    path: string
    code: string
    message: string
}

export type PublishReadinessInput = {
    title: string
    contentHtml: string
    excerpt?: string | null
    metaDescription?: string | null
}

const MIN_PUBLISH_WORD_COUNT = 120

/**
 * Enforces the minimum quality bar for content that becomes publicly visible immediately.
 * Draft content is intentionally exempt so partial work can still be saved.
 */
export function validatePublishReadiness(input: PublishReadinessInput): PublishValidationIssue[] {
    const issues: PublishValidationIssue[] = []

    if (input.title.trim().length < 10) {
        issues.push({
            path: "title",
            code: "too_small",
            message: "Judul minimal 10 karakter untuk status PUBLISHED",
        })
    }

    const wordCount = input.contentHtml.replace(/<[^>]*>/g, " ").split(/\s+/).filter(Boolean).length
    if (wordCount < MIN_PUBLISH_WORD_COUNT) {
        issues.push({
            path: "content",
            code: "too_small",
            message: `Konten minimal ${MIN_PUBLISH_WORD_COUNT} kata untuk status PUBLISHED`,
        })
    }

    const hasSummary = Boolean(input.excerpt?.trim() || input.metaDescription?.trim())
    if (!hasSummary) {
        issues.push({
            path: "excerpt",
            code: "custom",
            message: "Excerpt atau metaDescription wajib diisi untuk status PUBLISHED",
        })
    }

    return issues
}

export function sanitizeArticleHtml(contentHtml: string): string {
    return sanitizeHtmlContent(contentHtml)
}
