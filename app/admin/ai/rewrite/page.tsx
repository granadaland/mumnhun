"use client"

import { FileText, ArrowLeft, RefreshCw, Languages, BarChart3 } from "lucide-react"
import Link from "next/link"

export default function AiRewritePage() {
    return (
        <div className="space-y-6">
            <Link href="/admin/ai" className="inline-flex items-center gap-2 text-sm text-[#D4BCAA]/50 hover:text-[#F4EEE7] transition-colors">
                <ArrowLeft className="h-4 w-4" /> Kembali ke AI Tools
            </Link>

            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-900/30 via-[#2a2018] to-[#2a2018] border border-blue-500/15 p-10 text-center">
                <div className="relative">
                    <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-blue-500/20">
                        <FileText className="h-10 w-10 text-white" />
                    </div>
                    <h1 className="text-3xl font-bold text-[#F4EEE7] mb-3">Rewrite Artikel dengan AI</h1>
                    <p className="text-[#D4BCAA]/50 text-sm max-w-md mx-auto mb-8">
                        Tingkatkan kualitas artikel Anda. AI akan menulis ulang dengan gaya yang lebih baik, SEO-friendly, dan engaging.
                    </p>
                    <span className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-amber-500/10 text-amber-400 rounded-full border border-amber-500/20">
                        🚀 Coming Soon — Phase 4
                    </span>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                    { icon: <RefreshCw className="h-5 w-5" />, title: "Smart Rewrite", desc: "Tulis ulang dengan mempertahankan makna asli" },
                    { icon: <Languages className="h-5 w-5" />, title: "Tone Adjuster", desc: "Ubah tone: formal, casual, persuasive, informative" },
                    { icon: <BarChart3 className="h-5 w-5" />, title: "SEO Boost", desc: "Optimalkan keyword density dan readability" },
                ].map((f) => (
                    <div key={f.title} className="bg-[#2a2018] border border-[#D4BCAA]/10 rounded-xl p-5">
                        <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center text-blue-400 mb-3">{f.icon}</div>
                        <h3 className="text-sm font-semibold text-[#F4EEE7] mb-1">{f.title}</h3>
                        <p className="text-xs text-[#D4BCAA]/40">{f.desc}</p>
                    </div>
                ))}
            </div>
        </div>
    )
}
