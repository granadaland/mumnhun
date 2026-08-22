"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
    CalendarDays,
    Check,
    ExternalLink,
    FileText,
    Link2,
    Loader2,
    PlayCircle,
    ScanSearch,
    Send,
    X,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { AdminClientError, adminGet, adminPatch, adminPost } from "@/lib/api/admin-client"

/**
 * Content audit workspace.
 *
 * Three panels backed by the audit pipeline: the gap summary, the 30-day calendar of
 * generated ideas, and the internal link suggestions. Ideas can be turned into real posts
 * (draft or scheduled) and link suggestions can be applied to live articles.
 */

type AuditIdea = {
    id: string
    title: string
    angle: string | null
    focusKeyword: string | null
    secondaryKeywords: string | null
    categorySlug: string | null
    rationale: string | null
    scheduledFor: string | null
    status: string
    postId: string | null
}

type LinkSuggestion = {
    id: string
    exactPhrase: string
    targetUrl: string
    targetTitle: string | null
    rationale: string | null
    status: string
    sourcePost: { id: string; title: string; slug: string } | null
    targetPost: { id: string; title: string; slug: string } | null
}

type AuditRecord = {
    id: string
    status: string
    scannedPosts: number
    ideaCount: number
    linkCount: number
    gapSummary: string | null
    error: string | null
    completedAt: string | null
    ideas: AuditIdea[]
    linkSuggestions: LinkSuggestion[]
}

type AuditResponse = { success: boolean; data: AuditRecord | null }
type RunAuditResponse = {
    success: boolean
    data: { id: string; ideaCount: number; linkCount: number; discardedLinkSuggestions: number }
}
type MaterializeResponse = {
    success: boolean
    data: { id: string; slug: string; title: string; status: string; editUrl: string }
}
type ApplyLinksResponse = {
    success: boolean
    data: { applied: number; dismissed: number; skipped: Array<{ id: string; reason: string }> }
}
type PublishScheduledResponse = {
    success: boolean
    data: {
        checked: number
        published: Array<{ id: string; slug: string }>
        skipped: Array<{ id: string; slug: string; reason: string }>
    }
}

function getErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof AdminClientError) {
        const payload = error.payload
        if (payload && typeof payload === "object" && !Array.isArray(payload)) {
            const record = payload as Record<string, unknown>
            if (typeof record.error === "string" && record.error.trim()) return record.error
        }
        if (error.message.trim()) return error.message
    }
    if (error instanceof Error && error.message.trim()) return error.message
    return fallback
}

function formatDate(value: string | null): string {
    if (!value) return "Belum dijadwalkan"
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return "Belum dijadwalkan"
    return date.toLocaleString("id-ID", { dateStyle: "full", timeStyle: "short" })
}

function toDateInputValue(value: string | null): string {
    if (!value) return ""
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return ""
    return date.toISOString().slice(0, 16)
}

