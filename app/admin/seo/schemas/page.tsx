"use client"

import { useState, useEffect, useCallback } from "react"
import {
    Plus, Loader2, Trash2, Pencil, Check, X,
    Eye, EyeOff, Code2, FileJson,
} from "lucide-react"
import { ADMIN_CSRF_HEADER, getAdminCsrfToken } from "@/lib/security/csrf-client"

type Schema = {
    id: string
    entityType: string
    entityId: string | null
    schemaType: string
    schemaData: string
    isActive: boolean
    createdAt: string
}

const SCHEMA_TEMPLATES: Record<string, { label: string; data: object }> = {
    Article: {
        label: "Article",
        data: { "@context": "https://schema.org", "@type": "Article", headline: "", description: "", author: { "@type": "Person", name: "" }, datePublished: "", image: "" },
    },
    FAQPage: {
        label: "FAQ Page",
        data: { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: [{ "@type": "Question", name: "", acceptedAnswer: { "@type": "Answer", text: "" } }] },
    },
    LocalBusiness: {
        label: "Local Business",
        data: { "@context": "https://schema.org", "@type": "LocalBusiness", name: "Mum'n'Hun", description: "Sewa Freezer ASI", url: "https://mumnhun.id", telephone: "", address: { "@type": "PostalAddress", addressLocality: "", addressRegion: "", addressCountry: "ID" } },
    },
    BreadcrumbList: {
        label: "Breadcrumb",
        data: { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "Home", item: "https://mumnhun.id" }] },
    },
    WebSite: {
        label: "Website",
        data: { "@context": "https://schema.org", "@type": "WebSite", name: "Mum'n'Hun", url: "https://mumnhun.id", potentialAction: { "@type": "SearchAction", target: "https://mumnhun.id/blog?q={search_term_string}", "query-input": "required name=search_term_string" } },
    },
}

