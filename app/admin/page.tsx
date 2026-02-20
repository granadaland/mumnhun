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
            bg: "bg-emerald-100",
            text: "text-emerald-600",
            href: "/admin/posts?status=PUBLISHED",
        },
        {
            label: "Draft",
            value: stats.draftCount,
            icon: <Clock className="h-5 w-5" />,
            bg: "bg-amber-100",
            text: "text-amber-600",
            href: "/admin/posts?status=DRAFT",
        },
        {
            label: "Scheduled",
            value: stats.scheduledCount,
            icon: <TrendingUp className="h-5 w-5" />,
            bg: "bg-blue-100",
            text: "text-blue-600",
            href: "/admin/posts?status=SCHEDULED",
        },
        {
            label: "Kategori",
            value: stats.categoryCount,
            icon: <FolderOpen className="h-5 w-5" />,
            bg: "bg-purple-100",
            text: "text-purple-600",
            href: "/admin/categories",
        },
        {
            label: "Tag",
            value: stats.tagCount,
            icon: <Tags className="h-5 w-5" />,
            bg: "bg-pink-100",
            text: "text-pink-600",
            href: "/admin/tags",
        },
    ]

    const quickActions = [
        { label: "Tulis Artikel", href: "/admin/posts/new", icon: <PenTool className="h-5 w-5" />, color: "bg-emerald-500 shadow-emerald-500/20" },
        { label: "SEO Dashboard", href: "/admin/seo", icon: <BarChart3 className="h-5 w-5" />, color: "bg-blue-500 shadow-blue-500/20" },
        { label: "AI Tools", href: "/admin/ai", icon: <Sparkles className="h-5 w-5" />, color: "bg-purple-500 shadow-purple-500/20" },
        { label: "AI Chat", href: "/admin/chat", icon: <MessageSquare className="h-5 w-5" />, color: "bg-[#466A68] shadow-[#466A68]/20" },
        { label: "Pengaturan", href: "/admin/settings", icon: <Settings className="h-5 w-5" />, color: "bg-stone-500 shadow-stone-500/20" },
    ]

    const statusBadge = (status: string) => {
        switch (status) {
            case "PUBLISHED":
                return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] uppercase font-bold bg-emerald-100 text-emerald-700 rounded-md border border-emerald-200">
                        <CheckCircle2 className="h-3 w-3" /> Live
                    </span>
                )
            case "SCHEDULED":
                return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] uppercase font-bold bg-blue-100 text-blue-700 rounded-md border border-blue-200">
                        <Clock className="h-3 w-3" /> Scheduled
                    </span>
                )
            case "DRAFT":
                return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] uppercase font-bold bg-amber-100 text-amber-700 rounded-md border border-amber-200">
                        <AlertTriangle className="h-3 w-3" /> Draft
                    </span>
                )
            default:
                return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] uppercase font-bold bg-stone-100 text-stone-600 rounded-md border border-stone-200">
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
            <div className="relative overflow-hidden rounded-2xl bg-white border border-[#D4BCAA]/20 p-8 shadow-sm">
                <div className="relative z-10">
                    <p className="text-[#466A68] text-sm font-bold tracking-widest uppercase mb-1 drop-shadow-sm">{greeting} 👋</p>
                    <h1 className="text-3xl lg:text-4xl font-extrabold text-[#0F0A09] mb-3 tracking-tight">
                        {siteName || "Mum 'n Hun"} Dashboard
                    </h1>
                    <p className="text-[#8C7A6B] text-sm font-medium">
                        <span className="text-[#0F0A09] font-bold">{stats.postCount}</span> artikel published · <span className="text-[#0F0A09] font-bold">{stats.draftCount}</span> draft · <span className="text-[#0F0A09] font-bold">{stats.pageCount}</span> halaman · <span className="text-[#0F0A09] font-bold">{stats.mediaCount}</span> media
                    </p>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                {statCards.map((card) => (
                    <Link
                        key={card.label}
                        href={card.href}
                        className="group relative bg-white border border-[#D4BCAA]/20 hover:border-[#466A68]/40 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden"
                    >
                        <div className={`w-11 h-11 ${card.bg} rounded-xl flex items-center justify-center ${card.text} mb-4 group-hover:scale-[1.15] group-hover:rotate-6 shadow-sm transition-transform duration-300`}>
                            {card.icon}
                        </div>
                        <p className="text-2xl lg:text-3xl font-extrabold text-[#0F0A09] tabular-nums tracking-tight mb-1">{card.value}</p>
                        <p className="text-xs text-[#8C7A6B] font-bold uppercase tracking-widest">{card.label}</p>
                    </Link>
                ))}
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                {/* Recent Posts (2/3) */}
                <div className="xl:col-span-2 bg-white border border-[#D4BCAA]/20 rounded-2xl shadow-sm overflow-hidden flex flex-col">
                    <div className="flex items-center justify-between px-6 py-5 border-b border-[#D4BCAA]/20 bg-[#F9F6F0]/50">
                        <h2 className="font-bold text-[#0F0A09] text-sm uppercase tracking-widest">Artikel Terbaru</h2>
                        <Link href="/admin/posts" className="text-xs font-bold text-[#466A68] hover:text-[#466A68]/80 transition-colors flex items-center gap-1.5 group bg-white px-3 py-1.5 rounded-lg border border-[#D4BCAA]/20 shadow-sm">
                            Semua <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
                        </Link>
                    </div>
                    <div className="divide-y divide-[#D4BCAA]/20 flex-1">
                        {stats.recentPosts.map((post) => (
                            <Link
                                key={post.id}
                                href={`/admin/posts/${post.id}/edit`}
                                className="flex items-center justify-between px-6 py-4 hover:bg-[#F9F6F0] transition-colors group"
                            >
                                <div className="min-w-0 flex-1 mr-4">
                                    <p className="text-sm font-medium text-[#0F0A09] truncate group-hover:text-[#466A68] transition-colors">{post.title}</p>
                                    <p className="text-xs font-medium text-[#8C7A6B] mt-1">{formatRelativeTime(post.updatedAt)}</p>
                                </div>
                                {statusBadge(post.status)}
                            </Link>
                        ))}
                        {stats.recentPosts.length === 0 && (
                            <div className="px-6 py-12 text-center h-full flex flex-col items-center justify-center">
                                <FileText className="h-10 w-10 text-[#D4BCAA] mx-auto mb-3" />
                                <p className="text-[#8C7A6B] text-sm font-medium">Belum ada artikel</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Quick Actions (1/3) */}
                <div className="space-y-3">
                    <h2 className="text-xs font-bold text-[#8C7A6B] px-2 uppercase tracking-widest mb-4">Quick Actions</h2>
                    {quickActions.map((action) => (
                        <Link
                            key={action.label}
                            href={action.href}
                            className="flex items-center gap-4 bg-white border border-[#D4BCAA]/20 rounded-2xl p-4 hover:border-[#466A68]/30 shadow-sm hover:shadow-md transition-all duration-300 group"
                        >
                            <div className={`w-11 h-11 ${action.color} rounded-xl flex items-center justify-center text-white shadow-lg group-hover:scale-110 group-hover:-rotate-3 transition-transform duration-300`}>
                                {action.icon}
                            </div>
                            <span className="text-sm text-[#0F0A09] font-medium group-hover:text-[#466A68] transition-colors">{action.label}</span>
                            <ArrowRight className="h-4 w-4 text-[#D4BCAA] ml-auto group-hover:text-[#466A68] group-hover:translate-x-1 transition-all" />
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    )
}
