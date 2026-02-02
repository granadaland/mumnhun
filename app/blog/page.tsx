import { getPosts, getFeaturedImageUrl, stripHtml } from '@/lib/wordpress'
import Image from 'next/image'
import Link from 'next/link'
import { Container } from '@/components/ui/container'
import { Calendar, Clock, ArrowRight } from 'lucide-react'

export const metadata = {
  title: 'Blog - Tips & Artikel Seputar ASI | Mum\'N Hun',
  description: 'Artikel, tips, dan panduan lengkap seputar ASI, freezer ASI, dan penyimpanan ASIP untuk ibu menyusui.'
}

export default async function BlogPage() {
  const posts = await getPosts(1, 12)

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#FFFBF7] to-white">
      {/* Hero Section */}
      <section className="pt-32 pb-16 px-6">
        <Container>
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-4xl md:text-5xl font-bold text-[#382821] mb-6">
              Blog & Artikel
            </h1>
            <p className="text-lg text-[#382821]/70">
              Tips, panduan, dan informasi seputar ASI, freezer ASI, dan penyimpanan ASIP untuk Mums
            </p>
          </div>
        </Container>
      </section>

      {/* Blog Grid */}
      <section className="pb-20 px-6">
        <Container>
          {posts.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-[#382821]/60 text-lg">Belum ada artikel tersedia.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {posts.map((post) => {
                const imageUrl = getFeaturedImageUrl(post)
                const excerpt = stripHtml(post.excerpt.rendered)
                const title = post.title.rendered.replace(/&#038;/g, '&')

                return (
                  <Link
                    key={post.id}
                    href={`/blog/${post.slug}`}
                    className="group bg-white rounded-3xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1"
                  >
                    {/* Featured Image */}
                    <div className="relative aspect-[16/10] overflow-hidden">
                      <Image
                        src={imageUrl}
                        alt={title}
                        fill
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>

                    {/* Content */}
                    <div className="p-6">
                      {/* Date */}
                      <div className="flex items-center gap-4 text-sm text-[#382821]/60 mb-3">
                        <span className="flex items-center gap-1">
                          <Calendar size={14} />
                          {new Date(post.date).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric'
                          })}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock size={14} />
                          5 min
                        </span>
                      </div>

                      {/* Title */}
                      <h2 className="text-xl font-bold text-[#382821] mb-3 line-clamp-2 group-hover:text-[#466A68] transition-colors">
                        {title}
                      </h2>

                      {/* Excerpt */}
                      <p className="text-[#382821]/70 line-clamp-3 mb-4">
                        {excerpt.substring(0, 150)}...
                      </p>

                      {/* Read More */}
                      <div className="flex items-center text-[#466A68] font-semibold group-hover:gap-2 transition-all">
                        Baca Selengkapnya
                        <ArrowRight size={18} className="ml-1 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </Container>
      </section>
    </main>
  )
}
