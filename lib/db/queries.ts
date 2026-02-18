import prisma from "@/lib/db/prisma"
import { POSTS_PER_PAGE } from "@/lib/constants"
import type { Prisma } from "@prisma/client"

/**
 * Get paginated published posts
 */
export type GetPostsParams = {
    page?: number
    limit?: number
    search?: string
    category?: string // category slug
}

const postBySlugSelect = {
    id: true,
    title: true,
    slug: true,
    content: true,
    excerpt: true,
    featuredImage: true,
    status: true,
    publishedAt: true,
    updatedAt: true,
    readingTime: true,
    metaTitle: true,
    metaDescription: true,
    focusKeyword: true,
    canonicalUrl: true,
    ogImage: true,
    author: {
        select: {
            name: true,
        },
    },
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
} satisfies Prisma.PostSelect

const pageBySlugSelect = {
    id: true,
    title: true,
    slug: true,
    content: true,
    status: true,
    publishedAt: true,
    updatedAt: true,
    metaTitle: true,
    metaDescription: true,
    canonicalUrl: true,
    ogImage: true,
    ogTitle: true,
    ogDescription: true,
} satisfies Prisma.PageSelect

export async function getPosts({ page = 1, limit = POSTS_PER_PAGE, search, category }: GetPostsParams = {}) {
    const skip = (page - 1) * limit

    const where: Prisma.PostWhereInput = { status: "PUBLISHED" }

    if (search) {
        where.OR = [
            { title: { contains: search, mode: "insensitive" } },
            { content: { contains: search, mode: "insensitive" } },
            { excerpt: { contains: search, mode: "insensitive" } },
        ]
    }

    if (category) {
        where.categories = {
            some: {
                category: {
                    slug: category,
                },
            },
        }
    }

    const [posts, total] = await Promise.all([
        prisma.post.findMany({
            where,
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
                // content: false, // Don't fetch full content for list view for performance
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
        prisma.post.count({ where }),
    ])

    const totalPages = Math.ceil(total / limit)

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
    const post = await prisma.post.findFirst({
        where: {
            slug,
            status: "PUBLISHED",
        },
        select: postBySlugSelect,
    })

    return post
}

/**
 * Get single published page by slug
 */
export async function getPageBySlug(slug: string) {
    const page = await prisma.page.findFirst({
        where: {
            slug,
            status: "PUBLISHED",
        },
        select: pageBySlugSelect,
    })

    return page
}

type PublishedPostBySlug = NonNullable<Awaited<ReturnType<typeof getPostBySlug>>>
type PublishedPageBySlug = NonNullable<Awaited<ReturnType<typeof getPageBySlug>>>

export type PublicSlugResolution =
    | {
        kind: "post"
        post: PublishedPostBySlug
    }
    | {
        kind: "page"
        page: PublishedPageBySlug
    }

/**
 * Resolve public slug for Post/Page with deterministic conflict policy.
 * Priority: Post first, then Page (if both somehow share the same slug).
 */
export async function resolvePublicSlug(slug: string): Promise<PublicSlugResolution | null> {
    const [post, page] = await Promise.all([
        getPostBySlug(slug),
        getPageBySlug(slug),
    ])

    if (post) {
        return {
            kind: "post",
            post,
        }
    }

    if (page) {
        return {
            kind: "page",
            page,
        }
    }

    return null
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

/**
 * Get recent posts for sidebar
 */
export async function getRecentPosts(limit: number = 5, excludeId?: string) {
    const posts = await prisma.post.findMany({
        where: {
            status: "PUBLISHED",
            ...(excludeId && { id: { not: excludeId } }),
        },
        orderBy: { publishedAt: "desc" },
        take: limit,
        select: {
            id: true,
            title: true,
            slug: true,
            featuredImage: true,
            publishedAt: true,
            content: true, // For extracting first image
        },
    })

    return posts
}

/**
 * Get popular posts for sidebar (random selection for now, can be enhanced with view count later)
 */
export async function getPopularPosts(limit: number = 5, excludeId?: string) {
    // For now, get random posts as we don't track views
    // This uses a simple approach - fetch more and shuffle
    const posts = await prisma.post.findMany({
        where: {
            status: "PUBLISHED",
            ...(excludeId && { id: { not: excludeId } }),
        },
        orderBy: { publishedAt: "desc" },
        take: limit * 3, // Fetch more to shuffle
        select: {
            id: true,
            title: true,
            slug: true,
            featuredImage: true,
            publishedAt: true,
            content: true, // For extracting first image
        },
    })

    // Shuffle and take limit
    const shuffled = posts.sort(() => Math.random() - 0.5)
    return shuffled.slice(0, limit)
}

/**
 * Get previous and next posts for navigation
 */
export async function getPrevNextPosts(currentPostId: string, publishedAt: Date) {
    const [prevPost, nextPost] = await Promise.all([
        // Previous post (older)
        prisma.post.findFirst({
            where: {
                status: "PUBLISHED",
                publishedAt: { lt: publishedAt },
            },
            orderBy: { publishedAt: "desc" },
            select: {
                id: true,
                title: true,
                slug: true,
                featuredImage: true,
                content: true,
            },
        }),
        // Next post (newer)
        prisma.post.findFirst({
            where: {
                status: "PUBLISHED",
                publishedAt: { gt: publishedAt },
            },
            orderBy: { publishedAt: "asc" },
            select: {
                id: true,
                title: true,
                slug: true,
                featuredImage: true,
                content: true,
            },
        }),
    ])

    return { prevPost, nextPost }
}

/**
 * Get recommended posts (same category, for bottom of article)
 */
export async function getRecommendedPosts(postId: string, categoryId: string | undefined, limit: number = 6) {
    if (!categoryId) {
        // If no category, just get recent posts
        return prisma.post.findMany({
            where: {
                status: "PUBLISHED",
                id: { not: postId },
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
        })
    }

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
    })

    return posts
}


/**
 * Get sitemap data (categories, pages, tags)
 */
export async function getSitemapData() {
    const [categories, pages, tags] = await Promise.all([
        prisma.category.findMany({
            orderBy: { name: "asc" },
            include: {
                posts: {
                    where: {
                        post: {
                            status: "PUBLISHED",
                        }
                    },
                    include: {
                        post: {
                            select: {
                                id: true,
                                title: true,
                                slug: true,
                                publishedAt: true,
                            }
                        }
                    },
                    orderBy: {
                        post: {
                            publishedAt: "desc"
                        }
                    }
                }
            }
        }),
        prisma.page.findMany({
            where: {
                status: "PUBLISHED",
            },
            select: {
                id: true,
                title: true,
                slug: true,
                publishedAt: true,
            },
            orderBy: {
                title: "asc",
            },
        }),
        prisma.tag.findMany({
            where: {
                posts: {
                    some: {
                        post: {
                            status: "PUBLISHED"
                        }
                    }
                }
            },
            select: {
                id: true,
                name: true,
                slug: true,
                _count: {
                    select: {
                        posts: true
                    }
                }
            },
            orderBy: {
                name: "asc",
            }
        })
    ])

    return { categories, pages, tags }
}
