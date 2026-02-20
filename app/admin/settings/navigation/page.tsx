"use client"

import { useState, useEffect } from "react"
import { Save, Loader2, Check, Plus, Trash2, GripVertical } from "lucide-react"
import { ADMIN_CSRF_HEADER, getAdminCsrfToken } from "@/lib/security/csrf-client"

type NavLink = {
    href: string
    label: string
}

export default function NavigationSettingsPage() {
    const [navLinks, setNavLinks] = useState<NavLink[]>([])
    const [footerLinks, setFooterLinks] = useState<NavLink[]>([])
    const [footerDescription, setFooterDescription] = useState("")
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [saved, setSaved] = useState(false)

    useEffect(() => {
        fetchSettings()
    }, [])

    const fetchSettings = async () => {
        try {
            const res = await fetch("/api/admin/settings?group=navigation")
            const navData = await res.json()
            const resFooter = await fetch("/api/admin/settings?group=footer")
            const footerData = await resFooter.json()

            if (navData.success) {
                const navSetting = navData.data.find((s: { key: string }) => s.key === "nav_links")
                if (navSetting) {
                    try { setNavLinks(JSON.parse(navSetting.value)) } catch { /* ignore */ }
                }
            }

            if (footerData.success) {
                const footerSetting = footerData.data.find((s: { key: string }) => s.key === "footer_links")
                const descSetting = footerData.data.find((s: { key: string }) => s.key === "footer_description")
                if (footerSetting) {
                    try { setFooterLinks(JSON.parse(footerSetting.value)) } catch { /* ignore */ }
                }
                if (descSetting) setFooterDescription(descSetting.value)
            }
        } catch (err) {
            console.error("Failed to fetch settings:", err)
        } finally {
            setLoading(false)
        }
    }

    const handleSave = async () => {
        setSaving(true)
        setSaved(false)
        try {
            const csrfToken = await getAdminCsrfToken()
            const res = await fetch("/api/admin/settings", {
                method: "PUT",
                headers: { "Content-Type": "application/json", [ADMIN_CSRF_HEADER]: csrfToken },
                body: JSON.stringify({
                    settings: {
                        nav_links: JSON.stringify(navLinks),
                        footer_links: JSON.stringify(footerLinks),
                        footer_description: footerDescription,
                    },
                }),
            })
            const data = await res.json()
            if (data.success) {
                setSaved(true)
                setTimeout(() => setSaved(false), 3000)
            }
        } catch (err) {
            console.error("Failed to save:", err)
        } finally {
            setSaving(false)
        }
    }

    const addNavLink = () => setNavLinks([...navLinks, { href: "", label: "" }])
    const addFooterLink = () => setFooterLinks([...footerLinks, { href: "", label: "" }])
    const removeNavLink = (i: number) => setNavLinks(navLinks.filter((_, idx) => idx !== i))
    const removeFooterLink = (i: number) => setFooterLinks(footerLinks.filter((_, idx) => idx !== i))

    const updateNavLink = (i: number, field: "href" | "label", value: string) => {
        const updated = [...navLinks]
        updated[i][field] = value
        setNavLinks(updated)
    }

    const updateFooterLink = (i: number, field: "href" | "label", value: string) => {
        const updated = [...footerLinks]
        updated[i][field] = value
        setFooterLinks(updated)
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-6 w-6 text-[#466A68] animate-spin" />
            </div>
        )
    }

    const LinkEditor = ({
        links,
        onUpdate,
        onRemove,
        onAdd,
        title,
        description,
    }: {
        links: NavLink[]
        onUpdate: (i: number, field: "href" | "label", value: string) => void
        onRemove: (i: number) => void
        onAdd: () => void
        title: string
        description: string
    }) => (
        <div className="bg-white border border-[#D4BCAA]/20 rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-[#D4BCAA]/20">
                <h2 className="font-semibold text-[#0F0A09]">{title}</h2>
                <p className="text-xs text-[#8C7A6B]/40 mt-0.5">{description}</p>
            </div>
            <div className="divide-y divide-[#D4BCAA]/20">
                {links.map((link, i) => (
                    <div key={i} className="flex items-center gap-3 px-6 py-3">
                        <GripVertical className="h-4 w-4 text-[#8C7A6B]/20 flex-shrink-0 cursor-grab" />
                        <input
                            type="text"
                            value={link.label}
                            onChange={(e) => onUpdate(i, "label", e.target.value)}
                            placeholder="Label"
                            className="flex-1 px-3 py-2 bg-white border border-[#D4BCAA]/20 rounded-lg text-[#0F0A09] text-sm placeholder-[#8C7A6B]/60 focus:outline-none focus:ring-2 focus:ring-[#466A68]/30 transition-all"
                        />
                        <input
                            type="text"
                            value={link.href}
                            onChange={(e) => onUpdate(i, "href", e.target.value)}
                            placeholder="/path"
                            className="flex-1 px-3 py-2 bg-white border border-[#D4BCAA]/20 rounded-lg text-[#0F0A09] text-sm placeholder-[#8C7A6B]/60 focus:outline-none focus:ring-2 focus:ring-[#466A68]/30 transition-all"
                        />
                        <button
                            onClick={() => onRemove(i)}
                            className="p-2 text-[#8C7A6B]/30 hover:text-red-600 transition-colors"
                        >
                            <Trash2 className="h-4 w-4" />
                        </button>
                    </div>
                ))}
            </div>
            <div className="px-6 py-3 border-t border-[#D4BCAA]/20">
                <button
                    onClick={onAdd}
                    className="flex items-center gap-2 text-sm text-[#466A68] hover:text-[#466A68]/80 transition-colors"
                >
                    <Plus className="h-4 w-4" />
                    Tambah Link
                </button>
            </div>
        </div>
    )

    return (
        <div className="space-y-6 max-w-3xl">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-[#0F0A09]">Pengaturan Navigasi</h1>
                    <p className="text-[#8C7A6B]/50 text-sm mt-1">
                        Kelola link di header dan footer
                    </p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#466A68] to-[#3a5856] text-white text-sm font-medium rounded-lg hover:from-[#3a5856] hover:to-[#466A68] disabled:opacity-50 transition-all shadow-lg"
                >
                    {saving ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : saved ? (
                        <Check className="h-4 w-4" />
                    ) : (
                        <Save className="h-4 w-4" />
                    )}
                    {saved ? "Tersimpan!" : "Simpan"}
                </button>
            </div>

            {/* Header Navigation */}
            <LinkEditor
                links={navLinks}
                onUpdate={updateNavLink}
                onRemove={removeNavLink}
                onAdd={addNavLink}
                title="Header Navigation"
                description="Link yang muncul di navigasi header utama"
            />

            {/* Footer Links */}
            <LinkEditor
                links={footerLinks}
                onUpdate={updateFooterLink}
                onRemove={removeFooterLink}
                onAdd={addFooterLink}
                title="Footer Links"
                description="Link yang muncul di kolom Layanan footer"
            />

            {/* Footer Description */}
            <div className="bg-white border border-[#D4BCAA]/20 rounded-xl overflow-hidden">
                <div className="px-6 py-4 border-b border-[#D4BCAA]/20">
                    <h2 className="font-semibold text-[#0F0A09]">Footer Description</h2>
                    <p className="text-xs text-[#8C7A6B]/40 mt-0.5">
                        Deskripsi yang muncul di footer bawah logo
                    </p>
                </div>
                <div className="px-6 py-4">
                    <textarea
                        value={footerDescription}
                        onChange={(e) => setFooterDescription(e.target.value)}
                        rows={3}
                        className="w-full px-4 py-2.5 bg-white border border-[#D4BCAA]/20 rounded-lg text-[#0F0A09] text-sm placeholder-[#8C7A6B]/60 focus:outline-none focus:ring-2 focus:ring-[#466A68]/30 transition-all resize-none"
                    />
                </div>
            </div>
        </div>
    )
}
