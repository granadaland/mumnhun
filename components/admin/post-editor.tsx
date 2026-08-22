"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import NextImage from "next/image"
import { RichTextEditor } from "@/components/admin/rich-text-editor"
import { SeoScanner } from "@/components/admin/seo-scanner"
import { AiAssistantPanel, type AiSeoPackage } from "@/components/admin/ai-assistant-panel"
import { ImageSourcePicker, type PickedImage } from "@/components/admin/image-source-picker"
import { ADMIN_CSRF_HEADER, getAdminCsrfToken } from "@/lib/security/csrf-client"
import { SITE_URL } from "@/lib/constants"
import {
    Save, Loader2, ArrowLeft, Eye, ChevronDown, ChevronUp,
    Calendar, Globe, FileText, Search as SearchIcon, BarChart3,
    Sparkles, ImagePlus, Trash2,
} from "lucide-react"

type Category = { id: string; name: string; slug: string }
type Tag = { id: string; name: string; slug: string }
type PostData = {
    id?: string
    title: string
    slug: string
    content: string
    excerpt: string
    featuredImage: string
    status: string
    publishedAt: string
    scheduledAt: string
    categoryIds: string[]
    tagIds: string[]
    metaTitle: string
    metaDescription: string
    focusKeyword: string
    focusKeywords: string
    canonicalUrl: string
    ogImage: string
    ogTitle: string
    ogDescription: string
    schemaType: string
    schemaData: string
}

const defaultPost: PostData = {
    title: "", slug: "", content: "", excerpt: "", featuredImage: "",
    status: "DRAFT", publishedAt: "", scheduledAt: "",
    categoryIds: [], tagIds: [],
    metaTitle: "", metaDescription: "", focusKeyword: "", focusKeywords: "",
    canonicalUrl: "", ogImage: "", ogTitle: "", ogDescription: "",
    schemaType: "", schemaData: "",
}

function slugify(text: string): string {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-+|-+$/g, "")
}

