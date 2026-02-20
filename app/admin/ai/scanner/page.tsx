"use client"

import { useState } from "react"
import { ArrowLeft, BarChart3, Loader2, AlertTriangle, AlertCircle, CheckCircle, Search, ExternalLink } from "lucide-react"
import Link from "next/link"
import { adminPost } from "@/lib/api/admin-client"

type ScannerResult = {
    metrics: {
        totalPosts: number
        averageScore: number
        breakdown: { good: number, warning: number, poor: number }
        commonIssues: Array<{ label: string, count: number }>
    }
    posts: Array<{
        id: string
        title: string
        slug: string
        score: number
        checks: Array<{ id: string, label: string, status: string, message: string }>
    }>
}

export default function AiScannerPage() {
    const [scanning, setScanning] = useState(false)
    const [result, setResult] = useState<ScannerResult | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [searchQuery, setSearchQuery] = useState("")

    const handleScan = async () => {
        setScanning(true)
        setError(null)

        try {
            const res: any = await adminPost("/api/admin/ai/scanner", { body: {} })
            if (res.success && res.data) {
                setResult(res.data)
            } else {
                setError(res.error || "Gagal melakukan pemindaian massal.")
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : String(err))
        } finally {
            setScanning(false)
        }
    }

    const filteredPosts = result?.posts.filter(p =>
        p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.slug.toLowerCase().includes(searchQuery.toLowerCase())
    ) || []

    return (
        <div className="space-y-6 max-w-6xl mx-auto">
            <div className="flex items-center justify-between">
                <Link href="/admin/ai" className="inline-flex items-center gap-2 text-sm text-[#8C7A6B]/50 hover:text-[#0F0A09] transition-colors">
                    <ArrowLeft className="h-4 w-4" /> Kembali
                </Link>
                <div className="flex gap-4">
                    <button
                        onClick={handleScan}
                        disabled={scanning}
                        className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-all custom-focus shadow-md shadow-indigo-500/20"
                    >
                        {scanning ? (
                            <><Loader2 className="h-4 w-4 animate-spin" /> Menganalisis Semua Artikel...</>
                        ) : (
                            <><BarChart3 className="h-4 w-4" /> {result ? "Scan Ulang" : "Mulai Scan Website"}</>
                        )}
                    </button>
                </div>
            </div>

            {!result && !scanning && !error && (
                <div className="bg-white border border-[#D4BCAA]/20 rounded-xl p-12 text-center shadow-sm">
                    <div className="w-20 h-20 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
                        <BarChart3 className="h-10 w-10 text-indigo-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-[#0F0A09] mb-3">SEO Health Scanner</h2>
                    <p className="text-[#8C7A6B]/70 max-w-lg mx-auto mb-8">
                        Lakukan audit masal pada seluruh artikel Anda yang sudah Publish untuk menemukan celah SEO,
                        masalah optimasi keyword, dan meta tag yang hilang dengan cepat tanpa menghabiskan API key AI.
                    </p>
                    <button
                        onClick={handleScan}
                        className="inline-flex items-center gap-2 px-8 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-all shadow-md shadow-indigo-500/20"
                    >
                        Mulai Scan Semua Artikel Sekarang
                    </button>
                </div>
            )}

            {error && (
                <div className="p-4 bg-red-50 text-red-600 border border-red-100 rounded-xl shadow-sm text-sm">
                    {error}
                </div>
            )}

            {scanning && (
                <div className="bg-white border border-[#D4BCAA]/20 rounded-xl p-12 text-center shadow-sm flex flex-col items-center">
                    <Loader2 className="h-12 w-12 text-indigo-500 animate-spin mb-4" />
                    <h3 className="text-xl font-bold text-[#0F0A09] mb-2">Memeriksa Semua Artikel...</h3>
                    <p className="text-sm text-[#8C7A6B]/60">Ini biasanya memakan waktu beberapa detik.</p>
                </div>
            )}

            {result && !scanning && (
                <>
                    {/* Dashboard Metrics */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-white border border-[#D4BCAA]/20 rounded-xl p-5 shadow-sm">
                            <p className="text-xs font-semibold text-[#8C7A6B]/60 uppercase tracking-widest mb-1">Skor Keseluruhan</p>
                            <div className="flex items-end gap-2">
                                <span className={`text-4xl font-bold tabular-nums ${result.metrics.averageScore >= 71 ? "text-emerald-600" :
                                    result.metrics.averageScore >= 41 ? "text-amber-500" : "text-red-500"
                                    }`}>{result.metrics.averageScore}</span>
                                <span className="text-sm text-[#8C7A6B] mb-1">/ 100</span>
                            </div>
                        </div>

                        <div className="bg-white border border-emerald-500/20 rounded-xl p-5 shadow-sm flex flex-col justify-between">
                            <div className="flex items-center gap-2 text-emerald-600">
                                <CheckCircle className="h-5 w-5" />
                                <h3 className="font-semibold">Skor Bagus (&ge;71)</h3>
                            </div>
                            <div className="text-3xl font-bold text-emerald-700">{result.metrics.breakdown.good} <span className="text-sm font-normal text-emerald-600/60">artikel</span></div>
                        </div>

                        <div className="bg-white border border-amber-500/30 rounded-xl p-5 shadow-sm flex flex-col justify-between">
                            <div className="flex items-center gap-2 text-amber-600">
                                <AlertTriangle className="h-5 w-5" />
                                <h3 className="font-semibold">Perlu Perbaikan (41-70)</h3>
                            </div>
                            <div className="text-3xl font-bold text-amber-700">{result.metrics.breakdown.warning} <span className="text-sm font-normal text-amber-600/60">artikel</span></div>
                        </div>

                        <div className="bg-white border border-red-500/20 rounded-xl p-5 shadow-sm flex flex-col justify-between">
                            <div className="flex items-center gap-2 text-red-600">
                                <AlertCircle className="h-5 w-5" />
                                <h3 className="font-semibold">Sangat Rendah (&lt;41)</h3>
                            </div>
                            <div className="text-3xl font-bold text-red-700">{result.metrics.breakdown.poor} <span className="text-sm font-normal text-red-600/60">artikel</span></div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 align-top">

                        {/* Issues Leaderboard */}
                        <div className="bg-white border border-[#D4BCAA]/20 rounded-xl p-5 shadow-sm lg:col-span-1 min-h-[300px]">
                            <h3 className="text-base font-bold text-[#0F0A09] mb-4 border-b border-[#D4BCAA]/20 pb-3">Peringatan Terbanyak</h3>
                            {result.metrics.commonIssues.length > 0 ? (
                                <ul className="space-y-4">
                                    {result.metrics.commonIssues.map((issue, idx) => (
                                        <li key={idx} className="flex justify-between items-center text-sm">
                                            <span className="text-[#0F0A09]/80 font-medium truncate pr-2" title={issue.label}>{issue.label}</span>
                                            <span className="flex-shrink-0 bg-red-50 text-red-600 px-2.5 py-0.5 rounded-full text-xs font-semibold">{issue.count} peringatan</span>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-sm text-[#8C7A6B]/50 text-center py-8">Semua artikel terlihat sempurna! 🎉</p>
                            )}
                        </div>

                        {/* Posts List */}
                        <div className="bg-white border border-[#D4BCAA]/20 rounded-xl shadow-sm lg:col-span-2 overflow-hidden flex flex-col h-[700px]">
                            <div className="p-4 border-b border-[#D4BCAA]/20 flex flex-col sm:flex-row justify-between items-center gap-4 bg-[#FAF9F7]">
                                <h3 className="text-base font-bold text-[#0F0A09]">Daftar Artikel (Urut Terburuk)</h3>
                                <div className="flex items-center gap-2 bg-white border border-[#D4BCAA]/30 rounded-lg px-3 py-2 w-full sm:w-64">
                                    <Search className="h-4 w-4 text-[#8C7A6B]/50" />
                                    <input
                                        type="text"
                                        placeholder="Cari artikel..."
                                        value={searchQuery}
                                        onChange={e => setSearchQuery(e.target.value)}
                                        className="bg-transparent text-sm text-[#0F0A09] w-full outline-none placeholder-[#8C7A6B]/50"
                                    />
                                </div>
                            </div>

                            <div className="overflow-y-auto flex-1 p-4 space-y-3">
                                {filteredPosts.map(post => {
                                    const scoreColor = post.score >= 71 ? "text-emerald-600 bg-emerald-50 border-emerald-200" :
                                        post.score >= 41 ? "text-amber-600 bg-amber-50 border-amber-200" :
                                            "text-red-600 bg-red-50 border-red-200"

                                    const fails = post.checks.filter(c => c.status === "fail")
                                    const warns = post.checks.filter(c => c.status === "warn")

                                    return (
                                        <div key={post.id} className="border border-[#D4BCAA]/20 rounded-xl p-4 hover:border-indigo-500/30 transition-colors flex flex-col sm:flex-row gap-4 justify-between group">
                                            <div className="flex-1 min-w-0">
                                                <h4 className="font-semibold text-[#0F0A09] truncate text-base mb-1" title={post.title}>{post.title}</h4>
                                                <div className="flex flex-wrap gap-2 text-xs">
                                                    {fails.length > 0 && <span className="text-red-500 font-medium">{fails.length} Error</span>}
                                                    {warns.length > 0 && <span className="text-amber-500 font-medium">{warns.length} Warning</span>}
                                                    {fails.length === 0 && warns.length === 0 && <span className="text-emerald-500">Perfect SEO</span>}
                                                </div>

                                                {/* Show first 2 fails as hint */}
                                                {fails.length > 0 && (
                                                    <div className="mt-2.5 space-y-1">
                                                        {fails.slice(0, 2).map((fail, i) => (
                                                            <div key={i} className="text-[11px] text-[#8C7A6B]/80 flex gap-1.5 items-start">
                                                                <XCircle className="h-3.5 w-3.5 text-red-400 shrink-0" />
                                                                <span className="truncate">{fail.message}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>

                                            <div className="flex items-center gap-4 sm:flex-col sm:items-end justify-between sm:justify-center">
                                                <div className={`px-4 py-2 rounded-lg border font-bold text-xl tabular-nums ${scoreColor}`}>
                                                    {post.score}
                                                </div>
                                                <Link
                                                    href={`/admin/posts/${post.id}/edit`}
                                                    className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-800 transition-colors sm:opacity-0 group-hover:opacity-100"
                                                    target="_blank"
                                                >
                                                    Edit & Fix <ExternalLink className="h-3 w-3" />
                                                </Link>
                                            </div>
                                        </div>
                                    )
                                })}

                                {filteredPosts.length === 0 && (
                                    <div className="text-center py-10 text-[#8C7A6B]/50 text-sm">
                                        Tidak ada artikel ditemukan.
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    )
}

function XCircle(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <circle cx="12" cy="12" r="10" />
            <path d="m15 9-6 6" />
            <path d="m9 9 6 6" />
        </svg>
    )
}
