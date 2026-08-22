import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import prisma from "@/lib/db/prisma"
import { requireAdminApi, requireAdminMutationApi } from "@/lib/security/admin"
import {
    classifyProviderFailure,
    toAiKeyFailureHttpStatus,
} from "@/lib/security/ai-key-status"
import { logAdminError, logAdminInfo, logAdminWarn } from "@/lib/observability/admin-log"
import { summarizeUnknownError } from "@/lib/security/admin-helpers"
import { AllAiKeysFailedError, NoActiveAiKeyError, runWithAiRotary } from "@/lib/ai/key-rotary"
import { generateConversation, type ConversationTurn } from "@/lib/ai/provider"

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

        // Exclude the message just saved; it is sent as the current turn.
        const history: ConversationTurn[] = recentMessages.slice(0, -1).map((message) => ({
            role: message.role === "assistant" ? "assistant" : "user",
            content: message.content,
        }))

        const result = await runWithAiRotary({
            capability: "text",
            run: async (provider) => {
                const generated = await generateConversation(provider, {
                    system: SYSTEM_PROMPT,
                    history,
                    message: payload.message,
                    temperature: 0.8,
                    topP: 0.95,
                    maxTokens: 2048,
                })

                return { value: generated.text, authStyle: generated.authStyle }
            },
        })

        // Save assistant message
        const assistantMessage = await prisma.aiChatMessage.create({
            data: {
                role: "assistant",
                content: result.value,
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
            payloadSummary: { sessionId: payload.sessionId, usedKeyId: result.usedKeyId },
            validation: { ok: true },
        })

        return NextResponse.json({ success: true, data: assistantMessage })
    } catch (error) {
        if (error instanceof NoActiveAiKeyError) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Tidak ada API key AI yang aktif. Tambahkan key di Settings.",
                    errorCode: "AI_KEY_NOT_AVAILABLE",
                },
                { status: 503 }
            )
        }

        const failure = error instanceof AllAiKeysFailedError ? error.failure : classifyProviderFailure(error)

        logAdminError({
            requestId,
            action: "chat:send",
            userId: adminCheck.identity.id,
            role: adminCheck.identity.role,
            roleSource: adminCheck.identity.source,
            status: toAiKeyFailureHttpStatus(failure),
            error: summarizeUnknownError(error),
        })

        return NextResponse.json(
            {
                success: false,
                error: `AI gagal merespons: ${failure.message}`,
                errorCode: failure.code,
            },
            { status: toAiKeyFailureHttpStatus(failure) }
        )
    }
}
