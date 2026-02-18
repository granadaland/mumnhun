import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/db/prisma"
import { requireAdminApi, requireAdminMutationApi } from "@/lib/security/admin"

// GET: List all schemas
export async function GET() {
    const adminCheck = await requireAdminApi()
    if (!adminCheck.ok) return adminCheck.response

    const schemas = await prisma.seoSchema.findMany({
        orderBy: { createdAt: "desc" },
    })

    return NextResponse.json({ success: true, data: schemas })
}

// POST: Create schema
export async function POST(request: NextRequest) {
    const adminCheck = await requireAdminMutationApi(request, { action: "seo-schemas:create" })
    if (!adminCheck.ok) return adminCheck.response

    const body = await request.json()
    const { entityType, entityId, schemaType, schemaData, isActive } = body

    if (!entityType || !schemaType || !schemaData) {
        return NextResponse.json({ error: "entityType, schemaType, and schemaData are required" }, { status: 400 })
    }

    // Validate JSON
    try {
        JSON.parse(schemaData)
    } catch {
        return NextResponse.json({ error: "schemaData must be valid JSON" }, { status: 400 })
    }

    const schema = await prisma.seoSchema.create({
        data: { entityType, entityId: entityId || null, schemaType, schemaData, isActive: isActive ?? true },
    })

    return NextResponse.json({ success: true, data: schema })
}

// PUT: Update schema
export async function PUT(request: NextRequest) {
    const adminCheck = await requireAdminMutationApi(request, { action: "seo-schemas:update" })
    if (!adminCheck.ok) return adminCheck.response

    const body = await request.json()
    const { id, entityType, entityId, schemaType, schemaData, isActive } = body

    if (!id) return NextResponse.json({ error: "ID is required" }, { status: 400 })

    if (schemaData) {
        try {
            JSON.parse(schemaData)
        } catch {
            return NextResponse.json({ error: "schemaData must be valid JSON" }, { status: 400 })
        }
    }

    const schema = await prisma.seoSchema.update({
        where: { id },
        data: { entityType, entityId, schemaType, schemaData, isActive },
    })

    return NextResponse.json({ success: true, data: schema })
}

// DELETE: Delete schema
export async function DELETE(request: NextRequest) {
    const adminCheck = await requireAdminMutationApi(request, { action: "seo-schemas:delete" })
    if (!adminCheck.ok) return adminCheck.response

    const body = await request.json()
    const { id } = body

    if (!id) return NextResponse.json({ error: "ID is required" }, { status: 400 })

    await prisma.seoSchema.delete({ where: { id } })
    return NextResponse.json({ success: true })
}
