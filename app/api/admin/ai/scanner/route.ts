import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/db/prisma"
import { requireAdminApi } from "@/lib/security/admin"
import { runChecks, calculateScore, SeoCheck } from "@/components/admin/seo-scanner"

export async function POST(request: NextRequest) {
    // Basic admin check - no mutation strictly speaking, but treating as an action
    const adminCheck = await requireAdminApi()
    if (!adminCheck.ok) return adminCheck.response

    try {
        const posts = await prisma.post.findMany({
            where: { status: "PUBLISHED" },
            select: {
                id: true, title: true, content: true, metaTitle: true, metaDescription: true,
                focusKeyword: true, slug: true, excerpt: true, featuredImage: true,
                ogTitle: true, ogDescription: true, ogImage: true, canonicalUrl: true, schemaType: true
            },
            orderBy: { publishedAt: "desc" }
        })

        const postResults = posts.map(p => {
            const checks = runChecks({
                title: p.title || "",
                content: p.content || "",
                metaTitle: p.metaTitle || "",
                metaDescription: p.metaDescription || "",
                focusKeyword: p.focusKeyword || "",
                slug: p.slug || "",
                excerpt: p.excerpt || "",
                featuredImage: p.featuredImage || "",
                ogTitle: p.ogTitle || "",
                ogDescription: p.ogDescription || "",
                ogImage: p.ogImage || "",
                canonicalUrl: p.canonicalUrl || "",
                schemaType: p.schemaType || "",
            })
            const score = calculateScore(checks)

            return {
                id: p.id,
                title: p.title,
                slug: p.slug,
                score,
                checks
            }
        })

        // Generate aggregate metrics
        const totalPosts = postResults.length
        const totalScore = postResults.reduce((acc, curr) => acc + curr.score, 0)
        const averageScore = totalPosts > 0 ? Math.round(totalScore / totalPosts) : 0

        const goodCount = postResults.filter(p => p.score >= 71).length
        const warningCount = postResults.filter(p => p.score >= 41 && p.score < 71).length
        const poorCount = postResults.filter(p => p.score < 41).length

        // Find the most common failing checks
        const checkFailures: Record<string, { label: string, count: number }> = {}
        postResults.forEach(p => {
            p.checks.filter(c => c.status === "fail" || c.status === "warn").forEach(c => {
                if (!checkFailures[c.id]) {
                    checkFailures[c.id] = { label: c.label, count: 0 }
                }
                checkFailures[c.id].count += 1
            })
        })

        const commonIssues = Object.values(checkFailures)
            .sort((a, b) => b.count - a.count)
            .slice(0, 5)

        return NextResponse.json({
            success: true,
            data: {
                metrics: {
                    totalPosts,
                    averageScore,
                    breakdown: { good: goodCount, warning: warningCount, poor: poorCount },
                    commonIssues,
                },
                posts: postResults.sort((a, b) => a.score - b.score) // sort lowest score first
            }
        })

    } catch (error: any) {
        console.error("Scanner Error:", error)
        return NextResponse.json({ success: false, error: "Gagal memproses scanner SEO" }, { status: 500 })
    }
}
