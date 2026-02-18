import { NextResponse } from "next/server"
import prisma from "@/lib/db/prisma"
import { requireAdminApi } from "@/lib/security/admin"

type SeoCheck = {
    id: string
    label: string
    category: string
    status: "pass" | "fail" | "warn" | "info"
    weight: number
}

function stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim()
}

function countWords(text: string): number {
    return stripHtml(text).split(/\s+/).filter(Boolean).length
}

function scanPost(post: {
    title: string
    slug: string
    content: string
    excerpt: string | null
    featuredImage: string | null
    metaTitle: string | null
    metaDescription: string | null
    focusKeyword: string | null
    ogTitle: string | null
    ogDescription: string | null
    ogImage: string | null
    canonicalUrl: string | null
    schemaType: string | null
}): { score: number; passCount: number; totalChecks: number; issues: string[] } {
    const checks: SeoCheck[] = []
    const issues: string[] = []
    const plainContent = stripHtml(post.content || "")
    const wordCount = countWords(post.content || "")
    const effectiveTitle = post.metaTitle || post.title
    const kw = post.focusKeyword?.toLowerCase().trim()

    // Title
    checks.push({ id: "title", label: "", category: "title", status: post.title ? "pass" : "fail", weight: 10 })
    checks.push({ id: "title-len", label: "", category: "title", status: !effectiveTitle ? "fail" : effectiveTitle.length >= 30 && effectiveTitle.length <= 60 ? "pass" : "warn", weight: 8 })
    if (!effectiveTitle || effectiveTitle.length < 30 || effectiveTitle.length > 60) issues.push("Meta title harus 30-60 karakter")

    // Meta desc
    checks.push({ id: "meta", label: "", category: "title", status: !post.metaDescription ? "fail" : post.metaDescription.length >= 120 && post.metaDescription.length <= 160 ? "pass" : "warn", weight: 8 })
    if (!post.metaDescription) issues.push("Meta description kosong")

    // Focus keyword
    checks.push({ id: "kw", label: "", category: "kw", status: kw ? "pass" : "fail", weight: 10 })
    if (!kw) issues.push("Focus keyword belum diisi")

    if (kw) {
        checks.push({ id: "kw-title", label: "", category: "kw", status: post.title.toLowerCase().includes(kw) ? "pass" : "fail", weight: 8 })
        if (!post.title.toLowerCase().includes(kw)) issues.push("Keyword tidak ada di judul")
        checks.push({ id: "kw-content", label: "", category: "kw", status: plainContent.toLowerCase().includes(kw) ? "pass" : "fail", weight: 8 })
        checks.push({ id: "kw-slug", label: "", category: "kw", status: post.slug.toLowerCase().includes(kw.replace(/\s+/g, "-")) ? "pass" : "warn", weight: 5 })
    }

    // Content
    checks.push({ id: "length", label: "", category: "content", status: wordCount >= 300 ? "pass" : wordCount >= 150 ? "warn" : "fail", weight: 8 })
    if (wordCount < 300) issues.push(`Konten terlalu pendek (${wordCount} kata)`)

    const h2Count = (post.content?.match(/<h2/gi) || []).length
    checks.push({ id: "h2", label: "", category: "content", status: h2Count > 0 ? "pass" : "fail", weight: 6 })
    if (h2Count === 0) issues.push("Tidak ada subheading H2")

    // Images & links
    checks.push({ id: "img", label: "", category: "links", status: post.featuredImage ? "pass" : "fail", weight: 6 })
    if (!post.featuredImage) issues.push("Featured image kosong")

    const internalLinks = (post.content?.match(/href\s*=\s*"\/[^"]*"/gi) || []).length
    checks.push({ id: "ilinks", label: "", category: "links", status: internalLinks > 0 ? "pass" : "warn", weight: 5 })

    // Technical
    checks.push({ id: "og", label: "", category: "tech", status: post.ogTitle && post.ogDescription ? "pass" : "info", weight: 4 })
    checks.push({ id: "schema", label: "", category: "tech", status: post.schemaType ? "pass" : "info", weight: 3 })
    checks.push({ id: "slug", label: "", category: "tech", status: post.slug.length <= 75 ? "pass" : "warn", weight: 4 })

    let earned = 0, total = 0
    for (const c of checks) {
        total += c.weight
        if (c.status === "pass") earned += c.weight
        else if (c.status === "warn") earned += c.weight * 0.5
        else if (c.status === "info") earned += c.weight * 0.75
    }

    return {
        score: total === 0 ? 0 : Math.round((earned / total) * 100),
        passCount: checks.filter((c) => c.status === "pass").length,
        totalChecks: checks.length,
        issues: issues.slice(0, 3),
    }
}

// GET: Scan all published posts and return scores
export async function GET() {
    const adminCheck = await requireAdminApi()
    if (!adminCheck.ok) return adminCheck.response

    const posts = await prisma.post.findMany({
        where: { status: "PUBLISHED" },
        orderBy: { publishedAt: "desc" },
        select: {
            id: true, title: true, slug: true, content: true, excerpt: true,
            featuredImage: true, metaTitle: true, metaDescription: true,
            focusKeyword: true, ogTitle: true, ogDescription: true,
            ogImage: true, canonicalUrl: true, schemaType: true,
            publishedAt: true, updatedAt: true,
        },
    })

    const results = posts.map((post) => {
        const scan = scanPost(post)
        return {
            id: post.id,
            title: post.title,
            slug: post.slug,
            publishedAt: post.publishedAt,
            ...scan,
        }
    })

    const avgScore = results.length ? Math.round(results.reduce((s, r) => s + r.score, 0) / results.length) : 0
    const good = results.filter((r) => r.score >= 71).length
    const needsWork = results.filter((r) => r.score >= 41 && r.score < 71).length
    const poor = results.filter((r) => r.score < 41).length

    return NextResponse.json({
        success: true,
        data: {
            stats: { total: results.length, avgScore, good, needsWork, poor },
            posts: results,
        },
    })
}
