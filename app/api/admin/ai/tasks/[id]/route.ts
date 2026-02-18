import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import prisma from "@/lib/db/prisma"
import { requireAdminApi } from "@/lib/security/admin"
import { logAdminError, logAdminInfo, logAdminWarn } from "@/lib/observability/admin-log"
import { summarizeUnknownError } from "@/lib/security/admin-helpers"

const routeParamsSchema = z.object({
    id: z.string().min(1, "Task ID is required"),
})

function parseTaskJson(value: string | null) {
    if (!value) return null
    try {
        return JSON.parse(value) as unknown
    } catch {
        return value
    }
}

export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const adminCheck = await requireAdminApi()
    if (!adminCheck.ok) return adminCheck.response

    const requestId = crypto.randomUUID()

    const parsedParams = routeParamsSchema.safeParse(await params)
    if (!parsedParams.success) {
        logAdminWarn({
            requestId,
            action: "ai-tasks:detail",
            userId: adminCheck.identity.id,
            role: adminCheck.identity.role,
            roleSource: adminCheck.identity.source,
            status: 400,
            validation: { ok: false, reason: "invalid_params" },
        })

        return NextResponse.json(
            {
                success: false,
                error: "Validation failed",
                data: {
                    issues: parsedParams.error.issues.map((issue) => ({
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
        const { id } = parsedParams.data

        const task = await prisma.aiTask.findFirst({
            where: {
                id,
                userId: adminCheck.identity.id,
            },
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

        if (!task) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Task not found",
                },
                { status: 404 }
            )
        }

        logAdminInfo({
            requestId,
            action: "ai-tasks:detail",
            userId: adminCheck.identity.id,
            role: adminCheck.identity.role,
            roleSource: adminCheck.identity.source,
            status: 200,
            payloadSummary: { id: task.id, status: task.status },
            validation: { ok: true },
        })

        return NextResponse.json({
            success: true,
            data: {
                ...task,
                input: parseTaskJson(task.input),
                output: parseTaskJson(task.output),
            },
        })
    } catch (error) {
        const summarizedError = summarizeUnknownError(error)

        logAdminError({
            requestId,
            action: "ai-tasks:detail",
            userId: adminCheck.identity.id,
            role: adminCheck.identity.role,
            roleSource: adminCheck.identity.source,
            status: 500,
            error: summarizedError,
        })

        return NextResponse.json({ success: false, error: "Gagal memuat detail task AI" }, { status: 500 })
    }
}
