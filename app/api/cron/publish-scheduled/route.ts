import { NextRequest, NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { timingSafeEqual } from "node:crypto"
import { publishDueScheduledPosts } from "@/lib/content/scheduled-publisher"
import { logAdminError, logAdminInfo, logAdminWarn } from "@/lib/observability/admin-log"
import { summarizeUnknownError } from "@/lib/security/admin-helpers"

/**
 * Cron endpoint that flips due SCHEDULED posts to PUBLISHED.
 *
 * SECURITY: this route is unauthenticated by session on purpose (cron schedulers cannot
 * hold a login), so it requires a shared secret. Without `CRON_SECRET` configured the
 * route refuses to run at all rather than defaulting to open access.
 *
 * Call it with either:
 *   Authorization: Bearer <CRON_SECRET>
 *   x-cron-secret: <CRON_SECRET>
 *
 * Point a scheduler (Vercel Cron, Supabase pg_cron, cron-job.org, GitHub Actions) at
 * POST /api/cron/publish-scheduled every 5-15 minutes.
 */

export const dynamic = "force-dynamic"

function safeEqual(a: string, b: string): boolean {
    const bufferA = Buffer.from(a)
    const bufferB = Buffer.from(b)
    if (bufferA.length !== bufferB.length) return false
    return timingSafeEqual(bufferA, bufferB)
}

function extractProvidedSecret(request: NextRequest): string | null {
    const header = request.headers.get("authorization")?.trim()
    if (header?.toLowerCase().startsWith("bearer ")) {
        const token = header.slice(7).trim()
        if (token) return token
    }

    const custom = request.headers.get("x-cron-secret")?.trim()
    return custom || null
}

async function handle(request: NextRequest) {
    const requestId = crypto.randomUUID()
    const expectedSecret = process.env.CRON_SECRET?.trim()

    if (!expectedSecret) {
        logAdminWarn({
            requestId,
            action: "cron:publish-scheduled",
            status: 503,
            validation: { ok: false, reason: "cron_secret_missing" },
        })

        return NextResponse.json(
            {
                success: false,
                error: "CRON_SECRET belum dikonfigurasi di server.",
                errorCode: "CRON_SECRET_MISSING",
            },
            { status: 503 }
        )
    }

    const provided = extractProvidedSecret(request)
    if (!provided || !safeEqual(provided, expectedSecret)) {
        logAdminWarn({
            requestId,
            action: "cron:publish-scheduled",
            status: 401,
            validation: { ok: false, reason: "invalid_cron_secret" },
        })

        return NextResponse.json(
            { success: false, error: "Unauthorized", errorCode: "CRON_UNAUTHORIZED" },
            { status: 401 }
        )
    }

    try {
        const result = await publishDueScheduledPosts()

        if (result.published.length > 0) {
            revalidatePath("/")
            revalidatePath("/blog")
            for (const post of result.published) {
                revalidatePath(`/${post.slug}`)
            }
        }

        logAdminInfo({
            requestId,
            action: "cron:publish-scheduled",
            status: 200,
            payloadSummary: {
                checked: result.checked,
                published: result.published.length,
                skipped: result.skipped.length,
            },
            validation: { ok: true },
        })

        return NextResponse.json({ success: true, data: result })
    } catch (error) {
        logAdminError({
            requestId,
            action: "cron:publish-scheduled",
            status: 500,
            error: summarizeUnknownError(error),
        })

        return NextResponse.json(
            {
                success: false,
                error: "Gagal memproses publish terjadwal",
                errorCode: "CRON_PUBLISH_FAILED",
            },
            { status: 500 }
        )
    }
}

export async function POST(request: NextRequest) {
    return handle(request)
}

// GET is supported because several cron providers only issue GET requests.
export async function GET(request: NextRequest) {
    return handle(request)
}
