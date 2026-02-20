"use client"

import { useState, useEffect, useCallback } from "react"
import {
    Plus, Loader2, Trash2, Pencil, Check, X, FolderOpen,
} from "lucide-react"
import { ADMIN_CSRF_HEADER, getAdminCsrfToken } from "@/lib/security/csrf-client"

type Category = {
    id: string
    name: string
    slug: string
    description: string | null
    _count: { posts: number }
}

export default function CategoriesPage() {
    const [categories, setCategories] = useState<Category[]>([])
    const [loading, setLoading] = useState(true)
    const [newName, setNewName] = useState("")
    const [newDesc, setNewDesc] = useState("")
    const [adding, setAdding] = useState(false)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [editName, setEditName] = useState("")
    const [editDesc, setEditDesc] = useState("")
    const [deleting, setDeleting] = useState<string | null>(null)

    const fetchCategories = useCallback(async () => {
        try {
            const res = await fetch("/api/admin/categories")
            const data = await res.json()
            if (data.success) setCategories(data.data)
        } catch (err) {
            console.error("Failed to fetch categories:", err)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchCategories()
    }, [fetchCategories])

    const handleAdd = async () => {
        if (!newName.trim()) return
        setAdding(true)
        try {
            const csrfToken = await getAdminCsrfToken()
            const res = await fetch("/api/admin/categories", {
                method: "POST",
                headers: { "Content-Type": "application/json", [ADMIN_CSRF_HEADER]: csrfToken },
                body: JSON.stringify({ name: newName, description: newDesc || null }),
            })
            const data = await res.json()
            if (data.success) {
                setNewName("")
                setNewDesc("")
                fetchCategories()
            } else {
                alert(data.error)
            }
        } catch (err) {
            console.error(err)
        } finally {
            setAdding(false)
        }
    }

    const handleEdit = async (id: string) => {
        if (!editName.trim()) return
        try {
            const csrfToken = await getAdminCsrfToken()
            const res = await fetch(`/api/admin/categories/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json", [ADMIN_CSRF_HEADER]: csrfToken },
                body: JSON.stringify({ name: editName, description: editDesc || null }),
            })
            const data = await res.json()
            if (data.success) {
                setEditingId(null)
                fetchCategories()
            } else {
                alert(data.error)
            }
        } catch (err) {
            console.error(err)
        }
    }

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`Hapus kategori "${name}"? Artikel tidak akan terhapus.`)) return
        setDeleting(id)
        try {
            const csrfToken = await getAdminCsrfToken()
            await fetch(`/api/admin/categories/${id}`, { method: "DELETE", headers: { [ADMIN_CSRF_HEADER]: csrfToken } })
            fetchCategories()
        } catch (err) {
            console.error(err)
        } finally {
            setDeleting(null)
        }
    }

    return (
        <div className="space-y-6 max-w-3xl">
            <div>
                <h1 className="text-2xl font-bold text-[#0F0A09]">Kategori</h1>
                <p className="text-[#8C7A6B]/50 text-sm mt-1">
                    {categories.length} kategori
                </p>
            </div>

            {/* Add New */}
            <div className="bg-white border border-[#D4BCAA]/20 rounded-xl p-5 space-y-3">
                <h3 className="text-sm font-semibold text-[#0F0A09]">Tambah Kategori</h3>
                <div className="flex flex-col sm:flex-row gap-3">
                    <input
                        type="text"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        placeholder="Nama kategori"
                        onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                        className="flex-1 px-4 py-2.5 bg-white border border-[#D4BCAA]/20 rounded-lg text-[#0F0A09] text-sm placeholder-[#8C7A6B]/60 focus:outline-none focus:ring-2 focus:ring-[#466A68]/30 transition-all"
                    />
                    <input
                        type="text"
                        value={newDesc}
                        onChange={(e) => setNewDesc(e.target.value)}
                        placeholder="Deskripsi (opsional)"
                        className="flex-1 px-4 py-2.5 bg-white border border-[#D4BCAA]/20 rounded-lg text-[#0F0A09] text-sm placeholder-[#8C7A6B]/60 focus:outline-none focus:ring-2 focus:ring-[#466A68]/30 transition-all"
                    />
                    <button
                        onClick={handleAdd}
                        disabled={adding || !newName.trim()}
                        className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-[#466A68] to-[#3a5856] text-white text-sm font-medium rounded-lg hover:from-[#3a5856] hover:to-[#466A68] disabled:opacity-50 transition-all"
                    >
                        {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                        Tambah
                    </button>
                </div>
            </div>

            {/* List */}
            <div className="bg-white border border-[#D4BCAA]/20 rounded-xl overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center h-32">
                        <Loader2 className="h-6 w-6 text-[#466A68] animate-spin" />
                    </div>
                ) : categories.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-32 text-[#8C7A6B]/30">
                        <FolderOpen className="h-6 w-6 mb-2" />
                        <p className="text-sm">Belum ada kategori</p>
                    </div>
                ) : (
                    <div className="divide-y divide-[#D4BCAA]/20">
                        {categories.map((cat) => (
                            <div key={cat.id} className="flex items-center gap-4 px-6 py-3.5 hover:bg-[#D4BCAA]/5 transition-colors">
                                {editingId === cat.id ? (
                                    <>
                                        <input
                                            type="text"
                                            value={editName}
                                            onChange={(e) => setEditName(e.target.value)}
                                            onKeyDown={(e) => e.key === "Enter" && handleEdit(cat.id)}
                                            className="flex-1 px-3 py-1.5 bg-white border border-[#466A68]/30 rounded-lg text-[#0F0A09] text-sm outline-none"
                                            autoFocus
                                        />
                                        <input
                                            type="text"
                                            value={editDesc}
                                            onChange={(e) => setEditDesc(e.target.value)}
                                            placeholder="Deskripsi"
                                            className="flex-1 px-3 py-1.5 bg-white border border-[#D4BCAA]/20 rounded-lg text-[#0F0A09] text-sm placeholder-[#D4BCAA]/20 outline-none"
                                        />
                                        <button onClick={() => handleEdit(cat.id)} className="p-1.5 text-green-600 hover:text-green-700">
                                            <Check className="h-4 w-4" />
                                        </button>
                                        <button onClick={() => setEditingId(null)} className="p-1.5 text-[#8C7A6B]/30 hover:text-[#0F0A09]">
                                            <X className="h-4 w-4" />
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm text-[#0F0A09] font-medium">{cat.name}</p>
                                            {cat.description && (
                                                <p className="text-xs text-[#8C7A6B]/30 mt-0.5 truncate">{cat.description}</p>
                                            )}
                                            <p className="text-[10px] text-[#8C7A6B]/20 mt-0.5">/{cat.slug} · {cat._count.posts} artikel</p>
                                        </div>
                                        <button
                                            onClick={() => { setEditingId(cat.id); setEditName(cat.name); setEditDesc(cat.description || "") }}
                                            className="p-1.5 text-[#8C7A6B]/30 hover:text-[#466A68] transition-colors"
                                        >
                                            <Pencil className="h-4 w-4" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(cat.id, cat.name)}
                                            disabled={deleting === cat.id}
                                            className="p-1.5 text-[#8C7A6B]/30 hover:text-red-600 transition-colors disabled:opacity-50"
                                        >
                                            {deleting === cat.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                        </button>
                                    </>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
