import { z } from "zod"
import prisma from "@/lib/db/prisma"
import { decryptStoredApiKey } from "@/lib/security/api-key-crypto"
import {
    classifyProviderFailure,
    formatStoredAiKeyFailure,
    type AiKeyFailure,
} from "@/lib/security/ai-key-status"
import {
    AI_PROVIDER_OPENAI_COMPATIBLE,
    generateJson,
    generateText,
    type ResolvedAiProvider,
    type TextGenerationRequest,
} from "@/lib/ai/provider"
import { isAuthStyle, type AuthStyle } from "@/lib/ai/openai-compatible"

/**
 * The three dedicated AI task roles.
 *
 * Unlike `AiApiKey` (a rotary pool selected by lowest usage), a role model is pinned:
 * exactly one active credential per role, so each task always runs on the model the
 * operator assigned to it. There is deliberately no fallback to another role's key --
 * silently switching models would change voice and cost characteristics.
 */
export const AI_ROLES = ["scanning", "text", "image"] as const
export type AiRole = (typeof AI_ROLES)[number]

export const aiRoleSchema = z.enum(AI_ROLES)

export const AI_ROLE_LABELS: Record<AiRole, string> = {
    scanning: "Model A - Scanning & Internal Link",
    text: "Model B - Generate Teks",
    image: "Model C - Generate Gambar",
}

export type AiRoleModelRecord = {
    id: string
    role: string
    provider: string
    apiKey: string
    baseUrl: string | null
    model: string | null
    authStyle: string | null
}

export class RoleModelNotConfiguredError extends Error {
    role: AiRole

    constructor(role: AiRole) {
        super(`Model AI untuk role "${role}" belum dikonfigurasi atau tidak aktif.`)
        this.name = "RoleModelNotConfiguredError"
        this.role = role
    }
}

export function isAiRole(value: unknown): value is AiRole {
    return typeof value === "string" && (AI_ROLES as readonly string[]).includes(value)
}

async function loadRoleModel(role: AiRole): Promise<AiRoleModelRecord | null> {
    return prisma.aiRoleModel.findFirst({
        where: { role, isActive: true },
        select: {
            id: true,
            role: true,
            provider: true,
            apiKey: true,
            baseUrl: true,
            model: true,
            authStyle: true,
        },
    })
}

function toResolvedProvider(record: AiRoleModelRecord): ResolvedAiProvider {
    return {
        provider: record.provider,
        apiKey: decryptStoredApiKey(record.apiKey),
        baseUrl: record.baseUrl,
        model: record.model,
        authStyle: isAuthStyle(record.authStyle) ? record.authStyle : null,
    }
}

async function markRoleSuccess(
    id: string,
    options: { authStyle?: AuthStyle | null; currentAuthStyle?: string | null } = {}
): Promise<void> {
    const shouldUpdateAuthStyle =
        Boolean(options.authStyle) && options.authStyle !== options.currentAuthStyle

    await prisma.aiRoleModel.update({
        where: { id },
        data: {
            usageCount: { increment: 1 },
            lastUsedAt: new Date(),
            lastError: null,
            ...(shouldUpdateAuthStyle ? { authStyle: options.authStyle } : {}),
        },
    })
}

async function markRoleFailure(id: string, failure: AiKeyFailure): Promise<void> {
    await prisma.aiRoleModel
        .update({
            where: { id },
            data: {
                lastUsedAt: new Date(),
                lastError: formatStoredAiKeyFailure(failure),
            },
        })
        .catch(() => undefined)
}

export type RoleRunResult<T> = {
    value: T
    roleModelId: string
    provider: string
    model: string | null
}

/**
 * Runs one AI operation on the credential pinned to `role`.
 *
 * No rotation and no cross-role fallback: if the role's model fails, the error is
 * reported so the operator fixes that specific model instead of silently paying for a
 * different one.
 */
export async function runWithRoleModel<T>(
    role: AiRole,
    run: (provider: ResolvedAiProvider) => Promise<{ value: T; authStyle?: AuthStyle }>
): Promise<RoleRunResult<T>> {
    const record = await loadRoleModel(role)
    if (!record) {
        throw new RoleModelNotConfiguredError(role)
    }

    try {
        const resolved = toResolvedProvider(record)
        const outcome = await run(resolved)

        await markRoleSuccess(record.id, {
            authStyle: outcome.authStyle,
            currentAuthStyle: record.authStyle,
        })

        return {
            value: outcome.value,
            roleModelId: record.id,
            provider: record.provider,
            model: record.model,
        }
    } catch (error) {
        await markRoleFailure(record.id, classifyProviderFailure(error))
        throw error
    }
}

/** Convenience wrapper: schema-validated JSON generation on a role's model. */
export async function generateRoleJson<T>(
    role: AiRole,
    request: Omit<TextGenerationRequest, "jsonMode">,
    schema: z.ZodType<T>
): Promise<RoleRunResult<T>> {
    return runWithRoleModel<T>(role, async (provider) => {
        const generated = await generateJson(provider, request, schema)
        return { value: generated.data, authStyle: generated.authStyle }
    })
}

/** Convenience wrapper: free-form text generation on a role's model. */
export async function generateRoleText(
    role: AiRole,
    request: TextGenerationRequest
): Promise<RoleRunResult<string>> {
    return runWithRoleModel<string>(role, async (provider) => {
        const generated = await generateText(provider, request)
        return { value: generated.text, authStyle: generated.authStyle }
    })
}

export type ResolvedImageRoleModel = {
    roleModelId: string
    apiKey: string
    baseUrl: string
    model: string
    authStyle: AuthStyle | null
    provider: string
}

/**
 * Resolves the image role credential.
 *
 * Image generation speaks the OpenAI images API shape, so the role must be an
 * OpenAI-compatible provider with both a base URL and a model.
 */
export async function resolveImageRoleModel(): Promise<ResolvedImageRoleModel | null> {
    const record = await loadRoleModel("image")
    if (!record) return null
    if (record.provider !== AI_PROVIDER_OPENAI_COMPATIBLE && record.provider !== "gemini") return null

    const baseUrl = record.baseUrl?.trim()
    const model = record.model?.trim()
    if (record.provider === AI_PROVIDER_OPENAI_COMPATIBLE && (!baseUrl || !model)) return null

    return {
        roleModelId: record.id,
        apiKey: decryptStoredApiKey(record.apiKey),
        baseUrl: baseUrl || "",
        model: model || "",
        authStyle: isAuthStyle(record.authStyle) ? record.authStyle : null,
        provider: record.provider
    }
}

export async function recordImageRoleSuccess(id: string): Promise<void> {
    await markRoleSuccess(id)
}

export async function recordImageRoleFailure(id: string, error: unknown): Promise<void> {
    await markRoleFailure(id, classifyProviderFailure(error))
}
