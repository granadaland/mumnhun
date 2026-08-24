import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import prisma from "@/lib/db/prisma"
import { requireAdminApi, requireAdminMutationApi } from "@/lib/security/admin"
import { getPrismaErrorCode } from "@/lib/security/admin-helpers"

// GET: List all schemas
export async function GET() {
    const adminCheck = await requireAdminApi()
    if (!adminCheck.ok) return adminCheck.response

    const schemas = await prisma.seoSchema.findMany({
        orderBy: { createdAt: "desc" },
    })

    return NextResponse.json({ success: true, data: schemas })
}

// schemaData is stored as a JSON string; bound its size so a single request cannot
// bloat the row (the DB column is TEXT).
const createSchemaInput = z.object({
    entityType: z.string().trim().min(1).max(60),
    entityId: z.string().trim().max(100).nullable().optional(),
    schemaType: z.string().trim().min(1).max(60),
    schemaData: z
        .string()
        .min(2)
        .max(50_000)
        .refine((value) => {
            try {
                JSON.parse(value)
                return true
            } catch {
                return false
            }
        }, "schemaData must be valid JSON"),
    isActive: z.boolean().optional(),
})

const updateSchemaInput = createSchemaInput.partial().extend({
    id: z.string().trim().min(1),
})

function validationResponse(error: z.ZodError) {
    return NextResponse.json(
        {
            error: "Validation failed",
            issues: error.issues.map((issue) => ({
                path: issue.path.join("."),
                message: issue.message,
            })),
        },
        { status: 400 }
    )
}

// POST: Create schema
export async function POST(request: NextRequest) {
    const adminCheck = await requireAdminMutationApi(request, { action: "seo-schemas:create" })
    if (!adminCheck.ok) return adminCheck.response

    let parsed: z.infer<typeof createSchemaInput>
    try {
        const body = await request.json()
        const result = createSchemaInput.safeParse(body)
        if (!result.success) return validationResponse(result.error)
        parsed = result.data
    } catch {
        return NextResponse.json({ error: "Invalid request payload" }, { status: 400 })
    }

    const schema = await prisma.seoSchema.create({
        data: {
            entityType: parsed.entityType,
            entityId: parsed.entityId || null,
            schemaType: parsed.schemaType,
            schemaData: parsed.schemaData,
            isActive: parsed.isActive ?? true,
        },
    })

    return NextResponse.json({ success: true, data: schema })
}

// PUT: Update schema
export async function PUT(request: NextRequest) {
    const adminCheck = await requireAdminMutationApi(request, { action: "seo-schemas:update" })
    if (!adminCheck.ok) return adminCheck.response

    let parsed: z.infer<typeof updateSchemaInput>
    try {
        const body = await request.json()
        const result = updateSchemaInput.safeParse(body)
        if (!result.success) return validationResponse(result.error)
        parsed = result.data
    } catch {
        return NextResponse.json({ error: "Invalid request payload" }, { status: 400 })
    }

    // Only write the fields the caller actually sent; a partial toggle request must not
    // blank out entityType/schemaType with undefined-derived nulls.
    const data: Record<string, unknown> = {}
    if (parsed.entityType !== undefined) data.entityType = parsed.entityType
    if (parsed.entityId !== undefined) data.entityId = parsed.entityId || null
    if (parsed.schemaType !== undefined) data.schemaType = parsed.schemaType
    if (parsed.schemaData !== undefined) data.schemaData = parsed.schemaData
    if (parsed.isActive !== undefined) data.isActive = parsed.isActive

    try {
        const schema = await prisma.seoSchema.update({
            where: { id: parsed.id },
            data,
        })

        return NextResponse.json({ success: true, data: schema })
    } catch (error) {
        if (getPrismaErrorCode(error) === "P2025") {
            return NextResponse.json({ error: "Schema tidak ditemukan" }, { status: 404 })
        }
        throw error
    }
}

// DELETE: Delete schema
export async function DELETE(request: NextRequest) {
    const adminCheck = await requireAdminMutationApi(request, { action: "seo-schemas:delete" })
    if (!adminCheck.ok) return adminCheck.response

    let id: string | undefined
    try {
        const body = await request.json()
        const result = z.object({ id: z.string().trim().min(1) }).safeParse(body)
        if (!result.success) return validationResponse(result.error)
        id = result.data.id
    } catch {
        return NextResponse.json({ error: "Invalid request payload" }, { status: 400 })
    }

    try {
        await prisma.seoSchema.delete({ where: { id } })
        return NextResponse.json({ success: true })
    } catch (error) {
        if (getPrismaErrorCode(error) === "P2025") {
            return NextResponse.json({ error: "Schema tidak ditemukan" }, { status: 404 })
        }
        throw error
    }
}
