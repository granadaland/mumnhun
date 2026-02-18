"use client"

import { useState, useEffect, useCallback } from "react"
import { Save, Loader2, Globe, Shield, Search as SearchIcon } from "lucide-react"
import { ADMIN_CSRF_HEADER, getAdminCsrfToken } from "@/lib/security/csrf-client"

type SettingState = {
    seo_meta_title_template: string
    seo_default_meta_description: string
    seo_default_og_image: string
    seo_google_verification: string
    seo_bing_verification: string
    seo_noindex_global: string
    seo_social_profile_urls: string
    seo_default_schema_type: string
}

const defaults: SettingState = {
    seo_meta_title_template: "%title% | Mum'n'Hun",
    seo_default_meta_description: "",
    seo_default_og_image: "",
    seo_google_verification: "",
    seo_bing_verification: "",
    seo_noindex_global: "false",
    seo_social_profile_urls: "",
    seo_default_schema_type: "Article",
}

export default function SeoSettingsPage() {
    const [settings, setSettings] = useState<SettingState>(defaults)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [saved, setSaved] = useState(false)

    const fetchSettings = useCallback(async () => {
        try {
            const res = await fetch("/api/admin/settings?group=seo")
            const data = await res.json()
            if (data.success && data.data) {
                const merged = { ...defaults }
                for (const s of data.data) {
                    if (s.key in merged) {
                        (merged as Record<string, string>)[s.key] = s.value
                    }
                }
                setSettings(merged)
            }
        } catch (err) {
            console.error(err)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchSettings()
    }, [fetchSettings])

    const handleSave = async () => {
        setSaving(true)
        try {
            const csrfToken = await getAdminCsrfToken()
            // Convert settings to flat object for the settings API
            const payload: Record<string, string> = {}
            for (const [key, value] of Object.entries(settings)) {
                payload[key] = value
            }

            const res = await fetch("/api/admin/settings", {
                method: "PUT",
                headers: { "Content-Type": "application/json", [ADMIN_CSRF_HEADER]: csrfToken },
                body: JSON.stringify({ settings: payload, group: "seo" }),
            })
            const data = await res.json()
            if (data.success) {
                setSaved(true)
                setTimeout(() => setSaved(false), 2000)
            }
        } catch (err) {
            console.error(err)
            alert("Gagal menyimpan")
        } finally {
            setSaving(false)
        }
    }

    const update = (key: keyof SettingState, value: string) => {
        setSettings((prev) => ({ ...prev, [key]: value }))
    }

    if (loading) return (<div className="flex items-center justify-center h-64"><Loader2 className="h-6 w-6 text-[#466A68] animate-spin" /></div>)

    return (
        <div className="space-y-6 max-w-3xl">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-[#F4EEE7]">SEO Settings</h1>
                    <p className="text-[#D4BCAA]/50 text-sm mt-1">Pengaturan SEO global</p>
                </div>
                <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#466A68] to-[#3a5856] text-white text-sm font-medium rounded-lg disabled:opacity-50 transition-all shadow-lg">
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : saved ? <Save className="h-4 w-4" /> : <Save className="h-4 w-4" />}
                    {saved ? "Tersimpan!" : "Simpan"}
                </button>
            </div>

            {/* Meta Defaults */}
            <div className="bg-[#2a2018] border border-[#D4BCAA]/10 rounded-xl p-5 space-y-4">
                <div className="flex items-center gap-2 text-[#D4BCAA]/60">
                    <Globe className="h-4 w-4" />
                    <h3 className="text-sm font-semibold">Meta Defaults</h3>
                </div>

                <div>
                    <label className="block text-xs text-[#D4BCAA]/50 mb-1">Title Template</label>
                    <input type="text" value={settings.seo_meta_title_template} onChange={(e) => update("seo_meta_title_template", e.target.value)} placeholder="%title% | Mum'n'Hun" className="w-full px-4 py-2.5 bg-[#1a1412] border border-[#D4BCAA]/10 rounded-lg text-[#F4EEE7] text-sm placeholder-[#D4BCAA]/25 outline-none focus:ring-2 focus:ring-[#466A68]/30 transition-all" />
                    <p className="text-[10px] text-[#D4BCAA]/25 mt-1">Gunakan %title% sebagai placeholder judul halaman</p>
                </div>

                <div>
                    <label className="block text-xs text-[#D4BCAA]/50 mb-1">Default Meta Description</label>
                    <textarea value={settings.seo_default_meta_description} onChange={(e) => update("seo_default_meta_description", e.target.value)} rows={2} placeholder="Deskripsi default untuk halaman tanpa meta description" className="w-full px-4 py-2.5 bg-[#1a1412] border border-[#D4BCAA]/10 rounded-lg text-[#F4EEE7] text-sm placeholder-[#D4BCAA]/25 outline-none focus:ring-2 focus:ring-[#466A68]/30 resize-none transition-all" />
                </div>

                <div>
                    <label className="block text-xs text-[#D4BCAA]/50 mb-1">Default OG Image URL</label>
                    <input type="url" value={settings.seo_default_og_image} onChange={(e) => update("seo_default_og_image", e.target.value)} placeholder="https://res.cloudinary.com/..." className="w-full px-4 py-2.5 bg-[#1a1412] border border-[#D4BCAA]/10 rounded-lg text-[#F4EEE7] text-sm placeholder-[#D4BCAA]/25 outline-none focus:ring-2 focus:ring-[#466A68]/30 transition-all" />
                </div>

                <div>
                    <label className="block text-xs text-[#D4BCAA]/50 mb-1">Default Schema Type</label>
                    <select value={settings.seo_default_schema_type} onChange={(e) => update("seo_default_schema_type", e.target.value)} className="w-full px-4 py-2.5 bg-[#1a1412] border border-[#D4BCAA]/10 rounded-lg text-[#F4EEE7] text-sm outline-none focus:ring-2 focus:ring-[#466A68]/30 transition-all">
                        <option value="Article">Article</option>
                        <option value="BlogPosting">BlogPosting</option>
                        <option value="NewsArticle">NewsArticle</option>
                    </select>
                </div>
            </div>

            {/* Verification Codes */}
            <div className="bg-[#2a2018] border border-[#D4BCAA]/10 rounded-xl p-5 space-y-4">
                <div className="flex items-center gap-2 text-[#D4BCAA]/60">
                    <Shield className="h-4 w-4" />
                    <h3 className="text-sm font-semibold">Verification</h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs text-[#D4BCAA]/50 mb-1">Google Verification Code</label>
                        <input type="text" value={settings.seo_google_verification} onChange={(e) => update("seo_google_verification", e.target.value)} placeholder="google-site-verification=..." className="w-full px-4 py-2.5 bg-[#1a1412] border border-[#D4BCAA]/10 rounded-lg text-[#F4EEE7] text-sm placeholder-[#D4BCAA]/25 outline-none focus:ring-2 focus:ring-[#466A68]/30 transition-all font-mono" />
                    </div>
                    <div>
                        <label className="block text-xs text-[#D4BCAA]/50 mb-1">Bing Verification Code</label>
                        <input type="text" value={settings.seo_bing_verification} onChange={(e) => update("seo_bing_verification", e.target.value)} placeholder="msvalidate.01=..." className="w-full px-4 py-2.5 bg-[#1a1412] border border-[#D4BCAA]/10 rounded-lg text-[#F4EEE7] text-sm placeholder-[#D4BCAA]/25 outline-none focus:ring-2 focus:ring-[#466A68]/30 transition-all font-mono" />
                    </div>
                </div>
            </div>

            {/* Social & Indexing */}
            <div className="bg-[#2a2018] border border-[#D4BCAA]/10 rounded-xl p-5 space-y-4">
                <div className="flex items-center gap-2 text-[#D4BCAA]/60">
                    <SearchIcon className="h-4 w-4" />
                    <h3 className="text-sm font-semibold">Indexing & Social</h3>
                </div>

                <div>
                    <label className="block text-xs text-[#D4BCAA]/50 mb-1">Social Profile URLs</label>
                    <textarea value={settings.seo_social_profile_urls} onChange={(e) => update("seo_social_profile_urls", e.target.value)} rows={3} placeholder="Satu URL per baris (Instagram, Facebook, dll)" className="w-full px-4 py-2.5 bg-[#1a1412] border border-[#D4BCAA]/10 rounded-lg text-[#F4EEE7] text-sm placeholder-[#D4BCAA]/25 outline-none focus:ring-2 focus:ring-[#466A68]/30 resize-none transition-all font-mono" />
                    <p className="text-[10px] text-[#D4BCAA]/25 mt-1">Digunakan untuk schema Organization/Person</p>
                </div>

                <div className="flex items-center justify-between p-3 bg-[#1a1412] rounded-lg border border-[#D4BCAA]/10">
                    <div>
                        <p className="text-sm text-[#F4EEE7]">NoIndex Global</p>
                        <p className="text-[10px] text-[#D4BCAA]/30 mt-0.5">Blokir semua halaman dari search engines (hati-hati!)</p>
                    </div>
                    <button
                        onClick={() => update("seo_noindex_global", settings.seo_noindex_global === "true" ? "false" : "true")}
                        className={`relative w-10 h-5 rounded-full transition-colors ${settings.seo_noindex_global === "true" ? "bg-red-500" : "bg-[#D4BCAA]/15"}`}
                    >
                        <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${settings.seo_noindex_global === "true" ? "translate-x-5" : ""}`} />
                    </button>
                </div>
            </div>
        </div>
    )
}
