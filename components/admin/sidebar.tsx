"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
    LayoutDashboard,
    Activity,
    FileText,
    FolderOpen,
    Tags,
    BookOpen,
    Image as ImageIcon,
    Sparkles as SparklesIcon,
    Settings,
    ChevronLeft,
    ChevronRight,
    Search,
    MessageSquare,
    BarChart3,
    Link as LinkIcon,
    Globe,
    Bot,
    Menu,
    X,
    LogOut,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

type NavItem = {
    href: string
    label: string
    icon: React.ReactNode
    badge?: string
}

type NavGroup = {
    title: string
    items: NavItem[]
}

const navGroups: NavGroup[] = [
    {
        title: "Dashboard",
        items: [
            { href: "/admin", label: "Overview", icon: <LayoutDashboard className="h-4 w-4" /> },
            { href: "/admin/monitoring", label: "Monitoring", icon: <Activity className="h-4 w-4" /> },
        ],
    },
    {
        title: "Konten",
        items: [
            { href: "/admin/posts", label: "Artikel", icon: <FileText className="h-4 w-4" /> },
            { href: "/admin/categories", label: "Kategori", icon: <FolderOpen className="h-4 w-4" /> },
            { href: "/admin/tags", label: "Tag", icon: <Tags className="h-4 w-4" /> },
            { href: "/admin/pages", label: "Halaman", icon: <BookOpen className="h-4 w-4" /> },
            { href: "/admin/media", label: "Media", icon: <ImageIcon className="h-4 w-4" /> },
            { href: "/admin/hero", label: "Hero Section", icon: <SparklesIcon className="h-4 w-4" /> },
        ],
    },
    {
        title: "SEO",
        items: [
            { href: "/admin/seo", label: "SEO Dashboard", icon: <BarChart3 className="h-4 w-4" /> },
            { href: "/admin/seo/schemas", label: "Schema / JSON-LD", icon: <Globe className="h-4 w-4" /> },
            { href: "/admin/seo/settings", label: "SEO Settings", icon: <Settings className="h-4 w-4" /> },
        ],
    },
    {
        title: "AI Tools",
        items: [
            { href: "/admin/ai", label: "AI Dashboard", icon: <Bot className="h-4 w-4" /> },
            { href: "/admin/ai/generate", label: "Generate Artikel", icon: <SparklesIcon className="h-4 w-4" /> },
            { href: "/admin/ai/rewrite", label: "Rewrite Artikel", icon: <FileText className="h-4 w-4" /> },
            { href: "/admin/ai/internal-links", label: "Internal Links", icon: <LinkIcon className="h-4 w-4" /> },
            { href: "/admin/ai/scanner", label: "Website Scanner", icon: <Globe className="h-4 w-4" /> },
            { href: "/admin/chat", label: "AI Chat", icon: <MessageSquare className="h-4 w-4" />, badge: "AI" },
        ],
    },
    {
        title: "Pengaturan",
        items: [
            { href: "/admin/settings", label: "Umum", icon: <Settings className="h-4 w-4" /> },
            { href: "/admin/settings/navigation", label: "Navigasi", icon: <Menu className="h-4 w-4" /> },
            { href: "/admin/settings/social", label: "Media Sosial", icon: <Globe className="h-4 w-4" /> },
            { href: "/admin/settings/ai", label: "AI Config", icon: <Bot className="h-4 w-4" /> },
        ],
    },
]

