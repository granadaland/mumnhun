"use client"

import { type FormEvent, useCallback, useEffect, useState } from "react"
import { Loader2, RefreshCw, Save, ScanSearch, Sparkles, Trash2, Type } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { AdminClientError, adminDelete, adminGet, adminPatch, adminPost, adminPut } from "@/lib/api/admin-client"

/**
 * Per-task AI model configuration.
 *
 * Three independent credentials, one per role, with no rotation between them. Each card
 * owns its own API key, base URL, and model so an operator can point scanning, text, and
 * image work at different providers.
 */

type AiRole = "scanning" | "text" | "image"
type ConnectionStatus = "connected" | "failed" | "not_tested" | "not_configured"

type RoleModelItem = {
    id: string | null
    role: AiRole
    provider: string | null
    baseUrl: string | null
    model: string | null
    authStyle: string | null
    label: string | null
    isActive: boolean
    usageCount: number
    lastUsedAt: string | null
    apiKeyMasked: string | null
    connectionStatus: ConnectionStatus
    lastError: string | null
    lastErrorCode: string | null
}

type RoleModelsResponse = { success: boolean; data: RoleModelItem[] }
type RoleModelMutationResponse = { success: boolean; data: RoleModelItem; availableModels?: string[] }
type DiscoverModelsResponse = {
    success: boolean
    data: { provider: string; models: Array<{ id: string; ownedBy: string | null }>; authStyle: string | null }
}

type RoleFormState = {
    provider: "openai_compatible" | "gemini"
    apiKey: string
    baseUrl: string
    model: string
    label: string
}

const ROLE_META: Record<AiRole, { title: string; subtitle: string; tasks: string[]; icon: typeof Type }> = {
    scanning: {
        title: "Model A — Scanning",
        subtitle: "Audit arsip artikel & saran internal link",
        tasks: [
            "Memindai seluruh artikel PUBLISHED",
            "Menyusun ide konten & kalender 30 hari",
            "Mengusulkan internal link antar artikel",
        ],
        icon: ScanSearch,
    },
    text: {
        title: "Model B — Generate Teks",
        subtitle: "Judul, outline, artikel utuh, metadata SEO",
        tasks: [
            "Ide judul gaya HaiBunda (natural, singkat, SEO friendly)",
            "Outline berstruktur kuat",
            "Artikel utuh menyapa audiens sebagai \u201cMums\u201d",
            "Keyword, meta title/description, schema, kategori & tag",
        ],
        icon: Type,
    },
    image: {
        title: "Model C — Generate Gambar",
        subtitle: "Featured image, gambar dalam artikel, alt & caption",
        tasks: [
            "Featured image dan gambar isi artikel",
            "Alt text otomatis (bisa diedit)",
            "Caption foto otomatis (bisa diedit)",
            "Wajib provider OpenAI-compatible (/images/generations)",
        ],
        icon: Sparkles,
    },
}

const EMPTY_FORM: RoleFormState = {
    provider: "openai_compatible",
    apiKey: "",
    baseUrl: "",
    model: "",
    label: "",
}

function getErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof AdminClientError) {
        const payload = error.payload
        if (payload && typeof payload === "object" && !Array.isArray(payload)) {
            const record = payload as Record<string, unknown>
            if (typeof record.error === "string" && record.error.trim()) {
                const details = record.details
                if (details && typeof details === "object" && !Array.isArray(details)) {
                    const reason = (details as Record<string, unknown>).reason
                    if (typeof reason === "string" && reason.trim()) {
                        return `${record.error}: ${reason}`
                    }
                }
                return record.error
            }
        }
        if (error.message.trim()) return error.message
    }
    if (error instanceof Error && error.message.trim()) return error.message
    return fallback
}

