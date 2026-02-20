"use client"

import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react"
import { Loader2, Plus, Trash2, Key } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { AdminClientError, adminDelete, adminGet, adminPost, adminPut } from "@/lib/api/admin-client"

type ConnectionStatus = "connected" | "failed" | "not_tested"

type ApiKeyItem = {
    id: string
    provider?: string
    label: string | null
    apiKeyMasked: string
    isActive: boolean
    usageCount: number
    order: number
    lastUsedAt?: string | null
    connectionStatus: ConnectionStatus
    lastError?: string | null
    lastErrorCode?: string | null
}

type ApiKeysResponse = {
    success: boolean
    data: ApiKeyItem[]
}

type ApiKeyMutationResponse = {
    success: boolean
    data: ApiKeyItem
}

type ApiKeyDeleteResponse = {
    success: boolean
}

const MIN_API_KEY_LENGTH = 20

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value)
}

function mapApiKeyErrorCode(errorCode: string | null, reason: string | null, fallback: string): string {
    switch (errorCode) {
        case "AI_KEY_REQUIRED":
        case "AI_KEY_EMPTY":
            return "API key wajib diisi."
        case "AI_KEYS_LIMIT_REACHED":
            return "Maksimal 5 API key. Hapus key lama sebelum menambahkan key baru."
        case "PROVIDER_KEY_INVALID":
            return reason
                ? `API key provider tidak valid: ${reason}`
                : "API key provider tidak valid atau tidak punya izin akses."
        case "AI_KEY_NOT_FOUND":
            return "API key tidak ditemukan. Silakan muat ulang halaman."
        case "AI_KEY_ID_REQUIRED":
            return "ID API key tidak valid. Silakan muat ulang halaman."
        case "AI_KEY_NO_UPDATES":
            return "Tidak ada perubahan yang dikirim."
        case "AI_KEYS_LIST_FAILED":
            return "Gagal memuat daftar API key."
        case "AI_KEY_DELETE_FAILED":
            return "Gagal menghapus API key."
        default:
            if (typeof errorCode === "string" && errorCode.startsWith("CRYPTO_CONFIG_")) {
                return "Konfigurasi keamanan API key di server bermasalah. Hubungi developer."
            }
            return fallback
    }
}

function mapCsrfErrorMessage(errorCode: string | null, status: number | null, fallback: string): string | null {
    switch (errorCode) {
        case "CSRF_CONFIG_MISSING":
            return "Konfigurasi keamanan CSRF di server belum lengkap. Hubungi developer."
        case "CSRF_TOKEN_INIT_FAILED":
            return "Server gagal menyiapkan token keamanan. Coba lagi dalam beberapa saat."
        default:
            break
    }

    if (status === 401) {
        return "Sesi admin berakhir. Silakan login ulang lalu coba lagi."
    }

    if (status === 403) {
        return "Permintaan ditolak oleh proteksi keamanan. Muat ulang halaman lalu coba lagi."
    }

    const normalizedFallback = fallback.toLowerCase()
    if (status === 500 && normalizedFallback.includes("token keamanan")) {
        return "Layanan token keamanan admin sedang bermasalah. Coba lagi beberapa saat."
    }

    return null
}

function getClientErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof AdminClientError) {
        if (error.code === "TIMEOUT") {
            return "Permintaan ke server timeout. Coba lagi dalam beberapa saat."
        }

        if (error.code === "NETWORK_ERROR") {
            if (error.message.toLowerCase().includes("token keamanan")) {
                return "Gagal menginisialisasi token keamanan admin. Periksa koneksi lalu coba lagi."
            }
            return "Tidak bisa terhubung ke server admin. Periksa koneksi lalu coba lagi."
        }

        const payload = isRecord(error.payload) ? error.payload : null
        const errorCode = payload && typeof payload.errorCode === "string" ? payload.errorCode : null
        const details = payload && isRecord(payload.details) ? payload.details : null
        const reason = details && typeof details.reason === "string" ? details.reason : null

        const payloadMessage =
            payload && typeof payload.error === "string" && payload.error.trim().length > 0
                ? payload.error
                : payload && typeof payload.message === "string" && payload.message.trim().length > 0
                    ? payload.message
                    : null

        const normalizedFallbackMessage = payloadMessage ?? error.message ?? fallback

        const csrfMessage = mapCsrfErrorMessage(errorCode, error.status, normalizedFallbackMessage)
        if (csrfMessage) {
            return csrfMessage
        }

        return mapApiKeyErrorCode(errorCode, reason, normalizedFallbackMessage)
    }

    if (error instanceof Error && error.message.trim().length > 0) return error.message
    return fallback
}

