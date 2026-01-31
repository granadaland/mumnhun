import { Container } from "@/components/layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { BenefitCard, TestimonialCard, FaqAccordion } from "@/components/home"
import { PostCard } from "@/components/blog/post-card"
import { getPosts } from "@/lib/db/queries"
import {
  PRICING_PACKAGES,
  SERVICE_BENEFITS,
  TESTIMONIALS,
  FAQ_DATA,
  WHATSAPP_LINK,
} from "@/lib/constants"
import Image from "next/image"
import Link from "next/link"
import { Star } from "lucide-react"

export default async function HomePage() {
  const { posts: latestPosts } = await getPosts(1, 3)

  return (
    <>
      {/* ═══════════════════════════════════════════════════════ */}
      {/* SECTION 1: HERO (FULL WIDTH - No Pricing Sidebar!)     */}
      {/* ═══════════════════════════════════════════════════════ */}
      <section className="relative bg-gradient-to-br from-[#E8D5C4] via-[#D9C4B0] to-[#C9B199] overflow-hidden">
        <Container className="py-12 lg:py-20">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            {/* LEFT: Hero Content */}
            <div className="space-y-6 lg:space-y-8 order-2 lg:order-1">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold text-neutral-900 leading-tight">
                Solusi Penyimpanan ASI Aman untuk Ibu Bekerja
              </h1>

              <p className="text-base sm:text-lg lg:text-xl text-neutral-700 leading-relaxed max-w-xl">
                Sewa freezer ASI berkualitas dengan harga terjangkau. Jaga
                kesegaran ASI untuk buah hati Anda dengan mudah.
              </p>

              <div className="flex flex-col sm:flex-row gap-4">
                <Button
                  size="lg"
                  className="bg-teal-600 hover:bg-teal-700 text-white px-8 py-6 text-lg rounded-full"
                  asChild
                >
                  <Link href={WHATSAPP_LINK}>Saya Ingin Menyewa</Link>
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="border-2 border-neutral-800 text-neutral-800 hover:bg-neutral-800 hover:text-white px-8 py-6 text-lg rounded-full"
                  asChild
                >
                  <Link href={WHATSAPP_LINK}>Konsultasi Gratis</Link>
                </Button>
              </div>
            </div>

            {/* RIGHT: Hero Image - Mother + Baby */}
            <div className="relative order-1 lg:order-2">
              <div className="relative w-full aspect-[4/5] lg:aspect-square max-w-md mx-auto lg:max-w-none">
                <Image
                  src="https://images.unsplash.com/photo-1555252333-9f8e92e65df9?w=800&q=80"
                  alt="Ibu menyusui dan bayi"
                  fill
                  className="object-cover rounded-2xl"
                  priority
                />
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* ═══════════════════════════════════════════════════════ */}
      {/* SECTION 2: BENEFITS - 6 Cards (2x3 Grid)               */}
      {/* ═══════════════════════════════════════════════════════ */}
      <section className="py-16 lg:py-24 bg-[#FDF8F3]">
        <Container>
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold text-neutral-900 mb-4">
              Mengapa Memilih Mum &apos;N Hun?
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {SERVICE_BENEFITS.map((benefit, idx) => (
              <BenefitCard
                key={idx}
                icon={benefit.icon}
                title={benefit.title}
                description={benefit.description}
              />
            ))}
          </div>
        </Container>
      </section>

      {/* ═══════════════════════════════════════════════════════ */}
      {/* SECTION 3: PRICING - 3 Horizontal Cards                */}
      {/* ═══════════════════════════════════════════════════════ */}
      <section className="py-16 lg:py-24 bg-[#FDF8F3]">
        <Container>
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold text-neutral-900 mb-4">
              Pilihan Paket Sewa
            </h2>
          </div>

          {/* 3 Pricing Cards in Horizontal Row */}
          <div className="grid md:grid-cols-3 gap-6 lg:gap-8 max-w-5xl mx-auto">
            {PRICING_PACKAGES.map((pkg) => (
              <Card
                key={pkg.id}
                className={`relative border-2 rounded-2xl overflow-hidden transition-all hover:shadow-lg ${pkg.popular
                    ? "border-coral-400 bg-white shadow-xl scale-105 z-10"
                    : "border-neutral-200 bg-white"
                  }`}
              >
                {/* Popular Badge */}
                {pkg.popular && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-0">
                    <span className="bg-coral-500 text-white text-xs font-bold px-4 py-1.5 rounded-b-lg">
                      Populer
                    </span>
                  </div>
                )}

                <CardContent className={`p-6 lg:p-8 ${pkg.popular ? "pt-10" : ""}`}>
                  {/* Duration */}
                  <div className="text-center mb-2">
                    <p className="text-sm font-medium text-neutral-600">
                      {pkg.duration}
                    </p>
                  </div>

                  {/* Price */}
                  <div className="text-center mb-6">
                    <span className="text-sm text-neutral-500">Rp</span>
                    <span className="text-4xl lg:text-5xl font-bold text-neutral-900">
                      {pkg.priceDisplay.replace("Rp", "").trim()}
                    </span>
                  </div>

                  {/* Features */}
                  <ul className="space-y-3 mb-6">
                    {pkg.features.map((feature, idx) => (
                      <li
                        key={idx}
                        className="flex items-start gap-2 text-sm text-neutral-700"
                      >
                        <svg
                          className="w-5 h-5 text-teal-600 flex-shrink-0 mt-0.5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {/* CTA Button */}
                  <Button
                    className="w-full bg-teal-600 hover:bg-teal-700 text-white rounded-lg py-3"
                    asChild
                  >
                    <Link href={WHATSAPP_LINK}>Sewa Sekarang</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </Container>
      </section>

      {/* ═══════════════════════════════════════════════════════ */}
      {/* SECTION 4: TESTIMONIALS                                */}
      {/* ═══════════════════════════════════════════════════════ */}
      <section className="py-16 lg:py-24 bg-[#E8DDD4]">
        <Container>
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold text-neutral-900 mb-4">
              Apa Kata Mereka?
            </h2>
          </div>

          {/* Single Featured Testimonial Card */}
          <div className="max-w-4xl mx-auto">
            <Card className="bg-white rounded-2xl shadow-lg overflow-hidden">
              <CardContent className="p-8 lg:p-12">
                <div className="flex flex-col lg:flex-row gap-8 items-center">
                  {/* Testimonial Image */}
                  <div className="relative w-48 h-48 lg:w-64 lg:h-64 flex-shrink-0 rounded-2xl overflow-hidden">
                    <Image
                      src={TESTIMONIALS[0]?.image || "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&q=80"}
                      alt={TESTIMONIALS[0]?.name || "Customer"}
                      fill
                      className="object-cover"
                    />
                  </div>

                  {/* Testimonial Content */}
                  <div className="flex-1 text-center lg:text-left">
                    <p className="text-lg lg:text-xl text-neutral-700 leading-relaxed mb-6 italic">
                      &quot;{TESTIMONIALS[0]?.quote || "Mum 'N Hun sangat membantu saya! Freezer bersih dan dingin. ASI saya aman tersimpan. Sangat direkomendasikan untuk ibu menyusui!"}&quot;
                    </p>
                    <p className="font-semibold text-neutral-900 mb-4">
                      {TESTIMONIALS[0]?.name || "Forum Moonitawall"}
                    </p>

                    {/* Rating */}
                    <div className="flex items-center justify-center lg:justify-start gap-1">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className="w-5 h-5 fill-yellow-400 text-yellow-400"
                        />
                      ))}
                      <span className="ml-2 text-lg font-bold text-neutral-900">
                        4.9<span className="text-sm text-neutral-500">/5</span>
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </Container>
      </section>

      {/* ═══════════════════════════════════════════════════════ */}
      {/* SECTION 5: FAQ + LATEST ARTICLES (Side by Side)        */}
      {/* ═══════════════════════════════════════════════════════ */}
      <section className="py-16 lg:py-24 bg-[#FDF8F3]">
        <Container>
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold text-neutral-900 mb-4">
              Tanya Jawab & Artikel Terbaru
            </h2>
          </div>

          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16">
            {/* Left: FAQ */}
            <div>
              <h3 className="text-xl font-bold text-neutral-900 mb-6">FAQs</h3>
              <FaqAccordion faqs={FAQ_DATA} />
            </div>

            {/* Right: Latest Articles */}
            <div>
              <h3 className="text-xl font-bold text-neutral-900 mb-6">
                Latest Articles
              </h3>
              <div className="grid grid-cols-2 gap-4">
                {latestPosts.length > 0 ? (
                  latestPosts.slice(0, 2).map((post: any) => (
                    <Link
                      key={post.id}
                      href={`/blog/${post.slug}`}
                      className="group"
                    >
                      <div className="relative aspect-[4/3] rounded-lg overflow-hidden mb-2">
                        <Image
                          src={
                            post.featuredImage ||
                            "https://images.unsplash.com/photo-1555252333-9f8e92e65df9?w=400&q=80"
                          }
                          alt={post.title}
                          fill
                          className="object-cover group-hover:scale-105 transition"
                        />
                      </div>
                      <h4 className="text-sm font-medium text-neutral-900 line-clamp-2 group-hover:text-teal-700 transition">
                        {post.title}
                      </h4>
                    </Link>
                  ))
                ) : (
                  <>
                    <div className="relative aspect-[4/3] rounded-lg overflow-hidden bg-neutral-200">
                      <Image
                        src="https://images.unsplash.com/photo-1555252333-9f8e92e65df9?w=400&q=80"
                        alt="Artikel 1"
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div className="relative aspect-[4/3] rounded-lg overflow-hidden bg-neutral-200">
                      <Image
                        src="https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?w=400&q=80"
                        alt="Artikel 2"
                        fill
                        className="object-cover"
                      />
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </Container>
      </section>
    </>
  )
}
