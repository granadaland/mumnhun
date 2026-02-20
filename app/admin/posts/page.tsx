"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import {
    Plus, Search, FileText, Loader2, Trash2, Eye,
    ChevronLeft, ChevronRight, Filter,
} from "lucide-react"
import { AdminClientError, adminDelete, adminGet } from "@/lib/api/admin-client"

type Post = {
    id: string
    title: string
    slug: string
    status: string
    featuredImage: string | null
    publishedAt: string | null
    scheduledAt: string | null
    updatedAt: string
    readingTime: number | null
    categories: { category: { id: string; name: string; slug: string } }[]
    author: { id: string; name: string | null; email: string } | null
}

type Pagination = {
    page: number
    limit: number
    total: number
    totalPages: number
}

type ListPostsResponse = {
    success: boolean
    data: Post[]
    pagination: Pagination
}

function getClientErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof AdminClientError) return error.message
    if (error instanceof Error && error.message.trim().length > 0) return error.message
    return fallback
}

export default function PostsListPage() {
    const [posts, setPosts] = useState<Post[]>([])
    const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, totalPages: 0 })
    const [loading, setLoading] = useState(true)
    const [errorMessage, setErrorMessage] = useState<string | null>(null)
    const [search, setSearch] = useState("")
    const [statusFilter, setStatusFilter] = useState("")
    const [deleting, setDeleting] = useState<string | null>(null)

    const fetchPosts = useCallback(async (page = 1) => {
        setLoading(true)
        setErrorMessage(null)
        const params = new URLSearchParams({ page: String(page), limit: "20" })
        if (search) params.set("search", search)
        if (statusFilter) params.set("status", statusFilter)

        try {
            const data = await adminGet<ListPostsResponse>(`/api/admin/posts?${params.toString()}`)
            if (data.success) {
                setPosts(data.data)
                setPagination(data.pagination)
            }
        } catch (err) {
            const message = getClientErrorMessage(err, "Gagal memuat artikel")
            setErrorMessage(message)
            console.error("Failed to fetch posts:", err)
        } finally {
            setLoading(false)
        }
    }, [search, statusFilter])

    useEffect(() => {
        fetchPosts()
    }, [fetchPosts])

    const handleDelete = async (id: string, title: string) => {
        if (!confirm(`Hapus artikel "${title}"?`)) return
        setDeleting(id)
        setErrorMessage(null)
        try {
            await adminDelete<{ success: boolean }>(`/api/admin/posts/${id}`)
            await fetchPosts(pagination.page)
        } catch (err) {
            const message = getClientErrorMessage(err, "Gagal menghapus artikel")
            setErrorMessage(message)
            console.error("Failed to delete:", err)
        } finally {
            setDeleting(null)
        }
    }

    const statusBadge = (status: string) => {
        const styles: Record<string, string> = {
            PUBLISHED: "bg-green-500/10 text-green-600",
            DRAFT: "bg-amber-500/10 text-amber-600",
            SCHEDULED: "bg-blue-500/10 text-blue-600",
            ARCHIVED: "bg-gray-500/10 text-gray-400",
        }
        return styles[status] || styles.DRAFT
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-[#0F0A09]">Artikel</h1>
                    <p className="text-[#8C7A6B]/50 text-sm mt-1">
                        {pagination.total} artikel
                    </p>
                </div>
                <Link
                    href="/admin/posts/new"
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#466A68] to-[#3a5856] text-white text-sm font-medium rounded-lg hover:from-[#3a5856] hover:to-[#466A68] transition-all shadow-lg"
                >
                    <Plus className="h-4 w-4" />
                    Tulis Artikel
                </Link>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1 flex items-center gap-2 px-4 py-2.5 bg-white border border-[#D4BCAA]/20 rounded-lg">
                    <Search className="h-4 w-4 text-[#8C7A6B]/30" />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && fetchPosts()}
                        placeholder="Cari artikel..."
                        className="bg-transparent text-sm text-[#0F0A09] placeholder-[#8C7A6B]/60 outline-none w-full"
                    />
                </div>
                <div className="flex items-center gap-2 px-4 py-2.5 bg-white border border-[#D4BCAA]/20 rounded-lg">
                    <Filter className="h-4 w-4 text-[#8C7A6B]/30" />
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="bg-transparent text-sm text-[#0F0A09] outline-none"
                    >
                        <option value="" className="bg-white">Semua Status</option>
                        <option value="PUBLISHED" className="bg-white">Published</option>
                        <option value="DRAFT" className="bg-white">Draft</option>
                        <option value="SCHEDULED" className="bg-white">Scheduled</option>
                        <option value="ARCHIVED" className="bg-white">Archived</option>
                    </select>
                </div>
            </div>

            {errorMessage && (
                <div className="px-4 py-3 rounded-lg border border-red-500/20 bg-red-500/10 text-red-700 text-sm">
                    {errorMessage}
                </div>
            )}

            {/* Posts Table */}
            <div className="bg-white border border-[#D4BCAA]/20 rounded-xl overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center h-48">
                        <Loader2 className="h-6 w-6 text-[#466A68] animate-spin" />
                    </div>
                ) : posts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-48 text-[#8C7A6B]/30">
                        <FileText className="h-8 w-8 mb-2" />
                        <p className="text-sm">Belum ada artikel</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-[#D4BCAA]/20">
                                    <th className="text-left text-xs font-medium text-[#8C7A6B]/40 uppercase tracking-wider px-6 py-3">Judul</th>
                                    <th className="text-left text-xs font-medium text-[#8C7A6B]/40 uppercase tracking-wider px-4 py-3 hidden md:table-cell">Kategori</th>
                                    <th className="text-left text-xs font-medium text-[#8C7A6B]/40 uppercase tracking-wider px-4 py-3">Status</th>
                                    <th className="text-left text-xs font-medium text-[#8C7A6B]/40 uppercase tracking-wider px-4 py-3 hidden lg:table-cell">Diperbarui</th>
                                    <th className="text-right text-xs font-medium text-[#8C7A6B]/40 uppercase tracking-wider px-6 py-3">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#D4BCAA]/20">
                                {posts.map((post) => (
                                    <tr key={post.id} className="hover:bg-[#D4BCAA]/5 transition-colors">
                                        <td className="px-6 py-3.5">
                                            <Link href={`/admin/posts/${post.id}/edit`} className="block">
                                                <p className="text-sm text-[#0F0A09] font-medium truncate max-w-xs lg:max-w-md">
                                                    {post.title}
                                                </p>
                                                <p className="text-xs text-[#8C7A6B]/30 mt-0.5 truncate max-w-xs">
                                                    /{post.slug}
                                                </p>
                                            </Link>
                                        </td>
                                        <td className="px-4 py-3.5 hidden md:table-cell">
                                            <div className="flex flex-wrap gap-1">
                                                {post.categories.map((c) => (
                                                    <span key={c.category.id} className="px-2 py-0.5 text-[10px] font-medium bg-[#466A68]/10 text-[#466A68] rounded-full">
                                                        {c.category.name}
                                                    </span>
                                                ))}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3.5">
                                            <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full ${statusBadge(post.status)}`}>
                                                {post.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3.5 hidden lg:table-cell text-xs text-[#8C7A6B]/40">
                                            {new Date(post.updatedAt).toLocaleDateString("id-ID", {
                                                day: "numeric", month: "short", year: "numeric",
                                            })}
                                        </td>
                                        <td className="px-6 py-3.5">
                                            <div className="flex items-center justify-end gap-1">
                                                {post.status === "PUBLISHED" && (
                                                    <a
                                                        href={`/${post.slug}`}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="p-1.5 text-[#8C7A6B]/30 hover:text-[#466A68] transition-colors"
                                                        title="Lihat"
                                                    >
                                                        <Eye className="h-4 w-4" />
                                                    </a>
                                                )}
                                                <button
                                                    onClick={() => handleDelete(post.id, post.title)}
                                                    disabled={deleting === post.id}
                                                    className="p-1.5 text-[#8C7A6B]/30 hover:text-red-600 transition-colors disabled:opacity-50"
                                                    title="Hapus"
                                                >
                                                    {deleting === post.id ? (
                                                        <Loader2 className="h-4 w-4 animate-spin" />
                                                    ) : (
                                                        <Trash2 className="h-4 w-4" />
                                                    )}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Pagination */}
                {pagination.totalPages > 1 && (
                    <div className="flex items-center justify-between px-6 py-3 border-t border-[#D4BCAA]/20">
                        <p className="text-xs text-[#8C7A6B]/40">
                            Halaman {pagination.page} dari {pagination.totalPages}
                        </p>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => fetchPosts(pagination.page - 1)}
                                disabled={pagination.page <= 1}
                                className="p-1.5 text-[#8C7A6B]/30 hover:text-[#0F0A09] disabled:opacity-30 transition-colors"
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </button>
                            <button
                                onClick={() => fetchPosts(pagination.page + 1)}
                                disabled={pagination.page >= pagination.totalPages}
                                className="p-1.5 text-[#8C7A6B]/30 hover:text-[#0F0A09] disabled:opacity-30 transition-colors"
                            >
                                <ChevronRight className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
