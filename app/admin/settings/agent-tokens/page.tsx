"use client"

import { type FormEvent, useCallback, useEffect, useState } from "react"
import { Loader2, Plus, ShieldOff, Trash2, KeyRound, Copy } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { AdminClientError, adminDelete, adminGet, adminPost, adminPut } from "@/lib/api/admin-client"

const AGENT_SCOPES = ["article:create", "article:publish", "article:generate", "image:generate"] as const
type AgentScope = (typeof AGENT_SCOPES)[number]

const SCOPE_DESCRIPTIONS: Record<AgentScope, string> = {
    "article:create": "Kirim artikel siap-pakai (HTML) sebagai draft",
    "article:publish": "Izinkan status PUBLISHED (tampil langsung di website)",
    "article:generate": "Minta sistem membuat artikel via AI",
    "image:generate": "Izinkan generate featured image via AI",
}

type AgentTokenItem = {
    id: string
    name: string
    tokenPrefix: string
    scopes: AgentScope[]
    isActive: boolean
    revoked: boolean
    expired: boolean
    lastUsedAt: string | null
    expiresAt: string | null
    createdAt: string
}

type TokenListResponse = {
    success: boolean
    data: AgentTokenItem[]
}

type TokenMutationResponse = {
    success: boolean
    data: AgentTokenItem & { token?: string }
}

type FeedbackState = {
    type: "success" | "error"
    message: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value)
}

function getClientErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof AdminClientError) {
        const payload = isRecord(error.payload) ? error.payload : null
        const errorCode = payload && typeof payload.errorCode === "string" ? payload.errorCode : null

        switch (errorCode) {
            case "AGENT_TOKENS_LIMIT_REACHED":
                return "Batas token aktif tercapai. Cabut token lama terlebih dahulu."
            case "AGENT_TOKEN_NOT_FOUND":
                return "Token tidak ditemukan. Muat ulang halaman."
            case "AGENT_TOKEN_REVOKED":
                return "Token sudah dicabut dan tidak bisa diaktifkan kembali."
            case "AGENT_TOKEN_VALIDATION_FAILED":
                return "Data token tidak valid. Periksa nama dan scope."
            default:
                break
        }

        if (error.status === 401) return "Sesi admin berakhir. Silakan login ulang."
        if (error.status === 403) return "Permintaan ditolak oleh proteksi keamanan. Muat ulang halaman."

        return error.message || fallback
    }

    if (error instanceof Error && error.message.trim()) return error.message
    return fallback
}

function formatDateLabel(value: string | null): string {
    if (!value) return "-"

    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return "-"

    return date.toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })
}

