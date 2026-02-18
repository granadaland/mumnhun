import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import prisma from "@/lib/db/prisma"
import { requireAdminApi, requireAdminMutationApi } from "@/lib/security/admin"
import { decryptStoredApiKey } from "@/lib/security/api-key-crypto"
import { logAdminError, logAdminInfo, logAdminWarn } from "@/lib/observability/admin-log"
import { summarizeUnknownError } from "@/lib/security/admin-helpers"

const sendMessageSchema = z.object({
    message: z.string().trim().min(1, "Pesan tidak boleh kosong").max(4000),
    sessionId: z.string().trim().min(1).max(100),
})

const SYSTEM_PROMPT = [
    "Kamu adalah asisten AI untuk CMS blog mumnhun.id — sebuah blog berbahasa Indonesia tentang ASI, penyimpanan ASI, sewa freezer ASI, dan perawatan bayi.",
    "Bantu admin dalam hal:",
    "- Ide konten dan topik artikel",
    "- Penulisan dan revisi artikel",
    "- Strategi SEO dan keyword research",
    "- Tips copywriting dan engagement",
    "- Pertanyaan umum tentang pengelolaan blog",
    "",
    "Jawab dalam Bahasa Indonesia yang natural dan ramah. Gunakan format markdown jika perlu (heading, list, bold).",
    "Jika ditanya hal di luar topik blog/CMS, tetap jawab dengan helpful tapi arahkan kembali ke konteks blog.",
].join("\n")

type GeminiMessage = { role: "user" | "model"; parts: Array<{ text: string }> }
type GeminiResponse = {
    candidates?: Array<{
        content?: {
            parts?: Array<{ text?: string }>
        }
    }>
}

async function callGeminiChat(apiKey: string, history: GeminiMessage[], userMessage: string): Promise<string> {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${encodeURIComponent(apiKey)}`

    const contents: GeminiMessage[] = [
        ...history,
        { role: "user", parts: [{ text: userMessage }] },
    ]

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 30000)

    try {
        const response = await fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
                contents,
                generationConfig: {
                    temperature: 0.8,
                    topP: 0.95,
                    maxOutputTokens: 2048,
                },
            }),
            signal: controller.signal,
        })

        if (!response.ok) {
            const text = await response.text()
            throw new Error(`Gemini HTTP ${response.status}: ${text.slice(0, 200)}`)
        }

        const payload = (await response.json()) as GeminiResponse
        const text = payload.candidates?.[0]?.content?.parts
            ?.map((p) => p.text || "")
            .join("")
            .trim()

        if (!text) throw new Error("Gemini tidak mengembalikan respons")
        return text
    } finally {
        clearTimeout(timeout)
    }
}

// GET: Load chat history for a session
export async function GET(request: NextRequest) {
    const adminCheck = await requireAdminApi()
    if (!adminCheck.ok) return adminCheck.response

    const sessionId = new URL(request.url).searchParams.get("sessionId")
    if (!sessionId) {
        return NextResponse.json({ success: true, data: [] })
    }

    const messages = await prisma.aiChatMessage.findMany({
        where: { sessionId, userId: adminCheck.identity.id },
        orderBy: { createdAt: "asc" },
        select: { id: true, role: true, content: true, createdAt: true },
    })

    return NextResponse.json({ success: true, data: messages })
}

// POST: Send message and get AI response
export async function POST(request: NextRequest) {
    const adminCheck = await requireAdminMutationApi(request, { action: "chat:send" })
    if (!adminCheck.ok) return adminCheck.response

    const requestId = crypto.randomUUID()

    let payload: z.infer<typeof sendMessageSchema>
    try {
        const body = await request.json()
        const parsed = sendMessageSchema.safeParse(body)
        if (!parsed.success) {
            logAdminWarn({
                requestId,
                action: "chat:send",
                userId: adminCheck.identity.id,
                role: adminCheck.identity.role,
                roleSource: adminCheck.identity.source,
                status: 400,
                validation: { ok: false, reason: "invalid_payload" },
            })
            return NextResponse.json(
                { success: false, error: "Pesan tidak valid" },
                { status: 400 }
            )
        }
        payload = parsed.data
    } catch {
        return NextResponse.json(
            { success: false, error: "Request tidak valid" },
            { status: 400 }
        )
    }

    try {
        // Get active API keys
        const activeKeys = await prisma.aiApiKey.findMany({
            where: { isActive: true },
            orderBy: [{ usageCount: "asc" }, { order: "asc" }],
        })

        if (activeKeys.length === 0) {
            return NextResponse.json(
                { success: false, error: "Tidak ada API key AI yang aktif. Tambahkan key di Settings." },
                { status: 503 }
            )
        }

        // Save user message
        await prisma.aiChatMessage.create({
            data: {
                role: "user",
                content: payload.message,
                sessionId: payload.sessionId,
                userId: adminCheck.identity.id,
            },
        })

        // Load recent history for context (last 20 messages)
        const recentMessages = await prisma.aiChatMessage.findMany({
            where: { sessionId: payload.sessionId, userId: adminCheck.identity.id },
            orderBy: { createdAt: "asc" },
            take: 20,
            select: { role: true, content: true },
        })

        // Build Gemini history (exclude the last user message, it's sent separately)
        const history: GeminiMessage[] = recentMessages
            .slice(0, -1)
            .map((m) => ({
                role: (m.role === "assistant" ? "model" : "user") as "user" | "model",
                parts: [{ text: m.content }],
            }))

        // Try keys with round-robin
        let aiResponse: string | null = null
        let lastError = ""
        const maxAttempts = Math.min(activeKeys.length, 3)

        for (let i = 0; i < maxAttempts; i++) {
            const keyRecord = activeKeys[i]
            try {
                const decryptedKey = decryptStoredApiKey(keyRecord.apiKey)
                aiResponse = await callGeminiChat(decryptedKey, history, payload.message)

                await prisma.aiApiKey.update({
                    where: { id: keyRecord.id },
                    data: {
                        usageCount: { increment: 1 },
                        lastUsedAt: new Date(),
                        lastError: null,
                    },
                })
                break
            } catch (error) {
                lastError = summarizeUnknownError(error)
                await prisma.aiApiKey.update({
                    where: { id: keyRecord.id },
                    data: {
                        lastUsedAt: new Date(),
                        lastError: lastError.slice(0, 500),
                    },
                })
            }
        }

        if (!aiResponse) {
            return NextResponse.json(
                { success: false, error: `AI gagal merespons: ${lastError}` },
                { status: 502 }
            )
        }

        // Save assistant message
        const assistantMessage = await prisma.aiChatMessage.create({
            data: {
                role: "assistant",
                content: aiResponse,
                sessionId: payload.sessionId,
                userId: adminCheck.identity.id,
            },
            select: { id: true, role: true, content: true, createdAt: true },
        })

        logAdminInfo({
            requestId,
            action: "chat:send",
            userId: adminCheck.identity.id,
            role: adminCheck.identity.role,
            roleSource: adminCheck.identity.source,
            status: 200,
            payloadSummary: { sessionId: payload.sessionId },
            validation: { ok: true },
        })

        return NextResponse.json({ success: true, data: assistantMessage })
    } catch (error) {
        logAdminError({
            requestId,
            action: "chat:send",
            userId: adminCheck.identity.id,
            role: adminCheck.identity.role,
            roleSource: adminCheck.identity.source,
            status: 500,
            error: summarizeUnknownError(error),
        })

        return NextResponse.json(
            { success: false, error: "Gagal mengirim pesan" },
            { status: 500 }
        )
    }
}
