"use client"

import { useState, useEffect, useCallback } from "react"
import {
    Plus, Loader2, Trash2, Pencil, Check, X, Tags,
} from "lucide-react"
import { ADMIN_CSRF_HEADER, getAdminCsrfToken } from "@/lib/security/csrf-client"

type Tag = {
    id: string
    name: string
    slug: string
    _count: { posts: number }
}

export default function TagsPage() {
    const [tags, setTags] = useState<Tag[]>([])
    const [loading, setLoading] = useState(true)
    const [newName, setNewName] = useState("")
    const [adding, setAdding] = useState(false)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [editName, setEditName] = useState("")
    const [deleting, setDeleting] = useState<string | null>(null)

    const fetchTags = useCallback(async () => {
        try {
            const res = await fetch("/api/admin/tags")
            const data = await res.json()
            if (data.success) setTags(data.data)
        } catch (err) {
            console.error("Failed to fetch tags:", err)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchTags()
    }, [fetchTags])

    const handleAdd = async () => {
        if (!newName.trim()) return
        setAdding(true)
        try {
            const csrfToken = await getAdminCsrfToken()
            const res = await fetch("/api/admin/tags", {
                method: "POST",
                headers: { "Content-Type": "application/json", [ADMIN_CSRF_HEADER]: csrfToken },
                body: JSON.stringify({ name: newName }),
            })
            const data = await res.json()
            if (data.success) {
                setNewName("")
                fetchTags()
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
            const res = await fetch(`/api/admin/tags/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json", [ADMIN_CSRF_HEADER]: csrfToken },
                body: JSON.stringify({ name: editName }),
            })
            const data = await res.json()
            if (data.success) {
                setEditingId(null)
                fetchTags()
            } else {
                alert(data.error)
            }
        } catch (err) {
            console.error(err)
        }
    }

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`Hapus tag "${name}"?`)) return
        setDeleting(id)
        try {
            const csrfToken = await getAdminCsrfToken()
            await fetch(`/api/admin/tags/${id}`, { method: "DELETE", headers: { [ADMIN_CSRF_HEADER]: csrfToken } })
            fetchTags()
        } catch (err) {
            console.error(err)
        } finally {
            setDeleting(null)
        }
    }

    return (
        <div className="space-y-6 max-w-3xl">
            <div>
                <h1 className="text-2xl font-bold text-[#F4EEE7]">Tag</h1>
                <p className="text-[#D4BCAA]/50 text-sm mt-1">
                    {tags.length} tag
                </p>
            </div>

            {/* Add New */}
            <div className="bg-[#2a2018] border border-[#D4BCAA]/10 rounded-xl p-5">
                <div className="flex gap-3">
                    <input
                        type="text"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        placeholder="Nama tag baru"
                        onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                        className="flex-1 px-4 py-2.5 bg-[#1a1412] border border-[#D4BCAA]/10 rounded-lg text-[#F4EEE7] text-sm placeholder-[#D4BCAA]/25 focus:outline-none focus:ring-2 focus:ring-[#466A68]/30 transition-all"
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

            {/* Tag Cloud / List */}
            <div className="bg-[#2a2018] border border-[#D4BCAA]/10 rounded-xl overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center h-32">
                        <Loader2 className="h-6 w-6 text-[#466A68] animate-spin" />
                    </div>
                ) : tags.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-32 text-[#D4BCAA]/30">
                        <Tags className="h-6 w-6 mb-2" />
                        <p className="text-sm">Belum ada tag</p>
                    </div>
                ) : (
                    <div className="divide-y divide-[#D4BCAA]/5">
                        {tags.map((tag) => (
                            <div key={tag.id} className="flex items-center gap-4 px-6 py-3 hover:bg-[#D4BCAA]/5 transition-colors">
                                {editingId === tag.id ? (
                                    <>
                                        <input
                                            type="text"
                                            value={editName}
                                            onChange={(e) => setEditName(e.target.value)}
                                            onKeyDown={(e) => e.key === "Enter" && handleEdit(tag.id)}
                                            className="flex-1 px-3 py-1.5 bg-[#1a1412] border border-[#466A68]/30 rounded-lg text-[#F4EEE7] text-sm outline-none"
                                            autoFocus
                                        />
                                        <button onClick={() => handleEdit(tag.id)} className="p-1.5 text-green-400 hover:text-green-300">
                                            <Check className="h-4 w-4" />
                                        </button>
                                        <button onClick={() => setEditingId(null)} className="p-1.5 text-[#D4BCAA]/30 hover:text-[#F4EEE7]">
                                            <X className="h-4 w-4" />
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <div className="flex-1 min-w-0">
                                            <span className="text-sm text-[#F4EEE7]">{tag.name}</span>
                                            <span className="text-[10px] text-[#D4BCAA]/20 ml-2">/{tag.slug} · {tag._count.posts} artikel</span>
                                        </div>
                                        <button
                                            onClick={() => { setEditingId(tag.id); setEditName(tag.name) }}
                                            className="p-1.5 text-[#D4BCAA]/30 hover:text-[#466A68] transition-colors"
                                        >
                                            <Pencil className="h-4 w-4" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(tag.id, tag.name)}
                                            disabled={deleting === tag.id}
                                            className="p-1.5 text-[#D4BCAA]/30 hover:text-red-400 transition-colors disabled:opacity-50"
                                        >
                                            {deleting === tag.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
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