function validateApiKey(rawApiKey: string): string | null {
    const value = rawApiKey.trim()

    if (!value) {
        return "API key wajib diisi."
    }

    if (value.length < MIN_API_KEY_LENGTH) {
        return `API key terlalu pendek (minimal ${MIN_API_KEY_LENGTH} karakter).`
    }

    return null
}

function getConnectionStatusMeta(status: ConnectionStatus): { label: string; className: string } {
    switch (status) {
        case "connected":
            return {
                label: "Connected",
                className: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700",
            }
        case "failed":
            return {
                label: "Failed",
                className: "border-red-500/30 bg-red-500/10 text-red-700",
            }
        default:
            return {
                label: "Not Tested",
                className: "border-[#D4BCAA]/20 bg-[#D4BCAA]/10 text-[#8C7A6B]/70",
            }
    }
}

function formatLastError(lastError: string | null | undefined, lastErrorCode: string | null | undefined): string | null {
    if (!lastError) return null

    const prefix = lastErrorCode ? `${lastErrorCode}::` : null
    const normalized =
        prefix && lastError.startsWith(prefix) ? lastError.slice(prefix.length).trim() : lastError.trim()

    if (normalized.length <= 160) return normalized
    return `${normalized.slice(0, 157)}...`
}

function formatDateLabel(value: string | null | undefined): string | null {
    if (!value) return null

    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return null

    return date.toLocaleString("id-ID", {
        dateStyle: "medium",
        timeStyle: "short",
    })
}

type FeedbackState = {
    type: "success" | "error"
    message: string
}

