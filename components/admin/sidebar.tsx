"use client"

import { useState, useEffect } from "react"
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
    ChevronDown,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"

type NavItem = {
    href: string
    label: string
    icon: React.ReactNode
    badge?: string
}

type NavGroup = {
    id: string
    title: string
    items: NavItem[]
}

const navGroups: NavGroup[] = [
    {
        id: "dashboard",
        title: "Dashboard",
        items: [
            { href: "/admin", label: "Overview", icon: <LayoutDashboard className="h-4 w-4" /> },
            { href: "/admin/monitoring", label: "Monitoring", icon: <Activity className="h-4 w-4" /> },
        ],
    },
    {
        id: "content",
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
        id: "seo",
        title: "SEO",
        items: [
            { href: "/admin/seo", label: "SEO Dashboard", icon: <BarChart3 className="h-4 w-4" /> },
            { href: "/admin/seo/schemas", label: "Schema / JSON-LD", icon: <Globe className="h-4 w-4" /> },
            { href: "/admin/seo/settings", label: "SEO Settings", icon: <Settings className="h-4 w-4" /> },
        ],
    },
    {
        id: "ai",
        title: "AI Tools",
        items: [
            { href: "/admin/ai", label: "AI Dashboard", icon: <Bot className="h-4 w-4" /> },
            { href: "/admin/ai/generate", label: "Generate", icon: <SparklesIcon className="h-4 w-4" /> },
            { href: "/admin/ai/rewrite", label: "Rewrite", icon: <FileText className="h-4 w-4" /> },
            { href: "/admin/ai/internal-links", label: "Internal Links", icon: <LinkIcon className="h-4 w-4" /> },
            { href: "/admin/ai/scanner", label: "Scanner", icon: <Globe className="h-4 w-4" /> },
            { href: "/admin/chat", label: "AI Chat", icon: <MessageSquare className="h-4 w-4" />, badge: "AI" },
        ],
    },
    {
        id: "settings",
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
    const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
        dashboard: true,
        content: true,
    })
    const pathname = usePathname()
    const router = useRouter()

    useEffect(() => {
        // Auto-open groups that contain the active path
        navGroups.forEach((group) => {
            const hasActiveItem = group.items.some(item =>
                item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href)
            )
            if (hasActiveItem) {
                setOpenGroups(prev => ({ ...prev, [group.id]: true }))
            }
        })
    }, [pathname])

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

    const toggleGroup = (id: string) => {
        if (collapsed) {
            setCollapsed(false)
            setOpenGroups(prev => ({ ...prev, [id]: true }))
            return
        }
        setOpenGroups(prev => ({ ...prev, [id]: !prev[id] }))
    }

    const SidebarContent = () => (
        <div className="flex flex-col h-full bg-white relative z-10">
            {/* Logo */}
            <div className="flex items-center justify-between px-4 h-16 border-b border-[#D4BCAA]/20">
                {!collapsed && (
                    <Link href="/admin" className="flex items-center gap-3 group">
                        <div className="w-8 h-8 bg-[#466A68] text-white rounded-lg flex items-center justify-center shadow-md shadow-[#466A68]/20 group-hover:scale-105 transition-transform duration-200">
                            <span className="font-bold text-sm">M</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="font-bold text-[#0F0A09] text-sm leading-tight tracking-tight">Admin Console</span>
                            <span className="text-[10px] font-medium text-[#8C7A6B]">Mum &apos;n Hun</span>
                        </div>
                    </Link>
                )}
                {collapsed && (
                    <Link href="/admin" className="mx-auto mt-2 block group">
                        <div className="w-8 h-8 bg-[#466A68] text-white rounded-lg flex items-center justify-center shadow-md shadow-[#466A68]/20 group-hover:scale-105 transition-transform duration-200">
                            <span className="font-bold text-sm">M</span>
                        </div>
                    </Link>
                )}
                <button
                    onClick={() => setCollapsed(!collapsed)}
                    className="hidden lg:flex items-center justify-center w-8 h-8 rounded-lg text-[#8C7A6B] hover:text-[#0F0A09] hover:bg-[#F9F6F0] transition-colors"
                >
                    {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
                </button>
            </div>

            {/* Search */}
            {!collapsed && (
                <div className="px-4 pt-5 pb-3">
                    <div className="flex items-center gap-2 px-3 py-2 bg-[#F9F6F0] rounded-lg border border-transparent hover:border-[#D4BCAA]/40 transition-colors focus-within:bg-white focus-within:border-[#466A68] focus-within:ring-2 focus-within:ring-[#466A68]/10 shadow-inner">
                        <Search className="h-4 w-4 text-[#8C7A6B]" />
                        <input
                            type="text"
                            placeholder="Cari menu..."
                            className="bg-transparent text-sm text-[#0F0A09] placeholder-[#8C7A6B] outline-none w-full font-medium"
                        />
                    </div>
                </div>
            )}

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-2 no-scrollbar">
                {navGroups.map((group) => {
                    const isOpen = openGroups[group.id] || false
                    const hasActiveChild = group.items.some(item => isActive(item.href))

                    return (
                        <div key={group.id} className="pt-1">
                            {/* Group Header */}
                            <button
                                onClick={() => toggleGroup(group.id)}
                                className={cn(
                                    "w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors",
                                    collapsed ? "justify-center" : "",
                                    hasActiveChild ? "text-[#466A68]" : "text-[#8C7A6B] hover:text-[#0F0A09]"
                                )}
                                title={collapsed ? group.title : undefined}
                            >
                                {!collapsed ? (
                                    <>
                                        <span>{group.title}</span>
                                        <ChevronDown className={cn("h-3.5 w-3.5 transition-transform duration-200", isOpen ? "rotate-180" : "")} />
                                    </>
                                ) : (
                                    <span className="w-1.5 h-1.5 rounded-full bg-current opacity-50" />
                                )}
                            </button>

                            {/* Group Items */}
                            <div className={cn(
                                "space-y-0.5 overflow-hidden transition-all duration-200 ease-in-out",
                                !collapsed && isOpen ? "max-h-96 mt-1" : "max-h-0",
                                collapsed && "max-h-none opacity-100 mt-1"
                            )}>
                                {(isOpen || collapsed) && group.items.map((item) => {
                                    const active = isActive(item.href)
                                    return (
                                        <Link
                                            key={item.href}
                                            href={item.href}
                                            onClick={() => setMobileOpen(false)}
                                            className={cn(
                                                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all group relative font-medium",
                                                active
                                                    ? "bg-[#466A68]/10 text-[#466A68]"
                                                    : "text-[#8C7A6B] hover:text-[#0F0A09] hover:bg-[#F9F6F0]"
                                            )}
                                            title={collapsed ? item.label : undefined}
                                        >
                                            <span className={cn("shrink-0 transition-colors", active ? "text-[#466A68]" : "text-[#8C7A6B] group-hover:text-[#466A68]")}>
                                                {item.icon}
                                            </span>
                                            {!collapsed && (
                                                <>
                                                    <span className="truncate">{item.label}</span>
                                                    {item.badge && (
                                                        <span className="ml-auto px-1.5 py-0.5 text-xs font-bold bg-[#466A68]/10 text-[#466A68] rounded-md border border-[#466A68]/20 shadow-sm leading-none">
                                                            {item.badge}
                                                        </span>
                                                    )}
                                                </>
                                            )}
                                            {active && !collapsed && (
                                                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-[#466A68] rounded-r-full shadow-sm shadow-[#466A68]/50" />
                                            )}
                                            {active && collapsed && (
                                                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-[#466A68] rounded-l-full" />
                                            )}
                                        </Link>
                                    )
                                })}
                            </div>
                        </div>
                    )
                })}
            </nav>

            {/* Logout */}
            <div className="border-t border-[#D4BCAA]/20 p-4 bg-[#FAFAFA]">
                <button
                    onClick={handleLogout}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-[#8C7A6B] font-semibold hover:text-red-600 hover:bg-red-500/10 transition-all w-full group shadow-sm bg-white border border-[#D4BCAA]/20"
                    title={collapsed ? "Keluar" : undefined}
                >
                    <LogOut className="h-4 w-4 shrink-0 group-hover:-translate-x-0.5 transition-transform" />
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
                className="lg:hidden fixed top-4 left-4 z-50 w-10 h-10 bg-white border border-[#D4BCAA]/20 rounded-lg flex items-center justify-center text-[#8C7A6B] hover:text-[#0F0A09] transition-all shadow-md"
            >
                {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>

            {/* Mobile overlay */}
            {mobileOpen && (
                <div
                    className="lg:hidden fixed inset-0 bg-[#0F0A09]/40 backdrop-blur-sm z-40 transition-opacity"
                    onClick={() => setMobileOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={cn(
                    "fixed lg:sticky top-0 left-0 h-screen bg-white border-r border-[#D4BCAA]/20 z-40 transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] shadow-[2px_0_24px_rgba(0,0,0,0.02)]",
                    collapsed ? "w-20" : "w-64",
                    mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
                )}
            >
                <SidebarContent />
            </aside>
        </>
    )
}
