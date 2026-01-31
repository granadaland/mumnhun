import { MetadataRoute } from "next"
import prisma from "@/lib/db/prisma"
import { SITE_URL } from "@/lib/constants"

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    // Static pages
    const staticPages = [
        {
            url: SITE_URL,
            lastModified: new Date(),
            changeFrequency: "daily" as const,
            priority: 1,
        },
        {
            url: `${SITE_URL}/blog`,
            lastModified: new Date(),
            changeFrequency: "daily" as const,
            priority: 0.9,
        },
        {
            url: `${SITE_URL}/petunjuk`,
            lastModified: new Date(),
            changeFrequency: "monthly" as const,
            priority: 0.5,
        },
        {
            url: `${SITE_URL}/syarat-ketentuan`,
            lastModified: new Date(),
            changeFrequency: "yearly" as const,
            priority: 0.3,
        },
        {
            url: `${SITE_URL}/kontak`,
            lastModified: new Date(),
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
        url: `${SITE_URL}/blog/${post.slug}/`,
        lastModified: post.updatedAt,
        changeFrequency: "weekly" as const,
        priority: 0.8,
    }))

    // Get all categories
    const categories = await prisma.category.findMany({
        select: {
            slug: true,
            updatedAt: true,
        },
    })

    const categoryPages = categories.map((category) => ({
        url: `${SITE_URL}/category/${category.slug}/`,
        lastModified: category.updatedAt,
        changeFrequency: "weekly" as const,
        priority: 0.7,
    }))

    // Get all tags (limit to those with posts)
    const tags = await prisma.tag.findMany({
        where: {
            posts: {
                some: {},
            },
        },
        select: {
            slug: true,
            updatedAt: true,
        },
    })

    const tagPages = tags.map((tag) => ({
        url: `${SITE_URL}/tag/${tag.slug}/`,
        lastModified: tag.updatedAt,
        changeFrequency: "weekly" as const,
        priority: 0.6,
    }))

    return [...staticPages, ...postPages, ...categoryPages, ...tagPages]
}
