"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import {
    Send, Loader2, Plus, Bot, User, Sparkles, MessageSquare,
} from "lucide-react"
import { ADMIN_CSRF_HEADER, getAdminCsrfToken } from "@/lib/security/csrf-client"

const CHAT_REQUEST_TIMEOUT_MS = 120000

type ChatMessage = {
    id: string
    role: "user" | "assistant"
    content: string
    createdAt: string
}

function generateSessionId(): string {
    return `chat_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

function formatMarkdown(text: string): string {
    let html = text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")

    // Code blocks
    html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_m, _lang, code) =>
        `<pre class="bg-white rounded-lg p-3 my-2 overflow-x-auto text-xs font-mono text-[#8C7A6B]/80"><code>${code.trim()}</code></pre>`
    )
    // Inline code
    html = html.replace(/`([^`]+)`/g, '<code class="bg-white px-1.5 py-0.5 rounded text-xs font-mono text-[#466A68]">$1</code>')
    // Bold
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-[#0F0A09]">$1</strong>')
    // Italic
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Headers
    html = html.replace(/^### (.+)$/gm, '<h4 class="font-semibold text-[#0F0A09] mt-3 mb-1 text-sm">$1</h4>')
    html = html.replace(/^## (.+)$/gm, '<h3 class="font-semibold text-[#0F0A09] mt-3 mb-1">$1</h3>')
    // Unordered lists
    html = html.replace(/^- (.+)$/gm, '<li class="ml-4 list-disc text-[#8C7A6B]/80">$1</li>')
    // Ordered lists
    html = html.replace(/^\d+\. (.+)$/gm, '<li class="ml-4 list-decimal text-[#8C7A6B]/80">$1</li>')
    // Paragraphs (double newlines)
    html = html.replace(/\n\n/g, '</p><p class="mb-2">')
    // Single newlines
    html = html.replace(/\n/g, "<br/>")

    return `<p class="mb-2">${html}</p>`
}

export default function AiChatPage() {
    const [messages, setMessages] = useState<ChatMessage[]>([])
    const [input, setInput] = useState("")
    const [loading, setLoading] = useState(false)
    const [sessionId, setSessionId] = useState("")
    const [loadingHistory, setLoadingHistory] = useState(false)
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLTextAreaElement>(null)

    // Initialize session
    useEffect(() => {
        const stored = sessionStorage.getItem("ai-chat-session")
        if (stored) {
            setSessionId(stored)
        } else {
            const newId = generateSessionId()
            sessionStorage.setItem("ai-chat-session", newId)
            setSessionId(newId)
        }
    }, [])

    // Load history when session is set
    useEffect(() => {
        if (!sessionId) return
        setLoadingHistory(true)
        fetch(`/api/admin/chat?sessionId=${encodeURIComponent(sessionId)}`)
            .then((r) => r.json())
            .then((data) => {
                if (data.success && data.data.length > 0) {
                    setMessages(data.data)
                }
            })
            .catch(console.error)
            .finally(() => setLoadingHistory(false))
    }, [sessionId])

    // Auto-scroll
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }, [messages])

    const startNewChat = useCallback(() => {
        const newId = generateSessionId()
        sessionStorage.setItem("ai-chat-session", newId)
        setSessionId(newId)
        setMessages([])
        setInput("")
        inputRef.current?.focus()
    }, [])

    const sendMessage = useCallback(async () => {
        const text = input.trim()
        if (!text || loading) return

        const userMsg: ChatMessage = {
            id: `temp_${Date.now()}`,
            role: "user",
            content: text,
            createdAt: new Date().toISOString(),
        }

        setMessages((prev) => [...prev, userMsg])
        setInput("")
        setLoading(true)

        try {
            const csrfToken = await getAdminCsrfToken()
            const controller = new AbortController()
            const timeoutHandle = setTimeout(() => controller.abort(), CHAT_REQUEST_TIMEOUT_MS)

            const res = await fetch("/api/admin/chat", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    [ADMIN_CSRF_HEADER]: csrfToken,
                },
                body: JSON.stringify({ message: text, sessionId }),
                signal: controller.signal,
            })

            clearTimeout(timeoutHandle)

            const data = await res.json()

            if (data.success) {
                setMessages((prev) => [...prev, data.data])
            } else {
                setMessages((prev) => [
                    ...prev,
                    {
                        id: `err_${Date.now()}`,
                        role: "assistant" as const,
                        content: `⚠️ ${data.error || "Gagal mendapatkan respons AI"}`,
                        createdAt: new Date().toISOString(),
                    },
                ])
            }
        } catch (error) {
            const isTimeout =
                error instanceof DOMException &&
                error.name === "AbortError"

            setMessages((prev) => [
                ...prev,
                {
                    id: `err_${Date.now()}`,
                    role: "assistant" as const,
                    content: isTimeout
                        ? "⚠️ Request timeout. Respons AI terlalu lama, silakan coba lagi."
                        : "⚠️ Koneksi gagal. Silakan coba lagi.",
                    createdAt: new Date().toISOString(),
                },
            ])
        } finally {
            setLoading(false)
            inputRef.current?.focus()
        }
    }, [input, loading, sessionId])

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault()
            sendMessage()
        }
    }

    return (
        <div className="flex flex-col h-[calc(100vh-8rem)]">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h1 className="text-xl font-bold text-[#0F0A09] flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-[#466A68]" />
                        AI Chat Assistant
                    </h1>
                    <p className="text-xs text-[#8C7A6B]/40 mt-0.5">
                        Powered by Google Gemini — Tanya seputar konten, SEO, dan strategi blog
                    </p>
                </div>
                <button
                    onClick={startNewChat}
                    className="flex items-center gap-2 px-3 py-2 text-xs font-medium border border-[#D4BCAA]/15 text-[#8C7A6B]/60 rounded-lg hover:bg-[#D4BCAA]/5 hover:text-[#0F0A09] transition-all"
                >
                    <Plus className="h-3.5 w-3.5" />
                    Chat Baru
                </button>
            </div>

            {/* Chat Area */}
            <div className="flex-1 bg-white border border-[#D4BCAA]/20 rounded-xl overflow-hidden flex flex-col">
                {/* Messages */}
                <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
                    {loadingHistory ? (
                        <div className="flex items-center justify-center h-full">
                            <Loader2 className="h-5 w-5 text-[#466A68] animate-spin" />
                        </div>
                    ) : messages.length === 0 ? (
                        <div className="flex items-center justify-center h-full">
                            <div className="text-center max-w-sm">
                                <div className="w-14 h-14 bg-gradient-to-br from-[#466A68]/20 to-[#466A68]/5 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-[#466A68]/10">
                                    <MessageSquare className="h-7 w-7 text-[#466A68]" />
                                </div>
                                <h3 className="text-[#0F0A09] font-semibold mb-2">
                                    Mulai Percakapan
                                </h3>
                                <p className="text-xs text-[#8C7A6B]/40 leading-relaxed mb-4">
                                    Tanyakan ide konten, strategi SEO, tips copywriting, atau bantuan pengelolaan blog.
                                </p>
                                <div className="flex flex-wrap gap-2 justify-center">
                                    {[
                                        "Ide artikel tentang ASI",
                                        "Tips SEO untuk blog",
                                        "Cara menulis excerpt yang menarik",
                                    ].map((suggestion) => (
                                        <button
                                            key={suggestion}
                                            onClick={() => {
                                                setInput(suggestion)
                                                inputRef.current?.focus()
                                            }}
                                            className="px-3 py-1.5 text-[11px] bg-[#466A68]/10 text-[#466A68] rounded-full border border-[#466A68]/15 hover:bg-[#466A68]/20 transition-colors"
                                        >
                                            {suggestion}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <>
                            {messages.map((msg) => (
                                <div
                                    key={msg.id}
                                    className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                                >
                                    {msg.role === "assistant" && (
                                        <div className="flex-shrink-0 w-7 h-7 bg-gradient-to-br from-[#466A68]/20 to-[#466A68]/5 rounded-lg flex items-center justify-center border border-[#466A68]/15 mt-0.5">
                                            <Bot className="h-3.5 w-3.5 text-[#466A68]" />
                                        </div>
                                    )}
                                    <div
                                        className={`max-w-[75%] rounded-xl px-4 py-3 text-sm leading-relaxed ${msg.role === "user"
                                            ? "bg-[#466A68] text-white rounded-br-sm"
                                            : "bg-white border border-[#D4BCAA]/20 text-[#8C7A6B]/80 rounded-bl-sm"
                                            }`}
                                    >
                                        {msg.role === "assistant" ? (
                                            <div
                                                className="prose-chat [&_pre]:my-2 [&_li]:my-0.5"
                                                dangerouslySetInnerHTML={{ __html: formatMarkdown(msg.content) }}
                                            />
                                        ) : (
                                            <p className="whitespace-pre-wrap">{msg.content}</p>
                                        )}
                                    </div>
                                    {msg.role === "user" && (
                                        <div className="flex-shrink-0 w-7 h-7 bg-[#466A68]/15 rounded-lg flex items-center justify-center border border-[#466A68]/10 mt-0.5">
                                            <User className="h-3.5 w-3.5 text-[#466A68]" />
                                        </div>
                                    )}
                                </div>
                            ))}
                            {loading && (
                                <div className="flex gap-3 justify-start">
                                    <div className="flex-shrink-0 w-7 h-7 bg-gradient-to-br from-[#466A68]/20 to-[#466A68]/5 rounded-lg flex items-center justify-center border border-[#466A68]/15 mt-0.5">
                                        <Bot className="h-3.5 w-3.5 text-[#466A68]" />
                                    </div>
                                    <div className="bg-white border border-[#D4BCAA]/20 rounded-xl rounded-bl-sm px-4 py-3">
                                        <div className="flex items-center gap-2 text-sm text-[#8C7A6B]/40">
                                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                            Sedang berpikir...
                                        </div>
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </>
                    )}
                </div>

                {/* Input Area */}
                <div className="border-t border-[#D4BCAA]/20 px-4 py-3 bg-white">
                    <div className="flex items-end gap-2">
                        <textarea
                            ref={inputRef}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Ketik pesan... (Enter untuk kirim, Shift+Enter untuk baris baru)"
                            rows={1}
                            className="flex-1 bg-white border border-[#D4BCAA]/20 rounded-lg px-4 py-2.5 text-sm text-[#0F0A09] placeholder-[#8C7A6B]/60 outline-none focus:ring-2 focus:ring-[#466A68]/30 resize-none transition-all max-h-32"
                            style={{ minHeight: "42px" }}
                            onInput={(e) => {
                                const target = e.target as HTMLTextAreaElement
                                target.style.height = "42px"
                                target.style.height = Math.min(target.scrollHeight, 128) + "px"
                            }}
                            disabled={loading}
                        />
                        <button
                            onClick={sendMessage}
                            disabled={!input.trim() || loading}
                            className="flex-shrink-0 p-2.5 bg-gradient-to-r from-[#466A68] to-[#3a5856] text-white rounded-lg hover:from-[#3a5856] hover:to-[#466A68] disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-lg"
                        >
                            {loading ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Send className="h-4 w-4" />
                            )}
                        </button>
                    </div>
                    <p className="text-[10px] text-[#8C7A6B]/20 mt-1.5 text-center">
                        AI dapat membuat kesalahan. Periksa informasi penting.
                    </p>
                </div>
            </div>
        </div>
    )
}
