"use client"

import { Link as LinkIcon, ArrowLeft, Search, TrendingUp, Network } from "lucide-react"
import Link from "next/link"

export default function AiInternalLinksPage() {
    return (
        <div className="space-y-6">
            <Link href="/admin/ai" className="inline-flex items-center gap-2 text-sm text-[#D4BCAA]/50 hover:text-[#F4EEE7] transition-colors">
                <ArrowLeft className="h-4 w-4" /> Kembali ke AI Tools
            </Link>

            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-900/30 via-[#2a2018] to-[#2a2018] border border-emerald-500/15 p-10 text-center">
                <div className="relative">
                    <div className="w-20 h-20 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-emerald-500/20">
                        <LinkIcon className="h-10 w-10 text-white" />
                    </div>
                    <h1 className="text-3xl font-bold text-[#F4EEE7] mb-3">AI Internal Link Builder</h1>
                    <p className="text-[#D4BCAA]/50 text-sm max-w-md mx-auto mb-8">
                        Analisis dan tambahkan internal link secara otomatis antara artikel terkait untuk meningkatkan SEO dan navigasi.
                    </p>
                    <span className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-amber-500/10 text-amber-400 rounded-full border border-amber-500/20">
                        🚀 Coming Soon — Phase 4
                    </span>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                    { icon: <Search className="h-5 w-5" />, title: "Auto Discovery", desc: "Temukan peluang internal link dari semua artikel" },
                    { icon: <Network className="h-5 w-5" />, title: "Link Map", desc: "Visualisasi hubungan antar artikel berbentuk grafik" },
                    { icon: <TrendingUp className="h-5 w-5" />, title: "SEO Impact", desc: "Tingkatkan distribusi link equity secara merata" },
                ].map((f) => (
                    <div key={f.title} className="bg-[#2a2018] border border-[#D4BCAA]/10 rounded-xl p-5">
                        <div className="w-10 h-10 bg-emerald-500/10 rounded-lg flex items-center justify-center text-emerald-400 mb-3">{f.icon}</div>
                        <h3 className="text-sm font-semibold text-[#F4EEE7] mb-1">{f.title}</h3>
                        <p className="text-xs text-[#D4BCAA]/40">{f.desc}</p>
                    </div>
                ))}
            </div>
        </div>
    )
}
