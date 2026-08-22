"use client"

import { useCallback, useRef, useState } from "react"
import Image from "next/image"
import {
    Sparkles,
    Upload,
    ImageIcon,
    Loader2,
    X,
    Search,
    Wand2,
    Check,
} from "lucide-react"
import { AdminClientError, adminGet, adminPost } from "@/lib/api/admin-client"
import { ADMIN_CSRF_HEADER, getAdminCsrfToken } from "@/lib/security/csrf-client"

/**
 * Unified image source picker.
 *
 * One modal for the three ways an editor can attach an image: generate with the image
 * role model, upload from the computer, or pull from free stock providers. Every path
 * returns the same shape, and alt/caption travel with the result so accessibility text is
 * never left behind.
 */

export type PickedImage = {
    url: string
    alt: string
    caption: string
    mediaId?: string
    width?: number | null
    height?: number | null
}

type ImageSourcePickerProps = {
    isOpen: boolean
    onClose: () => void
    onSelect: (image: PickedImage) => void
    /** Feeds the AI prompt/alt/caption generator with article context. */
    articleTitle?: string
    articleKeyword?: string
    articleContext?: string
    purpose?: "featured" | "inline"
    title?: string
}

type SourceTab = "ai" | "upload" | "stock"

type StockCandidate = {
    provider: "unsplash" | "pexels"
    id: string
    previewUrl: string
    downloadUrl: string
    width: number | null
    height: number | null
    alt: string | null
    attribution: string
    attributionUrl: string | null
}

type ImageMetaResponse = {
    success: boolean
    data: { imagePrompt: string; altText: string; caption: string }
}

type AiImageResponse = {
    success: boolean
    data: { mediaId: string; url: string; width: number | null; height: number | null }
}

type StockSearchResponse = {
    success: boolean
    data: StockCandidate[]
}

type StockImportResponse = {
    success: boolean
    data: { mediaId: string; url: string; width: number | null; height: number | null }
}

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

