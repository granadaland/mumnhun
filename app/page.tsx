import { Container } from "@/components/layout"
import { Button } from "@/components/ui/button"
import { BenefitCard, FaqAccordion } from "@/components/home"
import { TestimonialsSection } from "@/components/home/testimonials-section"
import { HeroImageSlider } from "@/components/hero-image-slider"
import { getPosts } from "@/lib/db/queries"
import {
  DEFAULT_OG_IMAGE,
  PRICING_PACKAGES,
  SERVICE_BENEFITS,
  FAQ_DATA,
  TESTIMONIALS,
  WHATSAPP_LINK,
  WHATSAPP_NUMBER,
  SITE_URL,
  SITE_NAME,
  CONTACT_INFO,
} from "@/lib/constants"
import Image from "next/image"
import Link from "next/link"
import { Star, ShieldCheck, ArrowRight, MessageCircle, Clock3 } from "lucide-react"
import type { Metadata } from "next"

const RENTAL_STEPS = [
  {
    title: "Konsultasi via WhatsApp",
    description:
      "Klik tombol WhatsApp, sampaikan kebutuhan Anda, lalu tim kami bantu pilih paket sewa freezer ASI yang paling sesuai.",
  },
  {
    title: "Konfirmasi Paket & Jadwal",
    description:
      "Setelah paket dipilih, kami konfirmasi area layanan, jadwal antar, dan detail pembayaran secara transparan.",
  },
  {
    title: "Freezer Diantar & Siap Pakai",
    description:
      "Unit steril kami antar ke rumah. Anda tinggal pakai dengan tenang, termasuk dukungan selama masa sewa.",
  },
]

const rupiahFormatter = new Intl.NumberFormat("id-ID")
type LatestPost = Awaited<ReturnType<typeof getPosts>>["posts"][number]