export default function AiSettingsPage() {
    const [keys, setKeys] = useState<ApiKeyItem[]>([])
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [feedback, setFeedback] = useState<FeedbackState | null>(null)
    const [newKey, setNewKey] = useState({ label: "", apiKey: "" })
    const [formError, setFormError] = useState<string | null>(null)
    const [adding, setAdding] = useState(false)
    const [mutatingKeyId, setMutatingKeyId] = useState<string | null>(null)

    const trimmedApiKey = useMemo(() => newKey.apiKey.trim(), [newKey.apiKey])

    const fetchKeys = useCallback(async (mode: "initial" | "refresh" = "refresh") => {
        if (mode === "initial") {
            setLoading(true)
        } else {
            setRefreshing(true)
        }

        try {
            const data = await adminGet<ApiKeysResponse>("/api/admin/ai/keys")
            if (data.success) {
                setKeys(data.data)
            }
        } catch (err) {
            setFeedback({
                type: "error",
                message: getClientErrorMessage(err, "Gagal memuat API key"),
            })
            console.error("Failed to fetch keys:", err)
        } finally {
            if (mode === "initial") {
                setLoading(false)
            } else {
                setRefreshing(false)
            }
        }
    }, [])

    useEffect(() => {
        void fetchKeys("initial")
    }, [fetchKeys])

    const handleAddKey = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()

        const validationError = validateApiKey(newKey.apiKey)
        if (validationError) {
            setFormError(validationError)
            return
        }

        setAdding(true)
        setFeedback(null)
        setFormError(null)

        const normalizedPayload = {
            label: newKey.label.trim(),
            apiKey: newKey.apiKey.trim(),
        }

        try {
            const data = await adminPost<ApiKeyMutationResponse, { label: string; apiKey: string }>("/api/admin/ai/keys", {
                body: normalizedPayload,
            })

            if (data.success) {
                setKeys((prev) => [...prev, data.data].sort((a, b) => a.order - b.order))
                setNewKey({ label: "", apiKey: "" })
                setFeedback({
                    type: "success",
                    message: "API key berhasil disimpan dan diuji koneksi.",
                })
            }
        } catch (err) {
            setFeedback({
                type: "error",
                message: getClientErrorMessage(err, "Gagal menambah API key"),
            })
            console.error("Failed to add key:", err)
        } finally {
            setAdding(false)
            await fetchKeys()
        }
    }

    const handleToggleKey = async (id: string, isActive: boolean) => {
        setMutatingKeyId(id)
        setFeedback(null)

        try {
            const data = await adminPut<ApiKeyMutationResponse, { id: string; isActive: boolean }>("/api/admin/ai/keys", {
                body: { id, isActive: !isActive },
            })

            if (data.success) {
                setKeys((prev) => prev.map((k) => (k.id === id ? data.data : k)))
                setFeedback({
                    type: "success",
                    message: isActive
                        ? "API key berhasil dinonaktifkan."
                        : "API key berhasil diaktifkan dan koneksi diuji.",
                })
            }
        } catch (err) {
            setFeedback({
                type: "error",
                message: getClientErrorMessage(err, "Gagal memperbarui API key"),
            })
            console.error("Failed to toggle key:", err)
        } finally {
            await fetchKeys()
            setMutatingKeyId(null)
        }
    }

    const handleDeleteKey = async (id: string) => {
        if (!confirm("Yakin ingin menghapus API key ini?")) return

        setMutatingKeyId(id)
        setFeedback(null)

        try {
            const data = await adminDelete<ApiKeyDeleteResponse, { id: string }>("/api/admin/ai/keys", {
                body: { id },
            })

            if (data.success) {
                setKeys((prev) => prev.filter((k) => k.id !== id))
                setFeedback({
                    type: "success",
                    message: "API key berhasil dihapus.",
                })
            }
        } catch (err) {
            setFeedback({
                type: "error",
                message: getClientErrorMessage(err, "Gagal menghapus API key"),
            })
            console.error("Failed to delete key:", err)
        } finally {
            await fetchKeys()
            setMutatingKeyId(null)
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
            {/* Header */}
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-[#0F0A09]">AI Configuration</h1>
                    <p className="text-[#8C7A6B]/50 text-sm mt-1">
                        Kelola API keys Google Gemini (maks 5 keys, auto-rotary)
                    </p>
                </div>

                {refreshing && (
                    <div className="inline-flex items-center gap-2 rounded-md border border-[#D4BCAA]/20 bg-white px-3 py-1.5 text-xs text-[#8C7A6B]/80">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Sinkronisasi...
                    </div>
                )}
            </div>

            {/* Info */}
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl px-5 py-4">
                <p className="text-blue-700 text-sm">
                    <strong>Auto-Rotary:</strong> Sistem akan otomatis merotasi penggunaan API key untuk menghindari rate limit. Key dengan usage count terendah akan digunakan lebih dulu.
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

            {/* Existing Keys */}
            <div className="bg-white border border-[#D4BCAA]/20 rounded-xl overflow-hidden">
                <div className="px-6 py-4 border-b border-[#D4BCAA]/20">
                    <h2 className="font-semibold text-[#0F0A09]">API Keys ({keys.length}/5)</h2>
                </div>

                {keys.length === 0 ? (
                    <div className="px-6 py-8 text-center text-[#8C7A6B]/30 text-sm">
                        Belum ada API key. Tambahkan minimal 1 key untuk menggunakan fitur AI.
                    </div>
                ) : (
                    <div className="divide-y divide-[#D4BCAA]/20">
                        {keys.map((key) => {
                            const statusMeta = getConnectionStatusMeta(key.connectionStatus)
                            const lastError = formatLastError(key.lastError, key.lastErrorCode)
                            const lastUsedLabel = formatDateLabel(key.lastUsedAt)
                            const isMutatingThisKey = mutatingKeyId === key.id
                            const disableActions = adding || refreshing || mutatingKeyId !== null

                            return (
                                <div key={key.id} className="px-6 py-4 flex items-start gap-4">
                                    <div
                                        className={`w-10 h-10 rounded-lg flex items-center justify-center ${key.isActive
                                            ? "bg-[#466A68]/15 text-[#466A68]"
                                            : "bg-[#D4BCAA]/5 text-[#8C7A6B]/30"
                                            }`}
                                    >
                                        <Key className="h-4 w-4" />
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <p className="text-sm font-medium text-[#0F0A09]">
                                                {key.label || `Key ${key.order + 1}`}
                                            </p>
                                            <Badge variant="outline" className={statusMeta.className}>
                                                {statusMeta.label}
                                            </Badge>
                                            {key.connectionStatus === "failed" && key.lastErrorCode && (
                                                <span className="text-[10px] text-red-200/80">{key.lastErrorCode}</span>
                                            )}
                                        </div>

                                        <p className="text-xs text-[#8C7A6B]/40 font-mono mt-0.5">{key.apiKeyMasked}</p>

                                        <p className="text-[10px] text-[#8C7A6B]/30 mt-1">
                                            Digunakan {key.usageCount}x · {key.isActive ? "Aktif" : "Nonaktif"}
                                            {lastUsedLabel ? ` · Terakhir dicek ${lastUsedLabel}` : ""}
                                        </p>

                                        {key.connectionStatus === "failed" && lastError && (
                                            <p className="text-xs text-red-700/90 mt-1">Gagal terakhir: {lastError}</p>
                                        )}

                                        {key.connectionStatus === "not_tested" && (
                                            <p className="text-[10px] text-[#8C7A6B]/35 mt-1">
                                                Koneksi belum pernah diuji.
                                            </p>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={() => handleToggleKey(key.id, key.isActive)}
                                            disabled={disableActions}
                                            className={`p-2 transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${key.isActive
                                                ? "text-green-600 hover:text-green-700"
                                                : "text-[#8C7A6B]/30 hover:text-[#8C7A6B]/70"
                                                }`}
                                            title={key.isActive ? "Nonaktifkan" : "Aktifkan"}
                                            aria-label={key.isActive ? "Nonaktifkan API key" : "Aktifkan API key"}
                                        >
                                            {isMutatingThisKey ? (
                                                <Loader2 className="h-3 w-3 animate-spin" />
                                            ) : (
                                                <div
                                                    className={`w-3 h-3 rounded-full ${key.isActive ? "bg-green-400" : "bg-[#D4BCAA]/20"
                                                        }`}
                                                />
                                            )}
                                        </button>

                                        <button
                                            onClick={() => handleDeleteKey(key.id)}
                                            disabled={disableActions}
                                            className="p-2 text-[#8C7A6B]/30 hover:text-red-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                            title="Hapus"
                                            aria-label="Hapus API key"
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

            {/* Add New Key */}
            {keys.length < 5 && (
                <div className="bg-white border border-[#D4BCAA]/20 rounded-xl overflow-hidden">
                    <div className="px-6 py-4 border-b border-[#D4BCAA]/20">
                        <h2 className="font-semibold text-[#0F0A09]">Tambah API Key</h2>
                    </div>
                    <form className="px-6 py-4 space-y-4" onSubmit={handleAddKey}>
                        <div>
                            <label className="block text-sm font-medium text-[#8C7A6B]/80 mb-1.5">
                                Label (opsional)
                            </label>
                            <input
                                type="text"
                                value={newKey.label}
                                onChange={(e) => setNewKey({ ...newKey, label: e.target.value })}
                                placeholder="e.g., Production Key 1"
                                className="w-full px-4 py-2.5 bg-white border border-[#D4BCAA]/20 rounded-lg text-[#0F0A09] text-sm placeholder-[#8C7A6B]/60 focus:outline-none focus:ring-2 focus:ring-[#466A68]/30 transition-all"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-[#8C7A6B]/80 mb-1.5">
                                API Key
                            </label>
                            <input
                                type="password"
                                value={newKey.apiKey}
                                onChange={(e) => {
                                    const nextValue = e.target.value
                                    setNewKey({ ...newKey, apiKey: nextValue })

                                    if (formError) {
                                        setFormError(validateApiKey(nextValue))
                                    }
                                }}
                                placeholder="AIza..."
                                className={`w-full px-4 py-2.5 bg-white border rounded-lg text-[#0F0A09] text-sm placeholder-[#8C7A6B]/60 focus:outline-none focus:ring-2 transition-all font-mono ${formError
                                    ? "border-red-500/40 focus:ring-red-500/30"
                                    : "border-[#D4BCAA]/20 focus:ring-[#466A68]/30"
                                    }`}
                            />
                            {formError && <p className="text-xs text-red-700 mt-1.5">{formError}</p>}
                        </div>
                        <button
                            type="submit"
                            disabled={adding || refreshing || trimmedApiKey.length === 0}
                            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-[#466A68] to-[#3a5856] text-white text-sm font-medium rounded-lg hover:from-[#3a5856] hover:to-[#466A68] disabled:opacity-50 transition-all"
                        >
                            {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                            Tambah Key
                        </button>
                    </form>
                </div>
            )}
        </div>
    )
}
