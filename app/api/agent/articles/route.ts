import { NextRequest, NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import prisma from "@/lib/db/prisma"
import { requireAgentToken, type AgentIdentity } from "@/lib/security/agent-token"
import { logAdminError, logAdminInfo, logAdminWarn } from "@/lib/observability/admin-log"
import { summarizeUnknownError } from "@/lib/security/admin-helpers"
import {
    AllAiKeysFailedError,
    NoActiveAiKeyError,
    generateArticleWithRotary,
    loadActiveAiKeys,
    resolveImageProvider,
} from "@/lib/ai/key-rotary"
import { buildImagePrompt, generateImageWithProvider } from "@/lib/ai/provider"
import { MAX_IMAGE_BYTES, assertAllowedImageBuffer, ingestImage } from "@/lib/media/ingest"
import { classifyAiKeyFailure, formatStoredAiKeyFailure, toAiKeyFailureHttpStatus } from "@/lib/security/ai-key-status"
import {
    ensureUniquePostSlug,
    estimateReadingTime,
    sanitizeArticleHtml,
    slugifyTitle,
    validatePublishReadiness,
} from "@/lib/content/post-publishing"

const contentModeSchema = z.object({
    mode: z.literal("content"),
    title: z.string().trim().min(3).max(180),
    contentHtml: z.string().trim().min(50).max(200_000),
    excerpt: z.string().trim().max(320).optional(),
    slug: z.string().trim().min(3).max(180).optional(),
    status: z.enum(["DRAFT", "PUBLISHED"]).default("DRAFT"),
    metaTitle: z.string().trim().max(120).optional(),
    metaDescription: z.string().trim().max(320).optional(),
    focusKeyword: z.string().trim().max(120).optional(),
    categorySlugs: z.array(z.string().trim().min(1).max(200)).max(10).optional(),
    tagSlugs: z.array(z.string().trim().min(1).max(200)).max(20).optional(),
})

const generateModeSchema = z.object({
    mode: z.literal("generate"),
    topic: z.string().trim().min(3).max(200),
    tone: z.string().trim().min(2).max(80).optional(),
    targetWordCount: z.coerce.number().int().min(300).max(3000).optional(),
    status: z.enum(["DRAFT", "PUBLISHED"]).default("DRAFT"),
    generateImage: z.boolean().optional(),
    providerKeyId: z.string().trim().min(1).max(60).optional(),
    imageProviderKeyId: z.string().trim().min(1).max(60).optional(),
})

const agentArticleSchema = z.discriminatedUnion("mode", [contentModeSchema, generateModeSchema])

type AgentArticlePayload = z.infer<typeof agentArticleSchema>

function agentErrorJson(error: string, errorCode: string, status: number, details?: Record<string, unknown>) {
    return NextResponse.json(
        {
            success: false,
            error,
            errorCode,
            ...(details ? { details } : {}),
        },
        { status }
    )
}

function validationErrorJson(zodError: z.ZodError) {
    return NextResponse.json(
        {
            success: false,
            error: "Validation failed",
            errorCode: "AGENT_ARTICLE_VALIDATION_FAILED",
            details: {
                issues: zodError.issues.map((issue) => ({
                    path: issue.path.join("."),
                    code: issue.code,
                    message: issue.message,
                })),
            },
        },
        { status: 400 }
    )
}

function toJsonString(value: unknown): string {
    try {
        return JSON.stringify(value)
    } catch {
        return "{}"
    }
}

function getPublicUrl(slug: string): string {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/+$/, "")
    return baseUrl ? `${baseUrl}/${slug}` : `/${slug}`
}

async function resolveTaxonomyIds(input: {
    categorySlugs?: string[]
    tagSlugs?: string[]
}): Promise<{ categoryIds: string[]; tagIds: string[]; unknown: string[] }> {
    const unknown: string[] = []

    const categories = input.categorySlugs?.length
        ? await prisma.category.findMany({
            where: { slug: { in: input.categorySlugs } },
            select: { id: true, slug: true },
        })
        : []

    const tags = input.tagSlugs?.length
        ? await prisma.tag.findMany({
            where: { slug: { in: input.tagSlugs } },
            select: { id: true, slug: true },
        })
        : []

    for (const slug of input.categorySlugs || []) {
        if (!categories.some((category) => category.slug === slug)) {
            unknown.push(`category:${slug}`)
        }
    }

    for (const slug of input.tagSlugs || []) {
        if (!tags.some((tag) => tag.slug === slug)) {
            unknown.push(`tag:${slug}`)
        }
    }

    return {
        categoryIds: categories.map((category) => category.id),
        tagIds: tags.map((tag) => tag.id),
        unknown,
    }
}

