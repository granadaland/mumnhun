import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/db/prisma"
import { requireAdminApi, requireAdminMutationApi } from "@/lib/security/admin"

function slugify(text: string): string {
    return text.toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").replace(/^-+|-+$/g, "")
}

// GET: List categories
export async function GET() {
    const adminCheck = await requireAdminApi()
    if (!adminCheck.ok) return adminCheck.response

    const categories = await prisma.category.findMany({
        orderBy: { name: "asc" },
        include: { _count: { select: { posts: true } } },
    })

    return NextResponse.json({ success: true, data: categories })
}

// POST: Create category
export async function POST(request: NextRequest) {
    const adminCheck = await requireAdminMutationApi(request, { action: "categories:create" })
    if (!adminCheck.ok) return adminCheck.response

    const body = await request.json()
    const { name, description } = body

    if (!name?.trim()) {
        return NextResponse.json({ error: "Name is required" }, { status: 400 })
    }

    const slug = slugify(name)
    const existing = await prisma.category.findUnique({ where: { slug } })
    if (existing) {
        return NextResponse.json({ error: "Category already exists" }, { status: 400 })
    }

    const category = await prisma.category.create({
        data: { name: name.trim(), slug, description },
    })

    return NextResponse.json({ success: true, data: category })
}
