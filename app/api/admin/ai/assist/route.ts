import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import prisma from "@/lib/db/prisma"
import { requireAdminMutationApi } from "@/lib/security/admin"
import {
    classifyProviderFailure,
    toAiKeyFailureHttpStatus,
} from "@/lib/security/ai-key-status"
import { logAdminError, logAdminWarn } from "@/lib/observability/admin-log"
import { summarizeUnknownError } from "@/lib/security/admin-helpers"
import { sanitizeArticleHtml } from "@/lib/content/post-publishing"
import { RoleModelNotConfiguredError, generateRoleJson, generateRoleText } from "@/lib/ai/task-models"
import {
    HAIBUNDA_VOICE,
    JSON_ONLY_INSTRUCTION,
    buildFullContentPrompt,
    buildFullContentMarkdownPrompt,
    buildImageMetaPrompt,
    buildOutlinePrompt,
    buildSeoPackagePrompt,
    buildTitleIdeasPrompt,
    fullContentStructuredSchema,
    imageMetaOutputSchema,
    outlineStructuredSchema,
    seoPackageOutputSchema,
    titleIdeasOutputSchema,
} from "@/lib/ai/prompts"
import { coerceToHtml, renderArticleHtml, renderOutlineHtml } from "@/lib/ai/article-format"

/**
 * In-editor AI assistant.
 *
 * Every action runs on the dedicated "text" role model except `generate_image_meta`,
 * which also runs on the text model because it only produces a prompt plus alt/caption
 * copy -- the actual pixels come from the image role via /api/admin/ai/image.
 */

// Full-article generation can take minutes on slower gateways; allow up to 5 minutes so
// the platform does not kill the request before the model finishes.
export const maxDuration = 300

const assistRequestSchema = z.discriminatedUnion("action", [
    z.object({
        action: z.literal("generate_title"),
        payload: z.object({
            topic: z.string().trim().min(2).max(200),
            keyword: z.string().trim().max(120).optional(),
        }),
    }),
    z.object({
        action: z.literal("generate_excerpt"),
        payload: z.object({
            title: z.string().trim().max(180),
            content: z.string().trim().min(10),
        }),
    }),
    z.object({
        action: z.literal("generate_outline"),
        payload: z.object({
            title: z.string().trim().max(180),
            keyword: z.string().trim().max(120).optional(),
            angle: z.string().trim().max(300).optional(),
        }),
    }),
    z.object({
        action: z.literal("generate_content"),
        payload: z.object({
            title: z.string().trim().max(180),
            outline: z.string().trim().min(10),
            keyword: z.string().trim().max(120).optional(),
            targetWordCount: z.coerce.number().int().min(400).max(3000).optional(),
        }),
    }),
    z.object({
        action: z.literal("generate_seo"),
        payload: z.object({
            title: z.string().trim().max(180),
            content: z.string().trim().min(50),
            keyword: z.string().trim().max(120).optional(),
        }),
    }),
    z.object({
        action: z.literal("generate_image_meta"),
        payload: z.object({
            title: z.string().trim().max(180),
            context: z.string().trim().max(4000).optional(),
            keyword: z.string().trim().max(120).optional(),
            purpose: z.enum(["featured", "inline"]).default("featured"),
        }),
    }),
])

type AssistRequest = z.infer<typeof assistRequestSchema>
type AssistAction = AssistRequest["action"]

const excerptOutputSchema = z.object({
    excerpt: z.string().trim().min(10).max(400),
})

function errorJson(message: string, status: number, errorCode: string, details?: Record<string, unknown>) {
    return NextResponse.json(
        { success: false, error: message, errorCode, ...(details ? { details } : {}) },
        { status }
    )
}