export function PostEditor({ postId }: { postId?: string }) {
    const router = useRouter()
    const [post, setPost] = useState<PostData>(defaultPost)
    const [categories, setCategories] = useState<Category[]>([])
    const [tags, setTags] = useState<Tag[]>([])
    const [tagSearch, setTagSearch] = useState("")
    const [filteredTags, setFilteredTags] = useState<Tag[]>([])
    const [loading, setLoading] = useState(!!postId)
    const [saving, setSaving] = useState(false)
    const [showSeo, setShowSeo] = useState(false)
    const [showSchedule, setShowSchedule] = useState(false)
    const [showScanner, setShowScanner] = useState(false)
    const [showAiAssistant, setShowAiAssistant] = useState(false)
    const [showFeaturedPicker, setShowFeaturedPicker] = useState(false)
    const [autoSlug, setAutoSlug] = useState(!postId)
    const [autoCanonical, setAutoCanonical] = useState(true)

    // Fetch categories and tags
    useEffect(() => {
        Promise.all([
            fetch("/api/admin/categories").then((r) => r.json()),
            fetch("/api/admin/tags").then((r) => r.json()),
        ]).then(([catData, tagData]) => {
            if (catData.success) setCategories(catData.data)
            if (tagData.success) {
                setTags(tagData.data)
                setFilteredTags(tagData.data.slice(0, 20))
            }
        })
    }, [])

    // Fetch post for edit
    useEffect(() => {
        if (!postId) return
        fetch(`/api/admin/posts/${postId}`)
            .then((r) => r.json())
            .then((data) => {
                if (data.success) {
                    const p = data.data
                    setPost({
                        id: p.id,
                        title: p.title || "",
                        slug: p.slug || "",
                        content: p.content || "",
                        excerpt: p.excerpt || "",
                        featuredImage: p.featuredImage || "",
                        status: p.status || "DRAFT",
                        publishedAt: p.publishedAt ? new Date(p.publishedAt).toISOString().slice(0, 16) : "",
                        scheduledAt: p.scheduledAt ? new Date(p.scheduledAt).toISOString().slice(0, 16) : "",
                        categoryIds: p.categories?.map((c: { category: Category }) => c.category.id) || [],
                        tagIds: p.tags?.map((t: { tag: Tag }) => t.tag.id) || [],
                        metaTitle: p.metaTitle || "",
                        metaDescription: p.metaDescription || "",
                        focusKeyword: p.focusKeyword || "",
                        focusKeywords: p.focusKeywords || "",
                        canonicalUrl: p.canonicalUrl || "",
                        ogImage: p.ogImage || "",
                        ogTitle: p.ogTitle || "",
                        ogDescription: p.ogDescription || "",
                        schemaType: p.schemaType || "",
                        schemaData: p.schemaData || "",
                    })
                    if (p.status === "SCHEDULED") setShowSchedule(true)
                    // A canonical the editor already set by hand must not be overwritten.
                    if (p.canonicalUrl) setAutoCanonical(false)
                }
            })
            .finally(() => setLoading(false))
    }, [postId])

    // Auto-generate slug from title
    useEffect(() => {
        if (autoSlug && post.title) {
            setPost((prev) => ({ ...prev, slug: slugify(prev.title) }))
        }
    }, [post.title, autoSlug])

    // Canonical URL follows the slug until an editor types their own.
    useEffect(() => {
        if (!autoCanonical) return
        const nextCanonical = post.slug ? `${SITE_URL}/${post.slug}` : ""
        setPost((prev) => (prev.canonicalUrl === nextCanonical ? prev : { ...prev, canonicalUrl: nextCanonical }))
    }, [post.slug, autoCanonical])

    // Filter tags on search
    useEffect(() => {
        if (tagSearch.trim()) {
            setFilteredTags(
                tags.filter((t) =>
                    t.name.toLowerCase().includes(tagSearch.toLowerCase())
                ).slice(0, 20)
            )
        } else {
            setFilteredTags(tags.slice(0, 20))
        }
    }, [tagSearch, tags])

    const update = useCallback((field: keyof PostData, value: string | string[]) => {
        setPost((prev) => ({ ...prev, [field]: value }))
    }, [])

    /**
     * Applies the AI SEO package.
     *
     * Categories are matched against existing ones only (the API already restricts the
     * model to real slugs). Tags may be new, so unknown names are created first and the
     * local tag list is refreshed to keep the chips rendering.
     */
    const applySeoPackage = useCallback(
        async (seo: AiSeoPackage) => {
            setPost((prev) => ({
                ...prev,
                focusKeyword: seo.focusKeyword || prev.focusKeyword,
                focusKeywords: seo.secondaryKeywords.length
                    ? seo.secondaryKeywords.join(", ")
                    : prev.focusKeywords,
                metaTitle: seo.metaTitle || prev.metaTitle,
                metaDescription: seo.metaDescription || prev.metaDescription,
                schemaType: seo.schemaType || prev.schemaType,
            }))

            if (seo.categorySlug) {
                const matched = categories.find((category) => category.slug === seo.categorySlug)
                if (matched) {
                    setPost((prev) =>
                        prev.categoryIds.includes(matched.id)
                            ? prev
                            : { ...prev, categoryIds: [...prev.categoryIds, matched.id] }
                    )
                }
            }

            if (seo.tags.length === 0) return

            const csrfToken = await getAdminCsrfToken().catch(() => null)
            const resolvedTagIds: string[] = []
            const createdTags: Tag[] = []

            for (const tagName of seo.tags) {
                const normalized = tagName.trim()
                if (!normalized) continue

                const existing = tags.find(
                    (tag) => tag.name.toLowerCase() === normalized.toLowerCase()
                )
                if (existing) {
                    resolvedTagIds.push(existing.id)
                    continue
                }

                if (!csrfToken) continue

                try {
                    const response = await fetch("/api/admin/tags", {
                        method: "POST",
                        headers: { "Content-Type": "application/json", [ADMIN_CSRF_HEADER]: csrfToken },
                        body: JSON.stringify({ name: normalized }),
                    })
                    const data = await response.json()
                    if (data.success) {
                        createdTags.push(data.data)
                        resolvedTagIds.push(data.data.id)
                    }
                } catch {
                    // A failed tag creation must not abort the rest of the SEO application.
                }
            }

            if (createdTags.length > 0) {
                setTags((prev) => [...prev, ...createdTags])
            }

            if (resolvedTagIds.length > 0) {
                setPost((prev) => ({
                    ...prev,
                    tagIds: Array.from(new Set([...prev.tagIds, ...resolvedTagIds])),
                }))
            }
        },
        [categories, tags]
    )

    const handleFeaturedImagePicked = useCallback((image: PickedImage) => {
        setPost((prev) => ({
            ...prev,
            featuredImage: image.url,
            // Social previews reuse the featured image; there is no separate OG image field.
            ogImage: image.url,
        }))
    }, [])

    const handleSave = async (overrideStatus?: string) => {
        const status = overrideStatus || post.status
        if (!post.title.trim()) return alert("Judul wajib diisi")
        if (!post.slug.trim()) return alert("Slug wajib diisi")
        if (status === "SCHEDULED" && !post.scheduledAt) {
            return alert("Status Scheduled memerlukan tanggal jadwal publish")
        }

        setSaving(true)
        try {
            const csrfToken = await getAdminCsrfToken()
            const url = postId ? `/api/admin/posts/${postId}` : "/api/admin/posts"
            const method = postId ? "PUT" : "POST"
            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json", [ADMIN_CSRF_HEADER]: csrfToken },
                body: JSON.stringify({ ...post, status, ogImage: post.featuredImage }),
            })
            const data = await res.json()
            if (data.success) {
                if (!postId) {
                    router.push(`/admin/posts/${data.data.id}/edit`)
                }
                router.refresh()
            } else {
                const issues = Array.isArray(data.issues)
                    ? `\n\n${data.issues.map((issue: { message: string }) => `- ${issue.message}`).join("\n")}`
                    : ""
                alert(`${data.error || "Gagal menyimpan"}${issues}`)
            }
        } catch (err) {
            console.error("Save failed:", err)
            alert("Gagal menyimpan artikel")
        } finally {
            setSaving(false)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-6 w-6 text-[#466A68] animate-spin" />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <button
                    onClick={() => router.push("/admin/posts")}
                    className="flex items-center gap-2 text-sm text-[#8C7A6B]/50 hover:text-[#0F0A09] transition-colors"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Kembali
                </button>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setShowAiAssistant(true)}
                        className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-[#466A68]/10 to-[#466A68]/5 border border-[#466A68]/20 text-[#466A68] text-sm font-medium rounded-lg hover:bg-[#466A68]/15 transition-all"
                    >
                        <Sparkles className="h-4 w-4" />
                        AI Assist
                    </button>
                    <button
                        onClick={() => handleSave("DRAFT")}
                        disabled={saving}
                        className="px-4 py-2 border border-[#D4BCAA]/15 text-[#8C7A6B]/70 text-sm rounded-lg hover:bg-[#D4BCAA]/5 transition-all"
                    >
                        Simpan Draft
                    </button>
                    {post.status !== "PUBLISHED" && (
                        <button
                            onClick={() => handleSave("PUBLISHED")}
                            disabled={saving}
                            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#466A68] to-[#3a5856] text-white text-sm font-medium rounded-lg hover:from-[#3a5856] hover:to-[#466A68] disabled:opacity-50 transition-all shadow-lg"
                        >
                            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                            Publish
                        </button>
                    )}
                    {post.status === "PUBLISHED" && (
                        <button
                            onClick={() => handleSave()}
                            disabled={saving}
                            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#466A68] to-[#3a5856] text-white text-sm font-medium rounded-lg hover:from-[#3a5856] hover:to-[#466A68] disabled:opacity-50 transition-all shadow-lg"
                        >
                            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                            Update
                        </button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                {/* Main Editor (2/3) */}
                <div className="xl:col-span-2 space-y-5">
                    {/* Title */}
                    <input
                        type="text"
                        value={post.title}
                        onChange={(e) => update("title", e.target.value)}
                        placeholder="Judul Artikel"
                        className="w-full text-2xl font-bold bg-transparent text-[#0F0A09] placeholder-[#8C7A6B]/60 outline-none border-b border-[#D4BCAA]/20 pb-3 focus:border-[#466A68]/50 transition-colors"
                    />

                    {/* Slug */}
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-[#8C7A6B]/30">mumnhun.id/</span>
                        <input
                            type="text"
                            value={post.slug}
                            onChange={(e) => {
                                setAutoSlug(false)
                                update("slug", slugify(e.target.value))
                            }}
                            placeholder="slug-artikel"
                            className="flex-1 text-xs bg-transparent text-[#466A68] placeholder-[#8C7A6B]/60 outline-none font-mono"
                        />
                    </div>

                    {/* Content Editor */}
                    <RichTextEditor
                        content={post.content}
                        onChange={(html) => update("content", html)}
                        articleTitle={post.title}
                        articleKeyword={post.focusKeyword}
                    />

                    {/* Excerpt */}
                    <div className="bg-white border border-[#D4BCAA]/20 rounded-xl p-5">
                        <label className="block text-sm font-medium text-[#8C7A6B]/70 mb-2">
                            Excerpt / Ringkasan
                        </label>
                        <textarea
                            value={post.excerpt}
                            onChange={(e) => update("excerpt", e.target.value)}
                            rows={3}
                            placeholder="Ringkasan singkat artikel..."
                            className="w-full bg-white border border-[#D4BCAA]/20 rounded-lg px-4 py-2.5 text-sm text-[#0F0A09] placeholder-[#8C7A6B]/60 outline-none focus:ring-2 focus:ring-[#466A68]/30 resize-none transition-all"
                        />
                    </div>

                    {/* SEO Section */}
                    <div className="bg-white border border-[#D4BCAA]/20 rounded-xl overflow-hidden">
                        <button
                            onClick={() => setShowSeo(!showSeo)}
                            className="w-full flex items-center justify-between px-5 py-4 text-sm font-medium text-[#8C7A6B]/70 hover:text-[#0F0A09] transition-colors"
                        >
                            <div className="flex items-center gap-2">
                                <Globe className="h-4 w-4" />
                                SEO Settings
                            </div>
                            {showSeo ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </button>
                        {showSeo && (
                            <div className="px-5 pb-5 space-y-4 border-t border-[#D4BCAA]/20 pt-4">
                                <div>
                                    <label className="block text-xs text-[#8C7A6B]/50 mb-1">Meta Title <span className="text-[#8C7A6B]/30">({post.metaTitle.length}/60)</span></label>
                                    <input type="text" value={post.metaTitle} onChange={(e) => update("metaTitle", e.target.value)} placeholder={post.title || "Meta title..."} className="w-full bg-white border border-[#D4BCAA]/20 rounded-lg px-3 py-2 text-sm text-[#0F0A09] placeholder-[#8C7A6B]/60 outline-none focus:ring-2 focus:ring-[#466A68]/30 transition-all" />
                                </div>
                                <div>
                                    <label className="block text-xs text-[#8C7A6B]/50 mb-1">Meta Description <span className="text-[#8C7A6B]/30">({post.metaDescription.length}/160)</span></label>
                                    <textarea value={post.metaDescription} onChange={(e) => update("metaDescription", e.target.value)} rows={2} placeholder="Deskripsi singkat untuk mesin pencari..." className="w-full bg-white border border-[#D4BCAA]/20 rounded-lg px-3 py-2 text-sm text-[#0F0A09] placeholder-[#8C7A6B]/60 outline-none focus:ring-2 focus:ring-[#466A68]/30 resize-none transition-all" />
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs text-[#8C7A6B]/50 mb-1">Focus Keyword</label>
                                        <input type="text" value={post.focusKeyword} onChange={(e) => update("focusKeyword", e.target.value)} placeholder="sewa freezer ASI" className="w-full bg-white border border-[#D4BCAA]/20 rounded-lg px-3 py-2 text-sm text-[#0F0A09] placeholder-[#8C7A6B]/60 outline-none focus:ring-2 focus:ring-[#466A68]/30 transition-all" />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-[#8C7A6B]/50 mb-1">Keyword Pendukung</label>
                                        <input type="text" value={post.focusKeywords} onChange={(e) => update("focusKeywords", e.target.value)} placeholder="dipisah koma" className="w-full bg-white border border-[#D4BCAA]/20 rounded-lg px-3 py-2 text-sm text-[#0F0A09] placeholder-[#8C7A6B]/60 outline-none focus:ring-2 focus:ring-[#466A68]/30 transition-all" />
                                    </div>
                                </div>
                                <div>
                                    <div className="flex items-center justify-between mb-1">
                                        <label className="block text-xs text-[#8C7A6B]/50">Canonical URL</label>
                                        <label className="flex items-center gap-1.5 text-[10px] text-[#8C7A6B]/60 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={autoCanonical}
                                                onChange={(e) => setAutoCanonical(e.target.checked)}
                                                className="rounded border-[#D4BCAA]/20 text-[#466A68] focus:ring-[#466A68]/30"
                                            />
                                            Ikuti slug otomatis
                                        </label>
                                    </div>
                                    <input
                                        type="url"
                                        value={post.canonicalUrl}
                                        onChange={(e) => {
                                            setAutoCanonical(false)
                                            update("canonicalUrl", e.target.value)
                                        }}
                                        placeholder={`${SITE_URL}/slug-artikel`}
                                        className="w-full bg-white border border-[#D4BCAA]/20 rounded-lg px-3 py-2 text-sm text-[#0F0A09] placeholder-[#8C7A6B]/60 outline-none focus:ring-2 focus:ring-[#466A68]/30 transition-all disabled:bg-[#FAF9F7]"
                                        disabled={autoCanonical}
                                    />
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs text-[#8C7A6B]/50 mb-1">OG Title</label>
                                        <input type="text" value={post.ogTitle} onChange={(e) => update("ogTitle", e.target.value)} placeholder={post.title} className="w-full bg-white border border-[#D4BCAA]/20 rounded-lg px-3 py-2 text-sm text-[#0F0A09] placeholder-[#8C7A6B]/60 outline-none focus:ring-2 focus:ring-[#466A68]/30 transition-all" />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-[#8C7A6B]/50 mb-1">Schema Type</label>
                                        <select value={post.schemaType} onChange={(e) => update("schemaType", e.target.value)} className="w-full bg-white border border-[#D4BCAA]/20 rounded-lg px-3 py-2 text-sm text-[#0F0A09] outline-none focus:ring-2 focus:ring-[#466A68]/30 transition-all">
                                            <option value="" className="bg-white">Pilih Schema...</option>
                                            <option value="Article" className="bg-white">Article</option>
                                            <option value="BlogPosting" className="bg-white">BlogPosting</option>
                                            <option value="HowTo" className="bg-white">HowTo</option>
                                            <option value="FAQPage" className="bg-white">FAQPage</option>
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs text-[#8C7A6B]/50 mb-1">OG Description</label>
                                    <textarea value={post.ogDescription} onChange={(e) => update("ogDescription", e.target.value)} rows={2} placeholder="Deskripsi Open Graph..." className="w-full bg-white border border-[#D4BCAA]/20 rounded-lg px-3 py-2 text-sm text-[#0F0A09] placeholder-[#8C7A6B]/60 outline-none focus:ring-2 focus:ring-[#466A68]/30 resize-none transition-all" />
                                </div>
                                <p className="text-[10px] text-[#8C7A6B]/50">
                                    OG Image mengikuti Featured Image secara otomatis.
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Sidebar (1/3) */}
                <div className="space-y-5">
                    {/* Publish Settings */}
                    <div className="bg-white border border-[#D4BCAA]/20 rounded-xl p-5 space-y-4">
                        <h3 className="text-sm font-semibold text-[#0F0A09] flex items-center gap-2">
                            <FileText className="h-4 w-4 text-[#466A68]" />
                            Publish
                        </h3>

                        {/* Status */}
                        <div>
                            <label className="block text-xs text-[#8C7A6B]/50 mb-1">Status</label>
                            <select
                                value={post.status}
                                onChange={(e) => {
                                    update("status", e.target.value)
                                    setShowSchedule(e.target.value === "SCHEDULED")
                                }}
                                className="w-full bg-white border border-[#D4BCAA]/20 rounded-lg px-3 py-2 text-sm text-[#0F0A09] outline-none focus:ring-2 focus:ring-[#466A68]/30 transition-all"
                            >
                                <option value="DRAFT" className="bg-white">Draft</option>
                                <option value="PUBLISHED" className="bg-white">Published</option>
                                <option value="SCHEDULED" className="bg-white">Scheduled</option>
                                <option value="ARCHIVED" className="bg-white">Archived</option>
                            </select>
                        </div>

                        {/* Schedule Date */}
                        {(showSchedule || post.status === "SCHEDULED") && (
                            <div>
                                <label className="block text-xs text-[#8C7A6B]/50 mb-1 flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    Jadwal Publish
                                </label>
                                <input
                                    type="datetime-local"
                                    value={post.scheduledAt}
                                    onChange={(e) => update("scheduledAt", e.target.value)}
                                    className="w-full bg-white border border-[#D4BCAA]/20 rounded-lg px-3 py-2 text-sm text-[#0F0A09] outline-none focus:ring-2 focus:ring-[#466A68]/30 transition-all"
                                />
                            </div>
                        )}

                        {post.status === "PUBLISHED" && post.id && (
                            <a
                                href={`/${post.slug}`}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center gap-2 text-xs text-[#466A68] hover:text-[#466A68]/80 transition-colors"
                            >
                                <Eye className="h-3 w-3" />
                                Lihat artikel →
                            </a>
                        )}
                    </div>

                    {/* Featured Image */}
                    <div className="bg-white border border-[#D4BCAA]/20 rounded-xl p-5 space-y-3">
                        <h3 className="text-sm font-semibold text-[#0F0A09]">Featured Image</h3>

                        {post.featuredImage ? (
                            <div className="space-y-2">
                                <div className="relative aspect-video rounded-lg overflow-hidden border border-[#D4BCAA]/30 bg-[#FAF9F7]">
                                    <NextImage
                                        src={post.featuredImage}
                                        alt="Featured image artikel"
                                        fill
                                        sizes="(max-width: 1280px) 100vw, 320px"
                                        className="object-cover"
                                        unoptimized
                                    />
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setShowFeaturedPicker(true)}
                                        className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium border border-[#466A68]/30 text-[#466A68] rounded-lg hover:bg-[#466A68]/5 transition-colors"
                                    >
                                        <ImagePlus className="h-3.5 w-3.5" />
                                        Ganti Gambar
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setPost((prev) => ({ ...prev, featuredImage: "", ogImage: "" }))}
                                        className="px-3 py-2 text-xs text-[#8C7A6B] hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                        aria-label="Hapus featured image"
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <button
                                type="button"
                                onClick={() => setShowFeaturedPicker(true)}
                                className="w-full py-8 border-2 border-dashed border-[#D4BCAA]/40 rounded-lg flex flex-col items-center gap-2 text-[#8C7A6B] hover:border-[#466A68]/40 hover:text-[#466A68] transition-colors"
                            >
                                <ImagePlus className="h-5 w-5" />
                                <span className="text-xs font-medium">Pilih sumber gambar</span>
                                <span className="text-[10px] text-[#8C7A6B]/70">AI, upload, atau stock photo</span>
                            </button>
                        )}
                    </div>

                    {/* Categories */}
                    <div className="bg-white border border-[#D4BCAA]/20 rounded-xl p-5 space-y-3">
                        <h3 className="text-sm font-semibold text-[#0F0A09]">Kategori</h3>
                        <div className="space-y-1.5 max-h-40 overflow-y-auto">
                            {categories.map((cat) => (
                                <label key={cat.id} className="flex items-center gap-2 text-sm text-[#8C7A6B]/70 cursor-pointer hover:text-[#0F0A09] transition-colors">
                                    <input
                                        type="checkbox"
                                        checked={post.categoryIds.includes(cat.id)}
                                        onChange={(e) => {
                                            if (e.target.checked) {
                                                update("categoryIds", [...post.categoryIds, cat.id])
                                            } else {
                                                update("categoryIds", post.categoryIds.filter((id) => id !== cat.id))
                                            }
                                        }}
                                        className="rounded border-[#D4BCAA]/20 bg-white text-[#466A68] focus:ring-[#466A68]/30"
                                    />
                                    {cat.name}
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Tags */}
                    <div className="bg-white border border-[#D4BCAA]/20 rounded-xl p-5 space-y-3">
                        <h3 className="text-sm font-semibold text-[#0F0A09]">Tag</h3>

                        {/* Selected tags */}
                        {post.tagIds.length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                                {post.tagIds.map((tagId) => {
                                    const tag = tags.find((t) => t.id === tagId)
                                    return tag ? (
                                        <span
                                            key={tag.id}
                                            className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] bg-[#466A68]/15 text-[#466A68] rounded-full cursor-pointer hover:bg-red-500/10 hover:text-red-600 transition-colors"
                                            onClick={() => update("tagIds", post.tagIds.filter((id) => id !== tagId))}
                                        >
                                            {tag.name} ×
                                        </span>
                                    ) : null
                                })}
                            </div>
                        )}

                        {/* Tag search */}
                        <div className="flex items-center gap-2 px-3 py-2 bg-white border border-[#D4BCAA]/20 rounded-lg">
                            <SearchIcon className="h-3 w-3 text-[#8C7A6B]/30" />
                            <input
                                type="text"
                                value={tagSearch}
                                onChange={(e) => setTagSearch(e.target.value)}
                                placeholder="Cari tag..."
                                className="bg-transparent text-xs text-[#0F0A09] placeholder-[#8C7A6B]/60 outline-none w-full"
                            />
                        </div>

                        {/* Tag list */}
                        <div className="space-y-0.5 max-h-32 overflow-y-auto">
                            {filteredTags
                                .filter((t) => !post.tagIds.includes(t.id))
                                .map((tag) => (
                                    <button
                                        key={tag.id}
                                        onClick={() => update("tagIds", [...post.tagIds, tag.id])}
                                        className="block w-full text-left text-xs text-[#8C7A6B]/50 hover:text-[#0F0A09] hover:bg-[#D4BCAA]/5 px-2 py-1 rounded transition-colors"
                                    >
                                        {tag.name}
                                    </button>
                                ))}
                        </div>
                    </div>

                    {/* SEO Scanner */}
                    <div className="bg-white border border-[#D4BCAA]/20 rounded-xl overflow-hidden">
                        <button
                            onClick={() => setShowScanner(!showScanner)}
                            className="w-full flex items-center justify-between px-5 py-4 text-sm font-medium text-[#8C7A6B]/70 hover:text-[#0F0A09] transition-colors"
                        >
                            <div className="flex items-center gap-2">
                                <BarChart3 className="h-4 w-4 text-[#466A68]" />
                                SEO Score
                            </div>
                            {showScanner ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </button>
                        {showScanner && (
                            <div className="px-4 pb-4 border-t border-[#D4BCAA]/20 pt-3">
                                <SeoScanner
                                    title={post.title}
                                    content={post.content}
                                    metaTitle={post.metaTitle}
                                    metaDescription={post.metaDescription}
                                    focusKeyword={post.focusKeyword}
                                    slug={post.slug}
                                    excerpt={post.excerpt}
                                    featuredImage={post.featuredImage}
                                    ogTitle={post.ogTitle}
                                    ogDescription={post.ogDescription}
                                    ogImage={post.ogImage}
                                    canonicalUrl={post.canonicalUrl}
                                    schemaType={post.schemaType}
                                />
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <AiAssistantPanel
                isOpen={showAiAssistant}
                onClose={() => setShowAiAssistant(false)}
                postTitle={post.title}
                postContent={post.content}
                postKeyword={post.focusKeyword}
                onUpdateTitle={(title) => update("title", title)}
                onUpdateExcerpt={(excerpt) => update("excerpt", excerpt)}
                onUpdateContent={(content) => update("content", content)}
                onApplySeoPackage={applySeoPackage}
            />

            <ImageSourcePicker
                isOpen={showFeaturedPicker}
                onClose={() => setShowFeaturedPicker(false)}
                onSelect={handleFeaturedImagePicked}
                articleTitle={post.title}
                articleKeyword={post.focusKeyword}
                articleContext={post.excerpt || post.content}
                purpose="featured"
                title="Pilih Featured Image"
            />
        </div>
    )
}
