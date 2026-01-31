import { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ChevronLeft, ChevronRight, Tag } from "lucide-react"
import { getPostsByTag } from "@/lib/db/queries"
import { PostCard } from "@/components/blog/post-card"
import { Container } from "@/components/layout"
import { Button } from "@/components/ui/button"
import { SITE_NAME, SITE_URL } from "@/lib/constants"

interface TagPageProps {
    params: Promise<{ slug: string }>
    searchParams: Promise<{ page?: string }>
}

// Generate metadata for SEO
export async function generateMetadata({ params }: TagPageProps): Promise<Metadata> {
    const { slug } = await params
    const result = await getPostsByTag(slug)

    if (!result) {
        return { title: "Tag Tidak Ditemukan" }
    }

    const { tag } = result
    const title = `Tag: ${tag.name}`
    const description = `Artikel dengan tag ${tag.name} di ${SITE_NAME}`

    return {
        title,
        description,
        openGraph: {
            title,
            description,
            url: `${SITE_URL}/tag/${slug}/`,
        },
    }
}

export default async function TagPage({ params, searchParams }: TagPageProps) {
    const { slug } = await params
    const searchParamsResolved = await searchParams
    const page = Number(searchParamsResolved.page) || 1

    const result = await getPostsByTag(slug, page)

    if (!result) {
        notFound()
    }

    const { tag, posts, pagination } = result

    return (
        <div className="py-12 md:py-16">
            <Container>
                {/* Header */}
                <div className="text-center mb-12">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-mumnhun-100 mb-4">
                        <Tag className="h-8 w-8 text-mumnhun-600" />
                    </div>
                    <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
                        #{tag.name}
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        {pagination.total} artikel dengan tag ini
                    </p>
                </div>

                {/* Posts Grid */}
                {posts.length > 0 ? (
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {posts.map((post, index) => (
                                <PostCard
                                    key={post.id}
                                    post={post}
                                    priority={index < 3}
                                />
                            ))}
                        </div>

                        {/* Pagination */}
                        {pagination.totalPages > 1 && (
                            <div className="flex items-center justify-center gap-4 mt-12">
                                {pagination.hasPrevPage && (
                                    <Button asChild variant="outline">
                                        <Link href={`/tag/${slug}?page=${page - 1}`}>
                                            <ChevronLeft className="h-4 w-4 mr-2" />
                                            Sebelumnya
                                        </Link>
                                    </Button>
                                )}

                                <span className="text-sm text-muted-foreground">
                                    Halaman {page} dari {pagination.totalPages}
                                </span>

                                {pagination.hasNextPage && (
                                    <Button asChild variant="outline">
                                        <Link href={`/tag/${slug}?page=${page + 1}`}>
                                            Selanjutnya
                                            <ChevronRight className="h-4 w-4 ml-2" />
                                        </Link>
                                    </Button>
                                )}
                            </div>
                        )}
                    </>
                ) : (
                    /* Empty State */
                    <div className="text-center py-16">
                        <div className="text-6xl mb-4">🏷️</div>
                        <h2 className="text-xl font-semibold mb-2">Belum Ada Artikel</h2>
                        <p className="text-muted-foreground mb-6">
                            Belum ada artikel dengan tag ini.
                        </p>
                        <Button asChild>
                            <Link href="/blog">Lihat Semua Artikel</Link>
                        </Button>
                    </div>
                )}
            </Container>
        </div>
    )
}
