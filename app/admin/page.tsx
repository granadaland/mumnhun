import prisma from "@/lib/db/prisma"
import { getSetting } from "@/lib/settings"
import {
    FileText, FolderOpen, Tags, TrendingUp, Clock,
    PenTool, BarChart3, Sparkles, MessageSquare, Settings, ArrowRight,
    CheckCircle2, AlertTriangle, XCircle,
} from "lucide-react"
import Link from "next/link"

async function getStats() {
    const [postCount, draftCount, categoryCount, tagCount, scheduledCount, pageCount, mediaCount] = await Promise.all([
        prisma.post.count({ where: { status: "PUBLISHED" } }),
        prisma.post.count({ where: { status: "DRAFT" } }),
        prisma.category.count(),
        prisma.tag.count(),
        prisma.post.count({ where: { status: "SCHEDULED" } }),
        prisma.page.count(),
        prisma.media.count(),
    ])

    const recentPosts = await prisma.post.findMany({
        orderBy: { updatedAt: "desc" },
        take: 6,
        select: {
            id: true,
            title: true,
            slug: true,
            status: true,
            publishedAt: true,
            updatedAt: true,
        },
    })

    return { postCount, draftCount, categoryCount, tagCount, scheduledCount, pageCount, mediaCount, recentPosts }
}

function getGreeting() {
    const hour = new Date().getHours()
    if (hour < 12) return "Selamat Pagi"
    if (hour < 15) return "Selamat Siang"
    if (hour < 18) return "Selamat Sore"
    return "Selamat Malam"
}

