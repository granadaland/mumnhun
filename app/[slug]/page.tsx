import { resolvePublicSlug, getRelatedPosts, getRecentPosts, getPopularPosts, getPrevNextPosts, getRecommendedPosts } from '@/lib/db/queries'
import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { Container } from '@/components/ui/container'
import { Calendar, Clock, ArrowLeft, ArrowRight, Tag, TrendingUp, Clock3, BookOpen } from 'lucide-react'
import { Metadata } from 'next'
import { sanitizeHtmlContent } from '@/lib/security/sanitize-html'
import { DEFAULT_OG_IMAGE, SITE_NAME, SITE_URL } from '@/lib/constants'

// Helper to calculate reading time if not in DB, though we added it. 
// DB `readingTime` is preferred.
function estimateReadingTime(content: string) {
  const wpm = 200;
  const words = content.trim().split(/\s+/).length;
  return Math.ceil(words / wpm);
}

function isValidHttpUrl(value: string | null | undefined): value is string {
  if (!value) return false

  try {
    const parsed = new URL(value)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

function getCanonicalUrl(canonicalUrl: string | null | undefined, slug: string): string {
  if (isValidHttpUrl(canonicalUrl)) {
    return canonicalUrl
  }

  return `${SITE_URL}/${slug}`
}

function getRobotsByStatus(status: string | null | undefined): Metadata['robots'] {
  if (status !== 'PUBLISHED') {
    return {
      index: false,
      follow: false,
      googleBot: {
        index: false,
        follow: false,
      },
    }
  }

  return {
    index: true,
    follow: true,
    'max-snippet': -1,
    'max-image-preview': 'large',
    'max-video-preview': -1,
    googleBot: {
      index: true,
      follow: true,
      'max-snippet': -1,
      'max-image-preview': 'large',
      'max-video-preview': -1,
    },
  }
}

function sanitizeBrokenImageAlt(content: string): string {
  // Some migrated posts have anchor tags injected inside img alt="...".
  // That breaks HTML parsing and can leak raw attributes as visible text.
  return content.replace(
    /alt="([^"]*?)<a\s+href="[^"]*"[^>]*>(.*?)<\/a>([^"]*?)"/gi,
    (_match, before: string, linkedText: string, after: string) => `alt="${before}${linkedText}${after}"`
  )
}

function extractImageSourceFromTag(imgTag: string): string | null {
  const sourcePatterns = [
    /data-src=["']([^"']+)["']/i,
    /data-lazy-src=["']([^"']+)["']/i,
    /src=["']([^"']+)["']/i,
  ]

  for (const pattern of sourcePatterns) {
    const match = imgTag.match(pattern)
    if (match?.[1] && !match[1].startsWith('data:image')) {
      return match[1]
    }
  }

  return null
}

// Helper to extract the first image from HTML content
function extractFirstImage(content: string): { src: string | null; contentWithoutFirstImage: string } {
  const normalizedContent = sanitizeBrokenImageAlt(content)

  // Prefer removing full first figure block if it contains an image (including caption)
  const firstFigureMatch = normalizedContent.match(/<figure[^>]*>[\s\S]*?<img[^>]*>[\s\S]*?<\/figure>/i)
  if (firstFigureMatch) {
    const firstFigure = firstFigureMatch[0]
    const imgTagMatch = firstFigure.match(/<img[^>]*>/i)
    const firstImageSrc = imgTagMatch ? extractImageSourceFromTag(imgTagMatch[0]) : null

    return {
      src: firstImageSrc,
      contentWithoutFirstImage: normalizedContent.replace(firstFigure, ''),
    }
  }

  // Fallback: match the first standalone <img> tag
  const imgMatch = normalizedContent.match(/<img[^>]*>/i)
  if (imgMatch) {
    const firstImageSrc = extractImageSourceFromTag(imgMatch[0])
    let contentWithoutFirstImage = normalizedContent

    // Try to remove <p> containing only the first image
    const escapedImgTag = imgMatch[0].replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const pRegex = new RegExp(`<p[^>]*>\\s*${escapedImgTag}\\s*</p>`, 'i')

    if (pRegex.test(normalizedContent)) {
      contentWithoutFirstImage = normalizedContent.replace(pRegex, '')
    } else {
      // Just remove the img tag itself
      contentWithoutFirstImage = normalizedContent.replace(imgMatch[0], '')
    }

    return { src: firstImageSrc, contentWithoutFirstImage }
  }

  return { src: null, contentWithoutFirstImage: normalizedContent }
}

