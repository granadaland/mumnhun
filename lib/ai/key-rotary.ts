import prisma from "@/lib/db/prisma"
import { decryptStoredApiKey } from "@/lib/security/api-key-crypto"
import {
    classifyAiKeyFailure,
    formatStoredAiKeyFailure,
    type AiKeyFailure,
} from "@/lib/security/ai-key-status"
import {
    AI_PROVIDER_OPENAI_COMPATIBLE,
    generateArticleWithProvider,
    type AiArticleOutput,
    type AiCapability,
    type GenerateArticleInput,
    type ResolvedAiProvider,
} from "@/lib/ai/provider"

const MAX_KEY_ATTEMPTS = 3

export type AiKeyRecord = {
    id: string
    provider: string
    apiKey: string
    baseUrl: string | null
    model: string | null
    capability: string
}

export type ArticleGenerationResult = {
    article: AiArticleOutput
    usedKeyId: string
    attemptedKeyIds: string[]
}

export class NoActiveAiKeyError extends Error {
    constructor(message: string) {
        super(message)
        this.name = "NoActiveAiKeyError"
    }
}

export class AllAiKeysFailedError extends Error {
    failure: AiKeyFailure
    attemptedKeyIds: string[]

    constructor(failure: AiKeyFailure, attemptedKeyIds: string[]) {
        super(`Semua API key gagal: ${failure.message}`)
        this.name = "AllAiKeysFailedError"
        this.failure = failure
        this.attemptedKeyIds = attemptedKeyIds
    }
}

/**
 * Loads active keys for a capability, ordered by the existing rotary strategy
 * (lowest usage first). An explicit keyId pins the selection to one provider.
 */
export async function loadActiveAiKeys(options: {
    capability: AiCapability
    keyId?: string | null
}): Promise<AiKeyRecord[]> {
    const keys = await prisma.aiApiKey.findMany({
        where: {
            isActive: true,
            capability: options.capability,
            ...(options.keyId ? { id: options.keyId } : {}),
        },
        orderBy: [{ usageCount: "asc" }, { order: "asc" }, { createdAt: "asc" }],
        select: {
            id: true,
            provider: true,
            apiKey: true,
            baseUrl: true,
            model: true,
            capability: true,
        },
    })

    return keys
}

export function toResolvedProvider(record: AiKeyRecord): ResolvedAiProvider {
    return {
        provider: record.provider,
        apiKey: decryptStoredApiKey(record.apiKey),
        baseUrl: record.baseUrl,
        model: record.model,
    }
}

async function markKeySuccess(keyId: string): Promise<void> {
    await prisma.aiApiKey.update({
        where: { id: keyId },
        data: {
            usageCount: { increment: 1 },
            lastUsedAt: new Date(),
            lastError: null,
        },
    })
}

async function markKeyFailure(keyId: string, failure: AiKeyFailure): Promise<void> {
    await prisma.aiApiKey.update({
        where: { id: keyId },
        data: {
            lastUsedAt: new Date(),
            lastError: formatStoredAiKeyFailure(failure),
        },
    })
}

/**
 * Runs article generation across the rotary key set, recording per-key outcomes so the
 * dashboard can surface which provider failed and why.
 */
export async function generateArticleWithRotary(input: {
    keys: AiKeyRecord[]
    payload: GenerateArticleInput
    onAttempt?: (attemptIndex: number, attemptedKeyIds: string[]) => Promise<void> | void
}): Promise<ArticleGenerationResult> {
    if (input.keys.length === 0) {
        throw new NoActiveAiKeyError("Tidak ada API key AI aktif")
    }

    const attemptedKeyIds: string[] = []
    const maxAttempts = Math.min(input.keys.length, MAX_KEY_ATTEMPTS)
    let lastFailure: AiKeyFailure = { code: "UNKNOWN_ERROR", message: "AI generation failed" }

    for (let index = 0; index < maxAttempts; index += 1) {
        const keyRecord = input.keys[index]
        attemptedKeyIds.push(keyRecord.id)

        await input.onAttempt?.(index, [...attemptedKeyIds])

        try {
            const resolved = toResolvedProvider(keyRecord)
            const article = await generateArticleWithProvider(resolved, input.payload)

            await markKeySuccess(keyRecord.id)

            return { article, usedKeyId: keyRecord.id, attemptedKeyIds }
        } catch (error) {
            const failure = classifyAiKeyFailure(error)
            lastFailure = failure
            await markKeyFailure(keyRecord.id, failure)
        }
    }

    throw new AllAiKeysFailedError(lastFailure, attemptedKeyIds)
}

/**
 * Picks an image-capable OpenAI-compatible provider. Gemini image generation is not
 * wired up, so image keys must be OpenAI-compatible.
 */
export async function resolveImageProvider(keyId?: string | null): Promise<{
    keyId: string
    apiKey: string
    baseUrl: string
    model: string
} | null> {
    const keys = await loadActiveAiKeys({ capability: "image", keyId })

    for (const record of keys) {
        if (record.provider !== AI_PROVIDER_OPENAI_COMPATIBLE) continue

        const baseUrl = record.baseUrl?.trim()
        const model = record.model?.trim()
        if (!baseUrl || !model) continue

        return {
            keyId: record.id,
            apiKey: decryptStoredApiKey(record.apiKey),
            baseUrl,
            model,
        }
    }

    return null
}
