"use client"

import { useState, useEffect, useCallback } from "react"
import {
    Plus, Loader2, Trash2, Pencil, Check, X,
    GripVertical, Eye, EyeOff, Image as ImageIcon,
} from "lucide-react"
import { ADMIN_CSRF_HEADER, getAdminCsrfToken } from "@/lib/security/csrf-client"

type Slide = {
    id: string
    title: string
    subtitle: string | null
    imageUrl: string | null
    ctaPrimaryText: string
    ctaPrimaryLink: string
    ctaSecondaryText: string | null
    ctaSecondaryLink: string | null
    isActive: boolean
    order: number
}

export default function HeroSectionPage() {
    const [slides, setSlides] = useState<Slide[]>([])
    const [loading, setLoading] = useState(true)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [editForm, setEditForm] = useState<Partial<Slide>>({})
    const [adding, setAdding] = useState(false)
    const [newForm, setNewForm] = useState({ title: "", subtitle: "", imageUrl: "", ctaPrimaryText: "Cek Harga Sewa", ctaPrimaryLink: "/#pricing", ctaSecondaryText: "", ctaSecondaryLink: "" })
    const [saving, setSaving] = useState(false)

    const fetchSlides = useCallback(async () => {
        try {
            const res = await fetch("/api/admin/hero")
            const data = await res.json()
            if (data.success) setSlides(data.data)
        } catch (err) {
            console.error(err)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchSlides()
    }, [fetchSlides])

    const handleAdd = async () => {
        if (!newForm.title.trim()) return alert("Judul wajib diisi")
        setSaving(true)
        try {
            const csrfToken = await getAdminCsrfToken()
            const res = await fetch("/api/admin/hero", {
                method: "POST",
                headers: { "Content-Type": "application/json", [ADMIN_CSRF_HEADER]: csrfToken },
                body: JSON.stringify(newForm),
            })
            const data = await res.json()
            if (data.success) {
                setNewForm({ title: "", subtitle: "", imageUrl: "", ctaPrimaryText: "Cek Harga Sewa", ctaPrimaryLink: "/#pricing", ctaSecondaryText: "", ctaSecondaryLink: "" })
                setAdding(false)
                fetchSlides()
            }
        } catch (err) {
            console.error(err)
        } finally {
            setSaving(false)
        }
    }

    const handleUpdate = async (id: string) => {
        setSaving(true)
        try {
            const csrfToken = await getAdminCsrfToken()
            const res = await fetch("/api/admin/hero", {
                method: "PUT",
                headers: { "Content-Type": "application/json", [ADMIN_CSRF_HEADER]: csrfToken },
                body: JSON.stringify({ id, ...editForm }),
            })
            const data = await res.json()
            if (data.success) {
                setEditingId(null)
                fetchSlides()
            }
        } catch (err) {
            console.error(err)
        } finally {
            setSaving(false)
        }
    }

    const handleToggle = async (slide: Slide) => {
        try {
            const csrfToken = await getAdminCsrfToken()
            await fetch("/api/admin/hero", {
                method: "PUT",
                headers: { "Content-Type": "application/json", [ADMIN_CSRF_HEADER]: csrfToken },
                body: JSON.stringify({ id: slide.id, isActive: !slide.isActive }),
            })
            fetchSlides()
        } catch (err) {
            console.error(err)
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm("Hapus slide ini?")) return
        try {
            const csrfToken = await getAdminCsrfToken()
            await fetch("/api/admin/hero", {
                method: "DELETE",
                headers: { "Content-Type": "application/json", [ADMIN_CSRF_HEADER]: csrfToken },
                body: JSON.stringify({ id }),
            })
            fetchSlides()
        } catch (err) {
            console.error(err)
        }
    }

    if (loading) {
        return (<div className="flex items-center justify-center h-64"><Loader2 className="h-6 w-6 text-[#466A68] animate-spin" /></div>)
    }

    return (
        <div className="space-y-6 max-w-4xl">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-[#F4EEE7]">Hero Section</h1>
                    <p className="text-[#D4BCAA]/50 text-sm mt-1">Kelola slide banner homepage</p>
                </div>
                <button onClick={() => setAdding(true)} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#466A68] to-[#3a5856] text-white text-sm font-medium rounded-lg transition-all shadow-lg">
                    <Plus className="h-4 w-4" />
                    Tambah Slide
                </button>
            </div>

            {/* Add Form */}
            {adding && (
                <div className="bg-[#2a2018] border border-[#D4BCAA]/10 rounded-xl p-5 space-y-3">
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-[#F4EEE7]">Slide Baru</h3>
                        <button onClick={() => setAdding(false)} className="text-[#D4BCAA]/30 hover:text-[#F4EEE7]"><X className="h-4 w-4" /></button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <input type="text" value={newForm.title} onChange={(e) => setNewForm({ ...newForm, title: e.target.value })} placeholder="Judul slide" className="px-4 py-2.5 bg-[#1a1412] border border-[#D4BCAA]/10 rounded-lg text-[#F4EEE7] text-sm placeholder-[#D4BCAA]/25 outline-none focus:ring-2 focus:ring-[#466A68]/30 transition-all" />
                        <input type="text" value={newForm.subtitle} onChange={(e) => setNewForm({ ...newForm, subtitle: e.target.value })} placeholder="Subtitle (opsional)" className="px-4 py-2.5 bg-[#1a1412] border border-[#D4BCAA]/10 rounded-lg text-[#F4EEE7] text-sm placeholder-[#D4BCAA]/25 outline-none focus:ring-2 focus:ring-[#466A68]/30 transition-all" />
                    </div>
                    <input type="url" value={newForm.imageUrl} onChange={(e) => setNewForm({ ...newForm, imageUrl: e.target.value })} placeholder="URL gambar" className="w-full px-4 py-2.5 bg-[#1a1412] border border-[#D4BCAA]/10 rounded-lg text-[#F4EEE7] text-sm placeholder-[#D4BCAA]/25 outline-none focus:ring-2 focus:ring-[#466A68]/30 transition-all" />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <input type="text" value={newForm.ctaPrimaryText} onChange={(e) => setNewForm({ ...newForm, ctaPrimaryText: e.target.value })} placeholder="Teks CTA Utama" className="px-4 py-2.5 bg-[#1a1412] border border-[#D4BCAA]/10 rounded-lg text-[#F4EEE7] text-sm placeholder-[#D4BCAA]/25 outline-none focus:ring-2 focus:ring-[#466A68]/30 transition-all" />
                        <input type="text" value={newForm.ctaPrimaryLink} onChange={(e) => setNewForm({ ...newForm, ctaPrimaryLink: e.target.value })} placeholder="URL CTA Utama" className="px-4 py-2.5 bg-[#1a1412] border border-[#D4BCAA]/10 rounded-lg text-[#F4EEE7] text-sm placeholder-[#D4BCAA]/25 outline-none focus:ring-2 focus:ring-[#466A68]/30 transition-all" />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <input type="text" value={newForm.ctaSecondaryText} onChange={(e) => setNewForm({ ...newForm, ctaSecondaryText: e.target.value })} placeholder="Teks CTA Sekunder (opsional)" className="px-4 py-2.5 bg-[#1a1412] border border-[#D4BCAA]/10 rounded-lg text-[#F4EEE7] text-sm placeholder-[#D4BCAA]/25 outline-none focus:ring-2 focus:ring-[#466A68]/30 transition-all" />
                        <input type="text" value={newForm.ctaSecondaryLink} onChange={(e) => setNewForm({ ...newForm, ctaSecondaryLink: e.target.value })} placeholder="URL CTA Sekunder (opsional)" className="px-4 py-2.5 bg-[#1a1412] border border-[#D4BCAA]/10 rounded-lg text-[#F4EEE7] text-sm placeholder-[#D4BCAA]/25 outline-none focus:ring-2 focus:ring-[#466A68]/30 transition-all" />
                    </div>
                    <button onClick={handleAdd} disabled={saving} className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-[#466A68] to-[#3a5856] text-white text-sm font-medium rounded-lg disabled:opacity-50 transition-all">
                        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                        Simpan Slide
                    </button>
                </div>
            )}

            {/* Slides List */}
            <div className="space-y-3">
                {slides.length === 0 ? (
                    <div className="bg-[#2a2018] border border-[#D4BCAA]/10 rounded-xl flex flex-col items-center justify-center h-40 text-[#D4BCAA]/30">
                        <ImageIcon className="h-6 w-6 mb-2" />
                        <p className="text-sm">Belum ada slide</p>
                    </div>
                ) : (
                    slides.map((slide) => (
                        <div key={slide.id} className="bg-[#2a2018] border border-[#D4BCAA]/10 rounded-xl overflow-hidden">
                            {editingId === slide.id ? (
                                <div className="p-5 space-y-3">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <input type="text" value={editForm.title || ""} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} placeholder="Judul" className="px-3 py-2 bg-[#1a1412] border border-[#466A68]/30 rounded-lg text-[#F4EEE7] text-sm outline-none" />
                                        <input type="text" value={editForm.subtitle || ""} onChange={(e) => setEditForm({ ...editForm, subtitle: e.target.value })} placeholder="Subtitle" className="px-3 py-2 bg-[#1a1412] border border-[#D4BCAA]/10 rounded-lg text-[#F4EEE7] text-sm outline-none" />
                                    </div>
                                    <input type="url" value={editForm.imageUrl || ""} onChange={(e) => setEditForm({ ...editForm, imageUrl: e.target.value })} placeholder="URL gambar" className="w-full px-3 py-2 bg-[#1a1412] border border-[#D4BCAA]/10 rounded-lg text-[#F4EEE7] text-sm outline-none" />
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <input type="text" value={editForm.ctaPrimaryText || ""} onChange={(e) => setEditForm({ ...editForm, ctaPrimaryText: e.target.value })} placeholder="Teks CTA Utama" className="px-3 py-2 bg-[#1a1412] border border-[#D4BCAA]/10 rounded-lg text-[#F4EEE7] text-sm outline-none" />
                                        <input type="text" value={editForm.ctaPrimaryLink || ""} onChange={(e) => setEditForm({ ...editForm, ctaPrimaryLink: e.target.value })} placeholder="URL CTA Utama" className="px-3 py-2 bg-[#1a1412] border border-[#D4BCAA]/10 rounded-lg text-[#F4EEE7] text-sm outline-none" />
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => handleUpdate(slide.id)} disabled={saving} className="px-3 py-1.5 bg-green-500/10 text-green-400 text-sm rounded-lg disabled:opacity-50 hover:bg-green-500/20 transition-colors flex items-center gap-1">
                                            {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />} Simpan
                                        </button>
                                        <button onClick={() => setEditingId(null)} className="px-3 py-1.5 text-[#D4BCAA]/50 text-sm hover:text-[#F4EEE7] transition-colors">Batal</button>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-center gap-4 p-4">
                                    <GripVertical className="h-4 w-4 text-[#D4BCAA]/15 flex-shrink-0 cursor-grab" />
                                    <div className="w-24 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-[#1a1412]">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        {slide.imageUrl && <img src={slide.imageUrl} alt={slide.title} className="w-full h-full object-cover" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className={`text-sm font-medium ${slide.isActive ? "text-[#F4EEE7]" : "text-[#D4BCAA]/40 line-through"}`}>{slide.title}</p>
                                        {slide.subtitle && <p className="text-xs text-[#D4BCAA]/30 mt-0.5 truncate">{slide.subtitle}</p>}
                                        <p className="text-[10px] text-[#466A68]/60 mt-0.5">CTA: {slide.ctaPrimaryText}</p>
                                    </div>
                                    <div className="flex items-center gap-1 flex-shrink-0">
                                        <button onClick={() => handleToggle(slide)} className={`p-1.5 transition-colors ${slide.isActive ? "text-green-400 hover:text-green-300" : "text-[#D4BCAA]/20 hover:text-[#D4BCAA]/50"}`}>
                                            {slide.isActive ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                                        </button>
                                        <button onClick={() => { setEditingId(slide.id); setEditForm(slide) }} className="p-1.5 text-[#D4BCAA]/30 hover:text-[#466A68] transition-colors">
                                            <Pencil className="h-4 w-4" />
                                        </button>
                                        <button onClick={() => handleDelete(slide.id)} className="p-1.5 text-[#D4BCAA]/30 hover:text-red-400 transition-colors">
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}
