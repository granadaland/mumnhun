import { NextRequest, NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import prisma from "@/lib/db/prisma"
import { requireAdminMutationApi } from "@/lib/security/admin"
import {
    classifyProviderFailure,
    formatStoredAiKeyFailure,
    toAiKeyFailureHttpStatus,
} from "@/lib/security/ai-key-status"
import { logAdminError, logAdminInfo, logAdminWarn } from "@/lib/observability/admin-log"
import { summarizeUnknownError } from "@/lib/security/admin-helpers"
import { sanitizeHtmlContent } from "@/lib/security/sanitize-html"
import {
    AllAiKeysFailedError,
    NoActiveAiKeyError,
    generateArticleWithRotary,
    loadActiveAiKeys,
    resolveImageProvider,
} from "@/lib/ai/key-rotary"
import { buildImagePrompt, generateImageWithProvider } from "@/lib/ai/provider"
import { applyImagePolicy } from "@/lib/ai/image-policy"
import { MAX_IMAGE_BYTES, assertAllowedImageBuffer, ingestImage } from "@/lib/media/ingest"
import {
    ensureUniquePostSlug,
    estimateReadingTime,
    slugifyTitle,
    validatePublishReadiness,
} from "@/lib/content/post-publishing"

// Article + optional image generation can take minutes; extend the platform timeout.
export const maxDuration = 300

const generateArticleSchema = z.object({
    topic: z.string().trim().min(3, "Topic/keyword minimal 3 karakter").max(200),
    tone: z.string().trim().min(2).max(80).optional(),
    targetWordCount: z.coerce.number().int().min(300).max(3000).optional(),
    status: z.enum(["DRAFT", "PUBLISHED"]).optional(),
    providerKeyId: z.string().trim().min(1).max(60).optional(),
    generateImage: z.boolean().optional(),
    imageProviderKeyId: z.string().trim().min(1).max(60).optional(),
})

function toJsonString(value: unknown): string {
    try {
        return JSON.stringify(value)
    } catch {
        return "{}"
    }
}

function errorJson(message: string, status: number, data?: unknown) {
    return NextResponse.json(
        {
            success: false,
            error: message,
            ...(typeof data === "undefined" ? {} : { data }),
        },
        { status }
    )
}

function errorJsonWithCode(message: string, status: number, errorCode: string, data?: unknown) {
    return NextResponse.json(
        {
            success: false,
            error: message,
            errorCode,
            ...(typeof data === "undefined" ? {} : { data }),
        },
        { status }
    )
}

function slugify(text: string): string {
    return slugifyTitle(text)
}

class ArticleNotPublishableError extends Error {
    issues: ReturnType<typeof validatePublishReadiness>

    constructor(issues: ReturnType<typeof validatePublishReadiness>) {
        super("Artikel hasil AI belum memenuhi syarat publish langsung")
        this.name = "ArticleNotPublishableError"
        this.issues = issues
    }
}

type FeaturedImageResult = {
    url: string
    mediaId: string
    keyId: string
}

/**
 * Best-effort featured image generation. A failure here must not discard an otherwise
 * successful article, so the error is reported in the task output instead of thrown.
 */
async function tryGenerateFeaturedImage(input: {
    title: string
    topic: string
    imageProviderKeyId?: string
}): Promise<{ image: FeaturedImageResult } | { error: string }> {
    const provider = await resolveImageProvider(input.imageProviderKeyId)
    if (!provider) {
        return { error: "Tidak ada provider gambar AI aktif (capability=image)" }
    }

    const prompt = applyImagePolicy({
        prompt: buildImagePrompt({ title: input.title, topic: input.topic }),
        aspectRatio: "16:9",
    })

    try {
        const generated = await generateImageWithProvider(
            provider,
            prompt,
            // Bound the attempt so image generation cannot consume the article's budget.
            { maxBytes: MAX_IMAGE_BYTES, timeoutMs: 60_000, aspectRatio: "16:9" }
        )

        const mimeType = assertAllowedImageBuffer(generated.buffer)

        const media = await ingestImage({
            buffer: generated.buffer,
            mimeType,
            filename: `${slugify(input.title) || "featured"}.${mimeType.split("/")[1] || "png"}`,
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

        return { image: { url: media.url, mediaId: media.mediaId, keyId: provider.keyId } }
    } catch (error) {
        const failure = classifyProviderFailure(error)

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

export async function POST(request: NextRequest) {
    const adminCheck = await requireAdminMutationApi(request, { action: "ai-generate:create" })
    if (!adminCheck.ok) return adminCheck.response

    const requestId = crypto.randomUUID()

    let payload: z.infer<typeof generateArticleSchema>
    try {
        const body = await request.json()
        const parsed = generateArticleSchema.safeParse(body)

        if (!parsed.success) {
            logAdminWarn({
                requestId,
                action: "ai-generate:create",
                userId: adminCheck.identity.id,
                role: adminCheck.identity.role,
                roleSource: adminCheck.identity.source,
                status: 400,
                validation: { ok: false, reason: "invalid_payload" },
            })

            return errorJson("Validation failed", 400, {
                issues: parsed.error.issues.map((issue) => ({
                    path: issue.path.join("."),
                    code: issue.code,
                    message: issue.message,
                })),
            })
        }

        payload = parsed.data
    } catch {
        return errorJson("Invalid request payload", 400)
    }

    const targetStatus = payload.status || "DRAFT"

    const task = await prisma.aiTask.create({
        data: {
            type: "generate_article",
            status: "pending",
            progress: 0,
            userId: adminCheck.identity.id,
            input: toJsonString(payload),
        },
    })

    try {
        await prisma.aiTask.update({
            where: { id: task.id },
            data: { status: "processing", progress: 15 },
        })

        const activeKeys = await loadActiveAiKeys({
            capability: "text",
            keyId: payload.providerKeyId,
        })

        const generation = await generateArticleWithRotary({
            keys: activeKeys,
            // Route budget is 300s (maxDuration below): stop rotating keys once the wall
            // clock is spent instead of starting another multi-minute attempt.
            budgetMs: 250_000,
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

        const aiResult = generation.article

        // AI output is untrusted input: strip anything outside the editor's allowed HTML.
        const safeContentHtml = sanitizeHtmlContent(aiResult.contentHtml)
        if (!safeContentHtml.trim()) {
            throw new Error("Konten hasil AI kosong setelah sanitasi HTML")
        }

        if (targetStatus === "PUBLISHED") {
            const publishIssues = validatePublishReadiness({
                title: aiResult.title,
                contentHtml: safeContentHtml,
                excerpt: aiResult.excerpt,
                metaDescription: aiResult.metaDescription,
            })

            if (publishIssues.length > 0) {
                throw new ArticleNotPublishableError(publishIssues)
            }
        }

        await prisma.aiTask.update({
            where: { id: task.id },
            data: { progress: 75 },
        })

        let featuredImage: FeaturedImageResult | null = null
        let featuredImageError: string | null = null

        if (payload.generateImage) {
            const imageResult = await tryGenerateFeaturedImage({
                title: aiResult.title,
                topic: payload.topic,
                imageProviderKeyId: payload.imageProviderKeyId,
            })

            if ("image" in imageResult) {
                featuredImage = imageResult.image
            } else {
                featuredImageError = imageResult.error
            }
        }

        await prisma.aiTask.update({
            where: { id: task.id },
            data: { progress: 85 },
        })

        const slug = await ensureUniquePostSlug(aiResult.slugSuggestion || aiResult.title || payload.topic)

        const post = await prisma.post.create({
            data: {
                title: aiResult.title,
                slug,
                content: safeContentHtml,
                excerpt: aiResult.excerpt,
                status: targetStatus,
                publishedAt: targetStatus === "PUBLISHED" ? new Date() : null,
                readingTime: estimateReadingTime(safeContentHtml),
                metaTitle: aiResult.metaTitle,
                metaDescription: aiResult.metaDescription,
                focusKeyword: aiResult.focusKeyword,
                featuredImage: featuredImage?.url ?? null,
                ogImage: featuredImage?.url ?? null,
                authorId: adminCheck.identity.id,
                source: "ai_dashboard",
                createdVia: adminCheck.identity.id,
            },
            select: {
                id: true,
                slug: true,
                title: true,
                status: true,
                featuredImage: true,
            },
        })

        if (targetStatus === "PUBLISHED") {
            revalidatePath(`/${post.slug}`)
            revalidatePath("/")
        }

        const taskOutput = {
            postId: post.id,
            postSlug: post.slug,
            postTitle: post.title,
            postStatus: post.status,
            featuredImage: post.featuredImage,
            featuredImageError,
            usedKeyId: generation.usedKeyId,
            attemptedKeyIds: generation.attemptedKeyIds,
            editUrl: `/admin/posts/${post.id}/edit`,
        }

        await prisma.aiTask.update({
            where: { id: task.id },
            data: {
                status: "completed",
                progress: 100,
                output: toJsonString(taskOutput),
                error: null,
                completedAt: new Date(),
            },
        })

        logAdminInfo({
            requestId,
            action: "ai-generate:create",
            userId: adminCheck.identity.id,
            role: adminCheck.identity.role,
            roleSource: adminCheck.identity.source,
            status: 200,
            payloadSummary: {
                taskId: task.id,
                postId: post.id,
                postStatus: post.status,
                attempts: generation.attemptedKeyIds.length,
                usedKeyId: generation.usedKeyId,
                generatedImage: Boolean(featuredImage),
            },
            validation: { ok: true },
        })

        return NextResponse.json({
            success: true,
            data: {
                taskId: task.id,
                taskStatus: "completed",
                post: {
                    id: post.id,
                    slug: post.slug,
                    title: post.title,
                    status: post.status,
                    featuredImage: post.featuredImage,
                    editUrl: `/admin/posts/${post.id}/edit`,
                },
                ...(featuredImageError ? { warnings: { featuredImage: featuredImageError } } : {}),
            },
        })
    } catch (error) {
        const summarizedError = summarizeUnknownError(error).slice(0, 800)
        const failure =
            error instanceof AllAiKeysFailedError ? error.failure : classifyProviderFailure(error)

        await prisma.aiTask.update({
            where: { id: task.id },
            data: {
                status: "failed",
                progress: 100,
                error: summarizedError,
                completedAt: new Date(),
            },
        })

        logAdminError({
            requestId,
            action: "ai-generate:create",
            userId: adminCheck.identity.id,
            role: adminCheck.identity.role,
            roleSource: adminCheck.identity.source,
            status: 500,
            error: summarizedError,
            payloadSummary: { taskId: task.id },
        })

        if (error instanceof NoActiveAiKeyError) {
            return errorJsonWithCode("Tidak ada API key AI aktif", 400, "AI_KEYS_NOT_CONFIGURED", {
                taskId: task.id,
            })
        }

        if (error instanceof ArticleNotPublishableError) {
            return errorJsonWithCode(
                "Artikel hasil AI belum memenuhi syarat publish langsung",
                422,
                "ARTICLE_NOT_PUBLISHABLE",
                { taskId: task.id, issues: error.issues }
            )
        }

        return errorJsonWithCode(
            "Gagal generate artikel AI",
            toAiKeyFailureHttpStatus(failure),
            failure.code,
            { taskId: task.id }
        )
    }
}
