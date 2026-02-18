"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { RichTextEditor } from "@/components/admin/rich-text-editor"
import { Save, Loader2, ArrowLeft, Globe, ChevronDown, ChevronUp } from "lucide-react"
import { ADMIN_CSRF_HEADER, getAdminCsrfToken } from "@/lib/security/csrf-client"

function slugify(text: string): string {
    return text.toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").replace(/^-+|-+$/g, "")
}

export default function PageEditorPage() {
    const router = useRouter()
    const params = useParams()
    const pageId = params?.id as string | undefined
    const isNew = !pageId

    const [form, setForm] = useState({
        title: "", slug: "", content: "", metaTitle: "", metaDescription: "",
        status: "DRAFT", focusKeyword: "", ogTitle: "", ogDescription: "",
        ogImage: "", canonicalUrl: "", schemaType: "", schemaData: "",
    })
    const [loading, setLoading] = useState(!isNew)
    const [saving, setSaving] = useState(false)
    const [showSeo, setShowSeo] = useState(false)
    const [autoSlug, setAutoSlug] = useState(isNew)

    useEffect(() => {
        if (pageId) {
            fetch(`/api/admin/pages/${pageId}`)
                .then((r) => r.json())
                .then((data) => {
                    if (data.success) {
                        const p = data.data
                        setForm({
                            title: p.title || "", slug: p.slug || "", content: p.content || "",
                            metaTitle: p.metaTitle || "", metaDescription: p.metaDescription || "",
                            status: p.status || "DRAFT", focusKeyword: p.focusKeyword || "",
                            ogTitle: p.ogTitle || "", ogDescription: p.ogDescription || "",
                            ogImage: p.ogImage || "", canonicalUrl: p.canonicalUrl || "",
                            schemaType: p.schemaType || "", schemaData: p.schemaData || "",
                        })
                    }
                })
                .finally(() => setLoading(false))
        }
    }, [pageId])

    useEffect(() => {
        if (autoSlug && form.title) setForm((prev) => ({ ...prev, slug: slugify(prev.title) }))
    }, [form.title, autoSlug])

    const update = (field: string, value: string) => setForm((p) => ({ ...p, [field]: value }))

    const handleSave = async () => {
        if (!form.title.trim() || !form.slug.trim()) return alert("Judul dan slug wajib diisi")
        setSaving(true)
        try {
            const csrfToken = await getAdminCsrfToken()
            const url = pageId ? `/api/admin/pages/${pageId}` : "/api/admin/pages"
            const method = pageId ? "PUT" : "POST"
            const res = await fetch(url, { method, headers: { "Content-Type": "application/json", [ADMIN_CSRF_HEADER]: csrfToken }, body: JSON.stringify(form) })
            const data = await res.json()
            if (data.success) {
                if (isNew) router.push(`/admin/pages/${data.data.id}/edit`)
                router.refresh()
            } else {
                alert(data.error || "Gagal menyimpan")
            }
        } catch (err) {
            console.error(err)
            alert("Gagal menyimpan")
        } finally {
            setSaving(false)
        }
    }

    if (loading) {
        return (<div className="flex items-center justify-center h-64"><Loader2 className="h-6 w-6 text-[#466A68] animate-spin" /></div>)
    }

    return (
        <div className="space-y-6 max-w-4xl">
            <div className="flex items-center justify-between">
                <button onClick={() => router.push("/admin/pages")} className="flex items-center gap-2 text-sm text-[#D4BCAA]/50 hover:text-[#F4EEE7] transition-colors">
                    <ArrowLeft className="h-4 w-4" />
                    Kembali
                </button>
                <div className="flex items-center gap-3">
                    <select
                        value={form.status}
                        onChange={(e) => update("status", e.target.value)}
                        className="px-3 py-1.5 text-xs bg-[#1a1412] border border-[#D4BCAA]/10 rounded-lg text-[#F4EEE7] outline-none"
                    >
                        <option value="DRAFT">Draft</option>
                        <option value="PUBLISHED">Published</option>
                    </select>
                    <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#466A68] to-[#3a5856] text-white text-sm font-medium rounded-lg disabled:opacity-50 transition-all shadow-lg">
                        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        Simpan
                    </button>
                </div>
            </div>

            <input type="text" value={form.title} onChange={(e) => update("title", e.target.value)} placeholder="Judul Halaman" className="w-full text-2xl font-bold bg-transparent text-[#F4EEE7] placeholder-[#D4BCAA]/20 outline-none border-b border-[#D4BCAA]/10 pb-3 focus:border-[#466A68]/50 transition-colors" />

            <div className="flex items-center gap-2">
                <span className="text-xs text-[#D4BCAA]/30">mumnhun.id/</span>
                <input type="text" value={form.slug} onChange={(e) => { setAutoSlug(false); update("slug", slugify(e.target.value)) }} placeholder="slug-halaman" className="flex-1 text-xs bg-transparent text-[#466A68] placeholder-[#D4BCAA]/20 outline-none font-mono" />
            </div>

            <RichTextEditor content={form.content} onChange={(html) => update("content", html)} placeholder="Tulis konten halaman..." />

            {/* SEO */}
            <div className="bg-[#2a2018] border border-[#D4BCAA]/10 rounded-xl overflow-hidden">
                <button onClick={() => setShowSeo(!showSeo)} className="w-full flex items-center justify-between px-5 py-4 text-sm font-medium text-[#D4BCAA]/70 hover:text-[#F4EEE7] transition-colors">
                    <div className="flex items-center gap-2"><Globe className="h-4 w-4" />SEO Settings</div>
                    {showSeo ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
                {showSeo && (
                    <div className="px-5 pb-5 space-y-4 border-t border-[#D4BCAA]/5 pt-4">
                        <div>
                            <label className="block text-xs text-[#D4BCAA]/50 mb-1">Meta Title</label>
                            <input type="text" value={form.metaTitle} onChange={(e) => update("metaTitle", e.target.value)} placeholder={form.title} className="w-full bg-[#1a1412] border border-[#D4BCAA]/10 rounded-lg px-3 py-2 text-sm text-[#F4EEE7] placeholder-[#D4BCAA]/20 outline-none focus:ring-2 focus:ring-[#466A68]/30 transition-all" />
                        </div>
                        <div>
                            <label className="block text-xs text-[#D4BCAA]/50 mb-1">Meta Description</label>
                            <textarea value={form.metaDescription} onChange={(e) => update("metaDescription", e.target.value)} rows={2} className="w-full bg-[#1a1412] border border-[#D4BCAA]/10 rounded-lg px-3 py-2 text-sm text-[#F4EEE7] placeholder-[#D4BCAA]/20 outline-none focus:ring-2 focus:ring-[#466A68]/30 resize-none transition-all" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs text-[#D4BCAA]/50 mb-1">Focus Keyword</label>
                                <input type="text" value={form.focusKeyword} onChange={(e) => update("focusKeyword", e.target.value)} className="w-full bg-[#1a1412] border border-[#D4BCAA]/10 rounded-lg px-3 py-2 text-sm text-[#F4EEE7] outline-none focus:ring-2 focus:ring-[#466A68]/30 transition-all" />
                            </div>
                            <div>
                                <label className="block text-xs text-[#D4BCAA]/50 mb-1">Canonical URL</label>
                                <input type="url" value={form.canonicalUrl} onChange={(e) => update("canonicalUrl", e.target.value)} className="w-full bg-[#1a1412] border border-[#D4BCAA]/10 rounded-lg px-3 py-2 text-sm text-[#F4EEE7] outline-none focus:ring-2 focus:ring-[#466A68]/30 transition-all" />
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
