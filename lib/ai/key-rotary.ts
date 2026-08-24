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
    isCustomProvider,
    type AiArticleOutput,
    type AiCapability,
    type GenerateArticleInput,
    type ResolvedAiProvider,
    type GeneratedImage,
    generateImageWithProvider,
} from "@/lib/ai/provider"
import { isAuthStyle, type AuthStyle } from "@/lib/ai/openai-compatible"

const MAX_KEY_ATTEMPTS = 3

export type AiKeyRecord = {
    id: string
    provider: string
    apiKey: string
    baseUrl: string | null
    model: string | null
    capability: string
    authStyle: string | null
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
 * Loads active keys for a capability, ordered by the rotary strategy (lowest usage
 * first). An explicit keyId pins the selection to one provider.
 */
export async function loadActiveAiKeys(options: {
    capability: AiCapability
    keyId?: string | null
}): Promise<AiKeyRecord[]> {
    return prisma.aiApiKey.findMany({
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
            authStyle: true,
        },
    })
}

export function toResolvedProvider(record: AiKeyRecord): ResolvedAiProvider {
    return {
        provider: record.provider,
        apiKey: decryptStoredApiKey(record.apiKey),
        baseUrl: record.baseUrl,
        model: record.model,
        authStyle: isAuthStyle(record.authStyle) ? record.authStyle : null,
    }
}

