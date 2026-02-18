"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import {
    Loader2, Search, BarChart3, TrendingUp, TrendingDown,
    AlertTriangle, CheckCircle, XCircle, RefreshCw, Filter,
} from "lucide-react"

type PostScore = {
    id: string
    title: string
    slug: string
    publishedAt: string | null
    score: number
    passCount: number
    totalChecks: number
    issues: string[]
}

type ScanStats = {
    total: number
    avgScore: number
    good: number
    needsWork: number
    poor: number
}

export default function SeoDashboardPage() {
    const [posts, setPosts] = useState<PostScore[]>([])
    const [stats, setStats] = useState<ScanStats | null>(null)
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState("")
    const [filter, setFilter] = useState<"all" | "good" | "warn" | "poor">("all")

    const fetchScan = useCallback(async () => {
        setLoading(true)
        try {
            const res = await fetch("/api/admin/seo/scan")
            const data = await res.json()
            if (data.success) {
                setPosts(data.data.posts)
                setStats(data.data.stats)
            }
        } catch (err) {
            console.error(err)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchScan()
    }, [fetchScan])

    const filtered = posts.filter((p) => {
        if (search && !p.title.toLowerCase().includes(search.toLowerCase())) return false
        if (filter === "good" && p.score < 71) return false
        if (filter === "warn" && (p.score < 41 || p.score >= 71)) return false
        if (filter === "poor" && p.score >= 41) return false
        return true
    })

    const scoreColor = (s: number) => s >= 71 ? "text-green-400" : s >= 41 ? "text-amber-400" : "text-red-400"
    const scoreBg = (s: number) => s >= 71 ? "bg-green-500/10" : s >= 41 ? "bg-amber-500/10" : "bg-red-500/10"

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-[#F4EEE7]">SEO Dashboard</h1>
                    <p className="text-[#D4BCAA]/50 text-sm mt-1">Analisis kesehatan SEO semua artikel</p>
                </div>
                <button onClick={fetchScan} disabled={loading} className="flex items-center gap-2 px-4 py-2 bg-[#2a2018] border border-[#D4BCAA]/10 text-[#D4BCAA]/70 text-sm rounded-lg hover:text-[#F4EEE7] transition-colors">
                    <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                    Scan Ulang
                </button>
            </div>

            {/* Stats Cards */}
            {stats && (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    <div className="bg-[#2a2018] border border-[#D4BCAA]/10 rounded-xl p-4">
                        <div className="flex items-center gap-2 text-[#D4BCAA]/40 mb-1">
                            <BarChart3 className="h-3.5 w-3.5" />
                            <span className="text-[10px] uppercase tracking-wider">Total</span>
                        </div>
                        <p className="text-xl font-bold text-[#F4EEE7]">{stats.total}</p>
                    </div>
                    <div className="bg-[#2a2018] border border-[#D4BCAA]/10 rounded-xl p-4">
                        <div className="flex items-center gap-2 text-[#D4BCAA]/40 mb-1">
                            <TrendingUp className="h-3.5 w-3.5" />
                            <span className="text-[10px] uppercase tracking-wider">Rata-rata</span>
                        </div>
                        <p className={`text-xl font-bold ${scoreColor(stats.avgScore)}`}>{stats.avgScore}</p>
                    </div>
                    <div className="bg-[#2a2018] border border-[#D4BCAA]/10 rounded-xl p-4 cursor-pointer hover:border-green-500/20 transition-colors" onClick={() => setFilter(filter === "good" ? "all" : "good")}>
                        <div className="flex items-center gap-2 text-green-400/60 mb-1">
                            <CheckCircle className="h-3.5 w-3.5" />
                            <span className="text-[10px] uppercase tracking-wider">Bagus</span>
                        </div>
                        <p className="text-xl font-bold text-green-400">{stats.good}</p>
                    </div>
                    <div className="bg-[#2a2018] border border-[#D4BCAA]/10 rounded-xl p-4 cursor-pointer hover:border-amber-500/20 transition-colors" onClick={() => setFilter(filter === "warn" ? "all" : "warn")}>
                        <div className="flex items-center gap-2 text-amber-400/60 mb-1">
                            <AlertTriangle className="h-3.5 w-3.5" />
                            <span className="text-[10px] uppercase tracking-wider">Perlu Perbaikan</span>
                        </div>
                        <p className="text-xl font-bold text-amber-400">{stats.needsWork}</p>
                    </div>
                    <div className="bg-[#2a2018] border border-[#D4BCAA]/10 rounded-xl p-4 cursor-pointer hover:border-red-500/20 transition-colors" onClick={() => setFilter(filter === "poor" ? "all" : "poor")}>
                        <div className="flex items-center gap-2 text-red-400/60 mb-1">
                            <TrendingDown className="h-3.5 w-3.5" />
                            <span className="text-[10px] uppercase tracking-wider">Rendah</span>
                        </div>
                        <p className="text-xl font-bold text-red-400">{stats.poor}</p>
                    </div>
                </div>
            )}

            {/* Search & Filter */}
            <div className="flex items-center gap-3">
                <div className="flex-1 flex items-center gap-2 px-4 py-2.5 bg-[#2a2018] border border-[#D4BCAA]/10 rounded-lg">
                    <Search className="h-4 w-4 text-[#D4BCAA]/30" />
                    <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari artikel..." className="bg-transparent text-sm text-[#F4EEE7] placeholder-[#D4BCAA]/25 outline-none w-full" />
                </div>
                <div className="flex items-center gap-1 px-2 py-1 bg-[#2a2018] border border-[#D4BCAA]/10 rounded-lg">
                    <Filter className="h-3.5 w-3.5 text-[#D4BCAA]/30" />
                    {(["all", "good", "warn", "poor"] as const).map((f) => (
                        <button key={f} onClick={() => setFilter(f)} className={`px-2 py-1 text-[10px] font-medium rounded transition-colors ${filter === f ? "bg-[#466A68]/20 text-[#466A68]" : "text-[#D4BCAA]/30 hover:text-[#D4BCAA]/60"}`}>
                            {f === "all" ? "Semua" : f === "good" ? "Bagus" : f === "warn" ? "Perlu" : "Rendah"}
                        </button>
                    ))}
                </div>
            </div>

            {/* Posts List */}
            <div className="bg-[#2a2018] border border-[#D4BCAA]/10 rounded-xl overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center h-32"><Loader2 className="h-6 w-6 text-[#466A68] animate-spin" /></div>
                ) : filtered.length === 0 ? (
                    <div className="flex items-center justify-center h-32 text-[#D4BCAA]/30 text-sm">Tidak ada artikel ditemukan</div>
                ) : (
                    <div className="divide-y divide-[#D4BCAA]/5">
                        {filtered.map((post) => (
                            <div key={post.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-[#D4BCAA]/3 transition-colors">
                                {/* Score badge */}
                                <div className={`w-10 h-10 rounded-lg ${scoreBg(post.score)} flex items-center justify-center flex-shrink-0`}>
                                    <span className={`text-sm font-bold tabular-nums ${scoreColor(post.score)}`}>{post.score}</span>
                                </div>

                                {/* Title & issues */}
                                <div className="flex-1 min-w-0">
                                    <Link href={`/admin/posts/${post.id}/edit`} className="text-sm font-medium text-[#F4EEE7] hover:text-[#466A68] transition-colors truncate block">
                                        {post.title}
                                    </Link>
                                    {post.issues.length > 0 && (
                                        <p className="text-[10px] text-[#D4BCAA]/30 mt-0.5 truncate">
                                            {post.issues.join(" · ")}
                                        </p>
                                    )}
                                </div>

                                {/* Check count */}
                                <span className="text-[10px] text-[#D4BCAA]/25 flex-shrink-0 tabular-nums">
                                    {post.passCount}/{post.totalChecks}
                                </span>

                                {/* Edit link */}
                                <Link href={`/admin/posts/${post.id}/edit`} className="text-[10px] text-[#466A68]/60 hover:text-[#466A68] transition-colors flex-shrink-0">
                                    Edit
                                </Link>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