export function AdminSidebar() {
    const [collapsed, setCollapsed] = useState(false)
    const [mobileOpen, setMobileOpen] = useState(false)
    const pathname = usePathname()
    const router = useRouter()

    const handleLogout = async () => {
        const supabase = createClient()
        await supabase.auth.signOut()
        router.push("/login")
        router.refresh()
    }

    const isActive = (href: string) => {
        if (href === "/admin") return pathname === "/admin"
        return pathname.startsWith(href)
    }

    const SidebarContent = () => (
        <div className="flex flex-col h-full">
            {/* Logo */}
            <div className="flex items-center justify-between px-4 h-16 border-b border-[#D4BCAA]/10">
                {!collapsed && (
                    <Link href="/admin" className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-gradient-to-br from-[#466A68] to-[#3a5856] rounded-lg flex items-center justify-center">
                            <span className="text-white font-bold text-sm">M</span>
                        </div>
                        <span className="font-bold text-[#F4EEE7] text-sm">CMS Admin</span>
                    </Link>
                )}
                <button
                    onClick={() => setCollapsed(!collapsed)}
                    className="hidden lg:flex items-center justify-center w-8 h-8 rounded-lg text-[#D4BCAA]/50 hover:text-[#F4EEE7] hover:bg-[#D4BCAA]/10 transition-all"
                >
                    {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
                </button>
            </div>

            {/* Search */}
            {!collapsed && (
                <div className="px-3 pt-4 pb-2">
                    <div className="flex items-center gap-2 px-3 py-2 bg-[#1a1412] rounded-lg border border-[#D4BCAA]/10">
                        <Search className="h-4 w-4 text-[#D4BCAA]/40" />
                        <input
                            type="text"
                            placeholder="Cari..."
                            className="bg-transparent text-sm text-[#F4EEE7] placeholder-[#D4BCAA]/30 outline-none w-full"
                        />
                    </div>
                </div>
            )}

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-4 scrollbar-thin">
                {navGroups.map((group) => (
                    <div key={group.title}>
                        {!collapsed && (
                            <p className="px-3 text-[10px] font-semibold text-[#D4BCAA]/40 uppercase tracking-wider mb-1">
                                {group.title}
                            </p>
                        )}
                        <div className="space-y-0.5">
                            {group.items.map((item) => (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    onClick={() => setMobileOpen(false)}
                                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all group relative ${isActive(item.href)
                                        ? "bg-[#466A68]/20 text-[#466A68] font-medium"
                                        : "text-[#D4BCAA]/60 hover:text-[#F4EEE7] hover:bg-[#D4BCAA]/5"
                                        }`}
                                    title={collapsed ? item.label : undefined}
                                >
                                    <span className={isActive(item.href) ? "text-[#466A68]" : "text-[#D4BCAA]/40 group-hover:text-[#D4BCAA]/70"}>
                                        {item.icon}
                                    </span>
                                    {!collapsed && (
                                        <>
                                            <span>{item.label}</span>
                                            {item.badge && (
                                                <span className="ml-auto px-1.5 py-0.5 text-[10px] font-bold bg-gradient-to-r from-[#466A68] to-[#3a5856] text-white rounded-md">
                                                    {item.badge}
                                                </span>
                                            )}
                                        </>
                                    )}
                                    {isActive(item.href) && (
                                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-[#466A68] rounded-r" />
                                    )}
                                </Link>
                            ))}
                        </div>
                    </div>
                ))}
            </nav>

            {/* Logout */}
            <div className="border-t border-[#D4BCAA]/10 p-3">
                <button
                    onClick={handleLogout}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-[#D4BCAA]/60 hover:text-red-400 hover:bg-red-500/5 transition-all w-full"
                >
                    <LogOut className="h-4 w-4" />
                    {!collapsed && <span>Keluar</span>}
                </button>
            </div>
        </div>
    )

    return (
        <>
            {/* Mobile toggle */}
            <button
                onClick={() => setMobileOpen(!mobileOpen)}
                className="lg:hidden fixed top-4 left-4 z-50 w-10 h-10 bg-[#2a2018] border border-[#D4BCAA]/15 rounded-lg flex items-center justify-center text-[#D4BCAA] hover:text-[#F4EEE7] transition-all shadow-lg"
            >
                {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>

            {/* Mobile overlay */}
            {mobileOpen && (
                <div
                    className="lg:hidden fixed inset-0 bg-black/60 z-40"
                    onClick={() => setMobileOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={`fixed lg:sticky top-0 left-0 h-screen bg-[#2a2018] border-r border-[#D4BCAA]/10 z-40 transition-all duration-300 ${collapsed ? "w-16" : "w-64"
                    } ${mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
            >
                <SidebarContent />
            </aside>
        </>
    )
}
