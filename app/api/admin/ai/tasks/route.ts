import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import prisma from "@/lib/db/prisma"
import { requireAdminApi } from "@/lib/security/admin"
import { logAdminError, logAdminInfo, logAdminWarn } from "@/lib/observability/admin-log"
import { summarizeUnknownError } from "@/lib/security/admin-helpers"

const listTasksQuerySchema = z.object({
    limit: z.coerce.number().int().min(1).max(50).default(10),
})

function parseTaskJson(value: string | null) {
    if (!value) return null
    try {
        return JSON.parse(value) as unknown
    } catch {
        return value
    }
}

export async function GET(request: NextRequest) {
    const adminCheck = await requireAdminApi()
    if (!adminCheck.ok) return adminCheck.response

    const requestId = crypto.randomUUID()

    const { searchParams } = new URL(request.url)
    const parsedQuery = listTasksQuerySchema.safeParse({
        limit: searchParams.get("limit") ?? "10",
    })

    if (!parsedQuery.success) {
        logAdminWarn({
            requestId,
            action: "ai-tasks:list",
            userId: adminCheck.identity.id,
            role: adminCheck.identity.role,
            roleSource: adminCheck.identity.source,
            status: 400,
            validation: { ok: false, reason: "invalid_query" },
        })

        return NextResponse.json(
            {
                success: false,
                error: "Validation failed",
                data: {
                    issues: parsedQuery.error.issues.map((issue) => ({
                        path: issue.path.join("."),
                        code: issue.code,
                        message: issue.message,
                    })),
                },
            },
            { status: 400 }
        )
    }

    try {
        const tasks = await prisma.aiTask.findMany({
            where: { userId: adminCheck.identity.id },
            orderBy: { createdAt: "desc" },
            take: parsedQuery.data.limit,
            select: {
                id: true,
                type: true,
                status: true,
                progress: true,
                input: true,
                output: true,
                error: true,
                createdAt: true,
                updatedAt: true,
                completedAt: true,
            },
        })

        logAdminInfo({
            requestId,
            action: "ai-tasks:list",
            userId: adminCheck.identity.id,
            role: adminCheck.identity.role,
            roleSource: adminCheck.identity.source,
            status: 200,
            payloadSummary: { total: tasks.length },
            validation: { ok: true },
        })

        return NextResponse.json({
            success: true,
            data: tasks.map((task) => ({
                ...task,
                input: parseTaskJson(task.input),
                output: parseTaskJson(task.output),
            })),
        })
    } catch (error) {
        const summarizedError = summarizeUnknownError(error)

        logAdminError({
            requestId,
            action: "ai-tasks:list",
            userId: adminCheck.identity.id,
            role: adminCheck.identity.role,
            roleSource: adminCheck.identity.source,
            status: 500,
            error: summarizedError,
        })

        return NextResponse.json({ success: false, error: "Gagal memuat task AI" }, { status: 500 })
    }
}
