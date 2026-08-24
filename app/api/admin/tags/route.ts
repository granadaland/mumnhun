import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import prisma from "@/lib/db/prisma"
import { requireAdminApi, requireAdminMutationApi } from "@/lib/security/admin"

function slugify(text: string): string {
    return text.toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").replace(/^-+|-+$/g, "")
}

const createTagInput = z.object({
    name: z.string().trim().min(1, "Name is required").max(120),
})

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

    let payload: z.infer<typeof createTagInput>
    try {
        const body = await request.json()
        const result = createTagInput.safeParse(body)
        if (!result.success) {
            return NextResponse.json(
                {
                    error: "Validation failed",
                    issues: result.error.issues.map((issue) => ({
                        path: issue.path.join("."),
                        message: issue.message,
                    })),
                },
                { status: 400 }
            )
        }
        payload = result.data
    } catch {
        return NextResponse.json({ error: "Invalid request payload" }, { status: 400 })
    }

    const slug = slugify(payload.name)
    // A name made entirely of non-URL characters (e.g. CJK-only) yields an empty slug,
    // which would collide on the unique index with a cryptic Prisma error.
    if (!slug) {
        return NextResponse.json(
            { error: "Nama tidak dapat diubah menjadi slug yang valid (gunakan huruf/angka)" },
            { status: 400 }
        )
    }

    const existing = await prisma.tag.findUnique({ where: { slug } })
    if (existing) {
        return NextResponse.json({ error: "Tag already exists" }, { status: 400 })
    }

    const tag = await prisma.tag.create({
        data: { name: payload.name, slug },
    })

    return NextResponse.json({ success: true, data: tag })
}
