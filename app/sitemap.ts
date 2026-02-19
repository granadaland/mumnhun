import { MetadataRoute } from "next"
import prisma from "@/lib/db/prisma"
import { SITE_URL } from "@/lib/constants"

const STATIC_SITEMAP_LAST_MODIFIED = {
    home: new Date("2026-02-15T00:00:00.000Z"),
    blog: new Date("2026-02-15T00:00:00.000Z"),
    petunjuk: new Date("2026-02-15T00:00:00.000Z"),
    syaratKetentuan: new Date("2026-02-15T00:00:00.000Z"),
    kontak: new Date("2026-02-15T00:00:00.000Z"),
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    // Static pages
    const staticPages = [
        {
            url: SITE_URL,
            lastModified: STATIC_SITEMAP_LAST_MODIFIED.home,
            changeFrequency: "daily" as const,
            priority: 1,
        },
        {
            url: `${SITE_URL}/blog`,
            lastModified: STATIC_SITEMAP_LAST_MODIFIED.blog,
            changeFrequency: "daily" as const,
            priority: 0.9,
        },
        {
            url: `${SITE_URL}/petunjuk-pemakaian`,
            lastModified: STATIC_SITEMAP_LAST_MODIFIED.petunjuk,
            changeFrequency: "monthly" as const,
            priority: 0.5,
        },
        {
            url: `${SITE_URL}/syarat-ketentuan`,
            lastModified: STATIC_SITEMAP_LAST_MODIFIED.syaratKetentuan,
            changeFrequency: "yearly" as const,
            priority: 0.3,
        },
        {
            url: `${SITE_URL}/kontak`,
            lastModified: STATIC_SITEMAP_LAST_MODIFIED.kontak,
            changeFrequency: "yearly" as const,
            priority: 0.5,
        },
    ]

    // Get all published posts
    const posts = await prisma.post.findMany({
        where: { status: "PUBLISHED" },
        select: {
            slug: true,
            updatedAt: true,
        },
        orderBy: { publishedAt: "desc" },
    })

    const postPages = posts.map((post) => ({
        url: `${SITE_URL}/${post.slug}`,
        lastModified: post.updatedAt,
        changeFrequency: "weekly" as const,
        priority: 0.8,
    }))

    // Get all categories
    const categories = await prisma.category.findMany({
        where: {
            posts: {
                some: {
                    post: {
                        status: "PUBLISHED",
                    },
                },
            },
        },
        select: {
            slug: true,
            updatedAt: true,
        },
    })

    const categoryPages = categories.map((category) => ({
        url: `${SITE_URL}/category/${category.slug}`,
        lastModified: category.updatedAt,
        changeFrequency: "weekly" as const,
        priority: 0.7,
    }))

    // Get all tags (limit to those with posts)
    const tags = await prisma.tag.findMany({
        where: {
            posts: {
                some: {
                    post: {
                        status: "PUBLISHED",
                    },
                },
            },
        },
        select: {
            slug: true,
            updatedAt: true,
        },
    })

    const tagPages = tags.map((tag) => ({
        url: `${SITE_URL}/tag/${tag.slug}`,
        lastModified: tag.updatedAt,
        changeFrequency: "weekly" as const,
        priority: 0.6,
    }))

    return [...staticPages, ...postPages, ...categoryPages, ...tagPages]
}
