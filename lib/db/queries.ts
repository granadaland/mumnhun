import prisma from "@/lib/db/prisma"
import { POSTS_PER_PAGE } from "@/lib/constants"

/**
 * Get paginated published posts
 */
export async function getPosts(page: number = 1, limit: number = POSTS_PER_PAGE) {
    const skip = (page - 1) * limit

    const [posts, total] = await Promise.all([
        prisma.post.findMany({
            where: { status: "PUBLISHED" },
            orderBy: { publishedAt: "desc" },
            skip,
            take: limit,
            select: {
                id: true,
                title: true,
                slug: true,
                excerpt: true,
                featuredImage: true,
                publishedAt: true,
                content: true,
                categories: {
                    select: {
                        category: {
                            select: {
                                name: true,
                                slug: true,
                            },
                        },
                    },
                },
            },
        }),
        prisma.post.count({ where: { status: "PUBLISHED" } }),
    ])

    const totalPages = Math.ceil(total / POSTS_PER_PAGE)

    return {
        posts,
        pagination: {
            page,
            totalPages,
            total,
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1,
        },
    }
}

/**
 * Get single post by slug
 */
export async function getPostBySlug(slug: string) {
    const post = await prisma.post.findUnique({
        where: { slug },
        select: {
            id: true,
            title: true,
            slug: true,
            content: true,
            excerpt: true,
            featuredImage: true,
            publishedAt: true,
            metaTitle: true,
            metaDescription: true,
            categories: {
                select: {
                    category: {
                        select: {
                            id: true,
                            name: true,
                            slug: true,
                        },
                    },
                },
            },
            tags: {
                select: {
                    tag: {
                        select: {
                            id: true,
                            name: true,
                            slug: true,
                        },
                    },
                },
            },
        },
    })

    return post
}

/**
 * Get posts by category slug
 */
export async function getPostsByCategory(categorySlug: string, page: number = 1) {
    const skip = (page - 1) * POSTS_PER_PAGE

    const category = await prisma.category.findUnique({
        where: { slug: categorySlug },
    })

    if (!category) return null

    const [posts, total] = await Promise.all([
        prisma.post.findMany({
            where: {
                status: "PUBLISHED",
                categories: {
                    some: {
                        categoryId: category.id,
                    },
                },
            },
            orderBy: { publishedAt: "desc" },
            skip,
            take: POSTS_PER_PAGE,
            select: {
                id: true,
                title: true,
                slug: true,
                excerpt: true,
                featuredImage: true,
                publishedAt: true,
                content: true,
                categories: {
                    select: {
                        category: {
                            select: {
                                name: true,
                                slug: true,
                            },
                        },
                    },
                },
            },
        }),
        prisma.post.count({
            where: {
                status: "PUBLISHED",
                categories: {
                    some: {
                        categoryId: category.id,
                    },
                },
            },
        }),
    ])

    const totalPages = Math.ceil(total / POSTS_PER_PAGE)

    return {
        category,
        posts,
        pagination: {
            page,
            totalPages,
            total,
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1,
        },
    }
}

/**
 * Get posts by tag slug
 */
export async function getPostsByTag(tagSlug: string, page: number = 1) {
    const skip = (page - 1) * POSTS_PER_PAGE

    const tag = await prisma.tag.findUnique({
        where: { slug: tagSlug },
    })

    if (!tag) return null

    const [posts, total] = await Promise.all([
        prisma.post.findMany({
            where: {
                status: "PUBLISHED",
                tags: {
                    some: {
                        tagId: tag.id,
                    },
                },
            },
            orderBy: { publishedAt: "desc" },
            skip,
            take: POSTS_PER_PAGE,
            select: {
                id: true,
                title: true,
                slug: true,
                excerpt: true,
                featuredImage: true,
                publishedAt: true,
                content: true,
                categories: {
                    select: {
                        category: {
                            select: {
                                name: true,
                                slug: true,
                            },
                        },
                    },
                },
            },
        }),
        prisma.post.count({
            where: {
                status: "PUBLISHED",
                tags: {
                    some: {
                        tagId: tag.id,
                    },
                },
            },
        }),
    ])

    const totalPages = Math.ceil(total / POSTS_PER_PAGE)

    return {
        tag,
        posts,
        pagination: {
            page,
            totalPages,
            total,
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1,
        },
    }
}

/**
 * Get related posts by category
 */
export async function getRelatedPosts(postId: string, categoryId: string, limit: number = 3) {
    const posts = await prisma.post.findMany({
        where: {
            status: "PUBLISHED",
            id: { not: postId },
            categories: {
                some: {
                    categoryId,
                },
            },
        },
        orderBy: { publishedAt: "desc" },
        take: limit,
        select: {
            id: true,
            title: true,
            slug: true,
            excerpt: true,
            featuredImage: true,
            publishedAt: true,
            categories: {
                select: {
                    category: {
                        select: {
                            name: true,
                            slug: true,
                        },
                    },
                },
            },
        },
    })

    return posts
}

/**
 * Get all categories with post count
 */
export async function getCategories() {
    const categories = await prisma.category.findMany({
        orderBy: { name: "asc" },
        select: {
            id: true,
            name: true,
            slug: true,
            description: true,
            _count: {
                select: {
                    posts: true,
                },
            },
        },
    })

    return categories
}

/**
 * Get all post slugs for static generation
 */
export async function getAllPostSlugs() {
    const posts = await prisma.post.findMany({
        where: { status: "PUBLISHED" },
        select: { slug: true },
    })

    return posts.map((post: { slug: string }) => post.slug)
}
