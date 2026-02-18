"use client"

import { useMemo } from "react"
import { CheckCircle, XCircle, AlertTriangle, Info } from "lucide-react"

type SeoCheck = {
    id: string
    label: string
    category: "title" | "content" | "keywords" | "links" | "technical"
    status: "pass" | "fail" | "warn" | "info"
    message: string
    weight: number
}

type SeoScannerProps = {
    title: string
    content: string
    metaTitle: string
    metaDescription: string
    focusKeyword: string
    slug: string
    excerpt: string
    featuredImage: string
    ogTitle: string
    ogDescription: string
    ogImage: string
    canonicalUrl: string
    schemaType: string
}

function stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim()
}

function countWords(text: string): number {
    return stripHtml(text).split(/\s+/).filter(Boolean).length
}

function runChecks(props: SeoScannerProps): SeoCheck[] {
    const checks: SeoCheck[] = []
    const plainContent = stripHtml(props.content)
    const wordCount = countWords(props.content)
    const effectiveTitle = props.metaTitle || props.title
    const kw = props.focusKeyword?.toLowerCase().trim()

    // === TITLE & META ===
    checks.push({
        id: "title-exists",
        label: "Judul halaman",
        category: "title",
        status: props.title ? "pass" : "fail",
        message: props.title ? `"${props.title}"` : "Judul kosong",
        weight: 10,
    })

    checks.push({
        id: "title-length",
        label: "Panjang meta title",
        category: "title",
        status: !effectiveTitle ? "fail" : effectiveTitle.length >= 30 && effectiveTitle.length <= 60 ? "pass" : effectiveTitle.length < 30 ? "warn" : "warn",
        message: !effectiveTitle ? "Meta title kosong" : `${effectiveTitle.length} karakter (ideal: 30–60)`,
        weight: 8,
    })

    checks.push({
        id: "meta-desc",
        label: "Meta description",
        category: "title",
        status: !props.metaDescription ? "fail" : props.metaDescription.length >= 120 && props.metaDescription.length <= 160 ? "pass" : "warn",
        message: !props.metaDescription ? "Belum diisi" : `${props.metaDescription.length} karakter (ideal: 120–160)`,
        weight: 8,
    })

    // === KEYWORDS ===
    checks.push({
        id: "focus-keyword",
        label: "Focus keyword",
        category: "keywords",
        status: kw ? "pass" : "fail",
        message: kw ? `"${kw}"` : "Belum diisi",
        weight: 10,
    })

    if (kw) {
        checks.push({
            id: "kw-in-title",
            label: "Keyword di judul",
            category: "keywords",
            status: props.title.toLowerCase().includes(kw) ? "pass" : "fail",
            message: props.title.toLowerCase().includes(kw) ? "Ditemukan" : "Tidak ditemukan — tambahkan keyword di judul",
            weight: 8,
        })

        checks.push({
            id: "kw-in-meta-desc",
            label: "Keyword di meta description",
            category: "keywords",
            status: props.metaDescription?.toLowerCase().includes(kw) ? "pass" : "warn",
            message: props.metaDescription?.toLowerCase().includes(kw) ? "Ditemukan" : "Tidak ditemukan",
            weight: 5,
        })

        checks.push({
            id: "kw-in-slug",
            label: "Keyword di URL slug",
            category: "keywords",
            status: props.slug.toLowerCase().includes(kw.replace(/\s+/g, "-")) ? "pass" : "warn",
            message: props.slug.toLowerCase().includes(kw.replace(/\s+/g, "-")) ? "Ditemukan" : "Tidak ditemukan",
            weight: 5,
        })

        checks.push({
            id: "kw-in-content",
            label: "Keyword di konten",
            category: "keywords",
            status: plainContent.toLowerCase().includes(kw) ? "pass" : "fail",
            message: plainContent.toLowerCase().includes(kw)
                ? `Muncul ${(plainContent.toLowerCase().match(new RegExp(kw, "g")) || []).length}x`
                : "Tidak ditemukan — tambahkan keyword di konten",
            weight: 8,
        })

        // Keyword density
        if (wordCount > 0 && plainContent.toLowerCase().includes(kw)) {
            const kwCount = (plainContent.toLowerCase().match(new RegExp(kw, "g")) || []).length
            const density = ((kwCount * kw.split(/\s+/).length) / wordCount) * 100
            checks.push({
                id: "kw-density",
                label: "Keyword density",
                category: "keywords",
                status: density >= 0.5 && density <= 2.5 ? "pass" : density < 0.5 ? "warn" : "warn",
                message: `${density.toFixed(1)}% (ideal: 0.5–2.5%)`,
                weight: 5,
            })
        }
    }

    // === CONTENT QUALITY ===
    checks.push({
        id: "content-length",
        label: "Panjang konten",
        category: "content",
        status: wordCount >= 300 ? "pass" : wordCount >= 150 ? "warn" : "fail",
        message: `${wordCount} kata (minimum: 300)`,
        weight: 8,
    })

    checks.push({
        id: "excerpt",
        label: "Excerpt/ringkasan",
        category: "content",
        status: props.excerpt ? "pass" : "warn",
        message: props.excerpt ? `${props.excerpt.length} karakter` : "Belum diisi",
        weight: 3,
    })

    // Check headings (H2, H3)
    const h2Count = (props.content.match(/<h2/gi) || []).length
    const h3Count = (props.content.match(/<h3/gi) || []).length
    checks.push({
        id: "headings",
        label: "Subheading (H2/H3)",
        category: "content",
        status: h2Count > 0 ? "pass" : "fail",
        message: `${h2Count} H2, ${h3Count} H3 ${h2Count === 0 ? "— tambahkan minimal 1 subheading" : ""}`,
        weight: 6,
    })

    // === LINKS & IMAGES ===
    checks.push({
        id: "featured-image",
        label: "Featured image",
        category: "links",
        status: props.featuredImage ? "pass" : "fail",
        message: props.featuredImage ? "Ada" : "Belum diisi — gambar utama penting untuk CTR",
        weight: 6,
    })

    const imgTags = props.content.match(/<img[^>]*>/gi) || []
    const imgsWithAlt = imgTags.filter((img) => /alt\s*=\s*"[^"]+"/i.test(img))
    if (imgTags.length > 0) {
        checks.push({
            id: "img-alt",
            label: "Alt text gambar",
            category: "links",
            status: imgsWithAlt.length === imgTags.length ? "pass" : "warn",
            message: `${imgsWithAlt.length}/${imgTags.length} gambar punya alt text`,
            weight: 5,
        })
    }

    const internalLinks = (props.content.match(/href\s*=\s*"\/[^"]*"/gi) || []).length
    const externalLinks = (props.content.match(/href\s*=\s*"https?:\/\/[^"]*"/gi) || []).length
    checks.push({
        id: "internal-links",
        label: "Internal links",
        category: "links",
        status: internalLinks > 0 ? "pass" : "warn",
        message: `${internalLinks} link internal ${internalLinks === 0 ? "— tambahkan link ke artikel lain" : ""}`,
        weight: 5,
    })

    checks.push({
        id: "external-links",
        label: "External links",
        category: "links",
        status: externalLinks > 0 ? "pass" : "info",
        message: `${externalLinks} link eksternal`,
        weight: 2,
    })

    // === TECHNICAL ===
    checks.push({
        id: "og-data",
        label: "Open Graph data",
        category: "technical",
        status: props.ogTitle && props.ogDescription ? "pass" : props.ogTitle || props.ogDescription ? "warn" : "info",
        message: [props.ogTitle && "title", props.ogDescription && "desc", props.ogImage && "image"].filter(Boolean).join(", ") || "Belum diisi",
        weight: 4,
    })

    checks.push({
        id: "canonical",
        label: "Canonical URL",
        category: "technical",
        status: props.canonicalUrl ? "pass" : "info",
        message: props.canonicalUrl || "Default (otomatis)",
        weight: 2,
    })

    checks.push({
        id: "schema",
        label: "Schema markup",
        category: "technical",
        status: props.schemaType ? "pass" : "info",
        message: props.schemaType || "Tidak ada — pertimbangkan Article atau FAQPage",
        weight: 3,
    })

    checks.push({
        id: "slug-quality",
        label: "Kualitas URL slug",
        category: "technical",
        status: props.slug.length > 0 && props.slug.length <= 75 && !props.slug.includes("--") ? "pass" : "warn",
        message: `/${props.slug} (${props.slug.length} karakter, maks 75)`,
        weight: 4,
    })

    return checks
}

function calculateScore(checks: SeoCheck[]): number {
    let earned = 0
    let total = 0
    for (const check of checks) {
        total += check.weight
        if (check.status === "pass") earned += check.weight
        else if (check.status === "warn") earned += check.weight * 0.5
        else if (check.status === "info") earned += check.weight * 0.75
    }
    return total === 0 ? 0 : Math.round((earned / total) * 100)
}

const categoryLabels: Record<string, string> = {
    title: "Title & Meta",
    content: "Kualitas Konten",
    keywords: "Keywords",
    links: "Links & Gambar",
    technical: "Teknis",
}

const statusIcons = {
    pass: <CheckCircle className="h-3.5 w-3.5 text-green-400" />,
    fail: <XCircle className="h-3.5 w-3.5 text-red-400" />,
    warn: <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />,
    info: <Info className="h-3.5 w-3.5 text-blue-400/60" />,
}

export function SeoScanner(props: SeoScannerProps) {
    const checks = useMemo(() => runChecks(props), [props])
    const score = useMemo(() => calculateScore(checks), [checks])

    const grouped = useMemo(() => {
        const g: Record<string, SeoCheck[]> = {}
        for (const c of checks) {
            if (!g[c.category]) g[c.category] = []
            g[c.category].push(c)
        }
        return g
    }, [checks])

    const scoreColor = score >= 71 ? "text-green-400" : score >= 41 ? "text-amber-400" : "text-red-400"
    const scoreBg = score >= 71 ? "from-green-500/10 to-green-500/5" : score >= 41 ? "from-amber-500/10 to-amber-500/5" : "from-red-500/10 to-red-500/5"
    const scoreLabel = score >= 71 ? "Bagus" : score >= 41 ? "Perlu Perbaikan" : "Rendah"
    const passCount = checks.filter((c) => c.status === "pass").length

    return (
        <div className="space-y-4">
            {/* Score Badge */}
            <div className={`bg-gradient-to-br ${scoreBg} border border-[#D4BCAA]/5 rounded-xl p-4 flex items-center gap-4`}>
                <div className={`text-3xl font-bold ${scoreColor} tabular-nums`}>{score}</div>
                <div className="flex-1">
                    <p className={`text-sm font-medium ${scoreColor}`}>{scoreLabel}</p>
                    <p className="text-[10px] text-[#D4BCAA]/40">{passCount}/{checks.length} checks passed</p>
                </div>
                <div className="w-16 h-16 relative">
                    <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                        <circle cx="18" cy="18" r="16" fill="none" stroke="currentColor" strokeWidth="2" className="text-[#D4BCAA]/5" />
                        <circle cx="18" cy="18" r="16" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray={`${score} ${100 - score}`} strokeLinecap="round" className={scoreColor} />
                    </svg>
                </div>
            </div>

            {/* Checks by Category */}
            {Object.entries(grouped).map(([cat, items]) => (
                <div key={cat}>
                    <p className="text-[10px] font-semibold text-[#D4BCAA]/40 uppercase tracking-wider mb-1.5">{categoryLabels[cat] || cat}</p>
                    <div className="space-y-0.5">
                        {items.map((check) => (
                            <div key={check.id} className="flex items-start gap-2 py-1.5 px-2 rounded-lg hover:bg-[#D4BCAA]/3 transition-colors">
                                <div className="mt-0.5 flex-shrink-0">{statusIcons[check.status]}</div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs text-[#F4EEE7]/80">{check.label}</p>
                                    <p className="text-[10px] text-[#D4BCAA]/30 truncate">{check.message}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    )
}

// Export for use in API/dashboard
export { runChecks, calculateScore }
export type { SeoCheck, SeoScannerProps }
