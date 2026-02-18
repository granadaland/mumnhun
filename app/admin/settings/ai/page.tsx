"use client"

import { useState, useEffect } from "react"
import { Loader2, Plus, Trash2, Key } from "lucide-react"
import { AdminClientError, adminDelete, adminGet, adminPost, adminPut } from "@/lib/api/admin-client"

type ApiKeyItem = {
    id: string
    provider?: string
    label: string | null
    apiKeyMasked: string
    isActive: boolean
    usageCount: number
    order: number
    lastUsedAt?: string | null
    lastError?: string | null
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

function getClientErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof AdminClientError) return error.message
    if (error instanceof Error && error.message.trim().length > 0) return error.message
    return fallback
}

export default function AiSettingsPage() {
    const [keys, setKeys] = useState<ApiKeyItem[]>([])
    const [loading, setLoading] = useState(true)
    const [errorMessage, setErrorMessage] = useState<string | null>(null)
    const [newKey, setNewKey] = useState({ label: "", apiKey: "" })
    const [adding, setAdding] = useState(false)

    useEffect(() => {
        fetchKeys()
    }, [])

    const fetchKeys = async () => {
        setErrorMessage(null)
        try {
            const data = await adminGet<ApiKeysResponse>("/api/admin/ai/keys")
            if (data.success) {
                setKeys(data.data)
            }
        } catch (err) {
            setErrorMessage(getClientErrorMessage(err, "Gagal memuat API key"))
            console.error("Failed to fetch keys:", err)
        } finally {
            setLoading(false)
        }
    }

    const handleAddKey = async () => {
        if (!newKey.apiKey.trim()) return
        setAdding(true)
        setErrorMessage(null)
        try {
            const data = await adminPost<ApiKeyMutationResponse, { label: string; apiKey: string }>("/api/admin/ai/keys", {
                body: newKey,
            })

            if (data.success) {
                setKeys((prev) => [...prev, data.data])
                setNewKey({ label: "", apiKey: "" })
            }
        } catch (err) {
            setErrorMessage(getClientErrorMessage(err, "Gagal menambah API key"))
            console.error("Failed to add key:", err)
        } finally {
            setAdding(false)
        }
    }

    const handleToggleKey = async (id: string, isActive: boolean) => {
        setErrorMessage(null)
        try {
            const data = await adminPut<ApiKeyMutationResponse, { id: string; isActive: boolean }>("/api/admin/ai/keys", {
                body: { id, isActive: !isActive },
            })

            if (data.success) {
                setKeys((prev) => prev.map((k) => (k.id === id ? { ...k, isActive: !isActive } : k)))
            }
        } catch (err) {
            setErrorMessage(getClientErrorMessage(err, "Gagal memperbarui API key"))
            console.error("Failed to toggle key:", err)
        }
    }

    const handleDeleteKey = async (id: string) => {
        if (!confirm("Yakin ingin menghapus API key ini?")) return
        setErrorMessage(null)
        try {
            const data = await adminDelete<ApiKeyDeleteResponse, { id: string }>("/api/admin/ai/keys", {
                body: { id },
            })

            if (data.success) {
                setKeys((prev) => prev.filter((k) => k.id !== id))
            }
        } catch (err) {
            setErrorMessage(getClientErrorMessage(err, "Gagal menghapus API key"))
            console.error("Failed to delete key:", err)
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
            <div>
                <h1 className="text-2xl font-bold text-[#F4EEE7]">AI Configuration</h1>
                <p className="text-[#D4BCAA]/50 text-sm mt-1">
                    Kelola API keys Google Gemini (maks 5 keys, auto-rotary)
                </p>
            </div>

            {/* Info */}
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl px-5 py-4">
                <p className="text-blue-300 text-sm">
                    <strong>Auto-Rotary:</strong> Sistem akan otomatis merotasi penggunaan API key untuk menghindari rate limit. Key dengan usage count terendah akan digunakan lebih dulu.
                </p>
            </div>

            {errorMessage && (
                <div className="px-4 py-3 rounded-lg border border-red-500/20 bg-red-500/10 text-red-300 text-sm">
                    {errorMessage}
                </div>
            )}

            {/* Existing Keys */}
            <div className="bg-[#2a2018] border border-[#D4BCAA]/10 rounded-xl overflow-hidden">
                <div className="px-6 py-4 border-b border-[#D4BCAA]/5">
                    <h2 className="font-semibold text-[#F4EEE7]">API Keys ({keys.length}/5)</h2>
                </div>

                {keys.length === 0 ? (
                    <div className="px-6 py-8 text-center text-[#D4BCAA]/30 text-sm">
                        Belum ada API key. Tambahkan minimal 1 key untuk menggunakan fitur AI.
                    </div>
                ) : (
                    <div className="divide-y divide-[#D4BCAA]/5">
                        {keys.map((key) => (
                            <div key={key.id} className="px-6 py-4 flex items-center gap-4">
                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${key.isActive ? "bg-[#466A68]/15 text-[#466A68]" : "bg-[#D4BCAA]/5 text-[#D4BCAA]/30"}`}>
                                    <Key className="h-4 w-4" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-[#F4EEE7]">
                                        {key.label || `Key ${key.order + 1}`}
                                    </p>
                                    <p className="text-xs text-[#D4BCAA]/40 font-mono mt-0.5">
                                        {key.apiKeyMasked}
                                    </p>
                                    <p className="text-[10px] text-[#D4BCAA]/30 mt-1">
                                        Digunakan {key.usageCount}x · {key.isActive ? "Aktif" : "Nonaktif"}
                                    </p>
                                </div>
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={() => handleToggleKey(key.id, key.isActive)}
                                        className={`p-2 transition-colors ${key.isActive ? "text-green-400 hover:text-green-300" : "text-[#D4BCAA]/30 hover:text-[#D4BCAA]/70"}`}
                                        title={key.isActive ? "Nonaktifkan" : "Aktifkan"}
                                    >
                                        <div className={`w-3 h-3 rounded-full ${key.isActive ? "bg-green-400" : "bg-[#D4BCAA]/20"}`} />
                                    </button>
                                    <button
                                        onClick={() => handleDeleteKey(key.id)}
                                        className="p-2 text-[#D4BCAA]/30 hover:text-red-400 transition-colors"
                                        title="Hapus"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Add New Key */}
            {keys.length < 5 && (
                <div className="bg-[#2a2018] border border-[#D4BCAA]/10 rounded-xl overflow-hidden">
                    <div className="px-6 py-4 border-b border-[#D4BCAA]/5">
                        <h2 className="font-semibold text-[#F4EEE7]">Tambah API Key</h2>
                    </div>
                    <div className="px-6 py-4 space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-[#D4BCAA]/80 mb-1.5">
                                Label (opsional)
                            </label>
                            <input
                                type="text"
                                value={newKey.label}
                                onChange={(e) => setNewKey({ ...newKey, label: e.target.value })}
                                placeholder="e.g., Production Key 1"
                                className="w-full px-4 py-2.5 bg-[#1a1412] border border-[#D4BCAA]/10 rounded-lg text-[#F4EEE7] text-sm placeholder-[#D4BCAA]/25 focus:outline-none focus:ring-2 focus:ring-[#466A68]/30 transition-all"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-[#D4BCAA]/80 mb-1.5">
                                API Key
                            </label>
                            <input
                                type="password"
                                value={newKey.apiKey}
                                onChange={(e) => setNewKey({ ...newKey, apiKey: e.target.value })}
                                placeholder="AIza..."
                                className="w-full px-4 py-2.5 bg-[#1a1412] border border-[#D4BCAA]/10 rounded-lg text-[#F4EEE7] text-sm placeholder-[#D4BCAA]/25 focus:outline-none focus:ring-2 focus:ring-[#466A68]/30 transition-all font-mono"
                            />
                        </div>
                        <button
                            onClick={handleAddKey}
                            disabled={adding || !newKey.apiKey.trim()}
                            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-[#466A68] to-[#3a5856] text-white text-sm font-medium rounded-lg hover:from-[#3a5856] hover:to-[#466A68] disabled:opacity-50 transition-all"
                        >
                            {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                            Tambah Key
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