// Helper to get thumbnail from post (first image from content or featuredImage)
function getPostThumbnail(post: { content?: string; featuredImage: string | null }): string {
  if (post.content) {
    const imgMatch = post.content.match(/<img[^>]+src=["']([^"']+)["'][^>]*>/i);
    if (imgMatch) return imgMatch[1];
  }
  return post.featuredImage || '/images/placeholder.jpg';
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const resolved = await resolvePublicSlug(slug)

  if (!resolved) {
    return {
      title: 'Not Found',
      robots: {
        index: false,
        follow: false,
      },
    }
  }

  if (resolved.kind === 'page') {
    const page = resolved.page
    const canonicalUrl = getCanonicalUrl(page.canonicalUrl, slug)
    const seoTitle = page.metaTitle?.trim() || page.title
    const seoDescription = page.metaDescription || `Halaman ${page.title} di ${SITE_NAME}`
    const ogImageUrl = page.ogImage || undefined

    return {
      title: seoTitle,
      description: seoDescription,
      alternates: {
        canonical: canonicalUrl,
      },
      robots: getRobotsByStatus(page.status),
      openGraph: {
        title: page.ogTitle || seoTitle,
        description: page.ogDescription || seoDescription,
        url: canonicalUrl,
        siteName: SITE_NAME,
        type: 'website',
        ...(ogImageUrl ? { images: [ogImageUrl] } : {}),
      },
      twitter: {
        card: ogImageUrl ? 'summary_large_image' : 'summary',
        title: page.ogTitle || seoTitle,
        description: page.ogDescription || seoDescription,
        ...(ogImageUrl ? { images: [ogImageUrl] } : {}),
      },
    }
  }

  const post = resolved.post

  const canonicalUrl = getCanonicalUrl(post.canonicalUrl, slug)
  const seoTitle = post.metaTitle?.trim() || post.title
  const hasBrandInSeoTitle = seoTitle.toLowerCase().includes(SITE_NAME.toLowerCase())
  const seoDescription = post.metaDescription || post.excerpt || `Artikel ${post.title} di ${SITE_NAME}`
  const ogImageUrl = post.ogImage || post.featuredImage || DEFAULT_OG_IMAGE
  const metadataKeywords = [
    post.focusKeyword,
    ...post.tags.map((item) => item.tag.name),
  ].filter((keyword): keyword is string => Boolean(keyword && keyword.trim()))
  const uniqueMetadataKeywords = Array.from(new Set(metadataKeywords))
  const publishedTime = post.publishedAt ? new Date(post.publishedAt).toISOString() : undefined
  const modifiedTime = post.updatedAt
    ? new Date(post.updatedAt).toISOString()
    : post.publishedAt
      ? new Date(post.publishedAt).toISOString()
      : undefined

  return {
    title: hasBrandInSeoTitle ? { absolute: seoTitle } : seoTitle,
    description: seoDescription,
    ...(uniqueMetadataKeywords.length > 0 ? { keywords: uniqueMetadataKeywords } : {}),
    alternates: {
      canonical: canonicalUrl,
    },
    robots: getRobotsByStatus(post.status),
    openGraph: {
      title: seoTitle,
      description: seoDescription,
      url: canonicalUrl,
      siteName: SITE_NAME,
      type: 'article',
      publishedTime,
      modifiedTime,
      images: [ogImageUrl],
    },
    twitter: {
      card: 'summary_large_image',
      title: seoTitle,
      description: seoDescription,
      images: [ogImageUrl],
    },
  }
}

