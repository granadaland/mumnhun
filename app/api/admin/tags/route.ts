import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/db/prisma"
import { requireAdminApi, requireAdminMutationApi } from "@/lib/security/admin"

function slugify(text: string): string {
    return text.toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").replace(/^-+|-+$/g, "")
}

// GET: List tags
export async function GET() {
    const adminCheck = await requireAdminApi()
    if (!adminCheck.ok) return adminCheck.response

    const tags = await prisma.tag.findMany({
        orderBy: { name: "asc" },
        include: { _count: { select: { posts: true } } },
    })

    return NextResponse.json({ success: true, data: tags })
}

// POST: Create tag
export async function POST(request: NextRequest) {
    const adminCheck = await requireAdminMutationApi(request, { action: "tags:create" })
    if (!adminCheck.ok) return adminCheck.response

    const body = await request.json()
    const { name } = body

    if (!name?.trim()) {
        return NextResponse.json({ error: "Name is required" }, { status: 400 })
    }

    const slug = slugify(name)
    const existing = await prisma.tag.findUnique({ where: { slug } })
    if (existing) {
        return NextResponse.json({ error: "Tag already exists" }, { status: 400 })
    }

    const tag = await prisma.tag.create({
        data: { name: name.trim(), slug },
    })

    return NextResponse.json({ success: true, data: tag })
}
