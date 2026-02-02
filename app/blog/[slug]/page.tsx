import { getPostBySlug, getPosts, getFeaturedImageUrl, stripHtml, cleanWordPressContent } from '@/lib/wordpress'
import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { Container } from '@/components/ui/container'
import { Calendar, Clock, ArrowLeft, Tag } from 'lucide-react'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const post = await getPostBySlug(slug)

  if (!post) {
    return {
      title: 'Post Not Found'
    }
  }

  const title = post.title.rendered.replace(/&#038;/g, '&')
  const description = stripHtml(post.excerpt.rendered).substring(0, 160)

  return {
    title: `${title} | Mum'N Hun`,
    description,
    openGraph: {
      title,
      description,
      images: [getFeaturedImageUrl(post)],
    }
  }
}

export default async function BlogDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const [post, recentPosts] = await Promise.all([
    getPostBySlug(slug),
    getPosts(1, 5)
  ])

  if (!post) {
    notFound()
  }

  const imageUrl = getFeaturedImageUrl(post)
  const title = post.title.rendered.replace(/&#038;/g, '&')
  const relatedPosts = recentPosts.filter(p => p.id !== post.id).slice(0, 3)
  const cleanContent = cleanWordPressContent(post.content.rendered)

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#FFFBF7] to-white">
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
            <span className="text-[#382821]">Article</span>
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
                {title}
              </h1>

              {/* Meta Info */}
              <div className="flex flex-wrap items-center gap-4 text-[#382821]/60 pb-6 border-b border-gray-100">
                <span className="flex items-center gap-2">
                  <Calendar size={16} />
                  {new Date(post.date).toLocaleDateString('id-ID', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                  })}
                </span>
                <span className="flex items-center gap-2">
                  <Clock size={16} />
                  5 min read
                </span>
              </div>
            </div>

            {/* Featured Image */}
            <div className="relative aspect-[16/9] rounded-2xl overflow-hidden shadow-xl mb-10">
              <Image
                src={imageUrl}
                alt={title}
                fill
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1000px"
                className="object-cover"
                priority
              />
            </div>

            {/* Article Content - Styles in globals.css */}
            <div
              className="article-content"
              dangerouslySetInnerHTML={{ __html: cleanContent }}
            />

            {/* Related Posts */}
            {relatedPosts.length > 0 && (
              <div className="mt-16 pt-10 border-t-2 border-gray-100">
                <h3 className="text-2xl font-bold text-[#382821] mb-6 flex items-center gap-2">
                  <Tag size={24} className="text-[#466A68]" />
                  Baca Juga
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {relatedPosts.map((related) => {
                    const relatedImage = getFeaturedImageUrl(related)
                    const relatedTitle = related.title.rendered.replace(/&#038;/g, '&')

                    return (
                      <Link
                        key={related.id}
                        href={`/blog/${related.slug}`}
                        className="group bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
                      >
                        <div className="relative aspect-[16/10] overflow-hidden">
                          <Image
                            src={relatedImage}
                            alt={relatedTitle}
                            fill
                            sizes="(max-width: 768px) 100vw, 33vw"
                            className="object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                        </div>
                        <div className="p-4">
                          <h4 className="font-bold text-[#382821] line-clamp-2 group-hover:text-[#466A68] transition-colors">
                            {relatedTitle}
                          </h4>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              </div>
            )}

            {/* CTA Section */}
            <div className="mt-16 p-8 rounded-3xl bg-gradient-to-r from-[#466A68] to-[#2F4A48] text-white text-center">
              <h3 className="text-2xl font-bold mb-3">
                Butuh Freezer ASI Berkualitas?
              </h3>
              <p className="text-white/90 mb-6">
                Sewa freezer ASI premium dari Mum'N Hun. Steril, hemat energi, dan siap diantar!
              </p>
              <Link
                href="https://wa.me/6282122229350?text=Halo%20Mum%27N%20Hun%2C%20saya%20mau%20tanya%20tentang%20sewa%20freezer%20ASI"
                className="inline-flex items-center gap-2 bg-white text-[#466A68] px-8 py-4 rounded-full font-bold hover:shadow-xl transition-all hover:-translate-y-1"
              >
                Hubungi Kami via WhatsApp
              </Link>
            </div>
          </article>

          {/* Sidebar */}
          <aside className="lg:col-span-4">
            <div className="sticky top-24 space-y-8">
              {/* Latest Posts */}
              <div className="bg-white rounded-3xl p-6 shadow-lg">
                <h3 className="text-xl font-bold text-[#382821] mb-6 pb-3 border-b border-gray-100">
                  Artikel Terbaru
                </h3>
                <div className="space-y-4">
                  {recentPosts.slice(0, 4).map((recent) => {
                    const recentImage = getFeaturedImageUrl(recent)
                    const recentTitle = recent.title.rendered.replace(/&#038;/g, '&')

                    return (
                      <Link
                        key={recent.id}
                        href={`/blog/${recent.slug}`}
                        className="flex gap-4 group"
                      >
                        <div className="relative w-20 h-20 rounded-xl overflow-hidden flex-shrink-0">
                          <Image
                            src={recentImage}
                            alt={recentTitle}
                            fill
                            sizes="80px"
                            className="object-cover group-hover:scale-110 transition-transform duration-300"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-sm text-[#382821] line-clamp-2 group-hover:text-[#466A68] transition-colors">
                            {recentTitle}
                          </h4>
                          <p className="text-xs text-[#382821]/60 mt-1">
                            {new Date(recent.date).toLocaleDateString('id-ID', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric'
                            })}
                          </p>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              </div>

              {/* CTA Widget */}
              <div className="bg-gradient-to-br from-[#466A68] to-[#2F4A48] rounded-3xl p-6 text-white shadow-lg">
                <h3 className="text-xl font-bold mb-3">
                  Konsultasi Gratis!
                </h3>
                <p className="text-white/90 text-sm mb-4">
                  Ada pertanyaan seputar sewa freezer ASI? Hubungi kami sekarang!
                </p>
                <Link
                  href="https://wa.me/6282122229350"
                  className="block w-full bg-white text-[#466A68] text-center py-3 rounded-full font-bold hover:shadow-xl transition-all"
                >
                  Chat WhatsApp
                </Link>
              </div>

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