export default async function AdminDashboard() {
    const stats = await getStats()
    const siteName = await getSetting("site_name")
    const greeting = getGreeting()

    const statCards = [
        {
            label: "Published",
            value: stats.postCount,
            icon: <FileText className="h-5 w-5" />,
            gradient: "from-emerald-500 to-teal-600",
            bg: "bg-emerald-500/8",
            text: "text-emerald-400",
            href: "/admin/posts?status=PUBLISHED",
        },
        {
            label: "Draft",
            value: stats.draftCount,
            icon: <Clock className="h-5 w-5" />,
            gradient: "from-amber-500 to-orange-600",
            bg: "bg-amber-500/8",
            text: "text-amber-400",
            href: "/admin/posts?status=DRAFT",
        },
        {
            label: "Scheduled",
            value: stats.scheduledCount,
            icon: <TrendingUp className="h-5 w-5" />,
            gradient: "from-blue-500 to-indigo-600",
            bg: "bg-blue-500/8",
            text: "text-blue-400",
            href: "/admin/posts?status=SCHEDULED",
        },
        {
            label: "Kategori",
            value: stats.categoryCount,
            icon: <FolderOpen className="h-5 w-5" />,
            gradient: "from-purple-500 to-violet-600",
            bg: "bg-purple-500/8",
            text: "text-purple-400",
            href: "/admin/categories",
        },
        {
            label: "Tag",
            value: stats.tagCount,
            icon: <Tags className="h-5 w-5" />,
            gradient: "from-pink-500 to-rose-600",
            bg: "bg-pink-500/8",
            text: "text-pink-400",
            href: "/admin/tags",
        },
    ]

    const quickActions = [
        { label: "Tulis Artikel", href: "/admin/posts/new", icon: <PenTool className="h-5 w-5" />, color: "from-[#466A68] to-[#3a5856]" },
        { label: "SEO Dashboard", href: "/admin/seo", icon: <BarChart3 className="h-5 w-5" />, color: "from-emerald-600 to-teal-700" },
        { label: "AI Tools", href: "/admin/ai", icon: <Sparkles className="h-5 w-5" />, color: "from-violet-600 to-purple-700" },
        { label: "AI Chat", href: "/admin/chat", icon: <MessageSquare className="h-5 w-5" />, color: "from-pink-600 to-rose-700" },
        { label: "Pengaturan", href: "/admin/settings", icon: <Settings className="h-5 w-5" />, color: "from-slate-600 to-gray-700" },
    ]

    const statusBadge = (status: string) => {
        switch (status) {
            case "PUBLISHED":
                return (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 rounded-full">
                        <CheckCircle2 className="h-3 w-3" /> Live
                    </span>
                )
            case "SCHEDULED":
                return (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold bg-blue-500/10 text-blue-400 rounded-full">
                        <Clock className="h-3 w-3" /> Scheduled
                    </span>
                )
            case "DRAFT":
                return (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold bg-amber-500/10 text-amber-400 rounded-full">
                        <AlertTriangle className="h-3 w-3" /> Draft
                    </span>
                )
            default:
                return (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold bg-[#D4BCAA]/10 text-[#D4BCAA]/50 rounded-full">
                        <XCircle className="h-3 w-3" /> {status}
                    </span>
                )
        }
    }

    const formatRelativeTime = (date: Date) => {
        const now = new Date()
        const diff = now.getTime() - date.getTime()
        const minutes = Math.floor(diff / 60000)
        if (minutes < 1) return "Baru saja"
        if (minutes < 60) return `${minutes} menit lalu`
        const hours = Math.floor(minutes / 60)
        if (hours < 24) return `${hours} jam lalu`
        const days = Math.floor(hours / 24)
        if (days < 7) return `${days} hari lalu`
        return date.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })
    }

    return (
        <div className="space-y-8">
            {/* Welcome Banner */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#466A68]/20 via-[#2a2018] to-[#2a2018] border border-[#466A68]/20 p-8">
                <div className="absolute top-0 right-0 w-80 h-80 bg-[#466A68]/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
                <div className="absolute bottom-0 left-1/3 w-40 h-40 bg-[#D4BCAA]/3 rounded-full blur-3xl translate-y-1/2" />
                <div className="relative">
                    <p className="text-[#466A68] text-sm font-medium mb-1">{greeting} 👋</p>
                    <h1 className="text-2xl lg:text-3xl font-bold text-[#F4EEE7] mb-2">
                        {siteName || "Mum 'n Hun"} Dashboard
                    </h1>
                    <p className="text-[#D4BCAA]/50 text-sm">
                        {stats.postCount} artikel published · {stats.draftCount} draft · {stats.pageCount} halaman · {stats.mediaCount} media
                    </p>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {statCards.map((card) => (
                    <Link
                        key={card.label}
                        href={card.href}
                        className="group relative bg-[#2a2018] border border-[#D4BCAA]/8 rounded-xl p-5 hover:border-[#D4BCAA]/20 hover:shadow-lg hover:shadow-black/10 transition-all duration-300 overflow-hidden"
                    >
                        <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-white/[0.015] to-transparent rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        <div className={`w-10 h-10 ${card.bg} rounded-xl flex items-center justify-center ${card.text} mb-3 group-hover:scale-110 transition-transform duration-300`}>
                            {card.icon}
                        </div>
                        <p className="text-2xl font-bold text-[#F4EEE7] tabular-nums">{card.value}</p>
                        <p className="text-[11px] text-[#D4BCAA]/40 mt-0.5 font-medium">{card.label}</p>
                    </Link>
                ))}
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                {/* Recent Posts (2/3) */}
                <div className="xl:col-span-2 bg-[#2a2018] border border-[#D4BCAA]/8 rounded-xl overflow-hidden">
                    <div className="flex items-center justify-between px-6 py-4 border-b border-[#D4BCAA]/8">
                        <h2 className="font-semibold text-[#F4EEE7] text-sm">Artikel Terbaru</h2>
                        <Link href="/admin/posts" className="text-xs text-[#466A68] hover:text-[#466A68]/80 transition-colors flex items-center gap-1">
                            Semua <ArrowRight className="h-3 w-3" />
                        </Link>
                    </div>
                    <div className="divide-y divide-[#D4BCAA]/5">
                        {stats.recentPosts.map((post) => (
                            <Link
                                key={post.id}
                                href={`/admin/posts/${post.id}/edit`}
                                className="flex items-center justify-between px-6 py-3.5 hover:bg-[#D4BCAA]/3 transition-colors group"
                            >
                                <div className="min-w-0 flex-1 mr-3">
                                    <p className="text-sm text-[#F4EEE7] truncate group-hover:text-[#466A68] transition-colors">{post.title}</p>
                                    <p className="text-[11px] text-[#D4BCAA]/30 mt-0.5">{formatRelativeTime(post.updatedAt)}</p>
                                </div>
                                {statusBadge(post.status)}
                            </Link>
                        ))}
                        {stats.recentPosts.length === 0 && (
                            <div className="px-6 py-10 text-center">
                                <FileText className="h-8 w-8 text-[#D4BCAA]/15 mx-auto mb-2" />
                                <p className="text-[#D4BCAA]/30 text-sm">Belum ada artikel</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Quick Actions (1/3) */}
                <div className="space-y-3">
                    <h2 className="text-sm font-semibold text-[#D4BCAA]/50 px-1">Quick Actions</h2>
                    {quickActions.map((action) => (
                        <Link
                            key={action.label}
                            href={action.href}
                            className="flex items-center gap-3 bg-[#2a2018] border border-[#D4BCAA]/8 rounded-xl p-4 hover:border-[#D4BCAA]/20 hover:shadow-lg hover:shadow-black/10 transition-all duration-300 group"
                        >
                            <div className={`w-10 h-10 bg-gradient-to-br ${action.color} rounded-xl flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                                {action.icon}
                            </div>
                            <span className="text-sm text-[#D4BCAA]/70 font-medium group-hover:text-[#F4EEE7] transition-colors">{action.label}</span>
                            <ArrowRight className="h-4 w-4 text-[#D4BCAA]/15 ml-auto group-hover:text-[#D4BCAA]/40 group-hover:translate-x-1 transition-all" />
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    )
}
