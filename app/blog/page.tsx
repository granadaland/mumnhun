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
    <main className="min-h-screen bg-gradient-to-b from-[#FCFAF7] via-[#F7F3EE]/50 to-white">
      {/* Hero Section */}
      <section className="pt-32 pb-12 px-4 sm:px-6">
        <Container>
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-[#281E19] mb-4 text-balance">
              Blog & <span className="font-serif italic font-normal text-[#2E5650]">Artikel</span>
            </h1>
            <p className="text-base sm:text-lg text-[#382821]/75 max-w-2xl mx-auto text-pretty">
              Tips, panduan, dan informasi seputar ASI, freezer ASI, dan penyimpanan ASIP untuk Mums
            </p>
          </div>

          <BlogControls categories={categories} />
        </Container>
      </section>

      {/* Blog Grid */}
      <section className="pb-20 px-4 sm:px-6">
        <Container>
          {posts.length === 0 ? (
            <div className="text-center py-20 bg-white/90 rounded-3xl border border-dashed border-[#D4BCA8]/60 p-8">
              <p className="text-[#382821]/70 text-base sm:text-lg">
                Tidak ada artikel yang ditemukan{search ? ` untuk "${search}"` : ''}.
              </p>
              {(search || category) && (
                <Link
                  href="/blog"
                  className="inline-block mt-4 text-[#2E5650] font-bold hover:underline"
                >
                  Reset Filter
                </Link>
              )}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
                {posts.map((post) => {
                  // Fallback image if null
                  const imageUrl = post.featuredImage || '/images/placeholder.jpg'
                  const excerpt = sanitizeHtmlContent(post.excerpt || '')
                  const title = post.title

                  return (
                    <Link
                      key={post.id}
                      href={`/${post.slug}`}
                      className="group bg-white rounded-3xl overflow-hidden shadow-[0_4px_20px_rgba(40,30,25,0.04)] hover:shadow-[0_20px_40px_-10px_rgba(46,86,80,0.12)] transition-[transform,box-shadow,border-color] duration-300 hover:-translate-y-1.5 border border-stone-200/80 hover:border-[#2E5650]/40 flex flex-col active:scale-[0.96]"
                    >
                      {/* Featured Image */}
                      <div className="relative aspect-[16/10] overflow-hidden bg-[#F7F3EE]">
                        <Image
                          src={imageUrl}
                          alt={title}
                          fill
                          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                          className="object-cover group-hover:scale-105 transition-transform duration-500 ease-[cubic-bezier(0.2,0,0,1)]"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                        {/* Category Badge */}
                        {post.categories[0]?.category && (
                          <div className="absolute top-3.5 left-3.5 bg-white/95 backdrop-blur-md px-3 py-1 rounded-full text-xs font-semibold text-[#2E5650] shadow-sm border border-stone-200/60">
                            {post.categories[0].category.name}
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <div className="p-6 flex flex-col flex-1">
                        {/* Date */}
                        <div className="flex items-center gap-2 text-xs text-[#382821]/60 mb-2.5">
                          <span className="flex items-center gap-1.5">
                            <Calendar size={13} className="text-[#2E5650]" />
                            {new Date(post.publishedAt || new Date()).toLocaleDateString('id-ID', {
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric'
                            })}
                          </span>
                        </div>

                        {/* Title */}
                        <h2 className="text-lg sm:text-xl font-bold text-[#281E19] mb-2.5 line-clamp-2 group-hover:text-[#2E5650] transition-colors leading-snug text-balance">
                          {title}
                        </h2>

                        {/* Excerpt */}
                        <div
                          className="text-[#382821]/75 line-clamp-3 mb-5 text-sm leading-relaxed text-pretty flex-1"
                          dangerouslySetInnerHTML={{ __html: excerpt }}
                        />

                        {/* Read More */}
                        <div className="flex items-center text-[#2E5650] font-bold text-sm pt-3 border-t border-stone-100 group-hover:gap-2 transition-all">
                          <span>Baca Selengkapnya</span>
                          <ArrowRight size={15} className="ml-1 group-hover:translate-x-1 transition-transform" />
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
