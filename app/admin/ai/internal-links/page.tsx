"use client"

import { useState, useEffect } from "react"
import { ArrowLeft, Loader2, Save, Search, Link as LinkIcon, CheckCircle2 } from "lucide-react"
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

type LinkSuggestion = {
    targetUrl: string
    targetTitle: string
    exactPhrase: string
    replacementHtml: string
    rationale?: string
}

export default function AiInternalLinksPage() {
    const [posts, setPosts] = useState<PostOption[]>([])
    const [loadingPosts, setLoadingPosts] = useState(true)

    const [selectedPostId, setSelectedPostId] = useState("")
    const [scanning, setScanning] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const [suggestions, setSuggestions] = useState<LinkSuggestion[]>([])
    const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set())

    const [saving, setSaving] = useState(false)
    const [saveSuccess, setSaveSuccess] = useState(false)

    useEffect(() => {
        adminGet("/api/admin/posts?limit=100")
            .then((res: any) => {
                if (res.success && res.data) {
                    const postList = res.data.posts || res.data || []
                    setPosts(postList)
                }
            })
            .catch(err => console.error("Failed to fetch posts:", err))
            .finally(() => setLoadingPosts(false))
    }, [])

    const handleScan = async () => {
        if (!selectedPostId) {
            setError("Pilih artikel terlebih dahulu.")
            return
        }

        setScanning(true)
        setError(null)
        setSuggestions([])
        setSelectedIndices(new Set())
        setSaveSuccess(false)

        try {
            const res: any = await adminPost("/api/admin/ai/internal-links", {
                body: { postId: selectedPostId },
                timeoutMs: 120000,
            })

            if (res.success && res.data?.suggestions) {
                setSuggestions(res.data.suggestions)
                // Select all by default
                setSelectedIndices(new Set(res.data.suggestions.map((_: any, i: number) => i)))
                if (res.data.suggestions.length === 0) {
                    setError("AI tidak menemukan peluang internal link tambahan pada artikel ini.")
                }
            } else {
                setError(res.error || "Gagal melakukan scan artikel.")
            }
        } catch (err) {
            setError(getClientErrorMessage(err, "Gagal melakukan scan artikel."))
        } finally {
            setScanning(false)
        }
    }

    const toggleSelection = (idx: number) => {
        setSelectedIndices(prev => {
            const newSet = new Set(prev)
            if (newSet.has(idx)) newSet.delete(idx)
            else newSet.add(idx)
            return newSet
        })
    }

    const handleApply = async () => {
        if (selectedIndices.size === 0) return

        setSaving(true)
        setError(null)

        try {
            // 1. Fetch current full post
            const postRes: any = await adminGet(`/api/admin/posts/${selectedPostId}`)
            if (!postRes.success) throw new Error("Gagal mengambil data artikel asli")

            const p = postRes.data
            let newContent = p.content || ""

            // 2. Apply chosen replacements
            const chosenSuggestions = suggestions.filter((_, i) => selectedIndices.has(i))

            for (const sugg of chosenSuggestions) {
                // Only replace the first occurrence to avoid breaking HTML structure
                newContent = newContent.replace(sugg.exactPhrase, sugg.replacementHtml)
            }

            // 3. Build a clean flat payload — strip DB relational fields
            const updateRes: any = await adminPut(`/api/admin/posts/${selectedPostId}`, {
                body: {
                    title: p.title,
                    slug: p.slug,
                    content: newContent,
                    excerpt: p.excerpt || "",
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
                setSuggestions([]) // Clear to force another scan if needed
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
        <div className="space-y-6 max-w-5xl mx-auto">
            <div className="flex items-center justify-between">
                <Link href="/admin/ai" className="inline-flex items-center gap-2 text-sm text-[#8C7A6B]/50 hover:text-[#0F0A09] transition-colors">
                    <ArrowLeft className="h-4 w-4" /> Kembali
                </Link>
                <h1 className="text-xl font-bold text-[#0F0A09] flex items-center gap-2">
                    <LinkIcon className="h-5 w-5 text-indigo-500" />
                    AI Internal Link Builder
                </h1>
            </div>

            <div className="bg-white border border-[#D4BCAA]/20 rounded-xl p-6 shadow-sm">
                <div className="max-w-xl">
                    <h2 className="font-semibold text-[#0F0A09] mb-4">Pilih Artikel untuk Dianalisis</h2>
                    <div className="flex gap-3">
                        <select
                            value={selectedPostId}
                            onChange={e => {
                                setSelectedPostId(e.target.value)
                                setSaveSuccess(false)
                                setSuggestions([])
                            }}
                            disabled={scanning || loadingPosts}
                            className="flex-1 bg-white border border-[#D4BCAA]/30 rounded-lg px-3 py-2 text-sm text-[#0F0A09] focus:ring-2 focus:ring-[#466A68]/30 outline-none"
                        >
                            <option value="">-- Pilih Artikel --</option>
                            {posts.map(p => (
                                <option key={p.id} value={p.id}>
                                    {p.title} ({p.status})
                                </option>
                            ))}
                        </select>

                        <button
                            onClick={handleScan}
                            disabled={!selectedPostId || scanning}
                            className="flex items-center justify-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-all custom-focus shadow-md shadow-indigo-500/20 whitespace-nowrap"
                        >
                            {scanning ? (
                                <><Loader2 className="h-4 w-4 animate-spin" /> Menganalisis...</>
                            ) : (
                                <><Search className="h-4 w-4" /> Temukan Peluang Link</>
                            )}
                        </button>
                    </div>
                </div>

                {error && (
                    <div className="mt-4 max-w-xl p-3 bg-red-50 border border-red-100 rounded-lg text-sm text-red-600 break-words">
                        {error}
                    </div>
                )}

                {saveSuccess && (
                    <div className="mt-4 max-w-xl p-3 bg-emerald-50 border border-emerald-100 rounded-lg text-sm text-emerald-700 flex items-center gap-2">
                        <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                        Berhasil menerapkan {selectedIndices.size} internal link ke artikel.
                    </div>
                )}
            </div>

            {suggestions.length > 0 && (
                <div className="bg-white border border-[#D4BCAA]/20 rounded-xl overflow-hidden shadow-sm">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between p-5 border-b border-[#D4BCAA]/20 bg-[#FAF9F7] gap-4">
                        <div>
                            <h2 className="font-semibold text-[#0F0A09]">Rekomendasi Internal Link</h2>
                            <p className="text-sm text-[#8C7A6B]">Pilih link mana saja yang ingin Anda terapkan.</p>
                        </div>
                        <button
                            onClick={handleApply}
                            disabled={saving || selectedIndices.size === 0}
                            className="flex items-center justify-center gap-2 px-6 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 transition-all shadow-md shadow-emerald-500/20 whitespace-nowrap"
                        >
                            {saving ? (
                                <><Loader2 className="h-4 w-4 animate-spin" /> Menyimpan...</>
                            ) : (
                                <><Save className="h-4 w-4" /> Terapkan ({selectedIndices.size}) Link Terpilih</>
                            )}
                        </button>
                    </div>

                    <div className="divide-y divide-[#D4BCAA]/10">
                        {suggestions.map((sugg, idx) => (
                            <label key={idx} className="flex gap-4 p-5 hover:bg-[#FAF9F7] transition-colors cursor-pointer group">
                                <div className="mt-1">
                                    <input
                                        type="checkbox"
                                        checked={selectedIndices.has(idx)}
                                        onChange={() => toggleSelection(idx)}
                                        className="w-4 h-4 text-indigo-600 border-[#D4BCAA]/30 rounded focus:ring-indigo-500"
                                    />
                                </div>
                                <div className="flex-1 space-y-3">
                                    <div className="flex items-start justify-between gap-4">
                                        <div>
                                            <div className="text-xs font-semibold text-indigo-600 uppercase tracking-wider mb-1">Target Link</div>
                                            <a href={sugg.targetUrl} target="_blank" rel="noreferrer" className="text-sm font-medium text-[#0F0A09] hover:text-indigo-600 transition-colors flex items-center gap-1.5">
                                                {sugg.targetTitle}
                                            </a>
                                            <p className="text-xs text-[#8C7A6B] mt-0.5">{sugg.targetUrl}</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="p-3 bg-red-50/50 rounded-lg border border-red-100/50">
                                            <div className="text-[10px] uppercase font-bold text-red-500/70 mb-1.5">Sebelumnya</div>
                                            <p className="text-sm text-[#0F0A09]/80 italic">"...{sugg.exactPhrase}..."</p>
                                        </div>
                                        <div className="p-3 bg-emerald-50/50 rounded-lg border border-emerald-100/50">
                                            <div className="text-[10px] uppercase font-bold text-emerald-600/70 mb-1.5">Sesudahnya</div>
                                            <div
                                                className="text-sm text-[#0F0A09]/90 italic prose prose-sm prose-a:text-indigo-600 prose-a:font-medium prose-a:underline"
                                                dangerouslySetInnerHTML={{ __html: `"...${sugg.replacementHtml}..."` }}
                                            />
                                        </div>
                                    </div>

                                    {sugg.rationale && (
                                        <div className="flex items-center gap-2 mt-2">
                                            <div className="w-1 h-4 bg-[#D4BCAA]/30 rounded-full" />
                                            <p className="text-xs text-[#8C7A6B]/80">{sugg.rationale}</p>
                                        </div>
                                    )}
                                </div>
                            </label>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}
