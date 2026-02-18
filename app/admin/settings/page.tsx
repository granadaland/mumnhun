"use client"

import { useState, useEffect } from "react"
import { Save, Loader2, Check } from "lucide-react"
import { ADMIN_CSRF_HEADER, getAdminCsrfToken } from "@/lib/security/csrf-client"

type Setting = {
    id: string
    key: string
    value: string
    type: string
    group: string
    label: string | null
    description: string | null
}

export default function GeneralSettingsPage() {
    const [settings, setSettings] = useState<Setting[]>([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [saved, setSaved] = useState(false)
    const [formValues, setFormValues] = useState<Record<string, string>>({})

    useEffect(() => {
        fetchSettings()
    }, [])

    const fetchSettings = async () => {
        try {
            const res = await fetch("/api/admin/settings?group=general")
            const data = await res.json()
            if (data.success) {
                setSettings(data.data)
                const values: Record<string, string> = {}
                data.data.forEach((s: Setting) => {
                    values[s.key] = s.value
                })
                setFormValues(values)
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
                body: JSON.stringify({ settings: formValues }),
            })
            const data = await res.json()
            if (data.success) {
                setSaved(true)
                setTimeout(() => setSaved(false), 3000)
            }
        } catch (err) {
            console.error("Failed to save settings:", err)
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

    const settingsConfig = [
        { key: "site_name", label: "Nama Website", type: "text", placeholder: "Mum 'n' Hun" },
        { key: "site_description", label: "Deskripsi Website", type: "textarea", placeholder: "Deskripsi singkat website..." },
        { key: "site_url", label: "URL Website", type: "url", placeholder: "https://mumnhun.id" },
        { key: "site_logo", label: "Logo (Cloudinary URL)", type: "url", placeholder: "https://res.cloudinary.com/..." },
        { key: "site_icon", label: "Site Icon / Favicon (Cloudinary URL)", type: "url", placeholder: "https://res.cloudinary.com/..." },
        { key: "contact_email", label: "Email Kontak", type: "email", placeholder: "admin@mumnhun.id" },
        { key: "contact_phone", label: "Nomor Telepon", type: "text", placeholder: "+62 xxx" },
        { key: "contact_whatsapp", label: "WhatsApp", type: "text", placeholder: "628xxx" },
        { key: "contact_address", label: "Alamat", type: "text", placeholder: "Jakarta, Indonesia" },
        { key: "contact_work_hours", label: "Jam Kerja", type: "text", placeholder: "Senin - Jumat: 09:00 - 17:00 WIB" },
    ]

    return (
        <div className="space-y-6 max-w-3xl">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-[#F4EEE7]">Pengaturan Umum</h1>
                    <p className="text-[#D4BCAA]/50 text-sm mt-1">
                        Konfigurasi dasar website
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

            {/* Settings Form */}
            <div className="bg-[#2a2018] border border-[#D4BCAA]/10 rounded-xl divide-y divide-[#D4BCAA]/5">
                {settingsConfig.map((config) => (
                    <div key={config.key} className="px-6 py-5">
                        <label className="block text-sm font-medium text-[#D4BCAA]/80 mb-1.5">
                            {config.label}
                        </label>
                        {config.type === "textarea" ? (
                            <textarea
                                value={formValues[config.key] || ""}
                                onChange={(e) =>
                                    setFormValues({ ...formValues, [config.key]: e.target.value })
                                }
                                placeholder={config.placeholder}
                                rows={3}
                                className="w-full px-4 py-2.5 bg-[#1a1412] border border-[#D4BCAA]/10 rounded-lg text-[#F4EEE7] text-sm placeholder-[#D4BCAA]/25 focus:outline-none focus:ring-2 focus:ring-[#466A68]/30 focus:border-[#466A68]/50 transition-all resize-none"
                            />
                        ) : (
                            <input
                                type={config.type}
                                value={formValues[config.key] || ""}
                                onChange={(e) =>
                                    setFormValues({ ...formValues, [config.key]: e.target.value })
                                }
                                placeholder={config.placeholder}
                                className="w-full px-4 py-2.5 bg-[#1a1412] border border-[#D4BCAA]/10 rounded-lg text-[#F4EEE7] text-sm placeholder-[#D4BCAA]/25 focus:outline-none focus:ring-2 focus:ring-[#466A68]/30 focus:border-[#466A68]/50 transition-all"
                            />
                        )}
                    </div>
                ))}
            </div>
        </div>
    )
}