function validationErrorJson(zodError: z.ZodError) {
    return NextResponse.json(
        {
            success: false,
            error: "Validation failed",
            errorCode: "AI_ASSIST_VALIDATION_FAILED",
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

/** Per-action tuning. Long-form generation needs a larger budget and a longer timeout. */
const ACTION_TUNING: Record<AssistAction, { temperature: number; maxTokens: number; timeoutMs: number }> = {
    generate_title: { temperature: 0.85, maxTokens: 1024, timeoutMs: 60_000 },
    generate_excerpt: { temperature: 0.7, maxTokens: 1024, timeoutMs: 60_000 },
    generate_outline: { temperature: 0.6, maxTokens: 2048, timeoutMs: 90_000 },
    generate_content: { temperature: 0.75, maxTokens: 8192, timeoutMs: 240_000 },
    generate_seo: { temperature: 0.4, maxTokens: 2048, timeoutMs: 90_000 },
    generate_image_meta: { temperature: 0.7, maxTokens: 1024, timeoutMs: 60_000 },
}

export async function POST(request: NextRequest) {
    const adminCheck = await requireAdminMutationApi(request, { action: "ai-assist" })
    if (!adminCheck.ok) return adminCheck.response

    const requestId = crypto.randomUUID()

    let payload: AssistRequest
    try {
        const body = await request.json()
        const parsed = assistRequestSchema.safeParse(body)
        if (!parsed.success) {
            logAdminWarn({
                requestId,
                action: "ai-assist",
                userId: adminCheck.identity.id,
                role: adminCheck.identity.role,
                roleSource: adminCheck.identity.source,
                status: 400,
                validation: { ok: false, reason: "invalid_payload" },
            })
            return validationErrorJson(parsed.error)
        }
        payload = parsed.data
    } catch {
        return errorJson("Invalid request payload", 400, "AI_ASSIST_INVALID_JSON")
    }

    const tuning = ACTION_TUNING[payload.action]

    try {
        switch (payload.action) {
            case "generate_title": {
                const result = await generateRoleJson(
                    "text",
                    {
                        system: HAIBUNDA_VOICE,
                        prompt: buildTitleIdeasPrompt({
                            topic: payload.payload.topic,
                            keyword: payload.payload.keyword,
                        }),
                        ...tuning,
                    },
                    titleIdeasOutputSchema
                )
                return NextResponse.json({ success: true, data: result.value })
            }

            case "generate_excerpt": {
                const result = await generateRoleJson(
                    "text",
                    {
                        system: HAIBUNDA_VOICE,
                        prompt: `Buat ringkasan (excerpt) untuk artikel berikut.
Judul: ${payload.payload.title}
Konten: ${payload.payload.content.slice(0, 2500)}

Syarat: 1-2 kalimat, maksimal 300 karakter, menyebut manfaat konkret bagi Mums,
dan tidak sekadar mengulang judul.

Kembalikan JSON dengan key "excerpt". ${JSON_ONLY_INSTRUCTION}`,
                        ...tuning,
                    },
                    excerptOutputSchema
                )
                return NextResponse.json({ success: true, data: result.value })
            }

            case "generate_outline": {
                const result = await generateRoleJson(
                    "text",
                    {
                        system: HAIBUNDA_VOICE,
                        prompt: buildOutlinePrompt({
                            title: payload.payload.title,
                            keyword: payload.payload.keyword,
                            angle: payload.payload.angle,
                        }),
                        ...tuning,
                    },
                    outlineStructuredSchema
                )

                // Build the HTML from the structured shape, so every section becomes an H2
                // regardless of how the model formatted its text. Then sanitize with the
                // same allowlist used for stored content.
                const outlineHtml = sanitizeArticleHtml(renderOutlineHtml(result.value))
                if (!outlineHtml) {
                    return errorJson(
                        "Outline hasil AI kosong setelah diproses",
                        502,
                        "AI_ASSIST_EMPTY_OUTPUT"
                    )
                }

                return NextResponse.json({ success: true, data: { outlineHtml } })
            }

            case "generate_content": {
                // Primary path: structured JSON → guaranteed H2/H3/list HTML.
                // Fallback path: if the gateway cannot produce the nested JSON shape, ask
                // for Markdown prose and convert it deterministically. Either way the editor
                // receives real structure, never a flat blob.
                let contentHtml = ""
                let excerpt: string | null = null

                try {
                    const result = await generateRoleJson(
                        "text",
                        {
                            system: HAIBUNDA_VOICE,
                            prompt: buildFullContentPrompt({
                                title: payload.payload.title,
                                outline: payload.payload.outline,
                                keyword: payload.payload.keyword,
                                targetWordCount: payload.payload.targetWordCount,
                            }),
                            ...tuning,
                        },
                        fullContentStructuredSchema
                    )

                    contentHtml = sanitizeArticleHtml(renderArticleHtml(result.value))
                    excerpt = result.value.excerpt ?? null
                } catch (structuredError) {
                    // A schema/JSON failure is recoverable via the Markdown fallback; a
                    // provider/auth failure is not, so rethrow those to the outer handler.
                    if (structuredError instanceof RoleModelNotConfiguredError) {
                        throw structuredError
                    }

                    const fallback = await generateRoleText("text", {
                        system: HAIBUNDA_VOICE,
                        prompt: buildFullContentMarkdownPrompt({
                            title: payload.payload.title,
                            outline: payload.payload.outline,
                            keyword: payload.payload.keyword,
                            targetWordCount: payload.payload.targetWordCount,
                        }),
                        ...tuning,
                    })

                    contentHtml = sanitizeArticleHtml(coerceToHtml(fallback.value))
                }

                if (!contentHtml) {
                    return errorJson(
                        "Konten hasil AI kosong setelah diproses",
                        502,
                        "AI_ASSIST_EMPTY_OUTPUT"
                    )
                }

                return NextResponse.json({
                    success: true,
                    data: { contentHtml, excerpt },
                })
            }

            case "generate_seo": {
                // Categories are constrained to what the site already has; tags may be new.
                const [categories, tags] = await Promise.all([
                    prisma.category.findMany({ select: { slug: true, name: true }, orderBy: { name: "asc" } }),
                    prisma.tag.findMany({ select: { name: true }, orderBy: { name: "asc" }, take: 120 }),
                ])

                const result = await generateRoleJson(
                    "text",
                    {
                        system: HAIBUNDA_VOICE,
                        prompt: buildSeoPackagePrompt({
                            title: payload.payload.title,
                            content: payload.payload.content,
                            keyword: payload.payload.keyword,
                            availableCategories: categories,
                            existingTags: tags.map((tag) => tag.name),
                        }),
                        ...tuning,
                    },
                    seoPackageOutputSchema
                )

                const validSlugs = new Set(categories.map((category) => category.slug))
                const categorySlug =
                    result.value.categorySlug && validSlugs.has(result.value.categorySlug)
                        ? result.value.categorySlug
                        : null

                return NextResponse.json({
                    success: true,
                    data: { ...result.value, categorySlug },
                })
            }

            case "generate_image_meta": {
                const result = await generateRoleJson(
                    "text",
                    {
                        system: HAIBUNDA_VOICE,
                        prompt: buildImageMetaPrompt({
                            title: payload.payload.title,
                            context: payload.payload.context,
                            keyword: payload.payload.keyword,
                            purpose: payload.payload.purpose,
                        }),
                        ...tuning,
                    },
                    imageMetaOutputSchema
                )
                return NextResponse.json({ success: true, data: result.value })
            }
        }
    } catch (error) {
        const failure = classifyProviderFailure(error)

        logAdminError({
            requestId,
            action: "ai-assist",
            userId: adminCheck.identity.id,
            role: adminCheck.identity.role,
            roleSource: adminCheck.identity.source,
            status: toAiKeyFailureHttpStatus(failure),
            error: summarizeUnknownError(error).slice(0, 800),
        })

        if (error instanceof RoleModelNotConfiguredError) {
            return errorJson(
                "Model Generate Teks belum dikonfigurasi. Atur di Settings > AI Models.",
                400,
                "AI_ROLE_NOT_CONFIGURED",
                { role: error.role }
            )
        }

        return errorJson("Gagal diproses AI", toAiKeyFailureHttpStatus(failure), failure.code, {
            reason: failure.message,
        })
    }
}