async function tryGenerateFeaturedImage(input: {
    title: string
    topic: string
    imageProviderKeyId?: string
}): Promise<{ url: string; mediaId: string } | { error: string }> {
    const provider = await resolveImageProvider(input.imageProviderKeyId)
    if (!provider) {
        return { error: "Tidak ada provider gambar AI aktif (capability=image)" }
    }

    const prompt = buildImagePrompt({ title: input.title, topic: input.topic })

    try {
        const generated = await generateImageWithProvider(
            { apiKey: provider.apiKey, baseUrl: provider.baseUrl, model: provider.model },
            prompt,
            { maxBytes: MAX_IMAGE_BYTES }
        )

        const mimeType = assertAllowedImageBuffer(generated.buffer)

        const media = await ingestImage({
            buffer: generated.buffer,
            mimeType,
            filename: `${slugifyTitle(input.title) || "featured"}.${mimeType.split("/")[1] || "png"}`,
            source: "ai",
            alt: input.title,
            aiPrompt: prompt,
            folder: "mumnhun/ai",
        })

        await prisma.aiApiKey.update({
            where: { id: provider.keyId },
            data: {
                usageCount: { increment: 1 },
                lastUsedAt: new Date(),
                lastError: null,
            },
        })

        return { url: media.url, mediaId: media.mediaId }
    } catch (error) {
        const failure = classifyAiKeyFailure(error)

        await prisma.aiApiKey
            .update({
                where: { id: provider.keyId },
                data: {
                    lastUsedAt: new Date(),
                    lastError: formatStoredAiKeyFailure(failure),
                },
            })
            .catch(() => undefined)

        return { error: failure.message }
    }
}

type CreatePostInput = {
    title: string
    slug: string
    contentHtml: string
    excerpt: string | null
    status: "DRAFT" | "PUBLISHED"
    metaTitle: string | null
    metaDescription: string | null
    focusKeyword: string | null
    featuredImage: string | null
    categoryIds: string[]
    tagIds: string[]
    identity: AgentIdentity
}

async function createAgentPost(input: CreatePostInput) {
    const post = await prisma.post.create({
        data: {
            title: input.title,
            slug: input.slug,
            content: input.contentHtml,
            excerpt: input.excerpt,
            status: input.status,
            publishedAt: input.status === "PUBLISHED" ? new Date() : null,
            readingTime: estimateReadingTime(input.contentHtml),
            metaTitle: input.metaTitle,
            metaDescription: input.metaDescription,
            focusKeyword: input.focusKeyword,
            featuredImage: input.featuredImage,
            ogImage: input.featuredImage,
            source: "agent",
            createdVia: input.identity.tokenId,
            categories: input.categoryIds.length
                ? { create: input.categoryIds.map((categoryId) => ({ category: { connect: { id: categoryId } } })) }
                : undefined,
            tags: input.tagIds.length
                ? { create: input.tagIds.map((tagId) => ({ tag: { connect: { id: tagId } } })) }
                : undefined,
        },
        select: {
            id: true,
            slug: true,
            title: true,
            status: true,
            featuredImage: true,
        },
    })

    if (post.status === "PUBLISHED") {
        revalidatePath(`/${post.slug}`)
        revalidatePath("/")
    }

    return post
}

/**
 * External agent entry point (OpenClaw, Hermes, AI code editors).
 *
 * Authenticated by Bearer agent token rather than the admin session, so it deliberately
 * bypasses cookie CSRF while enforcing scopes and per-token rate limits instead.
 */
