"use client"

import { useState } from "react"
import { Sparkles, X, Loader2, Type, AlignLeft, ListTree, FileText, Search, Check } from "lucide-react"
import { AdminClientError, adminPost } from "@/lib/api/admin-client"
import "./wysiwyg-content.css"

/**
 * In-editor AI assistant.
 *
 * Every tab targets one editor field and shows the result before it is applied, except
 * the SEO tab, which fills a whole metadata package at once. Nothing is persisted here --
 * the editor still owns saving.
 */

export type AiSeoPackage = {
    focusKeyword: string
    secondaryKeywords: string[]
    metaTitle: string
    metaDescription: string
    schemaType: string
    categorySlug: string | null
    tags: string[]
    /** Empty string means "keep the existing value" — see applySeoPackage in post-editor. */
    slug: string
    ogTitle: string
    ogDescription: string
}

interface AiAssistantPanelProps {
    isOpen: boolean
    onClose: () => void
    postTitle: string
    postContent: string
    postKeyword: string
    onUpdateTitle: (title: string) => void
    onUpdateExcerpt: (excerpt: string) => void
    onUpdateContent: (content: string) => void
    onApplySeoPackage: (seo: AiSeoPackage) => Promise<void> | void
}

type AssistTab = "title" | "outline" | "content" | "excerpt" | "seo"

type AssistResponse<T> = { success: boolean; data: T }

function getErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof AdminClientError) {
        const payload = error.payload
        if (payload && typeof payload === "object" && !Array.isArray(payload)) {
            const record = payload as Record<string, unknown>
            if (typeof record.error === "string" && record.error.trim()) return record.error
        }
        if (error.message.trim()) return error.message
    }
    if (error instanceof Error && error.message.trim()) return error.message
    return fallback
}

