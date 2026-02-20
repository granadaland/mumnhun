"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import {
    Sparkles,
    ArrowLeft,
    Wand2,
    FileText,
    ListChecks,
    Loader2,
    AlertCircle,
    CheckCircle2,
    Clock3,
    RefreshCw,
} from "lucide-react"
import Link from "next/link"
import { AdminClientError, adminGet, adminPost } from "@/lib/api/admin-client"

type GenerateRequest = {
    topic: string
    tone?: string
    targetWordCount?: number
}

type GenerateResponse = {
    success: boolean
    data?: {
        taskId: string
        taskStatus: string
        post?: {
            id: string
            slug: string
            title: string
            status: string
            editUrl: string
        }
    }
    error?: string
}

type TaskDetailResponse = {
    success: boolean
    data?: {
        id: string
        type: string
        status: string
        progress: number
        output?: {
            postId?: string
            postSlug?: string
            postTitle?: string
            editUrl?: string
        } | null
        error?: string | null
        createdAt: string
        updatedAt: string
        completedAt?: string | null
    }
    error?: string
}

function getClientErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof AdminClientError) return error.message
    if (error instanceof Error && error.message.trim().length > 0) return error.message
    return fallback
}

export default function AiGeneratePage() {
    const [topic, setTopic] = useState("")
    const [tone, setTone] = useState("informatif")
    const [targetWordCount, setTargetWordCount] = useState("900")
    const [submitting, setSubmitting] = useState(false)
    const [errorMessage, setErrorMessage] = useState<string | null>(null)

    const [taskId, setTaskId] = useState<string | null>(null)
    const [taskStatus, setTaskStatus] = useState<string | null>(null)
    const [taskProgress, setTaskProgress] = useState<number>(0)
    const [taskError, setTaskError] = useState<string | null>(null)
    const [postResult, setPostResult] = useState<{
        id: string
        title?: string
        slug?: string
        editUrl?: string
    } | null>(null)

    const isTerminalTaskStatus = useMemo(
        () => taskStatus === "completed" || taskStatus === "failed",
        [taskStatus]
    )

    const fetchTaskDetail = useCallback(async (id: string) => {
        const taskData = await adminGet<TaskDetailResponse>(`/api/admin/ai/tasks/${id}`, {
            timeoutMs: 10000,
            retries: 1,
        })

        if (!taskData.success || !taskData.data) {
            throw new Error(taskData.error || "Gagal memuat status task")
        }

        setTaskStatus(taskData.data.status)
        setTaskProgress(taskData.data.progress)
        setTaskError(taskData.data.error || null)

        if (taskData.data.output?.postId) {
            setPostResult({
                id: taskData.data.output.postId,
                slug: taskData.data.output.postSlug,
                title: taskData.data.output.postTitle,
                editUrl: taskData.data.output.editUrl,
            })
        }
    }, [])

    useEffect(() => {
        if (!taskId) return

        let stopped = false

        const run = async () => {
            try {
                await fetchTaskDetail(taskId)
            } catch (error) {
                if (!stopped) {
                    setErrorMessage(getClientErrorMessage(error, "Gagal memuat progress task"))
                }
            }
        }

        run()

        if (isTerminalTaskStatus) {
            return () => {
                stopped = true
            }
        }

        const interval = setInterval(run, 2500)

        return () => {
            stopped = true
            clearInterval(interval)
        }
    }, [taskId, isTerminalTaskStatus, fetchTaskDetail])

    const handleSubmit = async () => {
        const normalizedTopic = topic.trim()
        if (normalizedTopic.length < 3) {
            setErrorMessage("Topik/keyword minimal 3 karakter")
            return
        }

        setSubmitting(true)
        setErrorMessage(null)
        setTaskError(null)
        setTaskId(null)
        setTaskStatus(null)
        setTaskProgress(0)
        setPostResult(null)

        const parsedWordCount = Number(targetWordCount)
        const hasTargetWordCount = targetWordCount.trim().length > 0 && Number.isFinite(parsedWordCount)

        const payload: GenerateRequest = {
            topic: normalizedTopic,
            ...(tone.trim() ? { tone: tone.trim() } : {}),
            ...(hasTargetWordCount ? { targetWordCount: Math.floor(parsedWordCount) } : {}),
        }

        try {
            const data = await adminPost<GenerateResponse, GenerateRequest>("/api/admin/ai/generate", {
                body: payload,
                timeoutMs: 90000,
            })

            if (!data.success || !data.data) {
                throw new Error(data.error || "Gagal generate artikel")
            }

            setTaskId(data.data.taskId)
            setTaskStatus(data.data.taskStatus)
            setTaskProgress(data.data.taskStatus === "completed" ? 100 : 0)

            if (data.data.post) {
                setPostResult({
                    id: data.data.post.id,
                    slug: data.data.post.slug,
                    title: data.data.post.title,
                    editUrl: data.data.post.editUrl,
                })
            }
        } catch (error) {
            setErrorMessage(getClientErrorMessage(error, "Gagal generate artikel"))
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <div className="space-y-6">
            <Link
                href="/admin/ai"
                className="inline-flex items-center gap-2 text-sm text-[#8C7A6B]/50 hover:text-[#0F0A09] transition-colors"
            >
                <ArrowLeft className="h-4 w-4" />
                Kembali ke AI Tools
            </Link>

            <div className="relative overflow-hidden rounded-2xl bg-white border border-violet-500/20 p-8">
                <div className="absolute inset-0 bg-black/10" />
                <div className="relative space-y-6">
                    <div className="text-center">
                        <div className="w-16 h-16 bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-2xl shadow-violet-500/20">
                            <Sparkles className="h-8 w-8 text-white" />
                        </div>
                        <h1 className="text-3xl font-bold text-[#0F0A09] mb-2">Generate Artikel dengan AI</h1>
                        <p className="text-[#8C7A6B]/50 text-sm max-w-xl mx-auto">
                            Masukkan topik/keyword, tone, dan target panjang artikel. Sistem akan membuat draft post otomatis beserta metadata SEO dasar.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="md:col-span-3 bg-white/70 border border-[#D4BCAA]/20 rounded-xl p-5 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-[#8C7A6B]/80 mb-1.5">Topik / Keyword *</label>
                                <input
                                    type="text"
                                    value={topic}
                                    onChange={(e) => setTopic(e.target.value)}
                                    placeholder="Contoh: tips sewa bus pariwisata untuk rombongan"
                                    className="w-full px-4 py-2.5 bg-white border border-[#D4BCAA]/15 rounded-lg text-[#0F0A09] text-sm placeholder-[#D4BCAA]/30 focus:outline-none focus:ring-2 focus:ring-violet-500/30"
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-medium text-[#8C7A6B]/80 mb-1.5">Tone (opsional)</label>
                                    <input
                                        type="text"
                                        value={tone}
                                        onChange={(e) => setTone(e.target.value)}
                                        placeholder="informatif"
                                        className="w-full px-4 py-2.5 bg-white border border-[#D4BCAA]/15 rounded-lg text-[#0F0A09] text-sm placeholder-[#D4BCAA]/30 focus:outline-none focus:ring-2 focus:ring-violet-500/30"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-[#8C7A6B]/80 mb-1.5">Target jumlah kata (opsional)</label>
                                    <input
                                        type="number"
                                        min={300}
                                        max={3000}
                                        value={targetWordCount}
                                        onChange={(e) => setTargetWordCount(e.target.value)}
                                        className="w-full px-4 py-2.5 bg-white border border-[#D4BCAA]/15 rounded-lg text-[#0F0A09] text-sm placeholder-[#D4BCAA]/30 focus:outline-none focus:ring-2 focus:ring-violet-500/30"
                                    />
                                </div>
                            </div>

                            <button
                                onClick={handleSubmit}
                                disabled={submitting}
                                className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-violet-600 to-purple-700 text-white text-sm font-medium rounded-lg hover:from-violet-500 hover:to-purple-600 disabled:opacity-60 transition-all"
                            >
                                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                                {submitting ? "Generating..." : "Generate Draft"}
                            </button>
                        </div>
                    </div>

                    {errorMessage && (
                        <div className="flex items-start gap-2 px-4 py-3 rounded-lg border border-red-500/25 bg-red-500/10 text-red-700 text-sm">
                            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                            <span>{errorMessage}</span>
                        </div>
                    )}

                    {taskId && (
                        <div className="bg-white/70 border border-[#D4BCAA]/20 rounded-xl p-5 space-y-3">
                            <div className="flex items-center justify-between gap-3">
                                <div>
                                    <p className="text-xs uppercase tracking-wide text-[#8C7A6B]/40">Task ID</p>
                                    <p className="text-sm text-[#0F0A09] font-mono break-all">{taskId}</p>
                                </div>
                                <button
                                    onClick={() => taskId && fetchTaskDetail(taskId)}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs border border-[#D4BCAA]/20 rounded-md text-[#8C7A6B]/70 hover:text-[#0F0A09] transition-colors"
                                >
                                    <RefreshCw className="h-3.5 w-3.5" />
                                    Refresh
                                </button>
                            </div>

                            <div className="flex items-center gap-2 text-sm text-[#0F0A09]">
                                {taskStatus === "completed" && <CheckCircle2 className="h-4 w-4 text-green-600" />}
                                {taskStatus === "failed" && <AlertCircle className="h-4 w-4 text-red-600" />}
                                {taskStatus !== "completed" && taskStatus !== "failed" && (
                                    <Clock3 className="h-4 w-4 text-amber-600" />
                                )}
                                <span>
                                    Status: <span className="font-semibold">{taskStatus || "pending"}</span>
                                </span>
                                <span className="text-[#8C7A6B]/45">•</span>
                                <span>{taskProgress}%</span>
                            </div>

                            <div className="h-2 w-full bg-white rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-violet-500 to-purple-600 transition-all"
                                    style={{ width: `${Math.max(0, Math.min(100, taskProgress))}%` }}
                                />
                            </div>

                            {taskError && (
                                <div className="text-sm text-red-700 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                                    {taskError}
                                </div>
                            )}

                            {postResult && (
                                <div className="text-sm bg-green-500/10 border border-green-500/20 rounded-lg px-3 py-3 space-y-1">
                                    <p className="text-green-700 font-medium">Draft berhasil dibuat</p>
                                    <p className="text-[#8C7A6B]/70 text-xs">Post ID: {postResult.id}</p>
                                    {postResult.title && <p className="text-[#0F0A09]">{postResult.title}</p>}
                                    <Link
                                        href={postResult.editUrl || `/admin/posts/${postResult.id}/edit`}
                                        className="inline-flex text-[#9AE6B4] hover:text-[#C6F6D5] text-xs underline"
                                    >
                                        Buka halaman edit draft
                                    </Link>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Feature Preview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                    { icon: <Wand2 className="h-5 w-5" />, title: "Smart Generation", desc: "Input topik & keyword, dapatkan artikel SEO-ready" },
                    { icon: <FileText className="h-5 w-5" />, title: "Template Based", desc: "Pilih template: listicle, how-to, review, guide" },
                    { icon: <ListChecks className="h-5 w-5" />, title: "Auto SEO", desc: "Meta title, description, dan schema otomatis terisi" },
                ].map((f) => (
                    <div key={f.title} className="bg-white border border-[#D4BCAA]/20 rounded-xl p-5">
                        <div className="w-10 h-10 bg-[#466A68]/10 rounded-lg flex items-center justify-center text-[#466A68] mb-3">
                            {f.icon}
                        </div>
                        <h3 className="text-sm font-semibold text-[#0F0A09] mb-1">{f.title}</h3>
                        <p className="text-xs text-[#8C7A6B]/40">{f.desc}</p>
                    </div>
                ))}
            </div>
        </div>
    )
}
