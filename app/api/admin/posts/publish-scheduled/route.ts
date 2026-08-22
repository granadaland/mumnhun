import { NextRequest, NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { requireAdminMutationApi } from "@/lib/security/admin"
import { publishDueScheduledPosts } from "@/lib/content/scheduled-publisher"
import { logAdminError, logAdminInfo } from "@/lib/observability/admin-log"
import { summarizeUnknownError } from "@/lib/security/admin-helpers"

/**
 * Manual trigger for the scheduled publisher.
 *
 * Gives operators a way to flush due posts immediately (and to verify the pipeline works)
 * without waiting for, or depending on, an external cron scheduler.
 */
export async function POST(request: NextRequest) {
    const adminCheck = await requireAdminMutationApi(request, { action: "posts:publish-scheduled" })
    if (!adminCheck.ok) return adminCheck.response

    const requestId = crypto.randomUUID()

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
            action: "posts:publish-scheduled",
            userId: adminCheck.identity.id,
            role: adminCheck.identity.role,
            roleSource: adminCheck.identity.source,
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
            action: "posts:publish-scheduled",
            userId: adminCheck.identity.id,
            role: adminCheck.identity.role,
            roleSource: adminCheck.identity.source,
            status: 500,
            error: summarizeUnknownError(error),
        })

        return NextResponse.json(
            {
                success: false,
                error: "Gagal memproses publish terjadwal",
                errorCode: "PUBLISH_SCHEDULED_FAILED",
            },
            { status: 500 }
        )
    }
}
