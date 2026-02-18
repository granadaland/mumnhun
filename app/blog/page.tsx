import { getPosts, getCategories } from '@/lib/db/queries'

import Image from 'next/image'
import Link from 'next/link'
import { Metadata } from 'next'
import { Container } from '@/components/ui/container'
import { Calendar, ArrowRight } from 'lucide-react'
import { BlogControls } from '@/components/blog/blog-controls'
import { Pagination } from '@/components/blog/pagination'
import { sanitizeHtmlContent } from '@/lib/security/sanitize-html'
import { SITE_NAME, SITE_URL } from '@/lib/constants'

const BLOG_TITLE = 'Blog'
const BLOG_DESCRIPTION = 'Artikel, tips, dan panduan lengkap seputar ASI, freezer ASI, dan penyimpanan ASIP untuk ibu menyusui.'

interface BlogMetadataProps {
  searchParams: Promise<{
    page?: string
    search?: string
    category?: string
  }>
}

export async function generateMetadata(props: BlogMetadataProps): Promise<Metadata> {
  const searchParams = await props.searchParams
  const page = Number(searchParams.page) || 1
  const search = searchParams.search?.trim() || ''
  const category = searchParams.category?.trim() || ''
  const hasQuery = Boolean(search || category)

  const canonicalParams = new URLSearchParams()
  if (search) {
    canonicalParams.set('search', search)
  }
  if (category) {
    canonicalParams.set('category', category)
  }
  if (page > 1) {
    canonicalParams.set('page', String(page))
  }
  const canonicalSuffix = canonicalParams.toString()
  const canonicalUrl = canonicalSuffix ? `${SITE_URL}/blog?${canonicalSuffix}` : `${SITE_URL}/blog`

  const pageTitle = page > 1 ? `${BLOG_TITLE} - Halaman ${page}` : BLOG_TITLE

  return {
    title: pageTitle,
    description: BLOG_DESCRIPTION,
    alternates: {
      canonical: canonicalUrl,
    },
    robots: hasQuery
      ? {
        index: false,
        follow: true,
        googleBot: {
          index: false,
          follow: true,
        },
      }
      : {
        index: true,
        follow: true,
      },
    openGraph: {
      title: pageTitle,
      description: BLOG_DESCRIPTION,
      url: canonicalUrl,
      type: 'website',
      siteName: SITE_NAME,
    },
    twitter: {
      card: 'summary_large_image',
      title: pageTitle,
      description: BLOG_DESCRIPTION,
    },
  }
}

interface BlogPageProps {
  searchParams: Promise<{
    page?: string
    search?: string
    category?: string
  }>
}

export default async function BlogPage(props: BlogPageProps) {
  const searchParams = await props.searchParams;
  const page = Number(searchParams.page) || 1
  const search = searchParams.search || ''
  const category = searchParams.category || ''

  // Fetch data in parallel
  const [data, categories] = await Promise.all([
    getPosts({ page, search, category }),
    getCategories()
  ])

  const { posts, pagination } = data

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#FFFBF7] to-white">
      {/* Hero Section */}
      <section className="pt-32 pb-12 px-6">
        <Container>
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-[#382821] mb-6">
              Blog & Artikel
            </h1>
            <p className="text-lg text-[#382821]/70">
              Tips, panduan, dan informasi seputar ASI, freezer ASI, dan penyimpanan ASIP untuk Mums
            </p>
          </div>

          <BlogControls categories={categories} />
        </Container>
      </section>

      {/* Blog Grid */}
      <section className="pb-20 px-6">
        <Container>
          {posts.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200">
              <p className="text-[#382821]/60 text-lg">
                Tidak ada artikel yang ditemukan{search ? ` untuk "${search}"` : ''}.
              </p>
              {(search || category) && (
                <Link
                  href="/blog"
                  className="inline-block mt-4 text-[#466A68] font-semibold hover:underline"
                >
                  Reset Filter
                </Link>
              )}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {posts.map((post) => {
                  // Fallback image if null
                  const imageUrl = post.featuredImage || '/images/placeholder.jpg' // Use local placeholder
                  const excerpt = sanitizeHtmlContent(post.excerpt || '')
                  const title = post.title // Prisma uses direct string

                  return (
                    <Link
                      key={post.id}
                      href={`/${post.slug}`} // Root slug
                      className="group bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border border-gray-100"
                    >
                      {/* Featured Image */}
                      <div className="relative aspect-[16/10] overflow-hidden bg-gray-100">
                        <Image
                          src={imageUrl}
                          alt={title}
                          fill
                          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                          className="object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                        {/* Category Badge */}
                        {post.categories[0]?.category && (
                          <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-semibold text-[#466A68] shadow-sm">
                            {post.categories[0].category.name}
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <div className="p-6">
                        {/* Date */}
                        <div className="flex items-center gap-4 text-xs text-[#382821]/60 mb-3">
                          <span className="flex items-center gap-1">
                            <Calendar size={12} />
                            {new Date(post.publishedAt || new Date()).toLocaleDateString('id-ID', {
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric'
                            })}
                          </span>
                        </div>

                        {/* Title */}
                        <h2 className="text-xl font-bold text-[#382821] mb-3 line-clamp-2 group-hover:text-[#466A68] transition-colors leading-tight">
                          {title}
                        </h2>

                        {/* Excerpt */}
                        <div
                          className="text-[#382821]/70 line-clamp-3 mb-5 text-sm leading-relaxed"
                          dangerouslySetInnerHTML={{ __html: excerpt }}
                        />

                        {/* Read More */}
                        <div className="flex items-center text-[#466A68] font-semibold text-sm group-hover:gap-2 transition-all">
                          Baca Selengkapnya
                          <ArrowRight size={16} className="ml-1 group-hover:translate-x-1 transition-transform" />
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>

              {/* Pagination */}
              <Pagination
                totalPages={pagination.totalPages}
                currentPage={pagination.page}
              />
            </>
          )}
        </Container>
      </section>
    </main>
  )
}
