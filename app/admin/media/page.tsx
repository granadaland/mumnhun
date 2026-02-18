"use client"

import { useState, useEffect, useCallback } from "react"
import {
    Plus, Loader2, Trash2, Search, Image as ImageIcon,
    Copy, Check, ChevronLeft, ChevronRight, X,
} from "lucide-react"
import { ADMIN_CSRF_HEADER, getAdminCsrfToken } from "@/lib/security/csrf-client"

type MediaItem = {
    id: string
    url: string
    alt: string | null
    width: number | null
    height: number | null
    mimeType: string | null
    createdAt: string
}

type Pagination = {
    page: number
    limit: number
    total: number
    totalPages: number
}

export default function MediaPage() {
    const [media, setMedia] = useState<MediaItem[]>([])
    const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 30, total: 0, totalPages: 0 })
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState("")
    const [showAdd, setShowAdd] = useState(false)
    const [newUrl, setNewUrl] = useState("")
    const [newAlt, setNewAlt] = useState("")
    const [adding, setAdding] = useState(false)
    const [copied, setCopied] = useState<string | null>(null)
    const [deleting, setDeleting] = useState<string | null>(null)
    const [preview, setPreview] = useState<MediaItem | null>(null)

    const fetchMedia = useCallback(async (page = 1) => {
        setLoading(true)
        const params = new URLSearchParams({ page: String(page), limit: "30" })
        if (search) params.set("search", search)

        try {
            const res = await fetch(`/api/admin/media?${params}`)
            const data = await res.json()
            if (data.success) {
                setMedia(data.data)
                setPagination(data.pagination)
            }
        } catch (err) {
            console.error(err)
        } finally {
            setLoading(false)
        }
    }, [search])

    useEffect(() => {
        fetchMedia()
    }, [fetchMedia])

    const handleAdd = async () => {
        if (!newUrl.trim()) return
        setAdding(true)
        try {
            const csrfToken = await getAdminCsrfToken()
            const res = await fetch("/api/admin/media", {
                method: "POST",
                headers: { "Content-Type": "application/json", [ADMIN_CSRF_HEADER]: csrfToken },
                body: JSON.stringify({ url: newUrl, alt: newAlt }),
            })
            const data = await res.json()
            if (data.success) {
                setNewUrl("")
                setNewAlt("")
                setShowAdd(false)
                fetchMedia()
            }
        } catch (err) {
            console.error(err)
        } finally {
            setAdding(false)
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm("Hapus media ini?")) return
        setDeleting(id)
        try {
            const csrfToken = await getAdminCsrfToken()
            await fetch("/api/admin/media", {
                method: "DELETE",
                headers: { "Content-Type": "application/json", [ADMIN_CSRF_HEADER]: csrfToken },
                body: JSON.stringify({ id }),
            })
            fetchMedia(pagination.page)
        } catch (err) {
            console.error(err)
        } finally {
            setDeleting(null)
        }
    }

    const copyUrl = (url: string) => {
        navigator.clipboard.writeText(url)
        setCopied(url)
        setTimeout(() => setCopied(null), 2000)
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-[#F4EEE7]">Media</h1>
                    <p className="text-[#D4BCAA]/50 text-sm mt-1">{pagination.total} file</p>
                </div>
                <button
                    onClick={() => setShowAdd(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#466A68] to-[#3a5856] text-white text-sm font-medium rounded-lg transition-all shadow-lg"
                >
                    <Plus className="h-4 w-4" />
                    Tambah Media
                </button>
            </div>

            {/* Add Modal */}
            {showAdd && (
                <div className="bg-[#2a2018] border border-[#D4BCAA]/10 rounded-xl p-5 space-y-3">
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-[#F4EEE7]">Tambah Media</h3>
                        <button onClick={() => setShowAdd(false)} className="text-[#D4BCAA]/30 hover:text-[#F4EEE7]">
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                    <input type="url" value={newUrl} onChange={(e) => setNewUrl(e.target.value)} placeholder="URL gambar (Cloudinary)" className="w-full px-4 py-2.5 bg-[#1a1412] border border-[#D4BCAA]/10 rounded-lg text-[#F4EEE7] text-sm placeholder-[#D4BCAA]/25 outline-none focus:ring-2 focus:ring-[#466A68]/30 transition-all" />
                    <input type="text" value={newAlt} onChange={(e) => setNewAlt(e.target.value)} placeholder="Alt text (deskripsi gambar)" className="w-full px-4 py-2.5 bg-[#1a1412] border border-[#D4BCAA]/10 rounded-lg text-[#F4EEE7] text-sm placeholder-[#D4BCAA]/25 outline-none focus:ring-2 focus:ring-[#466A68]/30 transition-all" />
                    {newUrl && (
                        <div className="rounded-lg overflow-hidden border border-[#D4BCAA]/10 max-h-40">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={newUrl} alt="Preview" className="w-full h-full object-contain" />
                        </div>
                    )}
                    <button onClick={handleAdd} disabled={adding || !newUrl.trim()} className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-[#466A68] to-[#3a5856] text-white text-sm font-medium rounded-lg disabled:opacity-50 transition-all">
                        {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                        Simpan
                    </button>
                </div>
            )}

            {/* Search */}
            <div className="flex items-center gap-2 px-4 py-2.5 bg-[#2a2018] border border-[#D4BCAA]/10 rounded-lg">
                <Search className="h-4 w-4 text-[#D4BCAA]/30" />
                <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === "Enter" && fetchMedia()} placeholder="Cari media..." className="bg-transparent text-sm text-[#F4EEE7] placeholder-[#D4BCAA]/25 outline-none w-full" />
            </div>

            {/* Grid */}
            {loading ? (
                <div className="flex items-center justify-center h-48"><Loader2 className="h-6 w-6 text-[#466A68] animate-spin" /></div>
            ) : media.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-[#D4BCAA]/30">
                    <ImageIcon className="h-8 w-8 mb-2" />
                    <p className="text-sm">Belum ada media</p>
                </div>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                    {media.map((item) => (
                        <div key={item.id} className="group relative bg-[#2a2018] border border-[#D4BCAA]/10 rounded-xl overflow-hidden aspect-square hover:border-[#466A68]/30 transition-all cursor-pointer" onClick={() => setPreview(item)}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={item.url} alt={item.alt || ""} className="w-full h-full object-cover" loading="lazy" />
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                <button onClick={(e) => { e.stopPropagation(); copyUrl(item.url) }} className="p-2 bg-white/10 backdrop-blur rounded-lg text-white hover:bg-white/20 transition-colors" title="Copy URL">
                                    {copied === item.url ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                                </button>
                                <button onClick={(e) => { e.stopPropagation(); handleDelete(item.id) }} disabled={deleting === item.id} className="p-2 bg-red-500/20 backdrop-blur rounded-lg text-red-300 hover:bg-red-500/30 transition-colors" title="Delete">
                                    {deleting === item.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Pagination */}
            {pagination.totalPages > 1 && (
                <div className="flex items-center justify-between">
                    <p className="text-xs text-[#D4BCAA]/40">Halaman {pagination.page} dari {pagination.totalPages}</p>
                    <div className="flex items-center gap-1">
                        <button onClick={() => fetchMedia(pagination.page - 1)} disabled={pagination.page <= 1} className="p-1.5 text-[#D4BCAA]/30 hover:text-[#F4EEE7] disabled:opacity-30"><ChevronLeft className="h-4 w-4" /></button>
                        <button onClick={() => fetchMedia(pagination.page + 1)} disabled={pagination.page >= pagination.totalPages} className="p-1.5 text-[#D4BCAA]/30 hover:text-[#F4EEE7] disabled:opacity-30"><ChevronRight className="h-4 w-4" /></button>
                    </div>
                </div>
            )}

            {/* Preview Modal */}
            {preview && (
                <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-6" onClick={() => setPreview(null)}>
                    <div className="bg-[#2a2018] border border-[#D4BCAA]/10 rounded-xl p-4 max-w-2xl w-full max-h-[80vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-3">
                            <p className="text-sm text-[#D4BCAA]/70 truncate flex-1">{preview.alt || "No alt text"}</p>
                            <button onClick={() => setPreview(null)} className="p-1 text-[#D4BCAA]/30 hover:text-[#F4EEE7]"><X className="h-4 w-4" /></button>
                        </div>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={preview.url} alt={preview.alt || ""} className="w-full rounded-lg" />
                        <div className="mt-3 flex items-center gap-2">
                            <input type="text" value={preview.url} readOnly className="flex-1 px-3 py-2 bg-[#1a1412] border border-[#D4BCAA]/10 rounded-lg text-xs text-[#F4EEE7] font-mono" />
                            <button onClick={() => copyUrl(preview.url)} className="px-3 py-2 bg-[#466A68]/15 text-[#466A68] text-xs font-medium rounded-lg hover:bg-[#466A68]/25 transition-colors">
                                {copied === preview.url ? "Copied!" : "Copy"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
