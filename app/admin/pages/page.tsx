"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import {
    Plus, Loader2, Trash2, FileText, Eye,
} from "lucide-react"
import { ADMIN_CSRF_HEADER, getAdminCsrfToken } from "@/lib/security/csrf-client"

type Page = {
    id: string
    title: string
    slug: string
    status: string
    publishedAt: string | null
    updatedAt: string
}

export default function PagesListPage() {
    const [pages, setPages] = useState<Page[]>([])
    const [loading, setLoading] = useState(true)
    const [deleting, setDeleting] = useState<string | null>(null)

    const fetchPages = useCallback(async () => {
        try {
            const res = await fetch("/api/admin/pages")
            const data = await res.json()
            if (data.success) setPages(data.data)
        } catch (err) {
            console.error(err)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchPages()
    }, [fetchPages])

    const handleDelete = async (id: string, title: string) => {
        if (!confirm(`Hapus halaman "${title}"?`)) return
        setDeleting(id)
        try {
            const csrfToken = await getAdminCsrfToken()
            await fetch(`/api/admin/pages/${id}`, { method: "DELETE", headers: { [ADMIN_CSRF_HEADER]: csrfToken } })
            fetchPages()
        } catch (err) {
            console.error(err)
        } finally {
            setDeleting(null)
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-[#F4EEE7]">Halaman</h1>
                    <p className="text-[#D4BCAA]/50 text-sm mt-1">{pages.length} halaman</p>
                </div>
                <Link
                    href="/admin/pages/new"
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#466A68] to-[#3a5856] text-white text-sm font-medium rounded-lg hover:from-[#3a5856] hover:to-[#466A68] transition-all shadow-lg"
                >
                    <Plus className="h-4 w-4" />
                    Halaman Baru
                </Link>
            </div>

            <div className="bg-[#2a2018] border border-[#D4BCAA]/10 rounded-xl overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center h-32">
                        <Loader2 className="h-6 w-6 text-[#466A68] animate-spin" />
                    </div>
                ) : pages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-32 text-[#D4BCAA]/30">
                        <FileText className="h-6 w-6 mb-2" />
                        <p className="text-sm">Belum ada halaman</p>
                    </div>
                ) : (
                    <div className="divide-y divide-[#D4BCAA]/5">
                        {pages.map((page) => (
                            <div key={page.id} className="flex items-center gap-4 px-6 py-3.5 hover:bg-[#D4BCAA]/5 transition-colors">
                                <Link href={`/admin/pages/${page.id}/edit`} className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-[#F4EEE7] truncate">{page.title}</p>
                                    <p className="text-xs text-[#D4BCAA]/30 mt-0.5">
                                        /{page.slug} · {new Date(page.updatedAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                                    </p>
                                </Link>
                                <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full ${page.status === "PUBLISHED" ? "bg-green-500/10 text-green-400" : "bg-amber-500/10 text-amber-400"}`}>
                                    {page.status === "PUBLISHED" ? "Published" : "Draft"}
                                </span>
                                {page.status === "PUBLISHED" && (
                                    <a href={`/${page.slug}`} target="_blank" rel="noreferrer" className="p-1.5 text-[#D4BCAA]/30 hover:text-[#466A68] transition-colors">
                                        <Eye className="h-4 w-4" />
                                    </a>
                                )}
                                <button
                                    onClick={() => handleDelete(page.id, page.title)}
                                    disabled={deleting === page.id}
                                    className="p-1.5 text-[#D4BCAA]/30 hover:text-red-400 transition-colors disabled:opacity-50"
                                >
                                    {deleting === page.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
