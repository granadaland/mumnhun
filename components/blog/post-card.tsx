import Link from "next/link"
import Image from "next/image"
import { formatIndonesianDate } from "@/lib/utils/format-date"
import { calculateReadTime } from "@/lib/utils/read-time"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface PostCardProps {
    post: {
        id: string
        title: string
        slug: string
        excerpt: string | null
        featuredImage: string | null
        publishedAt: Date | null
        categories?: {
            category: {
                name: string
                slug: string
            }
        }[]
        content?: string
    }
    priority?: boolean
    variant?: "default" | "compact"
}

export function PostCard({ post, priority = false, variant = "default" }: PostCardProps) {
    const category = post.categories?.[0]?.category
    const readTime = post.content ? calculateReadTime(post.content) : null

    // Compact variant for sidebar/list display
    if (variant === "compact") {
        return (
            <Link href={`/${post.slug}`}>
                <div className="flex gap-4 p-4 rounded-lg bg-cream-50 hover:bg-cream-100 transition-colors group">
                    {/* Thumbnail */}
                    <div className="relative w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden bg-teal-100">
                        {post.featuredImage ? (
                            <Image
                                src={post.featuredImage}
                                alt={post.title}
                                fill
                                className="object-cover"
                                sizes="80px"
                            />
                        ) : (
                            <div className="absolute inset-0 flex items-center justify-center">
                                <span className="text-2xl">📝</span>
                            </div>
                        )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm line-clamp-2 group-hover:text-teal-600 transition-colors">
                            {post.title}
                        </h4>
                        {post.publishedAt && (
                            <time
                                dateTime={post.publishedAt.toISOString()}
                                className="text-xs text-muted-foreground mt-1 block"
                            >
                                {formatIndonesianDate(post.publishedAt)}
                            </time>
                        )}
                    </div>
                </div>
            </Link>
        )
    }

    // Default variant - full card
    return (
        <Link href={`/${post.slug}`}>
            <Card className="h-full overflow-hidden transition-all hover:shadow-lg hover:border-teal-200 cursor-pointer group">
                {/* Featured Image */}
                <div className="relative aspect-video overflow-hidden bg-teal-100">
                    {post.featuredImage ? (
                        <Image
                            src={post.featuredImage}
                            alt={post.title}
                            fill
                            className="object-cover transition-transform group-hover:scale-105"
                            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                            priority={priority}
                        />
                    ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-4xl">📝</span>
                        </div>
                    )}
                </div>

                <CardHeader className="space-y-2">
                    {/* Category Badge */}
                    {category && (
                        <Badge variant="secondary" className="w-fit bg-teal-100 text-teal-700">
                            {category.name}
                        </Badge>
                    )}

                    {/* Title */}
                    <h3 className="font-semibold text-lg leading-tight line-clamp-2 group-hover:text-teal-600 transition-colors">
                        {post.title}
                    </h3>

                    {/* Excerpt */}
                    {post.excerpt && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                            {post.excerpt}
                        </p>
                    )}
                </CardHeader>

                <CardContent className="pt-0">
                    {/* Meta */}
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {post.publishedAt && (
                            <time dateTime={post.publishedAt.toISOString()}>
                                {formatIndonesianDate(post.publishedAt)}
                            </time>
                        )}
                        {readTime && (
                            <>
                                <span>•</span>
                                <span>{readTime} menit baca</span>
                            </>
                        )}
                    </div>
                </CardContent>
            </Card>
        </Link>
    )
}