export function ImageSourcePicker({
    isOpen,
    onClose,
    onSelect,
    articleTitle,
    articleKeyword,
    articleContext,
    purpose = "featured",
    title = "Pilih Sumber Gambar",
}: ImageSourcePickerProps) {
    const [tab, setTab] = useState<SourceTab>("ai")
    const [error, setError] = useState<string | null>(null)

    // Shared accessibility text, editable regardless of which source is used.
    const [altText, setAltText] = useState("")
    const [caption, setCaption] = useState("")

    // AI tab
    const [imagePrompt, setImagePrompt] = useState("")
    const [generatingMeta, setGeneratingMeta] = useState(false)
    const [generatingImage, setGeneratingImage] = useState(false)
    const [aiPreview, setAiPreview] = useState<PickedImage | null>(null)

    // Upload tab
    const [uploading, setUploading] = useState(false)
    const [uploadPreview, setUploadPreview] = useState<PickedImage | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    // Stock tab
    const [stockProvider, setStockProvider] = useState<"unsplash" | "pexels">("unsplash")
    const [stockQuery, setStockQuery] = useState("")
    const [searchingStock, setSearchingStock] = useState(false)
    const [stockResults, setStockResults] = useState<StockCandidate[]>([])
    const [importingId, setImportingId] = useState<string | null>(null)

    const resetAndClose = useCallback(() => {
        setError(null)
        setAiPreview(null)
        setUploadPreview(null)
        setStockResults([])
        setImportingId(null)
        onClose()
    }, [onClose])

    const commit = useCallback(
        (image: PickedImage) => {
            onSelect({
                ...image,
                alt: altText.trim() || image.alt,
                caption: caption.trim() || image.caption,
            })
            resetAndClose()
        },
        [altText, caption, onSelect, resetAndClose]
    )

    /** Asks the text model for an image prompt plus alt text and caption. */
    const handleGenerateMeta = async () => {
        if (!articleTitle?.trim()) {
            setError("Judul artikel diperlukan untuk membuat prompt gambar.")
            return
        }

        setGeneratingMeta(true)
        setError(null)

        try {
            const response = await adminPost<
                ImageMetaResponse,
                {
                    action: "generate_image_meta"
                    payload: { title: string; context?: string; keyword?: string; purpose: "featured" | "inline" }
                }
            >("/api/admin/ai/assist", {
                body: {
                    action: "generate_image_meta",
                    payload: {
                        title: articleTitle,
                        ...(articleContext?.trim() ? { context: articleContext.slice(0, 3500) } : {}),
                        ...(articleKeyword?.trim() ? { keyword: articleKeyword } : {}),
                        purpose,
                    },
                },
                timeoutMs: 90_000,
            })

            if (response.success) {
                setImagePrompt(response.data.imagePrompt)
                setAltText(response.data.altText)
                setCaption(response.data.caption)
            }
        } catch (err) {
            setError(getErrorMessage(err, "Gagal membuat prompt gambar"))
        } finally {
            setGeneratingMeta(false)
        }
    }

    const handleGenerateImage = async () => {
        const prompt = imagePrompt.trim()
        if (prompt.length < 10) {
            setError("Prompt gambar minimal 10 karakter.")
            return
        }

        setGeneratingImage(true)
        setError(null)

        try {
            const response = await adminPost<
                AiImageResponse,
                { prompt: string; alt?: string; caption?: string; filenameHint?: string }
            >("/api/admin/ai/image", {
                body: {
                    prompt,
                    ...(altText.trim() ? { alt: altText.trim() } : {}),
                    ...(caption.trim() ? { caption: caption.trim() } : {}),
                    ...(articleTitle?.trim() ? { filenameHint: articleTitle.slice(0, 100) } : {}),
                },
                timeoutMs: 180_000,
            })

            if (response.success) {
                setAiPreview({
                    url: response.data.url,
                    alt: altText.trim(),
                    caption: caption.trim(),
                    mediaId: response.data.mediaId,
                    width: response.data.width,
                    height: response.data.height,
                })
            }
        } catch (err) {
            setError(getErrorMessage(err, "Gagal generate gambar AI"))
        } finally {
            setGeneratingImage(false)
        }
    }

    const handleUpload = async (file: File) => {
        if (!file.type.startsWith("image/")) {
            setError("File harus berupa gambar.")
            return
        }

        setUploading(true)
        setError(null)

        try {
            const csrfToken = await getAdminCsrfToken()
            const formData = new FormData()
            formData.append("file", file)
            formData.append("folder", "mumnhun/posts")

            const response = await fetch("/api/admin/upload", {
                method: "POST",
                headers: { [ADMIN_CSRF_HEADER]: csrfToken },
                body: formData,
            })

            const data = await response.json()
            if (!response.ok || !data.success) {
                setError(data.error || "Gagal mengunggah gambar")
                return
            }

            setUploadPreview({
                url: data.data.url,
                alt: altText.trim(),
                caption: caption.trim(),
                mediaId: data.data.mediaId,
                width: data.data.width ?? null,
                height: data.data.height ?? null,
            })
        } catch (err) {
            setError(getErrorMessage(err, "Gagal mengunggah gambar"))
        } finally {
            setUploading(false)
        }
    }

    const handleSearchStock = async () => {
        const query = stockQuery.trim()
        if (query.length < 2) {
            setError("Kata kunci pencarian minimal 2 karakter.")
            return
        }

        setSearchingStock(true)
        setError(null)

        try {
            const params = new URLSearchParams({ provider: stockProvider, query, perPage: "12" })
            const response = await adminGet<StockSearchResponse>(
                `/api/admin/media/free-image?${params.toString()}`
            )

            if (response.success) {
                setStockResults(response.data)
                if (response.data.length === 0) {
                    setError("Tidak ada hasil untuk kata kunci tersebut.")
                }
            }
        } catch (err) {
            setError(getErrorMessage(err, "Gagal mencari stock photo"))
        } finally {
            setSearchingStock(false)
        }
    }

    /** Stock images are re-hosted into Cloudinary so the site never hotlinks the provider. */
    const handleImportStock = async (candidate: StockCandidate) => {
        setImportingId(candidate.id)
        setError(null)

        try {
            const response = await adminPost<
                StockImportResponse,
                {
                    provider: "unsplash" | "pexels"
                    downloadUrl: string
                    sourceRef: string
                    attribution: string
                    alt?: string
                }
            >("/api/admin/media/free-image", {
                body: {
                    provider: candidate.provider,
                    downloadUrl: candidate.downloadUrl,
                    sourceRef: candidate.id,
                    attribution: candidate.attribution,
                    ...(altText.trim() || candidate.alt
                        ? { alt: altText.trim() || candidate.alt || "" }
                        : {}),
                },
                timeoutMs: 90_000,
            })

            if (response.success) {
                commit({
                    url: response.data.url,
                    alt: altText.trim() || candidate.alt || "",
                    caption: caption.trim() || candidate.attribution,
                    mediaId: response.data.mediaId,
                    width: response.data.width,
                    height: response.data.height,
                })
            }
        } catch (err) {
            setError(getErrorMessage(err, "Gagal mengimpor stock photo"))
        } finally {
            setImportingId(null)
        }
    }

    if (!isOpen) return null

    const tabs: Array<{ id: SourceTab; label: string; icon: typeof Sparkles }> = [
        { id: "ai", label: "Generate AI", icon: Sparkles },
        { id: "upload", label: "Upload", icon: Upload },
        { id: "stock", label: "Stock Photo", icon: ImageIcon },
    ]

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div
                className="absolute inset-0 bg-[#0F0A09]/50 backdrop-blur-sm"
                onClick={resetAndClose}
                aria-hidden="true"
            />

            <div
                role="dialog"
                aria-modal="true"
                aria-label={title}
                className="relative w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col bg-white rounded-2xl border border-[#D4BCAA]/30 shadow-2xl"
            >
                <div className="flex items-center justify-between px-6 py-4 border-b border-[#D4BCAA]/20 bg-[#FAF9F7]">
                    <h2 className="font-semibold text-[#0F0A09]">{title}</h2>
                    <button
                        onClick={resetAndClose}
                        className="p-2 text-[#8C7A6B] hover:text-[#0F0A09] hover:bg-[#D4BCAA]/10 rounded-lg transition-colors"
                        aria-label="Tutup"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="flex border-b border-[#D4BCAA]/20">
                    {tabs.map((entry) => (
                        <button
                            key={entry.id}
                            onClick={() => {
                                setTab(entry.id)
                                setError(null)
                            }}
                            className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors ${tab === entry.id
                                ? "border-[#466A68] text-[#466A68]"
                                : "border-transparent text-[#8C7A6B] hover:text-[#0F0A09] hover:bg-[#FAF9F7]"
                                }`}
                        >
                            <entry.icon className="h-4 w-4" />
                            {entry.label}
                        </button>
                    ))}
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-5">
                    {tab === "ai" && (
                        <div className="space-y-4">
                            <div className="flex items-start justify-between gap-3">
                                <p className="text-sm text-[#8C7A6B]">
                                    AI akan menyusun prompt gambar, alt text, dan caption dari konteks artikel.
                                </p>
                                <button
                                    onClick={handleGenerateMeta}
                                    disabled={generatingMeta || !articleTitle?.trim()}
                                    className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-[#466A68]/30 text-[#466A68] rounded-lg hover:bg-[#466A68]/5 disabled:opacity-40 transition-colors"
                                >
                                    {generatingMeta ? (
                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    ) : (
                                        <Wand2 className="h-3.5 w-3.5" />
                                    )}
                                    Susun otomatis
                                </button>
                            </div>

                            <div>
                                <label htmlFor="image-prompt" className="block text-xs text-[#8C7A6B] mb-1.5">
                                    Prompt Gambar
                                </label>
                                <textarea
                                    id="image-prompt"
                                    value={imagePrompt}
                                    onChange={(e) => setImagePrompt(e.target.value)}
                                    rows={4}
                                    placeholder="Warm natural photo of a mother preparing breast milk storage bags, soft daylight, clean composition, no text, no watermark"
                                    className="w-full bg-white border border-[#D4BCAA]/30 rounded-lg px-3 py-2 text-sm text-[#0F0A09] placeholder-[#8C7A6B]/60 outline-none focus:ring-2 focus:ring-[#466A68]/30 resize-none"
                                />
                            </div>

                            <button
                                onClick={handleGenerateImage}
                                disabled={generatingImage || imagePrompt.trim().length < 10}
                                className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#466A68] text-white rounded-lg text-sm font-medium disabled:opacity-50 transition-opacity"
                            >
                                {generatingImage ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <Sparkles className="h-4 w-4" />
                                )}
                                Generate Gambar
                            </button>

                            {aiPreview && (
                                <div className="space-y-3">
                                    <div className="relative aspect-video rounded-xl overflow-hidden border border-[#D4BCAA]/30 bg-[#FAF9F7]">
                                        <Image
                                            src={aiPreview.url}
                                            alt={altText || "Pratinjau gambar AI"}
                                            fill
                                            sizes="(max-width: 768px) 100vw, 640px"
                                            className="object-cover"
                                            unoptimized
                                        />
                                    </div>
                                    <button
                                        onClick={() => commit(aiPreview)}
                                        className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#0F0A09] text-white rounded-lg text-sm font-medium"
                                    >
                                        <Check className="h-4 w-4" />
                                        Gunakan Gambar Ini
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {tab === "upload" && (
                        <div className="space-y-4">
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => {
                                    const file = e.target.files?.[0]
                                    if (file) void handleUpload(file)
                                }}
                            />

                            <button
                                onClick={() => fileInputRef.current?.click()}
                                disabled={uploading}
                                className="w-full py-10 border-2 border-dashed border-[#D4BCAA]/40 rounded-xl flex flex-col items-center gap-2 text-[#8C7A6B] hover:border-[#466A68]/40 hover:text-[#466A68] transition-colors disabled:opacity-50"
                            >
                                {uploading ? (
                                    <Loader2 className="h-6 w-6 animate-spin" />
                                ) : (
                                    <Upload className="h-6 w-6" />
                                )}
                                <span className="text-sm font-medium">
                                    {uploading ? "Mengunggah..." : "Pilih file dari komputer"}
                                </span>
                                <span className="text-xs text-[#8C7A6B]/70">JPG, PNG, WebP, AVIF (maks 10MB)</span>
                            </button>

                            {uploadPreview && (
                                <div className="space-y-3">
                                    <div className="relative aspect-video rounded-xl overflow-hidden border border-[#D4BCAA]/30 bg-[#FAF9F7]">
                                        <Image
                                            src={uploadPreview.url}
                                            alt={altText || "Pratinjau gambar unggahan"}
                                            fill
                                            sizes="(max-width: 768px) 100vw, 640px"
                                            className="object-cover"
                                            unoptimized
                                        />
                                    </div>
                                    <button
                                        onClick={() => commit(uploadPreview)}
                                        className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#0F0A09] text-white rounded-lg text-sm font-medium"
                                    >
                                        <Check className="h-4 w-4" />
                                        Gunakan Gambar Ini
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {tab === "stock" && (
                        <div className="space-y-4">
                            <div className="flex flex-col sm:flex-row gap-2">
                                <select
                                    value={stockProvider}
                                    onChange={(e) => setStockProvider(e.target.value as "unsplash" | "pexels")}
                                    className="bg-white border border-[#D4BCAA]/30 rounded-lg px-3 py-2 text-sm text-[#0F0A09] outline-none focus:ring-2 focus:ring-[#466A68]/30"
                                    aria-label="Provider stock photo"
                                >
                                    <option value="unsplash">Unsplash</option>
                                    <option value="pexels">Pexels</option>
                                </select>

                                <div className="flex-1 flex items-center gap-2 px-3 py-2 bg-white border border-[#D4BCAA]/30 rounded-lg">
                                    <Search className="h-4 w-4 text-[#8C7A6B]" />
                                    <input
                                        type="search"
                                        value={stockQuery}
                                        onChange={(e) => setStockQuery(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter") {
                                                e.preventDefault()
                                                void handleSearchStock()
                                            }
                                        }}
                                        placeholder="mother breastfeeding, baby bottle..."
                                        className="flex-1 bg-transparent text-sm text-[#0F0A09] placeholder-[#8C7A6B]/60 outline-none"
                                    />
                                </div>

                                <button
                                    onClick={handleSearchStock}
                                    disabled={searchingStock || stockQuery.trim().length < 2}
                                    className="px-4 py-2 bg-[#466A68] text-white rounded-lg text-sm font-medium disabled:opacity-50 inline-flex items-center gap-2"
                                >
                                    {searchingStock && <Loader2 className="h-4 w-4 animate-spin" />}
                                    Cari
                                </button>
                            </div>

                            {stockResults.length > 0 && (
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                    {stockResults.map((candidate) => (
                                        <button
                                            key={`${candidate.provider}-${candidate.id}`}
                                            onClick={() => handleImportStock(candidate)}
                                            disabled={importingId !== null}
                                            className="group relative aspect-[4/3] rounded-lg overflow-hidden border border-[#D4BCAA]/30 disabled:opacity-60"
                                            title={candidate.attribution}
                                        >
                                            <Image
                                                src={candidate.previewUrl}
                                                alt={candidate.alt || candidate.attribution}
                                                fill
                                                sizes="200px"
                                                className="object-cover group-hover:scale-105 transition-transform"
                                                unoptimized
                                            />
                                            <span className="absolute inset-x-0 bottom-0 bg-[#0F0A09]/70 text-white text-[10px] px-2 py-1 truncate text-left">
                                                {candidate.attribution}
                                            </span>
                                            {importingId === candidate.id && (
                                                <span className="absolute inset-0 flex items-center justify-center bg-white/70">
                                                    <Loader2 className="h-5 w-5 animate-spin text-[#466A68]" />
                                                </span>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Alt text and caption apply to every source. */}
                    <div className="space-y-3 pt-2 border-t border-[#D4BCAA]/20">
                        <div>
                            <label htmlFor="image-alt" className="block text-xs text-[#8C7A6B] mb-1.5">
                                Alt Text <span className="text-[#8C7A6B]/60">({altText.length}/125)</span>
                            </label>
                            <input
                                id="image-alt"
                                type="text"
                                value={altText}
                                onChange={(e) => setAltText(e.target.value)}
                                placeholder="Ibu menyiapkan kantong penyimpanan ASI perah di dapur"
                                className="w-full bg-white border border-[#D4BCAA]/30 rounded-lg px-3 py-2 text-sm text-[#0F0A09] placeholder-[#8C7A6B]/60 outline-none focus:ring-2 focus:ring-[#466A68]/30"
                            />
                        </div>
                        <div>
                            <label htmlFor="image-caption" className="block text-xs text-[#8C7A6B] mb-1.5">
                                Caption
                            </label>
                            <input
                                id="image-caption"
                                type="text"
                                value={caption}
                                onChange={(e) => setCaption(e.target.value)}
                                placeholder="Simpan ASIP dalam porsi kecil agar tidak ada yang terbuang."
                                className="w-full bg-white border border-[#D4BCAA]/30 rounded-lg px-3 py-2 text-sm text-[#0F0A09] placeholder-[#8C7A6B]/60 outline-none focus:ring-2 focus:ring-[#466A68]/30"
                            />
                        </div>
                    </div>

                    {error && (
                        <div role="alert" className="p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-100">
                            {error}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