function getIdeaStatusMeta(status: string): { label: string; className: string } {
    switch (status) {
        case "scheduled":
            return { label: "Terjadwal", className: "border-blue-500/30 bg-blue-500/10 text-blue-700" }
        case "drafted":
            return { label: "Draft dibuat", className: "border-amber-500/30 bg-amber-500/10 text-amber-700" }
        case "published":
            return { label: "Published", className: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700" }
        case "dismissed":
            return { label: "Diabaikan", className: "border-[#D4BCAA]/30 bg-[#FAF9F7] text-[#8C7A6B]" }
        default:
            return { label: "Pending", className: "border-[#D4BCAA]/30 bg-[#FAF9F7] text-[#8C7A6B]" }
    }
}

export default function ContentAuditPage() {
    const [audit, setAudit] = useState<AuditRecord | null>(null)
    const [loading, setLoading] = useState(true)
    const [running, setRunning] = useState(false)
    const [busyIdeaId, setBusyIdeaId] = useState<string | null>(null)
    const [applyingLinks, setApplyingLinks] = useState(false)
    const [publishing, setPublishing] = useState(false)
    const [selectedLinkIds, setSelectedLinkIds] = useState<Set<string>>(new Set())
    const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null)

    const [ideaCount, setIdeaCount] = useState("30")
    const [startDate, setStartDate] = useState("")
    const [publishHour, setPublishHour] = useState("9")

    const fetchAudit = useCallback(async (initial = false) => {
        if (initial) setLoading(true)
        try {
            const response = await adminGet<AuditResponse>("/api/admin/ai/audit")
            if (response.success) {
                setAudit(response.data)
                setSelectedLinkIds(
                    new Set(
                        (response.data?.linkSuggestions ?? [])
                            .filter((entry) => entry.status === "pending")
                            .map((entry) => entry.id)
                    )
                )
            }
        } catch (err) {
            setFeedback({ type: "error", message: getErrorMessage(err, "Gagal memuat hasil audit") })
        } finally {
            if (initial) setLoading(false)
        }
    }, [])

    useEffect(() => {
        void fetchAudit(true)
    }, [fetchAudit])

    const pendingLinks = useMemo(
        () => (audit?.linkSuggestions ?? []).filter((entry) => entry.status === "pending"),
        [audit]
    )

    const handleRunAudit = async () => {
        setRunning(true)
        setFeedback(null)

        try {
            const parsedIdeaCount = Number.parseInt(ideaCount, 10)
            const parsedHour = Number.parseInt(publishHour, 10)

            const response = await adminPost<
                RunAuditResponse,
                { ideaCount?: number; startDate?: string; publishHour?: number }
            >("/api/admin/ai/audit", {
                body: {
                    ...(Number.isFinite(parsedIdeaCount) ? { ideaCount: parsedIdeaCount } : {}),
                    ...(startDate ? { startDate } : {}),
                    ...(Number.isFinite(parsedHour) ? { publishHour: parsedHour } : {}),
                },
                timeoutMs: 300_000,
            })

            if (response.success) {
                setFeedback({
                    type: "success",
                    message: `Audit selesai: ${response.data.ideaCount} ide konten, ${response.data.linkCount} saran internal link${response.data.discardedLinkSuggestions > 0
                        ? ` (${response.data.discardedLinkSuggestions} saran dibuang karena frasanya tidak ditemukan)`
                        : ""
                        }.`,
                })
            }
        } catch (err) {
            setFeedback({ type: "error", message: getErrorMessage(err, "Gagal menjalankan audit konten") })
        } finally {
            setRunning(false)
            await fetchAudit()
        }
    }

    const handleReschedule = async (ideaId: string, value: string) => {
        setBusyIdeaId(ideaId)
        try {
            await adminPatch<{ success: boolean }, { id: string; scheduledFor: string | null }>(
                "/api/admin/content-calendar",
                { body: { id: ideaId, scheduledFor: value || null } }
            )
        } catch (err) {
            setFeedback({ type: "error", message: getErrorMessage(err, "Gagal mengubah jadwal") })
        } finally {
            setBusyIdeaId(null)
            await fetchAudit()
        }
    }

    const handleDismissIdea = async (ideaId: string) => {
        setBusyIdeaId(ideaId)
        try {
            await adminPatch<{ success: boolean }, { id: string; status: string }>(
                "/api/admin/content-calendar",
                { body: { id: ideaId, status: "dismissed" } }
            )
        } catch (err) {
            setFeedback({ type: "error", message: getErrorMessage(err, "Gagal mengabaikan ide") })
        } finally {
            setBusyIdeaId(null)
            await fetchAudit()
        }
    }

    const handleMaterialize = async (ideaId: string, targetStatus: "DRAFT" | "SCHEDULED") => {
        setBusyIdeaId(ideaId)
        setFeedback(null)

        try {
            const response = await adminPost<
                MaterializeResponse,
                { ideaId: string; targetStatus: "DRAFT" | "SCHEDULED" }
            >("/api/admin/content-calendar", {
                body: { ideaId, targetStatus },
                timeoutMs: 300_000,
            })

            if (response.success) {
                setFeedback({
                    type: "success",
                    message: `Artikel "${response.data.title}" dibuat dengan status ${response.data.status}.`,
                })
            }
        } catch (err) {
            setFeedback({ type: "error", message: getErrorMessage(err, "Gagal membuat artikel dari ide") })
        } finally {
            setBusyIdeaId(null)
            await fetchAudit()
        }
    }

    const handleApplyLinks = async (action: "apply" | "dismiss") => {
        const ids = Array.from(selectedLinkIds)
        if (ids.length === 0) {
            setFeedback({ type: "error", message: "Pilih minimal satu saran internal link." })
            return
        }

        setApplyingLinks(true)
        setFeedback(null)

        try {
            const response = await adminPost<
                ApplyLinksResponse,
                { ids: string[]; action: "apply" | "dismiss" }
            >("/api/admin/internal-link-suggestions", {
                body: { ids: ids.slice(0, 50), action },
                timeoutMs: 120_000,
            })

            if (response.success) {
                const skippedNote =
                    response.data.skipped.length > 0
                        ? ` ${response.data.skipped.length} dilewati karena frasanya sudah tidak ada.`
                        : ""
                setFeedback({
                    type: "success",
                    message:
                        action === "apply"
                            ? `${response.data.applied} internal link diterapkan.${skippedNote}`
                            : `${response.data.dismissed} saran diabaikan.`,
                })
            }
        } catch (err) {
            setFeedback({ type: "error", message: getErrorMessage(err, "Gagal memproses internal link") })
        } finally {
            setApplyingLinks(false)
            await fetchAudit()
        }
    }

    const handlePublishDue = async () => {
        setPublishing(true)
        setFeedback(null)

        try {
            const response = await adminPost<PublishScheduledResponse, Record<string, never>>(
                "/api/admin/posts/publish-scheduled",
                { body: {}, timeoutMs: 120_000 }
            )

            if (response.success) {
                const skippedNote =
                    response.data.skipped.length > 0
                        ? ` ${response.data.skipped.length} dilewati karena belum memenuhi syarat publish.`
                        : ""
                setFeedback({
                    type: "success",
                    message: `${response.data.published.length} artikel terjadwal dipublikasikan dari ${response.data.checked} yang jatuh tempo.${skippedNote}`,
                })
            }
        } catch (err) {
            setFeedback({ type: "error", message: getErrorMessage(err, "Gagal memproses publish terjadwal") })
        } finally {
            setPublishing(false)
            await fetchAudit()
        }
    }

    const toggleLink = (id: string) => {
        setSelectedLinkIds((prev) => {
            const next = new Set(prev)
            if (next.has(id)) {
                next.delete(id)
            } else {
                next.add(id)
            }
            return next
        })
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-6 w-6 text-[#466A68] animate-spin" />
            </div>
        )
    }

    return (
        <div className="space-y-6 max-w-5xl">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-[#0F0A09]">Audit Konten &amp; Kalender 30 Hari</h1>
                    <p className="text-[#8C7A6B] text-sm mt-1">
                        Model Scanning memindai seluruh artikel publish, lalu menyusun ide konten berjadwal dan
                        saran internal link.
                    </p>
                </div>

                <button
                    type="button"
                    onClick={handlePublishDue}
                    disabled={publishing}
                    className="inline-flex items-center gap-2 px-3 py-2 text-xs font-medium border border-[#466A68]/30 text-[#466A68] rounded-lg hover:bg-[#466A68]/5 disabled:opacity-40 transition-colors"
                    title="Publikasikan artikel terjadwal yang sudah jatuh tempo"
                >
                    {publishing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                    Publish yang jatuh tempo
                </button>
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

            {/* Run audit */}
            <section className="bg-white border border-[#D4BCAA]/20 rounded-xl p-6 space-y-4">
                <div className="flex items-center gap-2">
                    <ScanSearch className="h-4 w-4 text-[#466A68]" />
                    <h2 className="font-semibold text-[#0F0A09]">Jalankan Audit Baru</h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                        <label htmlFor="idea-count" className="block text-xs text-[#8C7A6B] mb-1">
                            Jumlah Ide
                        </label>
                        <input
                            id="idea-count"
                            type="number"
                            min={5}
                            max={30}
                            value={ideaCount}
                            onChange={(e) => setIdeaCount(e.target.value)}
                            className="w-full bg-white border border-[#D4BCAA]/30 rounded-lg px-3 py-2 text-sm text-[#0F0A09] outline-none focus:ring-2 focus:ring-[#466A68]/30"
                        />
                    </div>
                    <div>
                        <label htmlFor="start-date" className="block text-xs text-[#8C7A6B] mb-1">
                            Mulai Tanggal
                        </label>
                        <input
                            id="start-date"
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="w-full bg-white border border-[#D4BCAA]/30 rounded-lg px-3 py-2 text-sm text-[#0F0A09] outline-none focus:ring-2 focus:ring-[#466A68]/30"
                        />
                        <p className="text-[10px] text-[#8C7A6B]/60 mt-1">Kosong = mulai besok.</p>
                    </div>
                    <div>
                        <label htmlFor="publish-hour" className="block text-xs text-[#8C7A6B] mb-1">
                            Jam Publish
                        </label>
                        <input
                            id="publish-hour"
                            type="number"
                            min={0}
                            max={23}
                            value={publishHour}
                            onChange={(e) => setPublishHour(e.target.value)}
                            className="w-full bg-white border border-[#D4BCAA]/30 rounded-lg px-3 py-2 text-sm text-[#0F0A09] outline-none focus:ring-2 focus:ring-[#466A68]/30"
                        />
                    </div>
                </div>

                <button
                    type="button"
                    onClick={handleRunAudit}
                    disabled={running}
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#466A68] text-white rounded-lg text-sm font-medium disabled:opacity-50"
                >
                    {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlayCircle className="h-4 w-4" />}
                    Mulai Audit
                </button>

                {running && (
                    <p className="text-xs text-[#8C7A6B]/70">
                        Audit memindai seluruh arsip dan bisa berjalan beberapa menit. Jangan tutup halaman.
                    </p>
                )}
            </section>

            {!audit && (
                <div className="bg-white border border-[#D4BCAA]/20 rounded-xl px-6 py-10 text-center text-sm text-[#8C7A6B]">
                    Belum ada hasil audit. Jalankan audit pertama untuk membuat ide konten dan kalender.
                </div>
            )}

            {audit && (
                <>
                    {/* Gap summary */}
                    <section className="bg-white border border-[#D4BCAA]/20 rounded-xl p-6 space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <h2 className="font-semibold text-[#0F0A09]">Ringkasan Gap Konten</h2>
                            <div className="flex items-center gap-2 text-xs text-[#8C7A6B]">
                                <Badge variant="outline" className="border-[#D4BCAA]/30 bg-[#FAF9F7] text-[#8C7A6B]">
                                    {audit.scannedPosts} artikel dipindai
                                </Badge>
                                {audit.status === "failed" && (
                                    <Badge variant="outline" className="border-red-500/30 bg-red-500/10 text-red-700">
                                        Gagal
                                    </Badge>
                                )}
                            </div>
                        </div>

                        {audit.error && <p className="text-sm text-red-700">{audit.error}</p>}

                        {audit.gapSummary ? (
                            <p className="text-sm text-[#8C7A6B] whitespace-pre-line leading-relaxed">
                                {audit.gapSummary}
                            </p>
                        ) : (
                            <p className="text-sm text-[#8C7A6B]/70">Belum ada ringkasan.</p>
                        )}
                    </section>

                    {/* Calendar */}
                    <section className="bg-white border border-[#D4BCAA]/20 rounded-xl overflow-hidden">
                        <div className="px-6 py-4 border-b border-[#D4BCAA]/20 flex items-center gap-2">
                            <CalendarDays className="h-4 w-4 text-[#466A68]" />
                            <h2 className="font-semibold text-[#0F0A09]">
                                Kalender Konten ({audit.ideas.length})
                            </h2>
                        </div>

                        {audit.ideas.length === 0 ? (
                            <p className="px-6 py-8 text-center text-sm text-[#8C7A6B]">Belum ada ide konten.</p>
                        ) : (
                            <ul className="divide-y divide-[#D4BCAA]/20">
                                {audit.ideas.map((idea) => {
                                    const statusMeta = getIdeaStatusMeta(idea.status)
                                    const isBusy = busyIdeaId === idea.id

                                    return (
                                        <li key={idea.id} className="px-6 py-4 space-y-3">
                                            <div className="flex flex-wrap items-start justify-between gap-3">
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <h3 className="text-sm font-semibold text-[#0F0A09]">{idea.title}</h3>
                                                        <Badge variant="outline" className={statusMeta.className}>
                                                            {statusMeta.label}
                                                        </Badge>
                                                    </div>
                                                    <p className="text-xs text-[#8C7A6B] mt-1">{formatDate(idea.scheduledFor)}</p>
                                                    {idea.focusKeyword && (
                                                        <p className="text-[11px] text-[#466A68] mt-1">
                                                            Keyword: {idea.focusKeyword}
                                                            {idea.categorySlug ? ` · Kategori: ${idea.categorySlug}` : ""}
                                                        </p>
                                                    )}
                                                    {idea.rationale && (
                                                        <p className="text-[11px] text-[#8C7A6B]/70 mt-1">{idea.rationale}</p>
                                                    )}
                                                </div>

                                                <div className="flex flex-wrap items-center gap-2 shrink-0">
                                                    <input
                                                        type="datetime-local"
                                                        defaultValue={toDateInputValue(idea.scheduledFor)}
                                                        onBlur={(e) => {
                                                            if (e.target.value !== toDateInputValue(idea.scheduledFor)) {
                                                                void handleReschedule(idea.id, e.target.value)
                                                            }
                                                        }}
                                                        disabled={isBusy}
                                                        className="bg-white border border-[#D4BCAA]/30 rounded-lg px-2 py-1.5 text-xs text-[#0F0A09] outline-none focus:ring-2 focus:ring-[#466A68]/30"
                                                        aria-label={`Jadwal untuk ${idea.title}`}
                                                    />

                                                    {idea.postId ? (
                                                        <Link
                                                            href={`/admin/posts/${idea.postId}/edit`}
                                                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs border border-[#466A68]/30 text-[#466A68] rounded-lg hover:bg-[#466A68]/5"
                                                        >
                                                            <ExternalLink className="h-3.5 w-3.5" />
                                                            Buka Artikel
                                                        </Link>
                                                    ) : (
                                                        <>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleMaterialize(idea.id, "SCHEDULED")}
                                                                disabled={isBusy || !idea.scheduledFor}
                                                                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs bg-[#466A68] text-white rounded-lg disabled:opacity-40"
                                                                title="Buat artikel dengan status SCHEDULED"
                                                            >
                                                                {isBusy ? (
                                                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                                ) : (
                                                                    <CalendarDays className="h-3.5 w-3.5" />
                                                                )}
                                                                Jadwalkan
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleMaterialize(idea.id, "DRAFT")}
                                                                disabled={isBusy}
                                                                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs border border-[#D4BCAA]/40 text-[#8C7A6B] rounded-lg hover:bg-[#FAF9F7] disabled:opacity-40"
                                                                title="Buat artikel sebagai DRAFT untuk publish manual"
                                                            >
                                                                <FileText className="h-3.5 w-3.5" />
                                                                Draft
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleDismissIdea(idea.id)}
                                                                disabled={isBusy}
                                                                className="p-1.5 text-[#8C7A6B] hover:text-red-600 disabled:opacity-40"
                                                                title="Abaikan ide"
                                                                aria-label={`Abaikan ide ${idea.title}`}
                                                            >
                                                                <X className="h-3.5 w-3.5" />
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </li>
                                    )
                                })}
                            </ul>
                        )}
                    </section>

                    {/* Internal links */}
                    <section className="bg-white border border-[#D4BCAA]/20 rounded-xl overflow-hidden">
                        <div className="px-6 py-4 border-b border-[#D4BCAA]/20 flex flex-wrap items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                                <Link2 className="h-4 w-4 text-[#466A68]" />
                                <h2 className="font-semibold text-[#0F0A09]">
                                    Saran Internal Link ({pendingLinks.length} pending)
                                </h2>
                            </div>

                            {pendingLinks.length > 0 && (
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => handleApplyLinks("apply")}
                                        disabled={applyingLinks || selectedLinkIds.size === 0}
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs bg-[#466A68] text-white rounded-lg disabled:opacity-40"
                                    >
                                        {applyingLinks ? (
                                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                        ) : (
                                            <Check className="h-3.5 w-3.5" />
                                        )}
                                        Terapkan ({selectedLinkIds.size})
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleApplyLinks("dismiss")}
                                        disabled={applyingLinks || selectedLinkIds.size === 0}
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs border border-[#D4BCAA]/40 text-[#8C7A6B] rounded-lg hover:bg-[#FAF9F7] disabled:opacity-40"
                                    >
                                        Abaikan
                                    </button>
                                </div>
                            )}
                        </div>

                        {pendingLinks.length === 0 ? (
                            <p className="px-6 py-8 text-center text-sm text-[#8C7A6B]">
                                Tidak ada saran internal link yang menunggu persetujuan.
                            </p>
                        ) : (
                            <ul className="divide-y divide-[#D4BCAA]/20">
                                {pendingLinks.map((suggestion) => (
                                    <li key={suggestion.id} className="px-6 py-4">
                                        <label className="flex items-start gap-3 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={selectedLinkIds.has(suggestion.id)}
                                                onChange={() => toggleLink(suggestion.id)}
                                                className="mt-1 rounded border-[#D4BCAA]/30 text-[#466A68] focus:ring-[#466A68]/30"
                                            />
                                            <div className="min-w-0 flex-1 space-y-1">
                                                <p className="text-xs text-[#8C7A6B]">
                                                    Dari{" "}
                                                    <span className="text-[#0F0A09] font-medium">
                                                        {suggestion.sourcePost?.title ?? "(artikel dihapus)"}
                                                    </span>{" "}
                                                    ke{" "}
                                                    <span className="text-[#0F0A09] font-medium">
                                                        {suggestion.targetPost?.title ?? suggestion.targetTitle ?? suggestion.targetUrl}
                                                    </span>
                                                </p>
                                                <p className="text-sm text-[#0F0A09]">
                                                    Anchor: <span className="font-mono text-xs bg-[#FAF9F7] px-1.5 py-0.5 rounded">{suggestion.exactPhrase}</span>
                                                </p>
                                                {suggestion.rationale && (
                                                    <p className="text-[11px] text-[#8C7A6B]/70">{suggestion.rationale}</p>
                                                )}
                                            </div>
                                        </label>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </section>
                </>
            )}
        </div>
    )
}