export default async function BlogDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const resolved = await resolvePublicSlug(slug)

  if (!resolved) {
    notFound()
  }

  if (resolved.kind === 'page') {
    const page = resolved.page
    const sanitizedContent = sanitizeHtmlContent(page.content)
    const canonicalUrl = getCanonicalUrl(page.canonicalUrl, page.slug)
    const seoDescription = page.metaDescription || `Halaman ${page.title} di ${SITE_NAME}`

    const webPageJsonLd = {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: page.metaTitle || page.title,
      description: seoDescription,
      inLanguage: 'id-ID',
      url: canonicalUrl,
      isPartOf: {
        '@type': 'WebSite',
        name: SITE_NAME,
        url: SITE_URL,
      },
    }

    return (
      <main className="min-h-screen bg-gradient-to-b from-[#FFFBF7] to-white">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageJsonLd) }}
        />

        <section className="pt-32 pb-6 px-6 border-b border-gray-100">
          <Container className="max-w-4xl">
            <div className="flex items-center gap-2 text-sm text-[#382821]/60">
              <Link href="/" className="hover:text-[#466A68] transition-colors">
                Home
              </Link>
              <span>/</span>
              <span className="text-[#382821] truncate max-w-[260px]">{page.title}</span>
            </div>
          </Container>
        </section>

        <Container className="max-w-4xl py-12 px-6">
          <article className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 md:p-10">
            <header className="mb-8 pb-6 border-b border-gray-100">
              <h1 className="text-3xl md:text-4xl font-bold text-[#382821] leading-tight">
                {page.title}
              </h1>
            </header>

            <div
              className="article-content prose prose-lg max-w-none prose-headings:text-[#382821] prose-p:text-[#382821]/80 prose-a:text-[#466A68]"
              dangerouslySetInnerHTML={{ __html: sanitizedContent }}
            />
          </article>
        </Container>
      </main>
    )
  }

  const post = resolved.post

  // Fetch all related content in parallel
  const categoryId = post.categories[0]?.category.id
  const [relatedPosts, recentPosts, popularPosts, { prevPost, nextPost }, recommendedPosts] = await Promise.all([
    categoryId ? getRelatedPosts(post.id, categoryId, 3) : Promise.resolve([]),
    getRecentPosts(5, post.id),
    getPopularPosts(5, post.id),
    post.publishedAt ? getPrevNextPosts(post.id, post.publishedAt) : Promise.resolve({ prevPost: null, nextPost: null }),
    getRecommendedPosts(post.id, categoryId, 6),
  ])

  // Extract the first image from content to use as hero image
  const { src: firstImageSrc, contentWithoutFirstImage } = extractFirstImage(post.content)
  const heroImageUrl = firstImageSrc || post.featuredImage || '/images/placeholder.jpg'
  const sanitizedContent = sanitizeHtmlContent(contentWithoutFirstImage)
  const canonicalUrl = getCanonicalUrl(post.canonicalUrl, post.slug)
  const primaryCategory = post.categories[0]?.category
  const seoDescription = post.metaDescription || post.excerpt || `Artikel ${post.title} di ${SITE_NAME}`
  const seoKeywords = [
    post.focusKeyword,
    ...post.tags.map((item) => item.tag.name),
  ].filter((keyword): keyword is string => Boolean(keyword && keyword.trim()))
  const uniqueSeoKeywords = Array.from(new Set(seoKeywords))
  const readingTime = post.readingTime ?? estimateReadingTime(post.content)
  const articlePublishedAt = post.publishedAt ? new Date(post.publishedAt).toISOString() : null
  const articleModifiedAt = post.updatedAt
    ? new Date(post.updatedAt).toISOString()
    : post.publishedAt
      ? new Date(post.publishedAt).toISOString()
      : null
  const articleAuthorName = post.author?.name?.trim() || SITE_NAME

  const seoInternalLinks = [...relatedPosts, ...recommendedPosts, ...recentPosts]
    .filter((candidate) => candidate.id !== post.id)
    .filter((candidate, index, allCandidates) => allCandidates.findIndex((item) => item.id === candidate.id) === index)
    .slice(0, 6)

  const articleJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    ...(seoDescription ? { description: seoDescription } : {}),
    image: [post.ogImage || heroImageUrl],
    inLanguage: 'id-ID',
    ...(articlePublishedAt ? { datePublished: articlePublishedAt } : {}),
    ...(articleModifiedAt ? { dateModified: articleModifiedAt } : {}),
    ...(primaryCategory?.name ? { articleSection: primaryCategory.name } : {}),
    ...(uniqueSeoKeywords.length > 0 ? { keywords: uniqueSeoKeywords.join(', ') } : {}),
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': canonicalUrl,
    },
    author: post.author?.name
      ? {
        '@type': 'Person',
        name: articleAuthorName,
      }
      : {
        '@type': 'Organization',
        name: articleAuthorName,
      },
    publisher: {
      '@type': 'Organization',
      name: SITE_NAME,
      logo: {
        '@type': 'ImageObject',
        url: `${SITE_URL}/favicon.ico`,
      },
    },
    url: canonicalUrl,
  }

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: SITE_URL,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Blog',
        item: `${SITE_URL}/blog`,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: post.title,
        item: canonicalUrl,
      },
    ],
  }

  const webPageJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: post.metaTitle || post.title,
    description: seoDescription,
    inLanguage: 'id-ID',
    url: canonicalUrl,
    isPartOf: {
      '@type': 'WebSite',
      name: SITE_NAME,
      url: SITE_URL,
    },
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#FFFBF7] to-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageJsonLd) }}
      />

      {/* Breadcrumb Navigation */}
      <section className="pt-32 pb-6 px-6 border-b border-gray-100">
        <Container className="max-w-7xl">
          <div className="flex items-center gap-2 text-sm text-[#382821]/60">
            <Link href="/" className="hover:text-[#466A68] transition-colors">
              Home
            </Link>
            <span>/</span>
            <Link href="/blog" className="hover:text-[#466A68] transition-colors">
              Blog
            </Link>
            <span>/</span>
            <span className="text-[#382821] truncate max-w-[200px]">{post.title}</span>
          </div>
        </Container>
      </section>

      <Container className="max-w-7xl py-12 px-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          {/* Main Content */}
          <article className="lg:col-span-8">
            {/* Article Header */}
            <div className="mb-8">
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-[#382821] mb-6 leading-tight">
                {post.title}
              </h1>

              {/* Meta Info */}
              <div className="flex flex-wrap items-center gap-4 text-[#382821]/60 pb-6 border-b border-gray-100">
                {post.publishedAt && (
                  <span className="flex items-center gap-2">
                    <Calendar size={16} />
                    {new Date(post.publishedAt).toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </span>
                )}
                <span className="flex items-center gap-2">
                  <Clock size={16} />
                  {readingTime} min read
                </span>
                {post.focusKeyword && (
                  <span className="flex items-center gap-2 text-[#466A68] bg-[#466A68]/10 px-3 py-1 rounded-full text-xs font-medium">
                    <Tag size={14} />
                    Fokus topik: {post.focusKeyword}
                  </span>
                )}
              </div>
            </div>

            {/* Hero Image (first image from content) */}
            {heroImageUrl && (
              <div className="relative aspect-[16/9] rounded-2xl overflow-hidden shadow-xl mb-10">
                <Image
                  src={heroImageUrl}
                  alt={post.title}
                  fill
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1000px"
                  className="object-cover"
                  priority
                />
              </div>
            )}

            {/* Article Content (with first image removed to avoid duplication) */}
            <div
              className="article-content prose prose-lg max-w-none prose-headings:text-[#382821] prose-p:text-[#382821]/80 prose-a:text-[#466A68]"
              dangerouslySetInnerHTML={{ __html: sanitizedContent }}
            />

            {/* SEO Internal Linking */}
            {seoInternalLinks.length > 0 && (
              <section className="mt-10 p-6 bg-white rounded-2xl border border-gray-100">
                <h2 className="text-lg font-bold text-[#382821] mb-4">Topik Terkait untuk Dibaca Lanjutan</h2>
                <ul className="space-y-3 list-disc list-inside marker:text-[#466A68]">
                  {seoInternalLinks.map((item) => (
                    <li key={item.id}>
                      <Link
                        href={`/${item.slug}`}
                        className="text-[#382821] hover:text-[#466A68] transition-colors"
                      >
                        Pelajari juga: {item.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Read Also - Related Posts (within article) */}
            {relatedPosts.length > 0 && (
              <div className="mt-12 p-6 bg-[#FFFBF7] rounded-2xl border border-[#466A68]/10">
                <h3 className="text-xl font-bold text-[#382821] mb-4 flex items-center gap-2">
                  <BookOpen size={20} className="text-[#466A68]" />
                  Baca Juga
                </h3>
                <div className="space-y-3">
                  {relatedPosts.map((related) => (
                    <Link
                      key={related.id}
                      href={`/${related.slug}`}
                      className="flex items-center gap-4 p-3 bg-white rounded-xl hover:shadow-md transition-all group"
                    >
                      <div className="relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
                        <Image
                          src={getPostThumbnail(related)}
                          alt={related.title}
                          fill
                          className="object-cover group-hover:scale-110 transition-transform"
                        />
                      </div>
                      <h4 className="font-medium text-[#382821] group-hover:text-[#466A68] transition-colors line-clamp-2 text-sm">
                        {related.title}
                      </h4>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Previous / Next Navigation */}
            {(prevPost || nextPost) && (
              <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-4">
                {prevPost ? (
                  <Link
                    href={`/${prevPost.slug}`}
                    className="group flex items-center gap-4 p-4 bg-white rounded-2xl border border-gray-100 hover:shadow-lg hover:border-[#466A68]/20 transition-all"
                  >
                    <ArrowLeft size={24} className="text-[#466A68] flex-shrink-0" />
                    <div className="min-w-0">
                      <span className="text-xs text-[#382821]/50 uppercase tracking-wide">Sebelumnya</span>
                      <h4 className="font-semibold text-[#382821] group-hover:text-[#466A68] transition-colors line-clamp-2 text-sm">
                        {prevPost.title}
                      </h4>
                    </div>
                  </Link>
                ) : <div />}
                {nextPost ? (
                  <Link
                    href={`/${nextPost.slug}`}
                    className="group flex items-center gap-4 p-4 bg-white rounded-2xl border border-gray-100 hover:shadow-lg hover:border-[#466A68]/20 transition-all text-right"
                  >
                    <div className="min-w-0 flex-1">
                      <span className="text-xs text-[#382821]/50 uppercase tracking-wide">Selanjutnya</span>
                      <h4 className="font-semibold text-[#382821] group-hover:text-[#466A68] transition-colors line-clamp-2 text-sm">
                        {nextPost.title}
                      </h4>
                    </div>
                    <ArrowRight size={24} className="text-[#466A68] flex-shrink-0" />
                  </Link>
                ) : <div />}
              </div>
            )}

            {/* CTA Section */}
            <div className="mt-12 p-8 rounded-3xl bg-gradient-to-r from-[#466A68] to-[#2F4A48] text-white text-center">
              <h3 className="text-2xl font-bold mb-3">
                Butuh Freezer ASI Berkualitas?
              </h3>
              <p className="text-white/90 mb-6">
                Sewa freezer ASI premium dari {SITE_NAME}. Steril, hemat energi, dan siap diantar!
              </p>
              <Link
                href="https://wa.me/6282122229350?text=Halo%20Mum%27N%20Hun%2C%20saya%20mau%20tanya%20tentang%20sewa%20freezer%20ASI"
                className="inline-flex items-center gap-2 bg-white text-[#466A68] px-8 py-4 rounded-full font-bold hover:shadow-xl transition-all hover:-translate-y-1"
              >
                Hubungi Kami via WhatsApp
              </Link>
            </div>

            {/* Recommended Articles (6 articles with thumbnails) */}
            {recommendedPosts.length > 0 && (
              <div className="mt-16 pt-10 border-t-2 border-gray-100">
                <h3 className="text-2xl font-bold text-[#382821] mb-6 flex items-center gap-2">
                  <Tag size={24} className="text-[#466A68]" />
                  Artikel Rekomendasi
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {recommendedPosts.map((rec) => (
                    <Link
                      key={rec.id}
                      href={`/${rec.slug}`}
                      className="group bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
                    >
                      <div className="relative aspect-[16/10] overflow-hidden">
                        <Image
                          src={getPostThumbnail(rec)}
                          alt={rec.title}
                          fill
                          sizes="(max-width: 768px) 100vw, 33vw"
                          className="object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      </div>
                      <div className="p-4">
                        <h4 className="font-bold text-[#382821] line-clamp-2 group-hover:text-[#466A68] transition-colors">
                          {rec.title}
                        </h4>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </article>

          {/* Sidebar */}
          <aside className="lg:col-span-4">
            <div className="sticky top-24 space-y-8">
              {/* Promotional Poster */}
              <Link
                href="https://mumnhun.id"
                className="block rounded-2xl overflow-hidden shadow-md border border-gray-100 hover:shadow-xl transition-all"
              >
                <div className="relative aspect-[4/5]">
                  <Image
                    src="https://res.cloudinary.com/dvqcs0zqi/image/upload/v1771016767/Layanan_Sewa_Freezer_ASI_Jakarta_gdstef.webp"
                    alt="poster promosi sewa freezer asi"
                    fill
                    sizes="(max-width: 1024px) 100vw, 360px"
                    className="object-cover"
                  />
                </div>
              </Link>

              {/* Recent Articles */}
              {recentPosts.length > 0 && (
                <div className="bg-white rounded-2xl p-6 shadow-md border border-gray-100">
                  <h3 className="text-lg font-bold text-[#382821] mb-4 flex items-center gap-2">
                    <Clock3 size={18} className="text-[#466A68]" />
                    Artikel Terbaru
                  </h3>
                  <div className="space-y-4">
                    {recentPosts.map((recent) => (
                      <Link
                        key={recent.id}
                        href={`/${recent.slug}`}
                        className="flex items-start gap-3 group"
                      >
                        <div className="relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
                          <Image
                            src={getPostThumbnail(recent)}
                            alt={recent.title}
                            fill
                            className="object-cover group-hover:scale-110 transition-transform"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-medium text-[#382821] group-hover:text-[#466A68] transition-colors line-clamp-2">
                            {recent.title}
                          </h4>
                          {recent.publishedAt && (
                            <span className="text-xs text-[#382821]/50 mt-1 block">
                              {new Date(recent.publishedAt).toLocaleDateString('id-ID', {
                                day: 'numeric',
                                month: 'short',
                              })}
                            </span>
                          )}
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Popular Articles */}
              {popularPosts.length > 0 && (
                <div className="bg-white rounded-2xl p-6 shadow-md border border-gray-100">
                  <h3 className="text-lg font-bold text-[#382821] mb-4 flex items-center gap-2">
                    <TrendingUp size={18} className="text-[#466A68]" />
                    Artikel Populer
                  </h3>
                  <div className="space-y-4">
                    {popularPosts.map((pop, index) => (
                      <Link
                        key={pop.id}
                        href={`/${pop.slug}`}
                        className="flex items-start gap-3 group"
                      >
                        <div className="relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
                          <Image
                            src={getPostThumbnail(pop)}
                            alt={pop.title}
                            fill
                            className="object-cover group-hover:scale-110 transition-transform"
                          />
                          <div className="absolute top-1 left-1 bg-[#466A68] text-white text-xs font-bold w-5 h-5 rounded flex items-center justify-center">
                            {index + 1}
                          </div>
                        </div>
                        <h4 className="text-sm font-medium text-[#382821] group-hover:text-[#466A68] transition-colors line-clamp-2 flex-1">
                          {pop.title}
                        </h4>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Back to Blog */}
              <Link
                href="/blog"
                className="flex items-center justify-center gap-2 w-full bg-white text-[#382821] py-3 rounded-full font-semibold hover:shadow-lg transition-all border border-gray-200"
              >
                <ArrowLeft size={18} />
                Kembali ke Blog
              </Link>
            </div>
          </aside>
        </div>
      </Container>
    </main>
  )
}
