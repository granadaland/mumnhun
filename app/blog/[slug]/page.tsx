import { Metadata } from "next"
import { notFound } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { ArrowLeft, Calendar, Clock, Tag } from "lucide-react"
import { getPostBySlug, getRelatedPosts, getAllPostSlugs } from "@/lib/db/queries"
import { formatIndonesianDate } from "@/lib/utils/format-date"
import { calculateReadTime } from "@/lib/utils/read-time"
import { Container } from "@/components/layout"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { PostCard } from "@/components/blog/post-card"
import { SITE_NAME, SITE_URL, DEFAULT_OG_IMAGE } from "@/lib/constants"

interface BlogPostPageProps {
    params: Promise<{ slug: string }>
}

// Generate static params for all posts
export async function generateStaticParams() {
    const slugs = await getAllPostSlugs()
    return slugs.map((slug) => ({ slug }))
}

// Generate metadata for SEO
export async function generateMetadata({ params }: BlogPostPageProps): Promise<Metadata> {
    const { slug } = await params
    const post = await getPostBySlug(slug)

    if (!post) {
        return {
            title: "Artikel Tidak Ditemukan",
        }
    }

    const title = post.metaTitle || post.title
    const description = post.metaDescription || post.excerpt || `Baca artikel ${post.title} di ${SITE_NAME}`
    const ogImage = post.featuredImage || DEFAULT_OG_IMAGE

    return {
        title,
        description,
        openGraph: {
            title,
            description,
            type: "article",
            publishedTime: post.publishedAt?.toISOString(),
            url: `${SITE_URL}/blog/${post.slug}/`,
            images: [{ url: ogImage, width: 1200, height: 630 }],
        },
        twitter: {
            card: "summary_large_image",
            title,
            description,
            images: [ogImage],
        },
    }
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
    const { slug } = await params
    const post = await getPostBySlug(slug)

    if (!post) {
        notFound()
    }

    const readTime = calculateReadTime(post.content)
    const category = post.categories?.[0]?.category

    // Get related posts if we have a category
    const relatedPosts = category
        ? await getRelatedPosts(post.id, category.id, 3)
        : []

    return (
        <article className="py-8 md:py-12">
            <Container size="narrow">
                {/* Back Button */}
                <Button asChild variant="ghost" className="mb-6 -ml-4">
                    <Link href="/blog">
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Kembali ke Artikel
                    </Link>
                </Button>

                {/* Header */}
                <header className="mb-8">
                    {/* Category */}
                    {category && (
                        <Link href={`/category/${category.slug}/`}>
                            <Badge className="mb-4 bg-mumnhun-100 text-mumnhun-700 hover:bg-mumnhun-200">
                                {category.name}
                            </Badge>
                        </Link>
                    )}

                    {/* Title */}
                    <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight mb-4">
                        {post.title}
                    </h1>

                    {/* Meta */}
                    <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                        {post.publishedAt && (
                            <div className="flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                <time dateTime={post.publishedAt.toISOString()}>
                                    {formatIndonesianDate(post.publishedAt)}
                                </time>
                            </div>
                        )}
                        <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            <span>{readTime} menit baca</span>
                        </div>
                    </div>
                </header>

                {/* Featured Image */}
                {post.featuredImage && (
                    <div className="relative aspect-video overflow-hidden rounded-lg mb-8">
                        <Image
                            src={post.featuredImage}
                            alt={post.title}
                            fill
                            className="object-cover"
                            priority
                            sizes="(max-width: 768px) 100vw, 768px"
                        />
                    </div>
                )}

                {/* Content */}
                <div
                    className="prose prose-lg max-w-none
            prose-headings:font-bold prose-headings:tracking-tight
            prose-h2:text-2xl prose-h2:mt-8 prose-h2:mb-4
            prose-h3:text-xl prose-h3:mt-6 prose-h3:mb-3
            prose-p:text-muted-foreground prose-p:leading-relaxed
            prose-a:text-mumnhun-600 prose-a:no-underline hover:prose-a:underline
            prose-img:rounded-lg
            prose-blockquote:border-l-mumnhun-500 prose-blockquote:bg-mumnhun-50 prose-blockquote:py-1 prose-blockquote:px-4 prose-blockquote:rounded-r-lg
            prose-ul:my-4 prose-ol:my-4
            prose-li:text-muted-foreground"
                    dangerouslySetInnerHTML={{ __html: post.content }}
                />

                {/* Tags */}
                {post.tags && post.tags.length > 0 && (
                    <div className="mt-8 pt-8 border-t">
                        <div className="flex items-center gap-2 flex-wrap">
                            <Tag className="h-4 w-4 text-muted-foreground" />
                            {post.tags.map(({ tag }) => (
                                <Link key={tag.id} href={`/tag/${tag.slug}/`}>
                                    <Badge variant="outline" className="hover:bg-mumnhun-50">
                                        {tag.name}
                                    </Badge>
                                </Link>
                            ))}
                        </div>
                    </div>
                )}

                <Separator className="my-12" />

                {/* Related Posts */}
                {relatedPosts.length > 0 && (
                    <section>
                        <h2 className="text-2xl font-bold mb-6">Artikel Terkait</h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {relatedPosts.map((relatedPost) => (
                                <PostCard key={relatedPost.id} post={relatedPost} />
                            ))}
                        </div>
                    </section>
                )}
            </Container>
        </article>
    )
}