export async function POST(request: NextRequest) {
    const requestId = crypto.randomUUID()

    // Authenticate first (scope check happens after we know the requested mode), so an
    // unauthenticated caller can never probe payload validation behaviour.
    const agentCheck = await requireAgentToken(request, null, { action: "agent-articles:create" })
    if (!agentCheck.ok) return agentCheck.response

    const identity = agentCheck.identity

    let rawBody: unknown
    try {
        rawBody = await request.json()
    } catch {
        return agentErrorJson("Invalid JSON payload", "AGENT_ARTICLE_INVALID_JSON", 400)
    }

    const parsed = agentArticleSchema.safeParse(rawBody)
    if (!parsed.success) {
        logAdminWarn({
            requestId,
            action: "agent-articles:create",
            userId: identity.tokenId,
            role: "AGENT",
            roleSource: "agent-token",
            status: 400,
            validation: { ok: false, reason: "invalid_payload" },
        })

        return validationErrorJson(parsed.error)
    }

    const payload: AgentArticlePayload = parsed.data

    const requiredScope = payload.mode === "generate" ? "article:generate" : "article:create"
    if (!identity.scopes.includes(requiredScope)) {
        logAdminWarn({
            requestId,
            action: "agent-articles:create",
            userId: identity.tokenId,
            role: "AGENT",
            roleSource: "agent-token",
            status: 403,
            validation: { ok: false, reason: `missing_scope:${requiredScope}` },
        })

        return agentErrorJson(
            `Token tidak memiliki scope ${requiredScope}`,
            "AGENT_SCOPE_INSUFFICIENT",
            403
        )
    }

    // Publishing is a separate, stronger capability than drafting.
    if (payload.status === "PUBLISHED" && !identity.scopes.includes("article:publish")) {
        logAdminWarn({
            requestId,
            action: "agent-articles:create",
            userId: identity.tokenId,
            role: "AGENT",
            roleSource: "agent-token",
            status: 403,
            validation: { ok: false, reason: "missing_publish_scope" },
        })

        return agentErrorJson(
            "Token tidak memiliki scope article:publish",
            "AGENT_SCOPE_INSUFFICIENT",
            403
        )
    }

    if (payload.mode === "generate" && payload.generateImage && !identity.scopes.includes("image:generate")) {
        return agentErrorJson(
            "Token tidak memiliki scope image:generate",
            "AGENT_SCOPE_INSUFFICIENT",
            403
        )
    }

    try {
        if (payload.mode === "content") {
            // Agent-provided HTML is untrusted: run it through the same allowlist as the editor.
            const safeContentHtml = sanitizeArticleHtml(payload.contentHtml)
            if (!safeContentHtml.trim()) {
                return agentErrorJson(
                    "Konten kosong setelah sanitasi HTML",
                    "AGENT_ARTICLE_CONTENT_EMPTY",
                    400
                )
            }

            if (payload.status === "PUBLISHED") {
                const issues = validatePublishReadiness({
                    title: payload.title,
                    contentHtml: safeContentHtml,
                    excerpt: payload.excerpt,
                    metaDescription: payload.metaDescription,
                })

                if (issues.length > 0) {
                    return agentErrorJson(
                        "Artikel belum memenuhi syarat publish langsung",
                        "ARTICLE_NOT_PUBLISHABLE",
                        422,
                        { issues }
                    )
                }
            }

            const taxonomy = await resolveTaxonomyIds({
                categorySlugs: payload.categorySlugs,
                tagSlugs: payload.tagSlugs,
            })

            const slug = await ensureUniquePostSlug(payload.slug || payload.title)

            const post = await createAgentPost({
                title: payload.title,
                slug,
                contentHtml: safeContentHtml,
                excerpt: payload.excerpt?.trim() || null,
                status: payload.status,
                metaTitle: payload.metaTitle?.trim() || null,
                metaDescription: payload.metaDescription?.trim() || null,
                focusKeyword: payload.focusKeyword?.trim() || null,
                featuredImage: null,
                categoryIds: taxonomy.categoryIds,
                tagIds: taxonomy.tagIds,
                identity,
            })

            logAdminInfo({
                requestId,
                action: "agent-articles:create",
                userId: identity.tokenId,
                role: "AGENT",
                roleSource: "agent-token",
                status: 200,
                payloadSummary: { postId: post.id, status: post.status, mode: "content" },
                validation: { ok: true },
            })

            return NextResponse.json({
                success: true,
                data: {
                    id: post.id,
                    slug: post.slug,
                    title: post.title,
                    status: post.status,
                    publicUrl: getPublicUrl(post.slug),
                    editUrl: `/admin/posts/${post.id}/edit`,
                    ...(taxonomy.unknown.length ? { warnings: { unknownTaxonomy: taxonomy.unknown } } : {}),
                },
            })
        }

        const task = await prisma.aiTask.create({
            data: {
                type: "generate_article",
                status: "processing",
                progress: 10,
                userId: identity.tokenId,
                input: toJsonString(payload),
            },
        })

        try {
            const activeKeys = await loadActiveAiKeys({
                capability: "text",
                keyId: payload.providerKeyId,
            })

            const generation = await generateArticleWithRotary({
                keys: activeKeys,
                payload: {
                    topic: payload.topic,
                    tone: payload.tone,
                    targetWordCount: payload.targetWordCount,
                },
                onAttempt: async (attemptIndex, attemptedKeyIds) => {
                    await prisma.aiTask.update({
                        where: { id: task.id },
                        data: {
                            progress: Math.min(70, 25 + attemptIndex * 20),
                            output: toJsonString({ attemptedKeyIds }),
                        },
                    })
                },
            })

            const safeContentHtml = sanitizeArticleHtml(generation.article.contentHtml)
            if (!safeContentHtml.trim()) {
                throw new Error("Konten hasil AI kosong setelah sanitasi HTML")
            }

            if (payload.status === "PUBLISHED") {
                const issues = validatePublishReadiness({
                    title: generation.article.title,
                    contentHtml: safeContentHtml,
                    excerpt: generation.article.excerpt,
                    metaDescription: generation.article.metaDescription,
                })

                if (issues.length > 0) {
                    await prisma.aiTask.update({
                        where: { id: task.id },
                        data: {
                            status: "failed",
                            progress: 100,
                            error: "ARTICLE_NOT_PUBLISHABLE",
                            completedAt: new Date(),
                        },
                    })

                    return agentErrorJson(
                        "Artikel hasil AI belum memenuhi syarat publish langsung",
                        "ARTICLE_NOT_PUBLISHABLE",
                        422,
                        { taskId: task.id, issues }
                    )
                }
            }

            let featuredImage: string | null = null
            let featuredImageError: string | null = null

            if (payload.generateImage) {
                const imageResult = await tryGenerateFeaturedImage({
                    title: generation.article.title,
                    topic: payload.topic,
                    imageProviderKeyId: payload.imageProviderKeyId,
                })

                if ("url" in imageResult) {
                    featuredImage = imageResult.url
                } else {
                    featuredImageError = imageResult.error
                }
            }

            const slug = await ensureUniquePostSlug(
                generation.article.slugSuggestion || generation.article.title || payload.topic
            )

            const post = await createAgentPost({
                title: generation.article.title,
                slug,
                contentHtml: safeContentHtml,
                excerpt: generation.article.excerpt,
                status: payload.status,
                metaTitle: generation.article.metaTitle,
                metaDescription: generation.article.metaDescription,
                focusKeyword: generation.article.focusKeyword,
                featuredImage,
                categoryIds: [],
                tagIds: [],
                identity,
            })

            await prisma.aiTask.update({
                where: { id: task.id },
                data: {
                    status: "completed",
                    progress: 100,
                    output: toJsonString({
                        postId: post.id,
                        postSlug: post.slug,
                        postStatus: post.status,
                        featuredImage,
                        featuredImageError,
                        usedKeyId: generation.usedKeyId,
                        attemptedKeyIds: generation.attemptedKeyIds,
                    }),
                    error: null,
                    completedAt: new Date(),
                },
            })

            logAdminInfo({
                requestId,
                action: "agent-articles:create",
                userId: identity.tokenId,
                role: "AGENT",
                roleSource: "agent-token",
                status: 200,
                payloadSummary: { postId: post.id, status: post.status, mode: "generate", taskId: task.id },
                validation: { ok: true },
            })

            return NextResponse.json({
                success: true,
                data: {
                    id: post.id,
                    slug: post.slug,
                    title: post.title,
                    status: post.status,
                    featuredImage: post.featuredImage,
                    publicUrl: getPublicUrl(post.slug),
                    editUrl: `/admin/posts/${post.id}/edit`,
                    taskId: task.id,
                    ...(featuredImageError ? { warnings: { featuredImage: featuredImageError } } : {}),
                },
            })
        } catch (error) {
            const summarizedError = summarizeUnknownError(error).slice(0, 800)

            await prisma.aiTask
                .update({
                    where: { id: task.id },
                    data: {
                        status: "failed",
                        progress: 100,
                        error: summarizedError,
                        completedAt: new Date(),
                    },
                })
                .catch(() => undefined)

            logAdminError({
                requestId,
                action: "agent-articles:create",
                userId: identity.tokenId,
                role: "AGENT",
                roleSource: "agent-token",
                status: 502,
                error: summarizedError,
                payloadSummary: { taskId: task.id },
            })

            if (error instanceof NoActiveAiKeyError) {
                return agentErrorJson("Tidak ada API key AI aktif", "AI_KEYS_NOT_CONFIGURED", 400, {
                    taskId: task.id,
                })
            }

            const failure = error instanceof AllAiKeysFailedError ? error.failure : classifyAiKeyFailure(error)

            return agentErrorJson(
                "Gagal generate artikel AI",
                failure.code,
                toAiKeyFailureHttpStatus(failure),
                { taskId: task.id }
            )
        }
    } catch (error) {
        const summarizedError = summarizeUnknownError(error).slice(0, 800)

        logAdminError({
            requestId,
            action: "agent-articles:create",
            userId: identity.tokenId,
            role: "AGENT",
            roleSource: "agent-token",
            status: 500,
            error: summarizedError,
        })

        return agentErrorJson("Failed to create article", "AGENT_ARTICLE_CREATE_FAILED", 500)
    }
}
