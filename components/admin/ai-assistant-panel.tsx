"use client"

import { useState } from "react"
import { Sparkles, X, Loader2, Type, AlignLeft, ListTree, FileText, Search } from "lucide-react"
import { ADMIN_CSRF_HEADER, getAdminCsrfToken } from "@/lib/security/csrf-client"

// Props for communication with post-editor
interface AiAssistantPanelProps {
    isOpen: boolean
    onClose: () => void
    postTitle: string
    postContent: string
    postKeyword: string
    onUpdateTitle: (title: string) => void
    onUpdateExcerpt: (excerpt: string) => void
    onUpdateContent: (content: string) => void
    onUpdateSeo: (seo: { metaTitle: string; metaDescription: string; ogTitle: string; ogDescription: string; schemaType: string }) => void
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
    onUpdateSeo,
}: AiAssistantPanelProps) {
    const [activeTab, setActiveTab] = useState<"title" | "excerpt" | "outline" | "content" | "seo">("title")

    // States for generate_title
    const [topic, setTopic] = useState("")
    const [titleSuggestions, setTitleSuggestions] = useState<string[]>([])
    const [loadingTitle, setLoadingTitle] = useState(false)

    // States for generate_excerpt
    const [loadingExcerpt, setLoadingExcerpt] = useState(false)

    // States for generate_outline
    const [outlineHtml, setOutlineHtml] = useState("")
    const [loadingOutline, setLoadingOutline] = useState(false)

    // States for generate_content
    const [loadingContent, setLoadingContent] = useState(false)

    // States for generate_seo
    const [loadingSeo, setLoadingSeo] = useState(false)

    const [error, setError] = useState<string | null>(null)

    const callApi = async (action: string, payload: any) => {
        setError(null)
        try {
            const csrfToken = await getAdminCsrfToken()
            const res = await fetch("/api/admin/ai/assist", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    [ADMIN_CSRF_HEADER]: csrfToken,
                },
                body: JSON.stringify({ action, payload }),
            })
            const data = await res.json()
            if (!data.success) {
                setError(data.error || "Terjadi kesalahan AI")
                return null
            }
            return data.data
        } catch (err: any) {
            setError(err.message || "Gagal menghubungi server")
            return null
        }
    }

    const handleGenerateTitle = async () => {
        if (!topic) return setError("Topik wajib diisi")
        setLoadingTitle(true)
        const data = await callApi("generate_title", { topic })
        if (data && data.titles) setTitleSuggestions(data.titles)
        setLoadingTitle(false)
    }

    const handleGenerateExcerpt = async () => {
        if (!postTitle || !postContent) return setError("Judul dan konten diperlukan untuk membuat excerpt")
        setLoadingExcerpt(true)
        const data = await callApi("generate_excerpt", { title: postTitle, content: postContent })
        if (data && data.excerpt) onUpdateExcerpt(data.excerpt)
        setLoadingExcerpt(false)
    }

    const handleGenerateOutline = async () => {
        if (!postTitle) return setError("Judul diperlukan untuk membuat outline")
        setLoadingOutline(true)
        const data = await callApi("generate_outline", { title: postTitle, keyword: postKeyword })
        if (data && data.outlineHtml) setOutlineHtml(data.outlineHtml)
        setLoadingOutline(false)
    }

    const handleGenerateContent = async () => {
        if (!postTitle || !outlineHtml) return setError("Judul dan outline diperlukan untuk membuat konten")
        setLoadingContent(true)
        const data = await callApi("generate_content", {
            title: postTitle,
            outline: outlineHtml,
            keyword: postKeyword
        })
        if (data && data.contentHtml) {
            onUpdateContent(data.contentHtml)
        }
        setLoadingContent(false)
    }

    const handleGenerateSeo = async () => {
        if (!postTitle || !postContent) return setError("Judul dan konten diperlukan untuk SEO")
        setLoadingSeo(true)
        const data = await callApi("generate_seo", { title: postTitle, content: postContent, keyword: postKeyword })
        if (data) {
            onUpdateSeo({
                metaTitle: data.metaTitle || "",
                metaDescription: data.metaDescription || "",
                ogTitle: data.ogTitle || "",
                ogDescription: data.ogDescription || "",
                schemaType: data.schemaType || "",
            })
        }
        setLoadingSeo(false)
    }

    if (!isOpen) return null

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/20 z-40 lg:hidden"
                onClick={onClose}
            />

            {/* Panel */}
            <div className={`fixed top-0 right-0 h-full w-full sm:w-96 bg-white shadow-2xl z-50 transform transition-transform duration-300 ${isOpen ? "translate-x-0" : "translate-x-full"} flex flex-col border-l border-[#D4BCAA]/20`}>

                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-[#D4BCAA]/20 bg-[#FAF9F7]">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#466A68]/20 to-[#466A68]/5 flex items-center justify-center border border-[#466A68]/15">
                            <Sparkles className="h-4 w-4 text-[#466A68]" />
                        </div>
                        <h2 className="font-semibold text-[#0F0A09]">AI Assistant</h2>
                    </div>
                    <button onClick={onClose} className="p-2 text-[#8C7A6B] hover:text-[#0F0A09] hover:bg-[#D4BCAA]/10 rounded-lg transition-colors">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex overflow-x-auto no-scrollbar border-b border-[#D4BCAA]/20">
                    {[
                        { id: "title", icon: Type, label: "Judul" },
                        { id: "outline", icon: ListTree, label: "Outline" },
                        { id: "content", icon: FileText, label: "Konten" },
                        { id: "excerpt", icon: AlignLeft, label: "Excerpt" },
                        { id: "seo", icon: Search, label: "SEO" },
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
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

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto p-5 scroll-smooth">
                    {activeTab === "title" && (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-[#0F0A09] mb-1">Topik Artikel</label>
                                <textarea
                                    value={topic}
                                    onChange={e => setTopic(e.target.value)}
                                    placeholder="Contoh: Manfaat ASI Eksklusif"
                                    className="w-full bg-white border border-[#D4BCAA]/30 rounded-lg px-3 py-2 text-sm text-[#0F0A09] focus:ring-2 focus:ring-[#466A68]/30 outline-none"
                                    rows={3}
                                />
                            </div>
                            <button
                                onClick={handleGenerateTitle}
                                disabled={loadingTitle || !topic}
                                className="w-full flex items-center justify-center gap-2 py-2 bg-[#466A68] text-white rounded-lg text-sm font-medium disabled:opacity-50"
                            >
                                {loadingTitle && <Loader2 className="h-4 w-4 animate-spin" />}
                                Generate 5 Judul
                            </button>

                            {titleSuggestions.length > 0 && (
                                <div className="space-y-2 mt-4">
                                    <h4 className="text-xs font-semibold text-[#8C7A6B] uppercase tracking-wider mb-2">Pilih Judul:</h4>
                                    {titleSuggestions.map((title, i) => (
                                        <button
                                            key={i}
                                            onClick={() => onUpdateTitle(title)}
                                            className="w-full text-left p-3 text-sm text-[#0F0A09] bg-[#FAF9F7] border border-[#D4BCAA]/20 rounded-lg hover:border-[#466A68]/40 transition-colors"
                                        >
                                            {title}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === "outline" && (
                        <div className="space-y-4">
                            <p className="text-sm text-[#8C7A6B]">AI akan membuat struktur artikel berdasarkan Judul saat ini: <br /><strong className="text-[#0F0A09]">{postTitle || "(Belum ada judul)"}</strong></p>
                            <button
                                onClick={handleGenerateOutline}
                                disabled={loadingOutline || !postTitle}
                                className="w-full flex items-center justify-center gap-2 py-2 bg-[#466A68] text-white rounded-lg text-sm font-medium disabled:opacity-50"
                            >
                                {loadingOutline && <Loader2 className="h-4 w-4 animate-spin" />}
                                Generate Outline
                            </button>

                            {outlineHtml && (
                                <div className="mt-4">
                                    <h4 className="text-xs font-semibold text-[#8C7A6B] uppercase tracking-wider mb-2">Outline:</h4>
                                    <div className="prose prose-sm max-w-none bg-[#FAF9F7] p-4 rounded-lg border border-[#D4BCAA]/20" dangerouslySetInnerHTML={{ __html: outlineHtml }} />
                                    <button
                                        onClick={() => onUpdateContent(outlineHtml)}
                                        className="mt-3 w-full py-2 bg-white border border-[#466A68] text-[#466A68] rounded-lg text-sm font-medium hover:bg-[#466A68]/5"
                                    >
                                        Terapkan ke Editor Konten
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === "content" && (
                        <div className="space-y-4">
                            <p className="text-sm text-[#8C7A6B]">AI akan mengembangkan Outline menjadi artikel utuh. Pastikan Anda sudah membuat atau menerapkan Outline.</p>
                            <button
                                onClick={handleGenerateContent}
                                disabled={loadingContent || !postTitle || !outlineHtml}
                                className="w-full flex items-center justify-center gap-2 py-2 bg-[#466A68] text-white rounded-lg text-sm font-medium disabled:opacity-50"
                            >
                                {loadingContent && <Loader2 className="h-4 w-4 animate-spin" />}
                                Kembangkan Konten Utuh
                            </button>
                            {(!outlineHtml) && (
                                <p className="text-xs text-amber-600 mt-2 bg-amber-50 p-2 rounded border border-amber-200">Anda perlu Generate Outline terlebih dahulu di tab Outline.</p>
                            )}
                        </div>
                    )}

                    {activeTab === "excerpt" && (
                        <div className="space-y-4">
                            <p className="text-sm text-[#8C7A6B]">AI akan membaca isi konten Anda dan membuat ringkasan singkat 1 paragraf.</p>
                            <button
                                onClick={handleGenerateExcerpt}
                                disabled={loadingExcerpt || !postTitle || !postContent}
                                className="w-full flex items-center justify-center gap-2 py-2 bg-[#466A68] text-white rounded-lg text-sm font-medium disabled:opacity-50"
                            >
                                {loadingExcerpt && <Loader2 className="h-4 w-4 animate-spin" />}
                                Generate Excerpt
                            </button>
                        </div>
                    )}

                    {activeTab === "seo" && (
                        <div className="space-y-4">
                            <p className="text-sm text-[#8C7A6B]">AI akan membuat Meta Title, Meta Description, dan elemen SEO otomatis berdasarkan konten Anda.</p>
                            <button
                                onClick={handleGenerateSeo}
                                disabled={loadingSeo || !postTitle || !postContent}
                                className="w-full flex items-center justify-center gap-2 py-2 bg-[#466A68] text-white rounded-lg text-sm font-medium disabled:opacity-50"
                            >
                                {loadingSeo && <Loader2 className="h-4 w-4 animate-spin" />}
                                Auto-Fill SEO
                            </button>
                        </div>
                    )}

                    {error && (
                        <div className="mt-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">
                            {error}
                        </div>
                    )}
                </div>
            </div>
        </>
    )
}