function getPackageWhatsAppLink(duration: string, priceDisplay: string) {
  const message = `Halo, saya ingin sewa freezer ASI paket ${duration} (${priceDisplay}). Mohon info jadwal pengiriman dan cara pembayarannya.`
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`
}

// Homepage-specific SEO metadata
export const metadata: Metadata = {
  title: "Sewa Freezer ASI | Rental Kulkas ASI Bulanan | Mum 'n Hun",
  description:
    "Sewa freezer ASI murah untuk wilayah Jakarta Selatan, Depok, Jakarta Timur, Jakarta Utara, Jakarta Pusat, Bogor, Tangerang, Bintaro, Bekasi, BSD",
  keywords: [
    "Sewa Freezer ASI",
    "Rental Kulkas ASI",
    "Sewa Freezer ASI Bulanan",
    "Sewa Freezer ASI Terdekat",
    "Sewa Freezer ASI Jakarta",
    "Sewa Freezer ASI Jabodetabek",
  ],
  alternates: {
    canonical: `${SITE_URL}/`,
  },
  openGraph: {
    title: "Sewa Freezer ASI | Rental Kulkas ASI Bulanan | Mum 'n Hun",
    description:
      "Sewa freezer ASI murah untuk wilayah Jakarta Selatan, Depok, Jakarta Timur, Jakarta Utara, Jakarta Pusat, Bogor, Tangerang, Bintaro, Bekasi, BSD",
    url: `${SITE_URL}/`,
    type: "website",
    siteName: SITE_NAME,
    locale: "id_ID",
    images: [
      {
        url: DEFAULT_OG_IMAGE,
        width: 1200,
        height: 630,
        alt: "Sewa Freezer ASI Bulanan Jabodetabek",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Sewa Freezer ASI | Rental Kulkas ASI",
    description:
      "Sewa freezer ASI terdekat area Jabodetabek. Unit steril, garansi unit, dan respon WhatsApp cepat.",
    images: [DEFAULT_OG_IMAGE],
  },
}

export default async function HomePage() {
  const { posts: latestPosts } = await getPosts({ page: 1, limit: 3 })

  const averageRating = Number(
    (
      TESTIMONIALS.reduce((total, testimonial) => total + testimonial.rating, 0) /
      TESTIMONIALS.length
    ).toFixed(1)
  )
  const pricingOffers = PRICING_PACKAGES.map((pkg) => ({
    "@type": "Offer",
    name: `Paket Sewa ${pkg.duration}`,
    price: pkg.price,
    priceCurrency: "IDR",
    availability: "https://schema.org/InStock",
    url: `${SITE_URL}/#pricing`,
    itemOffered: {
      "@type": "Service",
      name: `Sewa Freezer ASI ${pkg.duration}`,
    },
  }))

  const websiteJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: SITE_URL,
    inLanguage: "id-ID",
    potentialAction: {
      "@type": "SearchAction",
      target: `${SITE_URL}/blog?search={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  }

  const localBusinessJsonLd = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: SITE_NAME,
    url: SITE_URL,
    image: [DEFAULT_OG_IMAGE],
    description:
      "Sewa freezer ASI murah untuk wilayah Jakarta Selatan, Depok, Jakarta Timur, Jakarta Utara, Jakarta Pusat, Bogor, Tangerang, Bintaro, Bekasi, BSD",
    telephone: CONTACT_INFO.phone,
    email: CONTACT_INFO.email,
    areaServed: [
      "Jakarta",
      "Bogor",
      "Depok",
      "Tangerang",
      "Bekasi",
      "Jakarta Selatan",
      "Jakarta Barat",
      "Jakarta Timur",
      "Jakarta Utara",
      "Jakarta Pusat",
      "BSD",
      "Bintaro",
      "Serpong",
      "Cinere",
      "Tangerang Selatan",
      "Ciputat",
    ],
    priceRange: "Rp160.000 - Rp550.000",
    contactPoint: [
      {
        "@type": "ContactPoint",
        telephone: CONTACT_INFO.phone,
        contactType: "customer service",
        areaServed: "ID",
        availableLanguage: ["id"],
      },
    ],
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: averageRating,
      reviewCount: TESTIMONIALS.length,
    },
    makesOffer: pricingOffers,
    address: {
      "@type": "PostalAddress",
      addressLocality: "Jakarta",
      addressCountry: "ID",
    },
  }

  const serviceJsonLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: "Sewa Freezer ASI Bulanan",
    serviceType: "Rental Kulkas ASI",
    provider: {
      "@type": "LocalBusiness",
      name: SITE_NAME,
      url: SITE_URL,
    },
    areaServed: [
      "Jakarta",
      "Bogor",
      "Depok",
      "Tangerang",
      "Bekasi",
      "Jakarta Selatan",
      "Jakarta Barat",
      "Jakarta Timur",
      "Jakarta Utara",
      "Jakarta Pusat",
      "BSD",
      "Bintaro",
      "Serpong",
      "Cinere",
      "Tangerang Selatan",
      "Ciputat",
    ],
    offers: pricingOffers,
  }

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ_DATA.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      {/* ═══════════════════════════════════════════════════════ */}
      {/* SECTION 1: HERO - Mockup Design                        */}
      {/* ═══════════════════════════════════════════════════════ */}
      <section className="relative pt-36 pb-20 md:pt-48 md:pb-32 px-6 overflow-hidden">
        {/* Background Gradient (Left to Right - Warm) */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#FFFBF7] via-[#F3E7DB] to-[#E2CDBA] -z-20" />

        <Container className="relative z-10">
          <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-20">
            {/* LEFT: Hero Content */}
            <div className="flex-1 text-center lg:text-left">
              {/* Animated Badge */}
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/60 border border-white/50 backdrop-blur-sm shadow-sm mb-6">
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#466A68] opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#466A68]" />
                </span>
                <span className="text-xs font-semibold tracking-wide text-[#382821] uppercase">
                  Solusi No.1 Ibu Bekerja
                </span>
              </div>

              {/* Hero Heading with Gradient Text */}
              <h1 className="text-4xl md:text-6xl xl:text-7xl font-bold text-[#382821] leading-[1.1] mb-2 tracking-tight">
                Sewa Freezer ASI
              </h1>
              <p className="text-2xl md:text-3xl xl:text-4xl font-semibold text-transparent bg-clip-text bg-gradient-to-r from-[#466A68] to-[#2F4A48] mb-6 relative w-fit">
                Kualitas ASI Tetap Terjaga
                <svg
                  className="absolute w-full h-2 -bottom-1 left-0 text-[#C48B77]/30 -z-10"
                  viewBox="0 0 100 10"
                  preserveAspectRatio="none"
                >
                  <path
                    d="M0 5 Q 50 10 100 5"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="none"
                  />
                </svg>
              </p>

              {/* Hero Description */}
              <p className="text-[#382821]/70 text-lg md:text-xl mb-10 leading-relaxed max-w-xl mx-auto lg:mx-0 font-light">
                Layanan <strong className="font-semibold text-[#382821]">rental kulkas ASI</strong> untuk ibu yang mencari
                <strong className="font-semibold text-[#382821]"> sewa freezer ASI terdekat</strong> area Jabodetabek.
                Unit steril, hemat energi, dan siap antar cepat. Lihat juga <Link href="#pricing" className="underline decoration-[#466A68]/50 underline-offset-4 hover:text-[#466A68]">paket sewa freezer ASI bulanan</Link> yang paling hemat.
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start">
                <Button
                  size="lg"
                  className="group w-full sm:w-auto bg-[#466A68] hover:bg-[#2F4A48] text-white px-8 py-4 rounded-full font-semibold transition-all duration-300 shadow-lg shadow-[#466A68]/30 hover:shadow-[#466A68]/50 hover:-translate-y-1 flex items-center justify-center gap-3"
                  asChild
                >
                  <Link href={WHATSAPP_LINK} target="_blank" rel="noopener noreferrer" aria-label="Hubungi WhatsApp untuk sewa freezer ASI">
                    <MessageCircle size={18} aria-hidden="true" />
                    Sewa via WhatsApp
                    <ArrowRight
                      size={18}
                      aria-hidden="true"
                      className="group-hover:translate-x-1 transition-transform"
                    />
                  </Link>
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full sm:w-auto bg-white/50 border border-white hover:bg-white text-[#382821] px-8 py-4 rounded-full font-semibold transition-all shadow-md hover:shadow-lg backdrop-blur-sm"
                  asChild
                >
                  <Link href="#pricing" aria-label="Lihat harga sewa freezer ASI bulanan">
                    Lihat Harga Bulanan
                  </Link>
                </Button>
              </div>

              <p className="mt-4 text-sm text-[#382821]/60">
                Butuh detail lengkap? Lihat <Link href="/petunjuk" className="font-medium underline decoration-[#466A68]/50 underline-offset-4 hover:text-[#466A68]">petunjuk penggunaan freezer ASI</Link> dan <Link href="/syarat-ketentuan" className="font-medium underline decoration-[#466A68]/50 underline-offset-4 hover:text-[#466A68]">syarat & ketentuan sewa</Link>.
              </p>

              {/* Trust Indicators */}
              <div className="mt-10 flex flex-wrap items-center justify-center lg:justify-start gap-x-6 gap-y-3 text-sm text-[#382821]/70">
                <div className="flex items-center gap-2">
                  <Clock3 size={18} className="text-[#466A68]" aria-hidden="true" />
                  <span>Respon WhatsApp ±5 Menit (jam kerja)</span>
                </div>
                <div className="w-1 h-1 bg-[#382821]/20 rounded-full hidden sm:block" />
                <div className="flex items-center gap-2">
                  <ShieldCheck size={18} className="text-[#466A68]" aria-hidden="true" />
                  <span>Garansi unit selama masa sewa</span>
                </div>
                <div className="w-1 h-1 bg-[#382821]/20 rounded-full hidden md:block" />
                <div>5k+ ibu terbantu</div>
              </div>
            </div>

            {/* RIGHT: Hero Image - Premium Style */}
            <div className="flex-1 relative w-full max-w-xl lg:max-w-lg">
              {/* Soft Glow Effect */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-white/30 rounded-full blur-3xl -z-10" />

              <div className="relative">
                {/* Floating Card: Rating */}
                <div className="absolute -top-6 -left-6 z-20 bg-white/90 backdrop-blur-xl p-4 rounded-2xl shadow-xl shadow-stone-200/50 border border-white animate-bounce-slow hidden md:block">
                  <div className="flex items-center gap-3">
                    <div className="flex -space-x-2">
                      {['S', 'R', 'A'].map((initial, i) => (
                        <div
                          key={i}
                          className="w-8 h-8 rounded-full bg-gradient-to-br from-[#466A68] to-[#2F4A48] border-2 border-white flex items-center justify-center text-white text-xs font-bold"
                        >
                          {initial}
                        </div>
                      ))}
                    </div>
                    <div>
                      <div className="flex text-yellow-400 text-xs">
                        {[1, 2, 3, 4, 5].map((i) => (
                          <Star key={i} size={10} fill="currentColor" />
                        ))}
                      </div>
                      <span className="text-xs font-bold text-[#382821]">
                        4.7/5.0 dari 5k+ review
                      </span>
                    </div>
                  </div>
                </div>

                {/* Main Image Slider */}
                <HeroImageSlider />

                {/* Floating Card: Feature */}
                <div className="absolute -bottom-8 right-0 md:-right-10 z-20 bg-white p-5 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.1)] border border-gray-100 flex items-center gap-4 animate-float max-w-[200px] md:max-w-none">
                  <div className="w-12 h-12 bg-[#466A68]/10 rounded-full flex items-center justify-center text-[#466A68]">
                    <ShieldCheck size={24} />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold">
                      Jaminan
                    </p>
                    <p className="text-[#382821] font-bold text-lg">
                      100% Steril
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Container>
      </section>


      {/* ═══════════════════════════════════════════════════════ */}
      {/* SECTION: CARA SEWA - 3 LANGKAH                         */}
      {/* ═══════════════════════════════════════════════════════ */}
      <section className="py-16 md:py-20 px-6 bg-[#FFFBF7]" aria-labelledby="cara-sewa-title">
        <Container>
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 id="cara-sewa-title" className="text-3xl md:text-4xl font-bold text-[#382821] tracking-tight">
              Cara Sewa Freezer ASI dalam 3 Langkah
            </h2>
            <p className="mt-4 text-[#382821]/70 leading-relaxed">
              Proses simpel, cepat, dan jelas agar Anda bisa fokus pada kebutuhan Si Kecil tanpa ribet.
            </p>
          </div>

          <ol className="grid md:grid-cols-3 gap-6 lg:gap-8">
            {RENTAL_STEPS.map((step, index) => (
              <li
                key={step.title}
                className="rounded-3xl border border-[#382821]/10 bg-white/80 backdrop-blur-sm p-6 lg:p-8 shadow-sm"
              >
                <span className="inline-flex w-10 h-10 items-center justify-center rounded-full bg-[#466A68] text-white font-bold mb-4">
                  {index + 1}
                </span>
                <h3 className="text-xl font-bold text-[#382821] mb-3">{step.title}</h3>
                <p className="text-[#382821]/70 leading-relaxed">{step.description}</p>
              </li>
            ))}
          </ol>
        </Container>
      </section>


      {/* ═══════════════════════════════════════════════════════ */}
      {/* SECTION: ABOUT - Tentang Mum 'n Hun                    */}
      {/* ═══════════════════════════════════════════════════════ */}
      <section className="py-20 md:py-28 px-6 relative overflow-hidden">
        <Container>
          <div className="flex flex-col lg:flex-row gap-12 lg:gap-20 items-center">
            {/* Left: Video Player */}
            <div className="flex-1 relative group">
              {/* Decorative Background Shape */}
              <div className="absolute -inset-4 bg-gradient-to-br from-[#E8DDD4] to-[#D4BCAA] rounded-[3rem] -z-10 rotate-3 group-hover:rotate-0 transition-transform duration-500" />

              {/* YouTube Embedded Player */}
              <div className="relative rounded-[2.5rem] overflow-hidden shadow-2xl shadow-stone-900/10 aspect-video">
                <iframe
                  src="https://www.youtube.com/embed/N9FIL22ro7I?rel=0"
                  title="Tentang Mum 'n Hun - Video Company Profile"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  className="absolute inset-0 w-full h-full"
                />

                {/* Floating Badge */}
                <div className="absolute top-6 left-6 bg-[#C48B77] text-white px-4 py-2 rounded-full font-bold text-sm shadow-lg pointer-events-none">
                  🎬 Video Company Profile
                </div>
              </div>
            </div>

            {/* Right: Content */}
            <div className="flex-1 text-center lg:text-left">
              {/* Section Tag */}
              <div className="inline-block px-4 py-1.5 rounded-full bg-[#466A68]/10 text-[#466A68] font-semibold text-sm mb-6">
                Tentang Mum &apos;N Hun
              </div>

              {/* Heading */}
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-[#382821] leading-tight mb-6">
                Spesialis Jasa{" "}
                <span className="text-[#466A68]">Sewa Freezer ASI</span>
                <br />
                Sejak Tahun 2010
              </h2>

              {/* Description Paragraphs */}
              <div className="space-y-4 text-[#382821]/70 leading-relaxed mb-8">
                <p>
                  Kami memahami betapa berharganya setiap tetes ASI bagi buah hati Anda. Sebagai penyedia layanan{" "}
                  <strong className="text-[#382821]">sewa freezer ASI</strong> terpercaya, Mum &apos;N Hun menyediakan unit freezer khusus yang dirancang untuk menjaga nutrisi dan kesegaran ASI perah dalam jangka panjang.
                </p>
                <p>
                  Kami melayani pengiriman <strong className="text-[#382821]">sewa freezer ASI Jakarta</strong>, Bogor, Depok, Tangerang, dan Bekasi. Lebih dari <strong className="text-[#382821]">5.000+ ibu menyusui</strong> telah mempercayakan penyimpanan ASI mereka kepada kami.
                </p>
              </div>

            </div>
          </div>

          {/* Stats Row - Full Width Under Video & About Content */}
          <div className="mt-12 lg:mt-14 pt-8 border-t border-[#382821]/10">
            <div className="rounded-[2rem] bg-gradient-to-br from-white/80 via-[#FFF9F4]/85 to-[#F4EEE7]/75 backdrop-blur-sm border border-white/80 shadow-lg shadow-stone-200/40 p-4 sm:p-5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                <div className="rounded-2xl bg-gradient-to-br from-[#FFF9F4] via-white to-[#F4EEE7] px-5 py-5 text-center border border-[#C48B77]/20 shadow-sm shadow-[#C48B77]/10">
                  <span className="mx-auto mb-3 block h-1.5 w-14 rounded-full bg-gradient-to-r from-[#C48B77]/75 to-[#E8DDD4]/80" />
                  <p className="text-3xl md:text-4xl font-bold text-[#382821]">2010</p>
                  <p className="mt-1 text-sm text-[#382821]/55 font-medium">Berdiri Sejak</p>
                </div>
                <div className="rounded-2xl bg-gradient-to-br from-[#F6FAF9] via-white to-[#EAF3F2] px-5 py-5 text-center border border-[#466A68]/20 shadow-sm shadow-[#466A68]/10">
                  <span className="mx-auto mb-3 block h-1.5 w-14 rounded-full bg-gradient-to-r from-[#466A68]/75 to-[#9CB9B7]/80" />
                  <p className="text-3xl md:text-4xl font-bold text-[#382821]">5k+</p>
                  <p className="mt-1 text-sm text-[#382821]/55 font-medium">Ibu Terbantu</p>
                </div>
                <div className="rounded-2xl bg-gradient-to-br from-[#FFFDF8] via-white to-[#F2EADF] px-5 py-5 text-center border border-[#B08A79]/20 shadow-sm shadow-[#C48B77]/10">
                  <span className="mx-auto mb-3 block h-1.5 w-14 rounded-full bg-gradient-to-r from-[#466A68]/65 to-[#C48B77]/70" />
                  <p className="text-2xl md:text-3xl font-bold text-[#382821] leading-tight">Jabodetabek</p>
                  <p className="mt-1 text-sm text-[#382821]/55 font-medium">Area Layanan</p>
                </div>
              </div>
            </div>
          </div>
        </Container>
      </section>


      {/* ═══════════════════════════════════════════════════════ */}
      {/* SECTION 2: BENEFITS - 6 Cards (2x3 Grid)               */}
      {/* ═══════════════════════════════════════════════════════ */}
      <section className="py-20 md:py-24 px-6 relative bg-[#F0E7DB] overflow-hidden">
        <Container>
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold text-[#382821] tracking-tight">
              Kenapa Harus{" "}
              <span className="text-[#466A68] relative inline-block">
                Mum &apos;N Hun?
                <span className="absolute bottom-2 left-0 w-full h-2 bg-[#C48B77]/20 -z-10 rounded-full" />
              </span>
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
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
      <section id="pricing" className="py-20 md:py-24 px-6 relative bg-white/40 overflow-hidden" aria-labelledby="pricing-title">
        {/* Background Decor */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[80%] bg-[#466A68]/5 blur-[120px] rounded-full -z-10" />

        <Container>
          <div className="text-center mb-16">
            <div className="inline-block px-4 py-1.5 rounded-full bg-[#C48B77]/10 text-[#C48B77] font-semibold text-sm mb-4">
              Harga Transparan
            </div>
            <h2 id="pricing-title" className="text-3xl md:text-5xl font-bold text-[#382821] tracking-tight">
              Pilihan Paket Sewa Freezer ASI Bulanan
            </h2>
            <p className="mt-4 max-w-2xl mx-auto text-[#382821]/70 leading-relaxed">
              Harga jelas tanpa biaya tersembunyi. Pilih paket yang paling sesuai dengan kebutuhan penyimpanan ASI Anda.
            </p>
          </div>

          {/* 3 Pricing Cards in Flex Row */}
          <div className="flex flex-col md:flex-row gap-8 lg:gap-12 justify-center items-center md:items-stretch">
            {PRICING_PACKAGES.map((pkg) => (
              <div
                key={pkg.id}
                className={`relative flex flex-col w-full md:w-1/3 max-w-sm rounded-[2.5rem] p-8 lg:p-10 transition-all duration-500 group ${pkg.popular
                  ? "bg-white/90 backdrop-blur-xl ring-4 ring-[#466A68]/10 shadow-2xl shadow-[#466A68]/10 scale-100 md:scale-110 z-10 pt-16 md:pt-14"
                  : "bg-white/80 backdrop-blur-md border border-white shadow-sm hover:border-[#466A68]/30 hover:bg-white hover:shadow-xl hover:-translate-y-2"
                  }`}
              >
                {/* Popular Badge */}
                {pkg.popular && (
                  <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-[#466A68] to-[#2F4A48] text-white px-6 py-2 rounded-full shadow-lg shadow-[#466A68]/30 text-sm font-bold">
                    ⭐ Paling Populer
                  </div>
                )}

                {/* Duration */}
                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-6 text-center">
                  {pkg.duration}
                </h3>

                {/* Price */}
                <div className="text-center mb-8">
                  <span className="text-lg text-gray-400 font-medium align-top">
                    Rp
                  </span>
                  <span className="text-4xl lg:text-5xl font-bold tracking-tight text-[#382821]">
                    {rupiahFormatter.format(pkg.price)}
                  </span>
                  <p className="text-sm text-[#382821]/60 mt-2">per paket sewa</p>
                </div>

                {/* Features */}
                <ul className="space-y-4 mb-8 flex-1">
                  {pkg.features.map((feature, idx) => (
                    <li
                      key={idx}
                      className="flex items-start gap-3 text-sm text-gray-700"
                    >
                      <div className="rounded-full p-0.5 bg-[#466A68]/10 text-[#466A68] mt-0.5">
                        <svg
                          className="w-3.5 h-3.5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={3}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      </div>
                      <span className="leading-tight font-medium text-[#382821]/80">
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>

                {/* CTA Button */}
                <Button
                  className={`w-full py-4 rounded-2xl font-bold uppercase tracking-wide transition-all ${pkg.popular
                    ? "bg-[#466A68] hover:bg-[#2F4A48] text-white shadow-lg shadow-[#466A68]/25"
                    : "bg-[#382821]/5 hover:bg-[#466A68] text-[#382821] hover:text-white border border-[#382821]/10 hover:border-transparent"
                    }`}
                  asChild
                >
                  <Link
                    href={getPackageWhatsAppLink(pkg.duration, pkg.priceDisplay)}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Pilih paket sewa ${pkg.duration} via WhatsApp`}
                  >
                    Pilih Paket
                  </Link>
                </Button>
              </div>
            ))}
          </div>
        </Container>
      </section>


      {/* ═══════════════════════════════════════════════════════ */}
      {/* SECTION 4: TESTIMONIALS                                */}
      {/* ═══════════════════════════════════════════════════════ */}
      <TestimonialsSection />


      {/* ═══════════════════════════════════════════════════════ */}
      {/* SECTION 5: FAQ + LATEST ARTICLES (Side by Side)        */}
      {/* ═══════════════════════════════════════════════════════ */}
      <section className="py-20 md:py-24 px-6 relative bg-white/40">
        <Container>
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold text-[#382821] tracking-tight">
              Tanya Jawab &{" "}
              <span className="text-[#466A68] relative inline-block">
                Artikel Terbaru
                <span className="absolute bottom-2 left-0 w-full h-2 bg-[#C48B77]/20 -z-10 rounded-full" />
              </span>
            </h2>
          </div>

          <div className="grid lg:grid-cols-2 gap-16 lg:gap-24">
            {/* Left: FAQ */}
            <div>
              <h3 className="text-lg font-bold text-[#382821] uppercase tracking-wider mb-8 flex items-center gap-3">
                <span className="w-8 h-0.5 bg-[#466A68] rounded-full" />
                Pertanyaan Umum
              </h3>
              <FaqAccordion faqs={FAQ_DATA} />
            </div>

            {/* Right: Latest Articles */}
            <div>
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-lg font-bold text-[#382821] uppercase tracking-wider flex items-center gap-3">
                  <span className="w-8 h-0.5 bg-[#C48B77] rounded-full" />
                  Artikel Terbaru
                </h3>
                <Link
                  href="/blog"
                  className="text-sm font-semibold text-[#466A68] hover:text-[#2F4A48] transition-colors flex items-center gap-1"
                >
                  Lihat Semua
                  <ArrowRight size={14} />
                </Link>
              </div>
              <div className="space-y-4">
                {latestPosts.length > 0 ? (
                  latestPosts.slice(0, 3).map((post: LatestPost) => (
                    <Link
                      key={post.id}
                      href={`/${post.slug}`}
                      className="group flex gap-5 p-4 rounded-3xl bg-white/40 hover:bg-white/80 border border-white/60 hover:shadow-xl hover:shadow-stone-200/50 backdrop-blur-sm cursor-pointer transition-all duration-300"
                    >
                      <div className="w-28 h-28 shrink-0 rounded-2xl overflow-hidden shadow-sm bg-[#E8DDD4]">
                        <Image
                          src={
                            post.featuredImage ||
                            "https://res.cloudinary.com/dvqcs0zqi/image/upload/v1769914192/Sewa_Freezer_ASI_Jakarta_g6mjoz.webp"
                          }
                          alt={post.title}
                          width={112}
                          height={112}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                          loading="lazy"
                        />
                      </div>
                      <div className="flex flex-col justify-center flex-1 min-w-0">
                        <div className="flex items-center gap-2 text-xs text-[#466A68] font-medium bg-[#466A68]/5 w-fit px-2 py-1 rounded-md mb-2">
                          <span>Artikel</span>
                        </div>
                        <h4 className="font-bold text-[#382821] text-lg leading-tight group-hover:text-[#466A68] transition-colors line-clamp-2">
                          {post.title}
                        </h4>
                      </div>
                    </Link>
                  ))
                ) : (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className="flex gap-5 p-4 rounded-3xl bg-white/40 border border-white/60 backdrop-blur-sm animate-pulse"
                      >
                        <div className="w-28 h-28 shrink-0 rounded-2xl bg-gradient-to-br from-[#E8DDD4] to-[#D4BCAA]" />
                        <div className="flex flex-col justify-center flex-1">
                          <div className="w-16 h-4 bg-[#E8DDD4] rounded mb-3" />
                          <div className="w-full h-5 bg-[#E8DDD4] rounded mb-2" />
                          <div className="w-3/4 h-5 bg-[#D4BCAA] rounded" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </Container>
      </section>
    </>
  )
}