function getStatusMeta(status: ConnectionStatus): { label: string; className: string } {
    switch (status) {
        case "connected":
            return { label: "Connected", className: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700" }
        case "failed":
            return { label: "Failed", className: "border-red-500/30 bg-red-500/10 text-red-700" }
        case "not_tested":
            return { label: "Not Tested", className: "border-[#D4BCAA]/30 bg-[#D4BCAA]/10 text-[#8C7A6B]" }
        default:
            return { label: "Belum diatur", className: "border-[#D4BCAA]/30 bg-[#FAF9F7] text-[#8C7A6B]" }
    }
}

function formatDate(value: string | null): string | null {
    if (!value) return null
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return null
    return date.toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })
}

export default function AiRoleModelsPage() {
    const [items, setItems] = useState<RoleModelItem[]>([])
    const [loading, setLoading] = useState(true)
    const [forms, setForms] = useState<Record<AiRole, RoleFormState>>({
        scanning: EMPTY_FORM,
        text: EMPTY_FORM,
        image: EMPTY_FORM,
    })
    const [busyRole, setBusyRole] = useState<AiRole | null>(null)
    const [discoveringRole, setDiscoveringRole] = useState<AiRole | null>(null)
    const [discovered, setDiscovered] = useState<Record<string, string[]>>({})
    const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null)

    const fetchItems = useCallback(async (initial = false) => {
        if (initial) setLoading(true)
        try {
            const response = await adminGet<RoleModelsResponse>("/api/admin/ai/role-models")
            if (response.success) setItems(response.data)
        } catch (err) {
            setFeedback({ type: "error", message: getErrorMessage(err, "Gagal memuat konfigurasi model AI") })
        } finally {
            if (initial) setLoading(false)
        }
    }, [])

    useEffect(() => {
        void fetchItems(true)
    }, [fetchItems])

    const updateForm = (role: AiRole, patch: Partial<RoleFormState>) => {
        setForms((prev) => ({ ...prev, [role]: { ...prev[role], ...patch } }))
    }

    const handleDiscover = async (role: AiRole) => {
        const form = forms[role]
        if (!form.baseUrl.trim() || !form.apiKey.trim()) {
            setFeedback({ type: "error", message: "Base URL dan API key wajib diisi untuk deteksi model." })
            return
        }

        setDiscoveringRole(role)
        setFeedback(null)

        try {
            const response = await adminPost<
                DiscoverModelsResponse,
                { provider: "openai_compatible" | "gemini"; baseUrl: string; apiKey: string }
            >("/api/admin/ai/models", {
                body: {
                    provider: form.provider,
                    baseUrl: form.baseUrl.trim(),
                    apiKey: form.apiKey.trim(),
                },
                timeoutMs: 40_000,
            })

            if (response.success) {
                const ids = response.data.models.map((entry) => entry.id)
                setDiscovered((prev) => ({ ...prev, [role]: ids }))
                setFeedback(
                    ids.length > 0
                        ? { type: "success", message: `Ditemukan ${ids.length} model.` }
                        : { type: "error", message: "Provider tidak mengembalikan daftar model. Tulis nama model manual." }
                )
            }
        } catch (err) {
            setFeedback({ type: "error", message: getErrorMessage(err, "Gagal membaca daftar model") })
        } finally {
            setDiscoveringRole(null)
        }
    }

    const handleSave = async (role: AiRole, event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        const form = forms[role]

        if (!form.apiKey.trim()) {
            setFeedback({ type: "error", message: "API key wajib diisi." })
            return
        }

        if (form.provider === "openai_compatible") {
            if (!form.baseUrl.trim()) {
                setFeedback({ type: "error", message: "Base URL wajib diisi untuk provider OpenAI-compatible." })
                return
            }
            if (!form.model.trim()) {
                setFeedback({ type: "error", message: "Model wajib diisi." })
                return
            }
        }

        setBusyRole(role)
        setFeedback(null)

        try {
            const response = await adminPut<
                RoleModelMutationResponse,
                {
                    role: AiRole
                    apiKey: string
                    provider: "openai_compatible" | "gemini"
                    baseUrl?: string
                    model?: string
                    label?: string
                }
            >("/api/admin/ai/role-models", {
                body: {
                    role,
                    apiKey: form.apiKey.trim(),
                    provider: form.provider,
                    ...(form.baseUrl.trim() ? { baseUrl: form.baseUrl.trim() } : {}),
                    ...(form.model.trim() ? { model: form.model.trim() } : {}),
                    ...(form.label.trim() ? { label: form.label.trim() } : {}),
                },
                timeoutMs: 60_000,
            })

            if (response.success) {
                setForms((prev) => ({ ...prev, [role]: { ...prev[role], apiKey: "" } }))
                setFeedback({ type: "success", message: `${ROLE_META[role].title} berhasil disimpan dan diuji.` })
            }
        } catch (err) {
            setFeedback({ type: "error", message: getErrorMessage(err, "Gagal menyimpan model AI") })
        } finally {
            setBusyRole(null)
            await fetchItems()
        }
    }

    const handleRetest = async (role: AiRole) => {
        setBusyRole(role)
        setFeedback(null)

        try {
            const response = await adminPatch<RoleModelMutationResponse, { role: AiRole; retest: boolean }>(
                "/api/admin/ai/role-models",
                { body: { role, retest: true }, timeoutMs: 60_000 }
            )
            if (response.success) {
                setFeedback({ type: "success", message: "Koneksi berhasil diuji ulang." })
            }
        } catch (err) {
            setFeedback({ type: "error", message: getErrorMessage(err, "Gagal menguji ulang koneksi") })
        } finally {
            setBusyRole(null)
            await fetchItems()
        }
    }

    const handleToggle = async (role: AiRole, nextActive: boolean) => {
        setBusyRole(role)
        setFeedback(null)

        try {
            await adminPatch<RoleModelMutationResponse, { role: AiRole; isActive: boolean }>(
                "/api/admin/ai/role-models",
                { body: { role, isActive: nextActive }, timeoutMs: 60_000 }
            )
            setFeedback({
                type: "success",
                message: nextActive ? "Model diaktifkan." : "Model dinonaktifkan.",
            })
        } catch (err) {
            setFeedback({ type: "error", message: getErrorMessage(err, "Gagal memperbarui model") })
        } finally {
            setBusyRole(null)
            await fetchItems()
        }
    }

    const handleDelete = async (role: AiRole) => {
        if (!confirm(`Hapus konfigurasi ${ROLE_META[role].title}?`)) return

        setBusyRole(role)
        setFeedback(null)

        try {
            await adminDelete<{ success: boolean }, { role: AiRole }>("/api/admin/ai/role-models", {
                body: { role },
            })
            setFeedback({ type: "success", message: "Konfigurasi model dihapus." })
        } catch (err) {
            setFeedback({ type: "error", message: getErrorMessage(err, "Gagal menghapus model") })
        } finally {
            setBusyRole(null)
            await fetchItems()
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-6 w-6 text-[#466A68] animate-spin" />
            </div>
        )
    }

    return (
        <div className="space-y-6 max-w-4xl">
            <div>
                <h1 className="text-2xl font-bold text-[#0F0A09]">AI Models per Tugas</h1>
                <p className="text-[#8C7A6B] text-sm mt-1">
                    Tiga model terpisah dengan API key dan base URL masing-masing. Tidak ada rotasi antar model —
                    setiap tugas selalu memakai model yang Anda tetapkan.
                </p>
            </div>

            {feedback && (
                <div
                    role="status"
                    aria-live="polite"
                    className={`px-4 py-3 rounded-lg border text-sm ${feedback.type === "error"
                        ? "border-red-500/20 bg-red-500/10 text-red-700"
                        : "border-emerald-500/20 bg-emerald-500/10 text-emerald-700"
                        }`}
                >
                    {feedback.message}
                </div>
            )}

            {items.map((item) => {
                const meta = ROLE_META[item.role]
                const form = forms[item.role]
                const statusMeta = getStatusMeta(item.connectionStatus)
                const lastUsed = formatDate(item.lastUsedAt)
                const isBusy = busyRole === item.role
                const isCustom = form.provider === "openai_compatible"
                const modelOptions = discovered[item.role] ?? []
                const RoleIcon = meta.icon

                return (
                    <section
                        key={item.role}
                        className="bg-white border border-[#D4BCAA]/20 rounded-xl overflow-hidden"
                    >
                        <div className="px-6 py-4 border-b border-[#D4BCAA]/20 flex items-start justify-between gap-4">
                            <div className="flex items-start gap-3">
                                <div className="w-10 h-10 rounded-lg bg-[#466A68]/10 text-[#466A68] flex items-center justify-center shrink-0">
                                    <RoleIcon className="h-5 w-5" />
                                </div>
                                <div>
                                    <div className="flex flex-wrap items-center gap-2">
                                        <h2 className="font-semibold text-[#0F0A09]">{meta.title}</h2>
                                        <Badge variant="outline" className={statusMeta.className}>
                                            {statusMeta.label}
                                        </Badge>
                                        {item.id && !item.isActive && (
                                            <Badge variant="outline" className="border-amber-500/30 bg-amber-500/10 text-amber-700">
                                                Nonaktif
                                            </Badge>
                                        )}
                                    </div>
                                    <p className="text-xs text-[#8C7A6B] mt-0.5">{meta.subtitle}</p>
                                </div>
                            </div>

                            {item.id && (
                                <div className="flex items-center gap-1 shrink-0">
                                    <button
                                        type="button"
                                        onClick={() => handleRetest(item.role)}
                                        disabled={isBusy}
                                        className="p-2 text-[#8C7A6B] hover:text-[#466A68] disabled:opacity-40 transition-colors"
                                        title="Uji ulang koneksi"
                                        aria-label="Uji ulang koneksi"
                                    >
                                        <RefreshCw className={`h-4 w-4 ${isBusy ? "animate-spin" : ""}`} />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleToggle(item.role, !item.isActive)}
                                        disabled={isBusy}
                                        className={`p-2 disabled:opacity-40 transition-colors ${item.isActive ? "text-green-600" : "text-[#8C7A6B]"
                                            }`}
                                        title={item.isActive ? "Nonaktifkan" : "Aktifkan"}
                                        aria-label={item.isActive ? "Nonaktifkan model" : "Aktifkan model"}
                                    >
                                        <span
                                            className={`block w-3 h-3 rounded-full ${item.isActive ? "bg-green-500" : "bg-[#D4BCAA]"
                                                }`}
                                        />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleDelete(item.role)}
                                        disabled={isBusy}
                                        className="p-2 text-[#8C7A6B] hover:text-red-600 disabled:opacity-40 transition-colors"
                                        title="Hapus konfigurasi"
                                        aria-label="Hapus konfigurasi"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="px-6 py-4 grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div className="space-y-3">
                                <h3 className="text-xs font-semibold text-[#8C7A6B] uppercase tracking-wider">
                                    Penugasan
                                </h3>
                                <ul className="space-y-1.5 text-xs text-[#8C7A6B]">
                                    {meta.tasks.map((task) => (
                                        <li key={task} className="flex items-start gap-2">
                                            <span className="mt-1 w-1.5 h-1.5 rounded-full bg-[#466A68]/50 shrink-0" />
                                            {task}
                                        </li>
                                    ))}
                                </ul>

                                {item.id && (
                                    <dl className="mt-4 space-y-1.5 text-xs bg-[#FAF9F7] p-3 rounded-lg border border-[#D4BCAA]/20">
                                        <div className="flex justify-between gap-2">
                                            <dt className="text-[#8C7A6B]/70">Provider</dt>
                                            <dd className="text-[#0F0A09]">
                                                {item.provider === "openai_compatible" ? "OpenAI-compatible" : "Gemini"}
                                            </dd>
                                        </div>
                                        <div className="flex justify-between gap-2">
                                            <dt className="text-[#8C7A6B]/70">Model</dt>
                                            <dd className="text-[#0F0A09] font-mono text-[11px] truncate max-w-[60%]">
                                                {item.model || "-"}
                                            </dd>
                                        </div>
                                        <div className="flex justify-between gap-2">
                                            <dt className="text-[#8C7A6B]/70">API Key</dt>
                                            <dd className="text-[#0F0A09] font-mono text-[11px]">{item.apiKeyMasked}</dd>
                                        </div>
                                        {item.baseUrl && (
                                            <div>
                                                <dt className="text-[#8C7A6B]/70">Base URL</dt>
                                                <dd className="text-[#0F0A09] font-mono text-[11px] break-all">
                                                    {item.baseUrl}
                                                </dd>
                                            </div>
                                        )}
                                        <div className="flex justify-between gap-2">
                                            <dt className="text-[#8C7A6B]/70">Dipakai</dt>
                                            <dd className="text-[#0F0A09]">
                                                {item.usageCount}x{lastUsed ? ` · ${lastUsed}` : ""}
                                            </dd>
                                        </div>
                                        {item.connectionStatus === "failed" && item.lastError && (
                                            <div className="pt-1 border-t border-[#D4BCAA]/20">
                                                <dt className="text-red-700/80">Gagal terakhir</dt>
                                                <dd className="text-red-700">{item.lastError}</dd>
                                            </div>
                                        )}
                                    </dl>
                                )}
                            </div>

                            <form className="space-y-3" onSubmit={(event) => handleSave(item.role, event)}>
                                <h3 className="text-xs font-semibold text-[#8C7A6B] uppercase tracking-wider">
                                    {item.id ? "Ganti Kredensial" : "Atur Kredensial"}
                                </h3>

                                <div>
                                    <label
                                        htmlFor={`provider-${item.role}`}
                                        className="block text-xs text-[#8C7A6B] mb-1"
                                    >
                                        Provider
                                    </label>
                                    <select
                                        id={`provider-${item.role}`}
                                        value={form.provider}
                                        onChange={(e) =>
                                            updateForm(item.role, {
                                                provider: e.target.value as RoleFormState["provider"],
                                                ...(e.target.value === "gemini" ? { baseUrl: "", model: "" } : {}),
                                            })
                                        }
                                        disabled={item.role === "image"}
                                        className="w-full bg-white border border-[#D4BCAA]/30 rounded-lg px-3 py-2 text-sm text-[#0F0A09] outline-none focus:ring-2 focus:ring-[#466A68]/30 disabled:bg-[#FAF9F7]"
                                    >
                                        <option value="openai_compatible">Custom (OpenAI-compatible)</option>
                                        <option value="gemini">Google Gemini</option>
                                    </select>
                                    {item.role === "image" && (
                                        <p className="text-[10px] text-[#8C7A6B]/60 mt-1">
                                            Role gambar hanya mendukung OpenAI-compatible.
                                        </p>
                                    )}
                                </div>

                                <div>
                                    <label htmlFor={`apikey-${item.role}`} className="block text-xs text-[#8C7A6B] mb-1">
                                        API Key
                                    </label>
                                    <input
                                        id={`apikey-${item.role}`}
                                        type="password"
                                        value={form.apiKey}
                                        onChange={(e) => updateForm(item.role, { apiKey: e.target.value })}
                                        placeholder={isCustom ? "sk-..." : "AIza..."}
                                        className="w-full bg-white border border-[#D4BCAA]/30 rounded-lg px-3 py-2 text-sm text-[#0F0A09] font-mono outline-none focus:ring-2 focus:ring-[#466A68]/30"
                                    />
                                </div>

                                {isCustom && (
                                    <>
                                        <div>
                                            <label
                                                htmlFor={`baseurl-${item.role}`}
                                                className="block text-xs text-[#8C7A6B] mb-1"
                                            >
                                                Base URL
                                            </label>
                                            <input
                                                id={`baseurl-${item.role}`}
                                                type="url"
                                                value={form.baseUrl}
                                                onChange={(e) => updateForm(item.role, { baseUrl: e.target.value })}
                                                placeholder="https://api.openai.com/v1"
                                                className="w-full bg-white border border-[#D4BCAA]/30 rounded-lg px-3 py-2 text-sm text-[#0F0A09] font-mono outline-none focus:ring-2 focus:ring-[#466A68]/30"
                                            />
                                        </div>

                                        <div>
                                            <div className="flex items-center justify-between mb-1">
                                                <label htmlFor={`model-${item.role}`} className="block text-xs text-[#8C7A6B]">
                                                    Model
                                                </label>
                                                <button
                                                    type="button"
                                                    onClick={() => handleDiscover(item.role)}
                                                    disabled={
                                                        discoveringRole === item.role ||
                                                        !form.baseUrl.trim() ||
                                                        !form.apiKey.trim()
                                                    }
                                                    className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] border border-[#466A68]/30 text-[#466A68] rounded hover:bg-[#466A68]/5 disabled:opacity-40"
                                                >
                                                    {discoveringRole === item.role && (
                                                        <Loader2 className="h-3 w-3 animate-spin" />
                                                    )}
                                                    Deteksi model
                                                </button>
                                            </div>

                                            {modelOptions.length > 0 && (
                                                <select
                                                    value={modelOptions.includes(form.model) ? form.model : ""}
                                                    onChange={(e) => {
                                                        if (e.target.value) updateForm(item.role, { model: e.target.value })
                                                    }}
                                                    className="w-full mb-2 bg-[#FAF9F7] border border-[#D4BCAA]/30 rounded-lg px-3 py-2 text-xs text-[#0F0A09] font-mono outline-none focus:ring-2 focus:ring-[#466A68]/30"
                                                    size={Math.min(6, Math.max(3, modelOptions.length))}
                                                >
                                                    {modelOptions.map((modelId) => (
                                                        <option key={modelId} value={modelId}>
                                                            {modelId}
                                                        </option>
                                                    ))}
                                                </select>
                                            )}

                                            <input
                                                id={`model-${item.role}`}
                                                type="text"
                                                value={form.model}
                                                onChange={(e) => updateForm(item.role, { model: e.target.value })}
                                                placeholder={item.role === "image" ? "gpt-image-1" : "gpt-4o-mini"}
                                                className="w-full bg-white border border-[#D4BCAA]/30 rounded-lg px-3 py-2 text-sm text-[#0F0A09] font-mono outline-none focus:ring-2 focus:ring-[#466A68]/30"
                                            />
                                        </div>
                                    </>
                                )}

                                <div>
                                    <label htmlFor={`label-${item.role}`} className="block text-xs text-[#8C7A6B] mb-1">
                                        Label (opsional)
                                    </label>
                                    <input
                                        id={`label-${item.role}`}
                                        type="text"
                                        value={form.label}
                                        onChange={(e) => updateForm(item.role, { label: e.target.value })}
                                        placeholder="mis. OpenRouter GPT-4o"
                                        className="w-full bg-white border border-[#D4BCAA]/30 rounded-lg px-3 py-2 text-sm text-[#0F0A09] outline-none focus:ring-2 focus:ring-[#466A68]/30"
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={isBusy || !form.apiKey.trim()}
                                    className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#466A68] text-white rounded-lg text-sm font-medium disabled:opacity-50"
                                >
                                    {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                    Simpan &amp; Uji Koneksi
                                </button>
                            </form>
                        </div>
                    </section>
                )
            })}
        </div>
    )
}