export default function AgentTokensPage() {
    const [tokens, setTokens] = useState<AgentTokenItem[]>([])
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [feedback, setFeedback] = useState<FeedbackState | null>(null)
    const [formError, setFormError] = useState<string | null>(null)
    const [creating, setCreating] = useState(false)
    const [mutatingId, setMutatingId] = useState<string | null>(null)
    const [issuedToken, setIssuedToken] = useState<string | null>(null)
    const [form, setForm] = useState<{ name: string; scopes: AgentScope[]; expiresInDays: string }>({
        name: "",
        scopes: ["article:create"],
        expiresInDays: "",
    })

    const fetchTokens = useCallback(async (mode: "initial" | "refresh" = "refresh") => {
        if (mode === "initial") setLoading(true)
        else setRefreshing(true)

        try {
            const data = await adminGet<TokenListResponse>("/api/admin/agent-tokens")
            if (data.success) setTokens(data.data)
        } catch (error) {
            setFeedback({ type: "error", message: getClientErrorMessage(error, "Gagal memuat daftar token") })
        } finally {
            if (mode === "initial") setLoading(false)
            else setRefreshing(false)
        }
    }, [])

    useEffect(() => {
        void fetchTokens("initial")
    }, [fetchTokens])

    const toggleScope = (scope: AgentScope) => {
        setForm((prev) => ({
            ...prev,
            scopes: prev.scopes.includes(scope)
                ? prev.scopes.filter((item) => item !== scope)
                : [...prev.scopes, scope],
        }))
        setFormError(null)
    }

    const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()

        if (form.name.trim().length < 3) {
            setFormError("Nama token minimal 3 karakter.")
            return
        }

        if (form.scopes.length === 0) {
            setFormError("Pilih minimal satu scope.")
            return
        }

        const parsedExpiry = form.expiresInDays.trim() ? Number(form.expiresInDays) : null
        if (parsedExpiry !== null && (!Number.isInteger(parsedExpiry) || parsedExpiry < 1 || parsedExpiry > 365)) {
            setFormError("Masa berlaku harus antara 1 dan 365 hari.")
            return
        }

        setCreating(true)
        setFeedback(null)
        setFormError(null)
        setIssuedToken(null)

        try {
            const data = await adminPost<
                TokenMutationResponse,
                { name: string; scopes: AgentScope[]; expiresInDays?: number }
            >("/api/admin/agent-tokens", {
                body: {
                    name: form.name.trim(),
                    scopes: form.scopes,
                    ...(parsedExpiry !== null ? { expiresInDays: parsedExpiry } : {}),
                },
            })

            if (data.success) {
                setIssuedToken(data.data.token ?? null)
                setForm({ name: "", scopes: ["article:create"], expiresInDays: "" })
                setFeedback({
                    type: "success",
                    message: "Token berhasil dibuat. Salin sekarang — nilainya tidak bisa dilihat lagi.",
                })
            }
        } catch (error) {
            setFeedback({ type: "error", message: getClientErrorMessage(error, "Gagal membuat token") })
        } finally {
            setCreating(false)
            await fetchTokens()
        }
    }

    const handleToggle = async (token: AgentTokenItem) => {
        setMutatingId(token.id)
        setFeedback(null)

        try {
            const data = await adminPut<TokenMutationResponse, { id: string; isActive: boolean }>(
                "/api/admin/agent-tokens",
                { body: { id: token.id, isActive: !token.isActive } }
            )

            if (data.success) {
                setFeedback({
                    type: "success",
                    message: token.isActive ? "Token dinonaktifkan." : "Token diaktifkan.",
                })
            }
        } catch (error) {
            setFeedback({ type: "error", message: getClientErrorMessage(error, "Gagal memperbarui token") })
        } finally {
            await fetchTokens()
            setMutatingId(null)
        }
    }

    const handleRevoke = async (token: AgentTokenItem) => {
        if (!confirm(`Cabut token "${token.name}"? Tindakan ini permanen.`)) return

        setMutatingId(token.id)
        setFeedback(null)

        try {
            const data = await adminPut<TokenMutationResponse, { id: string; revoke: boolean }>(
                "/api/admin/agent-tokens",
                { body: { id: token.id, revoke: true } }
            )

            if (data.success) {
                setFeedback({ type: "success", message: "Token dicabut." })
            }
        } catch (error) {
            setFeedback({ type: "error", message: getClientErrorMessage(error, "Gagal mencabut token") })
        } finally {
            await fetchTokens()
            setMutatingId(null)
        }
    }

    const handleDelete = async (token: AgentTokenItem) => {
        if (!confirm(`Hapus permanen catatan token "${token.name}"?`)) return

        setMutatingId(token.id)
        setFeedback(null)

        try {
            const data = await adminDelete<{ success: boolean }, { id: string }>("/api/admin/agent-tokens", {
                body: { id: token.id },
            })

            if (data.success) {
                setTokens((prev) => prev.filter((item) => item.id !== token.id))
                setFeedback({ type: "success", message: "Token dihapus." })
            }
        } catch (error) {
            setFeedback({ type: "error", message: getClientErrorMessage(error, "Gagal menghapus token") })
        } finally {
            await fetchTokens()
            setMutatingId(null)
        }
    }

    const copyIssuedToken = async () => {
        if (!issuedToken) return

        try {
            await navigator.clipboard.writeText(issuedToken)
            setFeedback({ type: "success", message: "Token disalin ke clipboard." })
        } catch {
            setFeedback({ type: "error", message: "Gagal menyalin otomatis. Salin manual dari kotak di atas." })
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
        <div className="space-y-6 max-w-3xl">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-[#0F0A09]">Agent API Tokens</h1>
                    <p className="text-[#8C7A6B]/50 text-sm mt-1">
                        Token Bearer untuk agent eksternal (OpenClaw, Hermes, AI code editor) yang memanggil{" "}
                        <code className="font-mono">POST /api/agent/articles</code>
                    </p>
                </div>

                {refreshing && (
                    <div className="inline-flex items-center gap-2 rounded-md border border-[#D4BCAA]/20 bg-white px-3 py-1.5 text-xs text-[#8C7A6B]/80">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Sinkronisasi...
                    </div>
                )}
            </div>

            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl px-5 py-4">
                <p className="text-amber-800 text-sm">
                    <strong>Penting:</strong> nilai token hanya ditampilkan sekali saat dibuat. Server menyimpan hash SHA-256 saja.
                    Berikan scope seminimal mungkin — <code className="font-mono">article:publish</code> membuat artikel langsung tampil publik.
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

            {issuedToken && (
                <div className="bg-white border border-emerald-500/30 rounded-xl px-5 py-4 space-y-2">
                    <p className="text-sm font-semibold text-[#0F0A09]">Token baru (tampil sekali)</p>
                    <p className="font-mono text-xs break-all bg-[#F9F6F0] rounded-lg px-3 py-2 text-[#0F0A09]">
                        {issuedToken}
                    </p>
                    <button
                        onClick={copyIssuedToken}
                        className="inline-flex items-center gap-2 px-3 py-1.5 text-xs border border-[#D4BCAA]/30 rounded-md text-[#8C7A6B] hover:text-[#0F0A09] transition-colors"
                    >
                        <Copy className="h-3.5 w-3.5" />
                        Salin token
                    </button>
                </div>
            )}

            <div className="bg-white border border-[#D4BCAA]/20 rounded-xl overflow-hidden">
                <div className="px-6 py-4 border-b border-[#D4BCAA]/20">
                    <h2 className="font-semibold text-[#0F0A09]">Token Terdaftar ({tokens.length})</h2>
                </div>

                {tokens.length === 0 ? (
                    <div className="px-6 py-8 text-center text-[#8C7A6B]/40 text-sm">
                        Belum ada token agent.
                    </div>
                ) : (
                    <div className="divide-y divide-[#D4BCAA]/20">
                        {tokens.map((token) => {
                            const disableActions = creating || refreshing || mutatingId !== null

                            return (
                                <div key={token.id} className="px-6 py-4 flex items-start gap-4">
                                    <div
                                        className={`w-10 h-10 rounded-lg flex items-center justify-center ${token.isActive
                                            ? "bg-[#466A68]/15 text-[#466A68]"
                                            : "bg-[#D4BCAA]/10 text-[#8C7A6B]/40"
                                            }`}
                                    >
                                        <KeyRound className="h-4 w-4" />
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <p className="text-sm font-medium text-[#0F0A09]">{token.name}</p>
                                            {token.revoked ? (
                                                <Badge variant="outline" className="border-red-500/30 bg-red-500/10 text-red-700">
                                                    Revoked
                                                </Badge>
                                            ) : token.expired ? (
                                                <Badge variant="outline" className="border-amber-500/30 bg-amber-500/10 text-amber-700">
                                                    Expired
                                                </Badge>
                                            ) : token.isActive ? (
                                                <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-700">
                                                    Active
                                                </Badge>
                                            ) : (
                                                <Badge variant="outline" className="border-[#D4BCAA]/30 bg-[#D4BCAA]/10 text-[#8C7A6B]/70">
                                                    Inactive
                                                </Badge>
                                            )}
                                        </div>

                                        <p className="text-xs text-[#8C7A6B]/50 font-mono mt-0.5">{token.tokenPrefix}••••••</p>

                                        <p className="text-[11px] text-[#8C7A6B]/60 mt-1">
                                            Scope: {token.scopes.length ? token.scopes.join(", ") : "-"}
                                        </p>

                                        <p className="text-[10px] text-[#8C7A6B]/40 mt-1">
                                            Dibuat {formatDateLabel(token.createdAt)} · Terakhir dipakai{" "}
                                            {formatDateLabel(token.lastUsedAt)} · Kedaluwarsa{" "}
                                            {token.expiresAt ? formatDateLabel(token.expiresAt) : "tidak ada"}
                                        </p>
                                    </div>

                                    <div className="flex items-center gap-1">
                                        {!token.revoked && (
                                            <button
                                                onClick={() => handleToggle(token)}
                                                disabled={disableActions || token.expired}
                                                className="p-2 text-[#8C7A6B]/40 hover:text-[#466A68] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                                title={token.isActive ? "Nonaktifkan" : "Aktifkan"}
                                                aria-label={token.isActive ? "Nonaktifkan token" : "Aktifkan token"}
                                            >
                                                {mutatingId === token.id ? (
                                                    <Loader2 className="h-3 w-3 animate-spin" />
                                                ) : (
                                                    <div
                                                        className={`w-3 h-3 rounded-full ${token.isActive ? "bg-green-500" : "bg-[#D4BCAA]/40"}`}
                                                    />
                                                )}
                                            </button>
                                        )}

                                        {!token.revoked && (
                                            <button
                                                onClick={() => handleRevoke(token)}
                                                disabled={disableActions}
                                                className="p-2 text-[#8C7A6B]/40 hover:text-amber-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                                title="Cabut token"
                                                aria-label="Cabut token"
                                            >
                                                <ShieldOff className="h-4 w-4" />
                                            </button>
                                        )}

                                        <button
                                            onClick={() => handleDelete(token)}
                                            disabled={disableActions}
                                            className="p-2 text-[#8C7A6B]/40 hover:text-red-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                            title="Hapus catatan token"
                                            aria-label="Hapus catatan token"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>

            <div className="bg-white border border-[#D4BCAA]/20 rounded-xl overflow-hidden">
                <div className="px-6 py-4 border-b border-[#D4BCAA]/20">
                    <h2 className="font-semibold text-[#0F0A09]">Buat Token Baru</h2>
                </div>

                <form className="px-6 py-4 space-y-4" onSubmit={handleCreate}>
                    <div>
                        <label htmlFor="agent-token-name" className="block text-sm font-medium text-[#8C7A6B]/80 mb-1.5">
                            Nama token
                        </label>
                        <input
                            id="agent-token-name"
                            type="text"
                            value={form.name}
                            onChange={(e) => {
                                setForm({ ...form, name: e.target.value })
                                setFormError(null)
                            }}
                            placeholder="e.g., OpenClaw production"
                            className="w-full px-4 py-2.5 bg-white border border-[#D4BCAA]/20 rounded-lg text-[#0F0A09] text-sm placeholder-[#8C7A6B]/60 focus:outline-none focus:ring-2 focus:ring-[#466A68]/30 transition-all"
                        />
                    </div>

                    <fieldset>
                        <legend className="block text-sm font-medium text-[#8C7A6B]/80 mb-1.5">Scope</legend>
                        <div className="space-y-2">
                            {AGENT_SCOPES.map((scope) => (
                                <label key={scope} className="flex items-start gap-2 text-sm text-[#8C7A6B]/80">
                                    <input
                                        type="checkbox"
                                        checked={form.scopes.includes(scope)}
                                        onChange={() => toggleScope(scope)}
                                        className="mt-1 h-4 w-4 rounded border-[#D4BCAA]/40 text-[#466A68] focus:ring-[#466A68]/30"
                                    />
                                    <span>
                                        <code className="font-mono text-xs text-[#0F0A09]">{scope}</code>
                                        <span className="block text-[11px] text-[#8C7A6B]/50">
                                            {SCOPE_DESCRIPTIONS[scope]}
                                        </span>
                                    </span>
                                </label>
                            ))}
                        </div>
                    </fieldset>

                    <div>
                        <label htmlFor="agent-token-expiry" className="block text-sm font-medium text-[#8C7A6B]/80 mb-1.5">
                            Masa berlaku (hari, opsional)
                        </label>
                        <input
                            id="agent-token-expiry"
                            type="number"
                            min={1}
                            max={365}
                            value={form.expiresInDays}
                            onChange={(e) => {
                                setForm({ ...form, expiresInDays: e.target.value })
                                setFormError(null)
                            }}
                            placeholder="90"
                            className="w-full px-4 py-2.5 bg-white border border-[#D4BCAA]/20 rounded-lg text-[#0F0A09] text-sm placeholder-[#8C7A6B]/60 focus:outline-none focus:ring-2 focus:ring-[#466A68]/30 transition-all"
                        />
                    </div>

                    {formError && <p className="text-xs text-red-700">{formError}</p>}

                    <button
                        type="submit"
                        disabled={creating || refreshing}
                        className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-[#466A68] to-[#3a5856] text-white text-sm font-medium rounded-lg hover:from-[#3a5856] hover:to-[#466A68] disabled:opacity-50 transition-all"
                    >
                        {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                        Buat Token
                    </button>
                </form>
            </div>
        </div>
    )
}
