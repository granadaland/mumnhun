"use client"

import { useState, useEffect } from "react"
import { ArrowLeft, RefreshCw, Save, Loader2, CheckCircle2, History, Languages, Sparkles } from "lucide-react"
import Link from "next/link"
import { AdminClientError, adminGet, adminPost, adminPut } from "@/lib/api/admin-client"

function getClientErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof AdminClientError && error.code === "TIMEOUT") {
        return "Request timeout. Proses AI butuh waktu lebih lama, silakan coba lagi."
    }

    if (error instanceof Error && error.message.trim().length > 0) {
        return error.message
    }

    return fallback
}

type PostOption = {
    id: string
    title: string
    status: string
}

type RewriteResult = {
    postId: string
    originalTitle: string
    rewrittenTitle: string
    rewrittenContentHtml: string
    rewrittenExcerpt?: string
}

export default function AiRewritePage() {
    const [posts, setPosts] = useState<PostOption[]>([])
    const [loadingPosts, setLoadingPosts] = useState(true)

    const [selectedPostId, setSelectedPostId] = useState("")
    const [tone, setTone] = useState("Menarik dan informatif")
    const [focusKeyword, setFocusKeyword] = useState("")

    const [rewriting, setRewriting] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [result, setResult] = useState<RewriteResult | null>(null)
    const [originalContent, setOriginalContent] = useState<string | null>(null)

    const [saving, setSaving] = useState(false)
    const [saveSuccess, setSaveSuccess] = useState(false)

    useEffect(() => {
        adminGet("/api/admin/posts?limit=100")
            .then((res: any) => {
                if (res.success && res.data) {
                    // Handle pagination format or direct array
                    const postList = res.data.posts || res.data || []
                    setPosts(postList)
                }
            })
            .catch(err => console.error("Failed to fetch posts:", err))
            .finally(() => setLoadingPosts(false))
    }, [])

    const handleRewrite = async () => {
        if (!selectedPostId) {
            setError("Pilih artikel terlebih dahulu.")
            return
        }

        setRewriting(true)
        setError(null)
        setResult(null)
        setSaveSuccess(false)

        try {
            // Fetch original post content to display side-by-side
            const postRes: any = await adminGet(`/api/admin/posts/${selectedPostId}`)
            if (postRes.success) {
                setOriginalContent(postRes.data.content)
            }

            const res: any = await adminPost("/api/admin/ai/rewrite", {
                body: {
                    postId: selectedPostId,
                    tone: tone || undefined,
                    focusKeyword: focusKeyword || undefined,
                },
                timeoutMs: 120000,
            })

            if (res.success && res.data?.result) {
                setResult(res.data.result)
            } else {
                setError(res.error || "Gagal melakukan rewrite.")
            }
        } catch (err) {
            setError(getClientErrorMessage(err, "Gagal melakukan rewrite."))
        } finally {
            setRewriting(false)
        }
    }

    const handleSave = async () => {
        if (!result) return

        setSaving(true)
        setError(null)
        setSaveSuccess(false)

        try {
            // 1. Fetch current full post to preserve all non-rewritten fields
            const postRes: any = await adminGet(`/api/admin/posts/${result.postId}`)
            if (!postRes.success) throw new Error("Gagal mengambil data artikel asli")

            const p = postRes.data

            // 2. Build a clean flat payload — strip DB relational fields
            const updateRes: any = await adminPut(`/api/admin/posts/${result.postId}`, {
                body: {
                    title: result.rewrittenTitle || p.title,
                    slug: p.slug,
                    content: result.rewrittenContentHtml || p.content,
                    excerpt: result.rewrittenExcerpt || p.excerpt,
                    status: p.status,
                    featuredImage: p.featuredImage || "",
                    publishedAt: p.publishedAt || null,
                    scheduledAt: p.scheduledAt || null,
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
                    categoryIds: p.categories?.map((c: any) => c.category?.id ?? c.id) || [],
                    tagIds: p.tags?.map((t: any) => t.tag?.id ?? t.id) || [],
                }
            })

            if (updateRes.success) {
                setSaveSuccess(true)
            } else {
                throw new Error(updateRes.error || "Gagal menyimpan artikel")
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : String(err))
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="space-y-6 max-w-6xl mx-auto">
            <div className="flex items-center justify-between">
                <Link href="/admin/ai" className="inline-flex items-center gap-2 text-sm text-[#8C7A6B]/50 hover:text-[#0F0A09] transition-colors">
                    <ArrowLeft className="h-4 w-4" /> Kembali
                </Link>
                <h1 className="text-xl font-bold text-[#0F0A09] flex items-center gap-2">
                    <RefreshCw className="h-5 w-5 text-blue-500" />
                    AI Rewrite Article
                </h1>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Configuration Sidebar */}
                <div className="lg:col-span-1 space-y-5">
                    <div className="bg-white border border-[#D4BCAA]/20 rounded-xl p-5 space-y-4 shadow-sm">
                        <h2 className="font-semibold text-[#0F0A09] border-b border-[#D4BCAA]/20 pb-3">Pengaturan Rewrite</h2>

                        <div>
                            <label className="block text-sm font-medium text-[#8C7A6B]/70 mb-1">
                                Pilih Artikel
                            </label>
                            <select
                                value={selectedPostId}
                                onChange={e => setSelectedPostId(e.target.value)}
                                disabled={rewriting || loadingPosts}
                                className="w-full bg-white border border-[#D4BCAA]/30 rounded-lg px-3 py-2 text-sm text-[#0F0A09] focus:ring-2 focus:ring-[#466A68]/30 outline-none"
                            >
                                <option value="">-- Pilih Artikel --</option>
                                {posts.map(p => (
                                    <option key={p.id} value={p.id}>
                                        {p.title} ({p.status})
                                    </option>
                                ))}
                            </select>
                            {loadingPosts && <p className="text-xs text-[#8C7A6B]/50 mt-1 flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Memuat artikel...</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-[#8C7A6B]/70 mb-1 flex items-center gap-1">
                                <Languages className="h-3 w-3" /> Tone / Gaya Bahasa
                            </label>
                            <input
                                type="text"
                                value={tone}
                                onChange={e => setTone(e.target.value)}
                                placeholder="Formal, Kasual, Informatif..."
                                disabled={rewriting}
                                className="w-full bg-white border border-[#D4BCAA]/30 rounded-lg px-3 py-2 text-sm text-[#0F0A09] focus:ring-2 focus:ring-[#466A68]/30 outline-none"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-[#8C7A6B]/70 mb-1">
                                Fokus Keyword (Opsional)
                            </label>
                            <input
                                type="text"
                                value={focusKeyword}
                                onChange={e => setFocusKeyword(e.target.value)}
                                placeholder="Contoh: sewa freezer asi"
                                disabled={rewriting}
                                className="w-full bg-white border border-[#D4BCAA]/30 rounded-lg px-3 py-2 text-sm text-[#0F0A09] focus:ring-2 focus:ring-[#466A68]/30 outline-none"
                            />
                        </div>

                        <button
                            onClick={handleRewrite}
                            disabled={!selectedPostId || rewriting}
                            className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-all custom-focus shadow-md shadow-blue-500/20"
                        >
                            {rewriting ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" /> Sedang Menulis... (Bisa ~1 menit)
                                </>
                            ) : (
                                <>
                                    <RefreshCw className="h-4 w-4" /> Mulai Rewrite
                                </>
                            )}
                        </button>

                        {error && (
                            <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-sm text-red-600 break-words">
                                {error}
                            </div>
                        )}
                    </div>
                </div>

                {/* Content Area */}
                <div className="lg:col-span-2 space-y-5">

                    {!result && !rewriting && (
                        <div className="bg-white border border-[#D4BCAA]/20 rounded-xl p-10 flex flex-col items-center justify-center text-center h-full min-h-[400px]">
                            <History className="h-12 w-12 text-[#8C7A6B]/20 mb-4" />
                            <h3 className="text-lg font-medium text-[#0F0A09] mb-2">Area Hasil Rewrite</h3>
                            <p className="text-sm text-[#8C7A6B]/60 max-w-sm">
                                Pilih artikel di sebelah kiri dan klik "Mulai Rewrite" untuk melihat perbandingan hasil tulis ulang dari AI di sini.
                            </p>
                        </div>
                    )}

                    {rewriting && (
                        <div className="bg-white border border-[#D4BCAA]/20 rounded-xl p-10 flex flex-col items-center justify-center text-center h-full min-h-[400px]">
                            <Loader2 className="h-10 w-10 text-blue-500 animate-spin mb-4" />
                            <h3 className="text-lg font-medium text-[#0F0A09] mb-2">AI Sedang Merangkai...</h3>
                            <p className="text-sm text-[#8C7A6B]/60 max-w-sm">
                                Proses ini memakan waktu sekitar 30 - 60 detik tergantung panjang artikel asli.
                            </p>
                        </div>
                    )}

                    {result && !rewriting && (
                        <div className="bg-white border border-[#D4BCAA]/20 rounded-xl overflow-hidden shadow-sm flex flex-col h-full">

                            <div className="flex items-center justify-between p-4 border-b border-[#D4BCAA]/20 bg-[#FAF9F7]">
                                <h2 className="font-semibold text-[#0F0A09]">Review Hasil Rewrite</h2>
                                <button
                                    onClick={handleSave}
                                    disabled={saving || saveSuccess}
                                    className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all shadow-sm ${saveSuccess
                                        ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
                                        : "bg-emerald-500 hover:bg-emerald-600 text-white"
                                        }`}
                                >
                                    {saving ? (
                                        <><Loader2 className="h-4 w-4 animate-spin" /> Menyimpan...</>
                                    ) : saveSuccess ? (
                                        <><CheckCircle2 className="h-4 w-4" /> Berhasil Disimpan</>
                                    ) : (
                                        <><Save className="h-4 w-4" /> Terapkan & Simpan ke Artikel</>
                                    )}
                                </button>
                                {saveSuccess && result && (
                                    <Link
                                        href={`/admin/posts/${result.postId}/edit`}
                                        className="inline-flex items-center gap-1.5 px-3 py-2 text-sm text-blue-600 hover:text-blue-800 border border-blue-200 bg-blue-50 rounded-lg transition-colors"
                                    >
                                        Edit Lebih Lanjut →
                                    </Link>
                                )}
                            </div>

                            <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-6 overflow-y-auto max-h-[800px]">

                                {/* Original View */}
                                <div className="space-y-4">
                                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-md">
                                        Versi Asli
                                    </div>
                                    <h3 className="text-lg font-bold text-[#0F0A09]">{result.originalTitle}</h3>
                                    {originalContent ? (
                                        <div
                                            className="prose prose-sm max-w-none prose-p:text-[#0F0A09]/80 prose-headings:text-[#0F0A09]"
                                            dangerouslySetInnerHTML={{ __html: originalContent }}
                                        />
                                    ) : (
                                        <p className="text-sm text-gray-400 italic">Konten asli tidak dapat dimuat.</p>
                                    )}
                                </div>

                                {/* Rewritten View */}
                                <div className="space-y-4">
                                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-600 text-xs font-medium rounded-md border border-blue-100">
                                        <Sparkles className="h-3 w-3" /> Hasil Rewrite
                                    </div>
                                    <h3 className="text-lg font-bold text-[#0F0A09]">{result.rewrittenTitle}</h3>
                                    {result.rewrittenExcerpt && (
                                        <div className="p-3 bg-[#FAF9F7] rounded-lg border border-[#D4BCAA]/20 text-sm text-[#8C7A6B] italic">
                                            <strong>Excerpt:</strong> {result.rewrittenExcerpt}
                                        </div>
                                    )}
                                    <div
                                        className="prose prose-sm max-w-none prose-p:text-[#0F0A09]/90 prose-headings:text-[#0F0A09]"
                                        dangerouslySetInnerHTML={{ __html: result.rewrittenContentHtml }}
                                    />
                                </div>

                            </div>
                        </div>
                    )}
                </div>

            </div>
        </div>
    )
}
