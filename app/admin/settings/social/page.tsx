"use client"

import { useState, useEffect } from "react"
import { Save, Loader2, Check } from "lucide-react"
import { ADMIN_CSRF_HEADER, getAdminCsrfToken } from "@/lib/security/csrf-client"

export default function SocialSettingsPage() {
    const [formValues, setFormValues] = useState<Record<string, string>>({})
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [saved, setSaved] = useState(false)

    useEffect(() => {
        fetchSettings()
    }, [])

    const fetchSettings = async () => {
        try {
            const [socialRes, homepageRes] = await Promise.all([
                fetch("/api/admin/settings?group=social"),
                fetch("/api/admin/settings?group=homepage"),
            ])
            const socialData = await socialRes.json()
            const homepageData = await homepageRes.json()

            const values: Record<string, string> = {}
            if (socialData.success) {
                socialData.data.forEach((s: { key: string; value: string }) => {
                    values[s.key] = s.value
                })
            }
            if (homepageData.success) {
                homepageData.data.forEach((s: { key: string; value: string }) => {
                    values[s.key] = s.value
                })
            }
            setFormValues(values)
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
                body: JSON.stringify({ settings: formValues }),
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

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-6 w-6 text-[#466A68] animate-spin" />
            </div>
        )
    }

    const socialFields = [
        { key: "social_instagram", label: "Instagram", placeholder: "https://instagram.com/mumnhun", icon: "📸" },
        { key: "social_facebook", label: "Facebook", placeholder: "https://facebook.com/mumnhun", icon: "👤" },
        { key: "social_twitter", label: "Twitter / X", placeholder: "https://x.com/mumnhun", icon: "🐦" },
        { key: "social_tiktok", label: "TikTok", placeholder: "https://tiktok.com/@mumnhun", icon: "🎵" },
        { key: "social_youtube", label: "YouTube", placeholder: "https://youtube.com/@mumnhun", icon: "▶️" },
    ]

    return (
        <div className="space-y-6 max-w-3xl">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-[#0F0A09]">Media Sosial</h1>
                    <p className="text-[#8C7A6B]/50 text-sm mt-1">
                        Link media sosial dan video YouTube homepage
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

            {/* Social Media Links */}
            <div className="bg-white border border-[#D4BCAA]/20 rounded-xl divide-y divide-[#D4BCAA]/20">
                {socialFields.map((field) => (
                    <div key={field.key} className="px-6 py-4">
                        <label className="flex items-center gap-2 text-sm font-medium text-[#8C7A6B]/80 mb-1.5">
                            <span>{field.icon}</span>
                            {field.label}
                        </label>
                        <input
                            type="url"
                            value={formValues[field.key] || ""}
                            onChange={(e) =>
                                setFormValues({ ...formValues, [field.key]: e.target.value })
                            }
                            placeholder={field.placeholder}
                            className="w-full px-4 py-2.5 bg-white border border-[#D4BCAA]/20 rounded-lg text-[#0F0A09] text-sm placeholder-[#8C7A6B]/60 focus:outline-none focus:ring-2 focus:ring-[#466A68]/30 focus:border-[#466A68]/50 transition-all"
                        />
                    </div>
                ))}
            </div>

            {/* YouTube Homepage */}
            <div className="bg-white border border-[#D4BCAA]/20 rounded-xl overflow-hidden">
                <div className="px-6 py-4 border-b border-[#D4BCAA]/20">
                    <h2 className="font-semibold text-[#0F0A09]">YouTube Homepage</h2>
                    <p className="text-xs text-[#8C7A6B]/40 mt-0.5">
                        URL video YouTube yang akan ditampilkan di homepage
                    </p>
                </div>
                <div className="px-6 py-4">
                    <input
                        type="url"
                        value={formValues["homepage_youtube_url"] || ""}
                        onChange={(e) =>
                            setFormValues({ ...formValues, homepage_youtube_url: e.target.value })
                        }
                        placeholder="https://www.youtube.com/watch?v=..."
                        className="w-full px-4 py-2.5 bg-white border border-[#D4BCAA]/20 rounded-lg text-[#0F0A09] text-sm placeholder-[#8C7A6B]/60 focus:outline-none focus:ring-2 focus:ring-[#466A68]/30 focus:border-[#466A68]/50 transition-all"
                    />
                </div>
            </div>
        </div>
    )
}