export default function SchemasPage() {
    const [schemas, setSchemas] = useState<Schema[]>([])
    const [loading, setLoading] = useState(true)
    const [adding, setAdding] = useState(false)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [form, setForm] = useState({ entityType: "global", entityId: "", schemaType: "Article", schemaData: "" })
    const [saving, setSaving] = useState(false)
    const [jsonError, setJsonError] = useState("")

    const fetchSchemas = useCallback(async () => {
        try {
            const res = await fetch("/api/admin/seo/schemas")
            const data = await res.json()
            if (data.success) setSchemas(data.data)
        } catch (err) {
            console.error(err)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchSchemas()
    }, [fetchSchemas])

    const applyTemplate = (type: string) => {
        const tpl = SCHEMA_TEMPLATES[type]
        if (tpl) {
            setForm({ ...form, schemaType: type, schemaData: JSON.stringify(tpl.data, null, 2) })
            setJsonError("")
        }
    }

    const validateJson = (json: string) => {
        try {
            JSON.parse(json)
            setJsonError("")
            return true
        } catch (e) {
            setJsonError((e as Error).message)
            return false
        }
    }

    const handleSave = async () => {
        if (!form.schemaData || !validateJson(form.schemaData)) return
        setSaving(true)
        try {
            const csrfToken = await getAdminCsrfToken()
            const url = "/api/admin/seo/schemas"
            const method = editingId ? "PUT" : "POST"
            const body = editingId ? { ...form, id: editingId } : form
            const res = await fetch(url, { method, headers: { "Content-Type": "application/json", [ADMIN_CSRF_HEADER]: csrfToken }, body: JSON.stringify(body) })
            const data = await res.json()
            if (data.success) {
                setAdding(false)
                setEditingId(null)
                setForm({ entityType: "global", entityId: "", schemaType: "Article", schemaData: "" })
                fetchSchemas()
            } else {
                alert(data.error)
            }
        } catch (err) {
            console.error(err)
        } finally {
            setSaving(false)
        }
    }

    const handleToggle = async (schema: Schema) => {
        try {
            const csrfToken = await getAdminCsrfToken()
            await fetch("/api/admin/seo/schemas", {
                method: "PUT",
                headers: { "Content-Type": "application/json", [ADMIN_CSRF_HEADER]: csrfToken },
                body: JSON.stringify({ id: schema.id, isActive: !schema.isActive }),
            })
            fetchSchemas()
        } catch (err) {
            console.error(err)
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm("Hapus schema ini?")) return
        try {
            const csrfToken = await getAdminCsrfToken()
            await fetch("/api/admin/seo/schemas", {
                method: "DELETE",
                headers: { "Content-Type": "application/json", [ADMIN_CSRF_HEADER]: csrfToken },
                body: JSON.stringify({ id }),
            })
            fetchSchemas()
        } catch (err) {
            console.error(err)
        }
    }

    const startEdit = (schema: Schema) => {
        setEditingId(schema.id)
        setForm({
            entityType: schema.entityType,
            entityId: schema.entityId || "",
            schemaType: schema.schemaType,
            schemaData: (() => { try { return JSON.stringify(JSON.parse(schema.schemaData), null, 2) } catch { return schema.schemaData } })(),
        })
        setAdding(true)
        setJsonError("")
    }

    return (
        <div className="space-y-6 max-w-4xl">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-[#F4EEE7]">Schema / JSON-LD</h1>
                    <p className="text-[#D4BCAA]/50 text-sm mt-1">Kelola structured data untuk SEO</p>
                </div>
                <button onClick={() => { setAdding(true); setEditingId(null); setForm({ entityType: "global", entityId: "", schemaType: "Article", schemaData: "" }) }} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#466A68] to-[#3a5856] text-white text-sm font-medium rounded-lg transition-all shadow-lg">
                    <Plus className="h-4 w-4" />
                    Tambah Schema
                </button>
            </div>

            {/* Editor Form */}
            {adding && (
                <div className="bg-[#2a2018] border border-[#D4BCAA]/10 rounded-xl p-5 space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-[#F4EEE7]">{editingId ? "Edit Schema" : "Schema Baru"}</h3>
                        <button onClick={() => { setAdding(false); setEditingId(null) }} className="text-[#D4BCAA]/30 hover:text-[#F4EEE7]"><X className="h-4 w-4" /></button>
                    </div>

                    {/* Template Picker */}
                    <div>
                        <label className="block text-xs text-[#D4BCAA]/50 mb-1.5">Template</label>
                        <div className="flex flex-wrap gap-1.5">
                            {Object.entries(SCHEMA_TEMPLATES).map(([key, tpl]) => (
                                <button key={key} onClick={() => applyTemplate(key)} className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${form.schemaType === key ? "bg-[#466A68]/15 border-[#466A68]/30 text-[#466A68]" : "border-[#D4BCAA]/10 text-[#D4BCAA]/40 hover:text-[#D4BCAA]/70"}`}>
                                    {tpl.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                            <label className="block text-xs text-[#D4BCAA]/50 mb-1">Tipe Entity</label>
                            <select value={form.entityType} onChange={(e) => setForm({ ...form, entityType: e.target.value })} className="w-full px-3 py-2 bg-[#1a1412] border border-[#D4BCAA]/10 rounded-lg text-sm text-[#F4EEE7] outline-none">
                                <option value="global">Global</option>
                                <option value="homepage">Homepage</option>
                                <option value="post">Post</option>
                                <option value="page">Page</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs text-[#D4BCAA]/50 mb-1">Schema Type</label>
                            <input type="text" value={form.schemaType} onChange={(e) => setForm({ ...form, schemaType: e.target.value })} className="w-full px-3 py-2 bg-[#1a1412] border border-[#D4BCAA]/10 rounded-lg text-sm text-[#F4EEE7] outline-none" />
                        </div>
                        <div>
                            <label className="block text-xs text-[#D4BCAA]/50 mb-1">Entity ID (opsional)</label>
                            <input type="text" value={form.entityId} onChange={(e) => setForm({ ...form, entityId: e.target.value })} placeholder="ID post/page" className="w-full px-3 py-2 bg-[#1a1412] border border-[#D4BCAA]/10 rounded-lg text-sm text-[#F4EEE7] placeholder-[#D4BCAA]/20 outline-none" />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs text-[#D4BCAA]/50 mb-1">JSON-LD Data</label>
                        <textarea
                            value={form.schemaData}
                            onChange={(e) => { setForm({ ...form, schemaData: e.target.value }); validateJson(e.target.value) }}
                            rows={12}
                            className={`w-full px-4 py-3 bg-[#1a1412] border ${jsonError ? "border-red-500/30" : "border-[#D4BCAA]/10"} rounded-lg text-xs text-[#F4EEE7] font-mono outline-none resize-y focus:ring-2 focus:ring-[#466A68]/30 transition-all`}
                            placeholder='{"@context": "https://schema.org", ...}'
                        />
                        {jsonError && <p className="text-[10px] text-red-400 mt-1">{jsonError}</p>}
                    </div>

                    <button onClick={handleSave} disabled={saving || !form.schemaData} className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-[#466A68] to-[#3a5856] text-white text-sm font-medium rounded-lg disabled:opacity-50 transition-all">
                        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                        {editingId ? "Update" : "Simpan"}
                    </button>
                </div>
            )}

            {/* Schema List */}
            <div className="space-y-2">
                {loading ? (
                    <div className="flex items-center justify-center h-32"><Loader2 className="h-6 w-6 text-[#466A68] animate-spin" /></div>
                ) : schemas.length === 0 ? (
                    <div className="bg-[#2a2018] border border-[#D4BCAA]/10 rounded-xl flex flex-col items-center justify-center h-32 text-[#D4BCAA]/30">
                        <FileJson className="h-6 w-6 mb-2" />
                        <p className="text-sm">Belum ada schema</p>
                    </div>
                ) : (
                    schemas.map((schema) => (
                        <div key={schema.id} className="bg-[#2a2018] border border-[#D4BCAA]/10 rounded-xl p-4">
                            <div className="flex items-center gap-3">
                                <Code2 className={`h-4 w-4 flex-shrink-0 ${schema.isActive ? "text-[#466A68]" : "text-[#D4BCAA]/20"}`} />
                                <div className="flex-1 min-w-0">
                                    <p className={`text-sm font-medium ${schema.isActive ? "text-[#F4EEE7]" : "text-[#D4BCAA]/40"}`}>{schema.schemaType}</p>
                                    <p className="text-[10px] text-[#D4BCAA]/25 mt-0.5">
                                        {schema.entityType}{schema.entityId ? ` · ${schema.entityId}` : ""} · {new Date(schema.createdAt).toLocaleDateString("id-ID")}
                                    </p>
                                </div>
                                <div className="flex items-center gap-1 flex-shrink-0">
                                    <button onClick={() => handleToggle(schema)} className={`p-1.5 transition-colors ${schema.isActive ? "text-green-400 hover:text-green-300" : "text-[#D4BCAA]/20 hover:text-[#D4BCAA]/50"}`}>
                                        {schema.isActive ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                                    </button>
                                    <button onClick={() => startEdit(schema)} className="p-1.5 text-[#D4BCAA]/30 hover:text-[#466A68] transition-colors">
                                        <Pencil className="h-4 w-4" />
                                    </button>
                                    <button onClick={() => handleDelete(schema.id)} className="p-1.5 text-[#D4BCAA]/30 hover:text-red-400 transition-colors">
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                            <pre className="mt-2 px-3 py-2 bg-[#1a1412] rounded-lg text-[10px] text-[#D4BCAA]/40 font-mono overflow-x-auto max-h-20 scrollbar-thin">
                                {(() => { try { return JSON.stringify(JSON.parse(schema.schemaData), null, 2) } catch { return schema.schemaData } })()}
                            </pre>
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}
