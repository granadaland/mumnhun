"use client"

import Link from "next/link"
import {
    Bot, Sparkles, FileText, Link as LinkIcon, Globe, MessageSquare,
    ArrowRight, Zap, Key,
} from "lucide-react"

const aiFeatures = [
    {
        href: "/admin/ai/generate",
        icon: <Sparkles className="h-6 w-6" />,
        title: "Generate Artikel",
        description: "Buat artikel lengkap dengan AI berdasarkan topik, keyword, dan tone yang diinginkan.",
        color: "from-violet-600 to-purple-700",
        status: "coming-soon",
    },
    {
        href: "/admin/ai/rewrite",
        icon: <FileText className="h-6 w-6" />,
        title: "Rewrite Artikel",
        description: "Tulis ulang dan tingkatkan kualitas artikel yang sudah ada menggunakan AI.",
        color: "from-blue-600 to-indigo-700",
        status: "coming-soon",
    },
    {
        href: "/admin/ai/internal-links",
        icon: <LinkIcon className="h-6 w-6" />,
        title: "Internal Links",
        description: "Analisis dan tambahkan internal link secara otomatis untuk meningkatkan SEO.",
        color: "from-emerald-600 to-teal-700",
        status: "coming-soon",
    },
    {
        href: "/admin/ai/scanner",
        icon: <Globe className="h-6 w-6" />,
        title: "Website Scanner",
        description: "Scan seluruh website untuk menemukan masalah SEO, broken links, dan peluang perbaikan.",
        color: "from-amber-600 to-orange-700",
        status: "coming-soon",
    },
    {
        href: "/admin/chat",
        icon: <MessageSquare className="h-6 w-6" />,
        title: "AI Chat",
        description: "Chat dengan AI assistant untuk bantuan menulis, riset, dan strategi konten.",
        color: "from-pink-600 to-rose-700",
        status: "coming-soon",
    },
]

export default function AiDashboardPage() {
    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-900/40 via-[#2a2018] to-[#2a2018] border border-violet-500/20 p-8">
                <div className="absolute top-0 right-0 w-64 h-64 bg-violet-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                <div className="relative">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-violet-500/20">
                            <Bot className="h-6 w-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-[#F4EEE7]">AI Tools</h1>
                            <p className="text-violet-300/60 text-sm">Powered by Google Gemini</p>
                        </div>
                    </div>
                    <p className="text-[#D4BCAA]/60 text-sm max-w-xl mt-2">
                        Suite lengkap tools AI untuk membuat, mengoptimasi, dan mengelola konten website Anda secara otomatis.
                    </p>
                </div>
            </div>

            {/* Setup Reminder */}
            <Link
                href="/admin/settings/ai"
                className="flex items-center gap-4 bg-[#2a2018] border border-[#D4BCAA]/10 rounded-xl p-5 hover:border-[#466A68]/30 transition-all group"
            >
                <div className="w-10 h-10 bg-[#466A68]/15 rounded-lg flex items-center justify-center text-[#466A68]">
                    <Key className="h-5 w-5" />
                </div>
                <div className="flex-1">
                    <p className="text-sm font-medium text-[#F4EEE7]">Konfigurasi API Key</p>
                    <p className="text-xs text-[#D4BCAA]/40 mt-0.5">Pastikan API key Gemini sudah dikonfigurasi sebelum menggunakan fitur AI</p>
                </div>
                <ArrowRight className="h-4 w-4 text-[#D4BCAA]/30 group-hover:text-[#466A68] transition-colors" />
            </Link>

            {/* Feature Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                {aiFeatures.map((feature) => (
                    <Link
                        key={feature.href}
                        href={feature.href}
                        className="group relative bg-[#2a2018] border border-[#D4BCAA]/10 rounded-xl p-6 hover:border-[#D4BCAA]/20 transition-all duration-300 overflow-hidden"
                    >
                        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-white/[0.02] to-transparent rounded-bl-full" />
                        <div className={`w-12 h-12 bg-gradient-to-br ${feature.color} rounded-xl flex items-center justify-center text-white mb-4 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                            {feature.icon}
                        </div>
                        <h3 className="text-base font-semibold text-[#F4EEE7] mb-1.5">{feature.title}</h3>
                        <p className="text-xs text-[#D4BCAA]/50 leading-relaxed mb-4">{feature.description}</p>
                        <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-semibold bg-amber-500/10 text-amber-400 rounded-full">
                                <Zap className="h-3 w-3" />
                                Coming Soon
                            </span>
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    )
}