export function AiAssistantPanel({
    isOpen,
    onClose,
    postTitle,
    postContent,
    postKeyword,
    onUpdateTitle,
    onUpdateExcerpt,
    onUpdateContent,
    onApplySeoPackage,
}: AiAssistantPanelProps) {
    const [activeTab, setActiveTab] = useState<AssistTab>("title")
    const [error, setError] = useState<string | null>(null)

    const [topic, setTopic] = useState("")
    const [titleSuggestions, setTitleSuggestions] = useState<string[]>([])
    const [loadingTitle, setLoadingTitle] = useState(false)

    const [outlineHtml, setOutlineHtml] = useState("")
    const [loadingOutline, setLoadingOutline] = useState(false)

    const [targetWordCount, setTargetWordCount] = useState("1100")
    const [generatedContent, setGeneratedContent] = useState("")
    const [generatedExcerpt, setGeneratedExcerpt] = useState("")
    const [loadingContent, setLoadingContent] = useState(false)

    const [loadingExcerpt, setLoadingExcerpt] = useState(false)

    const [loadingSeo, setLoadingSeo] = useState(false)
    const [seoResult, setSeoResult] = useState<AiSeoPackage | null>(null)
    const [applyingSeo, setApplyingSeo] = useState(false)

    const handleGenerateTitle = async () => {
        if (!topic.trim()) {
            setError("Topik wajib diisi")
            return
        }

        setLoadingTitle(true)
        setError(null)

        try {
            const response = await adminPost<
                AssistResponse<{ titles: string[] }>,
                { action: "generate_title"; payload: { topic: string; keyword?: string } }
            >("/api/admin/ai/assist", {
                body: {
                    action: "generate_title",
                    payload: {
                        topic: topic.trim(),
                        ...(postKeyword.trim() ? { keyword: postKeyword.trim() } : {}),
                    },
                },
                timeoutMs: 90_000,
            })

            if (response.success) setTitleSuggestions(response.data.titles)
        } catch (err) {
            setError(getErrorMessage(err, "Gagal membuat ide judul"))
        } finally {
            setLoadingTitle(false)
        }
    }

    const handleGenerateOutline = async () => {
        if (!postTitle.trim()) {
            setError("Judul diperlukan untuk membuat outline")
            return
        }

        setLoadingOutline(true)
        setError(null)

        try {
            const response = await adminPost<
                AssistResponse<{ outlineHtml: string }>,
                { action: "generate_outline"; payload: { title: string; keyword?: string } }
            >("/api/admin/ai/assist", {
                body: {
                    action: "generate_outline",
                    payload: {
                        title: postTitle,
                        ...(postKeyword.trim() ? { keyword: postKeyword.trim() } : {}),
                    },
                },
                timeoutMs: 120_000,
            })

            if (response.success) setOutlineHtml(response.data.outlineHtml)
        } catch (err) {
            setError(getErrorMessage(err, "Gagal membuat outline"))
        } finally {
            setLoadingOutline(false)
        }
    }

    /**
     * Full-article generation.
     *
     * Falls back to the content already in the editor when no outline was generated in
     * this session, so an editor who wrote their own structure can still use this.
     */
    const handleGenerateContent = async () => {
        const outline = outlineHtml.trim() || postContent.trim()

        if (!postTitle.trim()) {
            setError("Judul diperlukan untuk membuat konten")
            return
        }

        if (outline.length < 10) {
            setError("Buat outline dulu, atau tulis kerangka singkat di editor konten.")
            return
        }

        setLoadingContent(true)
        setError(null)

        try {
            const parsedWordCount = Number.parseInt(targetWordCount, 10)

            const response = await adminPost<
                AssistResponse<{ contentHtml: string; excerpt: string | null }>,
                {
                    action: "generate_content"
                    payload: { title: string; outline: string; keyword?: string; targetWordCount?: number }
                }
            >("/api/admin/ai/assist", {
                body: {
                    action: "generate_content",
                    payload: {
                        title: postTitle,
                        outline,
                        ...(postKeyword.trim() ? { keyword: postKeyword.trim() } : {}),
                        ...(Number.isFinite(parsedWordCount) ? { targetWordCount: parsedWordCount } : {}),
                    },
                },
                timeoutMs: 300_000,
            })

            if (response.success) {
                setGeneratedContent(response.data.contentHtml)
                setGeneratedExcerpt(response.data.excerpt ?? "")
            }
        } catch (err) {
            setError(getErrorMessage(err, "Gagal membuat konten artikel"))
        } finally {
            setLoadingContent(false)
        }
    }

    const handleGenerateExcerpt = async () => {
        if (!postTitle.trim() || !postContent.trim()) {
            setError("Judul dan konten diperlukan untuk membuat excerpt")
            return
        }

        setLoadingExcerpt(true)
        setError(null)

        try {
            const response = await adminPost<
                AssistResponse<{ excerpt: string }>,
                { action: "generate_excerpt"; payload: { title: string; content: string } }
            >("/api/admin/ai/assist", {
                body: {
                    action: "generate_excerpt",
                    payload: { title: postTitle, content: postContent },
                },
                timeoutMs: 90_000,
            })

            if (response.success) onUpdateExcerpt(response.data.excerpt)
        } catch (err) {
            setError(getErrorMessage(err, "Gagal membuat excerpt"))
        } finally {
            setLoadingExcerpt(false)
        }
    }

    const handleGenerateSeo = async () => {
        if (!postTitle.trim() || !postContent.trim()) {
            setError("Judul dan konten diperlukan untuk SEO")
            return
        }

        setLoadingSeo(true)
        setError(null)

        try {
            const response = await adminPost<
                AssistResponse<AiSeoPackage>,
                { action: "generate_seo"; payload: { title: string; content: string; keyword?: string } }
            >("/api/admin/ai/assist", {
                body: {
                    action: "generate_seo",
                    payload: {
                        title: postTitle,
                        content: postContent,
                        ...(postKeyword.trim() ? { keyword: postKeyword.trim() } : {}),
                    },
                },
                timeoutMs: 120_000,
            })

            if (response.success) setSeoResult(response.data)
        } catch (err) {
            setError(getErrorMessage(err, "Gagal membuat metadata SEO"))
        } finally {
            setLoadingSeo(false)
        }
    }

    const handleApplySeo = async () => {
        if (!seoResult) return

        setApplyingSeo(true)
        try {
            await onApplySeoPackage(seoResult)
        } catch (err) {
            setError(getErrorMessage(err, "Gagal menerapkan metadata SEO"))
        } finally {
            setApplyingSeo(false)
        }
    }

    if (!isOpen) return null

    const tabs: Array<{ id: AssistTab; icon: typeof Type; label: string }> = [
        { id: "title", icon: Type, label: "Judul" },
        { id: "outline", icon: ListTree, label: "Outline" },
        { id: "content", icon: FileText, label: "Konten" },
        { id: "excerpt", icon: AlignLeft, label: "Excerpt" },
        { id: "seo", icon: Search, label: "SEO" },
    ]

    return (
        <>
            <div className="fixed inset-0 bg-black/20 z-40 lg:hidden" onClick={onClose} aria-hidden="true" />

            <div className="fixed top-0 right-0 h-full w-full sm:w-[26rem] bg-white shadow-2xl z-50 flex flex-col border-l border-[#D4BCAA]/20">
                <div className="flex items-center justify-between px-5 py-4 border-b border-[#D4BCAA]/20 bg-[#FAF9F7]">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#466A68]/20 to-[#466A68]/5 flex items-center justify-center border border-[#466A68]/15">
                            <Sparkles className="h-4 w-4 text-[#466A68]" />
                        </div>
                        <h2 className="font-semibold text-[#0F0A09]">AI Assistant</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-[#8C7A6B] hover:text-[#0F0A09] hover:bg-[#D4BCAA]/10 rounded-lg transition-colors"
                        aria-label="Tutup panel AI"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="flex overflow-x-auto no-scrollbar border-b border-[#D4BCAA]/20">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => {
                                setActiveTab(tab.id)
                                setError(null)
                            }}
                            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${activeTab === tab.id
                                ? "border-[#466A68] text-[#466A68]"
                                : "border-transparent text-[#8C7A6B] hover:text-[#0F0A09] hover:bg-[#FAF9F7]"
                                }`}
                        >
                            <tab.icon className="h-4 w-4" />
                            {tab.label}
                        </button>
                    ))}
                </div>

                <div className="flex-1 overflow-y-auto p-5">
                    {activeTab === "title" && (
                        <div className="space-y-4">
                            <div>
                                <label htmlFor="ai-topic" className="block text-sm font-medium text-[#0F0A09] mb-1">
                                    Topik Artikel
                                </label>
                                <textarea
                                    id="ai-topic"
                                    value={topic}
                                    onChange={(e) => setTopic(e.target.value)}
                                    placeholder="Contoh: Cara menyimpan ASI perah di freezer"
                                    rows={3}
                                    className="w-full bg-white border border-[#D4BCAA]/30 rounded-lg px-3 py-2 text-sm text-[#0F0A09] outline-none focus:ring-2 focus:ring-[#466A68]/30"
                                />
                            </div>
                            <button
                                onClick={handleGenerateTitle}
                                disabled={loadingTitle || !topic.trim()}
                                className="w-full flex items-center justify-center gap-2 py-2 bg-[#466A68] text-white rounded-lg text-sm font-medium disabled:opacity-50"
                            >
                                {loadingTitle && <Loader2 className="h-4 w-4 animate-spin" />}
                                Generate Ide Judul
                            </button>

                            {titleSuggestions.length > 0 && (
                                <div className="space-y-2 mt-4">
                                    <h4 className="text-xs font-semibold text-[#8C7A6B] uppercase tracking-wider">
                                        Pilih Judul
                                    </h4>
                                    {titleSuggestions.map((title, index) => (
                                        <button
                                            key={index}
                                            onClick={() => onUpdateTitle(title)}
                                            className="w-full text-left p-3 text-sm text-[#0F0A09] bg-[#FAF9F7] border border-[#D4BCAA]/20 rounded-lg hover:border-[#466A68]/40 transition-colors"
                                        >
                                            {title}
                                            <span className="block text-[10px] text-[#8C7A6B]/60 mt-1">
                                                {title.length} karakter
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === "outline" && (
                        <div className="space-y-4">
                            <p className="text-sm text-[#8C7A6B]">
                                Outline dibuat dari judul saat ini:
                                <br />
                                <strong className="text-[#0F0A09]">{postTitle || "(Belum ada judul)"}</strong>
                            </p>
                            <button
                                onClick={handleGenerateOutline}
                                disabled={loadingOutline || !postTitle.trim()}
                                className="w-full flex items-center justify-center gap-2 py-2 bg-[#466A68] text-white rounded-lg text-sm font-medium disabled:opacity-50"
                            >
                                {loadingOutline && <Loader2 className="h-4 w-4 animate-spin" />}
                                Generate Outline
                            </button>

                            {outlineHtml && (
                                <div className="space-y-3">
                                    <h4 className="text-xs font-semibold text-[#8C7A6B] uppercase tracking-wider">
                                        Outline
                                    </h4>
                                    <div
                                        className="wysiwyg-content wysiwyg-compact bg-[#FAF9F7] p-4 rounded-lg border border-[#D4BCAA]/20 max-h-72 overflow-y-auto"
                                        dangerouslySetInnerHTML={{ __html: outlineHtml }}
                                    />
                                    <button
                                        onClick={() => onUpdateContent(outlineHtml)}
                                        className="w-full flex items-center justify-center gap-2 py-2 bg-white border border-[#466A68] text-[#466A68] rounded-lg text-sm font-medium hover:bg-[#466A68]/5"
                                    >
                                        <Check className="h-4 w-4" />
                                        Terapkan Outline ke Editor
                                    </button>
                                    <p className="text-[10px] text-[#8C7A6B]/60">
                                        Outline akan menggantikan isi editor konten. Lanjutkan ke tab Konten untuk
                                        mengembangkannya menjadi artikel utuh.
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === "content" && (
                        <div className="space-y-4">
                            <p className="text-sm text-[#8C7A6B]">
                                AI mengembangkan outline menjadi artikel utuh bergaya HaiBunda.
                                {!outlineHtml.trim() && postContent.trim()
                                    ? " Outline belum dibuat, jadi isi editor saat ini akan dipakai sebagai kerangka."
                                    : ""}
                            </p>

                            <div>
                                <label htmlFor="ai-word-count" className="block text-xs text-[#8C7A6B] mb-1">
                                    Target Panjang (kata)
                                </label>
                                <input
                                    id="ai-word-count"
                                    type="number"
                                    min={400}
                                    max={3000}
                                    step={100}
                                    value={targetWordCount}
                                    onChange={(e) => setTargetWordCount(e.target.value)}
                                    className="w-full bg-white border border-[#D4BCAA]/30 rounded-lg px-3 py-2 text-sm text-[#0F0A09] outline-none focus:ring-2 focus:ring-[#466A68]/30"
                                />
                            </div>

                            <button
                                onClick={handleGenerateContent}
                                disabled={loadingContent || !postTitle.trim()}
                                className="w-full flex items-center justify-center gap-2 py-2 bg-[#466A68] text-white rounded-lg text-sm font-medium disabled:opacity-50"
                            >
                                {loadingContent && <Loader2 className="h-4 w-4 animate-spin" />}
                                Kembangkan Konten Utuh
                            </button>

                            {loadingContent && (
                                <p className="text-xs text-[#8C7A6B]/70">
                                    Artikel panjang bisa memakan waktu hingga beberapa menit. Jangan tutup panel.
                                </p>
                            )}

                            {generatedContent && (
                                <div className="space-y-3">
                                    <h4 className="text-xs font-semibold text-[#8C7A6B] uppercase tracking-wider">
                                        Pratinjau Artikel
                                    </h4>
                                    <div
                                        className="wysiwyg-content wysiwyg-compact bg-[#FAF9F7] p-4 rounded-lg border border-[#D4BCAA]/20 max-h-80 overflow-y-auto"
                                        dangerouslySetInnerHTML={{ __html: generatedContent }}
                                    />
                                    <button
                                        onClick={() => {
                                            onUpdateContent(generatedContent)
                                            if (generatedExcerpt) onUpdateExcerpt(generatedExcerpt)
                                        }}
                                        className="w-full flex items-center justify-center gap-2 py-2 bg-[#0F0A09] text-white rounded-lg text-sm font-medium"
                                    >
                                        <Check className="h-4 w-4" />
                                        Terapkan ke Artikel
                                        {generatedExcerpt ? " + Excerpt" : ""}
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === "excerpt" && (
                        <div className="space-y-4">
                            <p className="text-sm text-[#8C7A6B]">
                                AI membaca konten dan membuat ringkasan 1-2 kalimat. Hasilnya langsung mengisi kolom
                                Excerpt.
                            </p>
                            <button
                                onClick={handleGenerateExcerpt}
                                disabled={loadingExcerpt || !postTitle.trim() || !postContent.trim()}
                                className="w-full flex items-center justify-center gap-2 py-2 bg-[#466A68] text-white rounded-lg text-sm font-medium disabled:opacity-50"
                            >
                                {loadingExcerpt && <Loader2 className="h-4 w-4 animate-spin" />}
                                Generate Excerpt
                            </button>
                        </div>
                    )}

                    {activeTab === "seo" && (
                        <div className="space-y-4">
                            <p className="text-sm text-[#8C7A6B]">
                                AI menyusun keyword, meta title, meta description, slug, OG, schema, kategori,
                                dan tag. Kategori hanya dipilih dari yang sudah ada; tag baru boleh dibuat.
                            </p>
                            <button
                                onClick={handleGenerateSeo}
                                disabled={loadingSeo || !postTitle.trim() || !postContent.trim()}
                                className="w-full flex items-center justify-center gap-2 py-2 bg-[#466A68] text-white rounded-lg text-sm font-medium disabled:opacity-50"
                            >
                                {loadingSeo && <Loader2 className="h-4 w-4 animate-spin" />}
                                Analisa SEO
                            </button>

                            {seoResult && (
                                <div className="space-y-3">
                                    <dl className="space-y-2 text-xs bg-[#FAF9F7] p-4 rounded-lg border border-[#D4BCAA]/20">
                                        <div>
                                            <dt className="text-[#8C7A6B]/70">Focus Keyword</dt>
                                            <dd className="text-[#0F0A09] font-medium">{seoResult.focusKeyword}</dd>
                                        </div>
                                        {seoResult.secondaryKeywords.length > 0 && (
                                            <div>
                                                <dt className="text-[#8C7A6B]/70">Keyword Pendukung</dt>
                                                <dd className="text-[#0F0A09]">{seoResult.secondaryKeywords.join(", ")}</dd>
                                            </div>
                                        )}
                                        <div>
                                            <dt className="text-[#8C7A6B]/70">Meta Title ({seoResult.metaTitle.length})</dt>
                                            <dd className="text-[#0F0A09]">{seoResult.metaTitle}</dd>
                                        </div>
                                        <div>
                                            <dt className="text-[#8C7A6B]/70">
                                                Meta Description ({seoResult.metaDescription.length})
                                            </dt>
                                            <dd className="text-[#0F0A09]">{seoResult.metaDescription}</dd>
                                        </div>
                                        <div>
                                            <dt className="text-[#8C7A6B]/70">Schema</dt>
                                            <dd className="text-[#0F0A09]">{seoResult.schemaType}</dd>
                                        </div>
                                        {seoResult.slug && (
                                            <div>
                                                <dt className="text-[#8C7A6B]/70">Slug</dt>
                                                <dd className="text-[#466A68] font-mono">{seoResult.slug}</dd>
                                            </div>
                                        )}
                                        {seoResult.ogTitle && (
                                            <div>
                                                <dt className="text-[#8C7A6B]/70">OG Title</dt>
                                                <dd className="text-[#0F0A09]">{seoResult.ogTitle}</dd>
                                            </div>
                                        )}
                                        {seoResult.ogDescription && (
                                            <div>
                                                <dt className="text-[#8C7A6B]/70">OG Description</dt>
                                                <dd className="text-[#0F0A09]">{seoResult.ogDescription}</dd>
                                            </div>
                                        )}
                                        <div>
                                            <dt className="text-[#8C7A6B]/70">Kategori</dt>
                                            <dd className="text-[#0F0A09]">
                                                {seoResult.categorySlug || "(tidak ada yang relevan)"}
                                            </dd>
                                        </div>
                                        {seoResult.tags.length > 0 && (
                                            <div>
                                                <dt className="text-[#8C7A6B]/70">Tag</dt>
                                                <dd className="text-[#0F0A09]">{seoResult.tags.join(", ")}</dd>
                                            </div>
                                        )}
                                    </dl>

                                    <button
                                        onClick={handleApplySeo}
                                        disabled={applyingSeo}
                                        className="w-full flex items-center justify-center gap-2 py-2 bg-[#0F0A09] text-white rounded-lg text-sm font-medium disabled:opacity-50"
                                    >
                                        {applyingSeo ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                            <Check className="h-4 w-4" />
                                        )}
                                        Terapkan ke Kolom SEO
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {error && (
                        <div role="alert" className="mt-4 p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-100">
                            {error}
                        </div>
                    )}
                </div>
            </div>
        </>
    )
}
