import { Metadata } from "next"
import Link from "next/link"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { getPosts } from "@/lib/db/queries"
import { PostCard } from "@/components/blog/post-card"
import { Container } from "@/components/layout"
import { Button } from "@/components/ui/button"
import { SITE_NAME } from "@/lib/constants"

export const metadata: Metadata = {
    title: "Semua Artikel",
    description: "Kumpulan artikel parenting, kehamilan, bayi, dan tumbuh kembang anak untuk keluarga Indonesia.",
}

interface BlogPageProps {
    searchParams: Promise<{ page?: string }>
}

export default async function BlogPage({ searchParams }: BlogPageProps) {
    const params = await searchParams
    const page = Number(params.page) || 1
    const { posts, pagination } = await getPosts(page)

    return (
        <div className="py-12 md:py-16">
            <Container>
                {/* Header */}
                <div className="text-center mb-12">
                    <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
                        Semua Artikel
                    </h1>
                    <p className="text-muted-foreground max-w-2xl mx-auto">
                        Temukan tips dan panduan parenting dari para ahli untuk keluarga Indonesia.
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
                                        <Link href={`/blog?page=${page - 1}`}>
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
                                        <Link href={`/blog?page=${page + 1}`}>
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
                        <div className="text-6xl mb-4">📝</div>
                        <h2 className="text-xl font-semibold mb-2">Belum Ada Artikel</h2>
                        <p className="text-muted-foreground mb-6">
                            Artikel akan muncul setelah import data WordPress selesai.
                        </p>
                        <Button asChild>
                            <Link href="/">Kembali ke Beranda</Link>
                        </Button>
                    </div>
                )}
            </Container>
        </div>
    )
}