async function markKeySuccess(
    keyId: string,
    options: { authStyle?: AuthStyle | null; currentAuthStyle?: string | null } = {}
): Promise<void> {
    // Persist a newly discovered auth style so later calls skip the probing.
    const shouldUpdateAuthStyle =
        Boolean(options.authStyle) && options.authStyle !== options.currentAuthStyle

    await prisma.aiApiKey.update({
        where: { id: keyId },
        data: {
            usageCount: { increment: 1 },
            lastUsedAt: new Date(),
            lastError: null,
            ...(shouldUpdateAuthStyle ? { authStyle: options.authStyle } : {}),
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

export type RotaryResult<T> = {
    value: T
    usedKeyId: string
    usedProvider: string
    usedModel: string | null
    attemptedKeyIds: string[]
}

/**
 * Runs an AI operation across the rotary key set for a capability.
 *
 * Each key is tried in order; per-key outcomes are recorded so the dashboard can show
 * which provider failed and why. The task callback receives the resolved provider so
 * it can pick the right prompt shape without knowing about key storage.
 */
export async function runWithAiRotary<T>(input: {
    capability?: AiCapability
    keyId?: string | null
    keys?: AiKeyRecord[]
    /**
     * Wall-clock budget for the WHOLE operation across all key attempts. When the
     * elapsed time exceeds it, no further keys are tried and the accumulated failure is
     * raised as NETWORK_TIMEOUT — without this, per-request timeouts multiply
     * (3 keys × internal retries) far past the platform function limit.
     */
    budgetMs?: number
    run: (provider: ResolvedAiProvider, record: AiKeyRecord) => Promise<{ value: T; authStyle?: AuthStyle }>
    onAttempt?: (attemptIndex: number, attemptedKeyIds: string[]) => Promise<void> | void
}): Promise<RotaryResult<T>> {
    const keys =
        input.keys ??
        (await loadActiveAiKeys({ capability: input.capability ?? "text", keyId: input.keyId }))

    if (keys.length === 0) {
        throw new NoActiveAiKeyError("Tidak ada API key AI aktif")
    }

    const startedAt = Date.now()
    const attemptedKeyIds: string[] = []
    const maxAttempts = Math.min(keys.length, MAX_KEY_ATTEMPTS)
    let lastFailure: AiKeyFailure = { code: "UNKNOWN_ERROR", message: "AI request failed" }

    for (let index = 0; index < maxAttempts; index += 1) {
        // Budget check happens BEFORE spending another multi-minute attempt, not after.
        if (
            index > 0 &&
            typeof input.budgetMs === "number" &&
            Date.now() - startedAt > input.budgetMs
        ) {
            lastFailure = {
                code: "NETWORK_TIMEOUT",
                message: `Budget waktu ${Math.round(input.budgetMs / 1000)}s tercapai setelah ${index} percobaan — hentikan retry antar key`,
            }
            break
        }

        const record = keys[index]
        attemptedKeyIds.push(record.id)

        await input.onAttempt?.(index, [...attemptedIdsSafe(attemptedKeyIds)])

        let outcome: { value: T; authStyle?: AuthStyle }
        try {
            const resolved = toResolvedProvider(record)
            outcome = await input.run(resolved, record)
        } catch (error) {
            const failure = classifyAiKeyFailure(error)
            lastFailure = failure
            // Bookkeeping must not mask the real provider failure by throwing its own.
            await markKeyFailure(record.id, failure).catch(() => undefined)
            continue
        }

        // The generation already succeeded and is paid for: a bookkeeping failure here
        // must not discard it and trigger a regeneration on the next key.
        await markKeySuccess(record.id, {
            authStyle: outcome.authStyle,
            currentAuthStyle: record.authStyle,
        }).catch(() => undefined)

        return {
            value: outcome.value,
            usedKeyId: record.id,
            usedProvider: record.provider,
            usedModel: record.model,
            attemptedKeyIds,
        }
    }

    throw new AllAiKeysFailedError(lastFailure, attemptedKeyIds)
}

/** Defensive copy helper so callbacks cannot mutate the caller's array mid-flight. */
function attemptedIdsSafe(ids: string[]): string[] {
    return [...ids]
}

export type ArticleGenerationResult = {
    article: AiArticleOutput
    usedKeyId: string
    attemptedKeyIds: string[]
}

/** Article generation on top of the generic rotary runner. */
export async function generateArticleWithRotary(input: {
    keys?: AiKeyRecord[]
    keyId?: string | null
    payload: GenerateArticleInput
    budgetMs?: number
    onAttempt?: (attemptIndex: number, attemptedKeyIds: string[]) => Promise<void> | void
}): Promise<ArticleGenerationResult> {
    const result = await runWithAiRotary<AiArticleOutput>({
        capability: "text",
        keyId: input.keyId,
        keys: input.keys,
        budgetMs: input.budgetMs,
        onAttempt: input.onAttempt,
        run: async (provider) => {
            const article = await generateArticleWithProvider(provider, input.payload)
            const { usedAuthStyle, ...rest } = article
            return { value: rest, authStyle: usedAuthStyle }
        },
    })

    return {
        article: result.value,
        usedKeyId: result.usedKeyId,
        attemptedKeyIds: result.attemptedKeyIds,
    }
}

export type ImageGenerationResult = {
    image: GeneratedImage
    usedKeyId: string
    attemptedKeyIds: string[]
}

/** Image generation on top of the generic rotary runner. */
export async function generateImageWithRotary(input: {
    keys?: AiKeyRecord[]
    keyId?: string | null
    payload: { prompt: string, options: { maxBytes: number; timeoutMs?: number; aspectRatio?: string } }
    budgetMs?: number
    onAttempt?: (attemptIndex: number, attemptedKeyIds: string[]) => Promise<void> | void
}): Promise<ImageGenerationResult> {
    const result = await runWithAiRotary<GeneratedImage>({
        capability: "image",
        keyId: input.keyId,
        keys: input.keys,
        budgetMs: input.budgetMs,
        onAttempt: input.onAttempt,
        run: async (provider) => {
            const image = await generateImageWithProvider(provider, input.payload.prompt, input.payload.options)
            return { value: image, authStyle: provider.authStyle ?? undefined }
        },
    })

    return {
        image: result.value,
        usedKeyId: result.usedKeyId,
        attemptedKeyIds: result.attemptedKeyIds,
    }
}

/**
 * Picks an image-capable provider. Image generation uses the OpenAI images API shape,
 * so Gemini keys are not eligible.
 */
export async function resolveImageProvider(keyId?: string | null): Promise<ResolvedAiProvider & { keyId: string } | null> {
    const keys = await loadActiveAiKeys({ capability: "image", keyId })

    for (const record of keys) {
        if (record.provider !== AI_PROVIDER_OPENAI_COMPATIBLE && record.provider !== "gemini") continue

        const baseUrl = record.baseUrl?.trim()
        const model = record.model?.trim()
        if (record.provider === AI_PROVIDER_OPENAI_COMPATIBLE && (!baseUrl || !model)) continue

        return {
            keyId: record.id,
            apiKey: decryptStoredApiKey(record.apiKey),
            baseUrl: baseUrl ?? "",
            model: model ?? "",
            authStyle: isAuthStyle(record.authStyle) ? record.authStyle : null,
            provider: record.provider,
        }
    }

    return null
}

export { isCustomProvider }
