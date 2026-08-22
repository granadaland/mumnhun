import { Container } from "@/components/layout"
import { Button } from "@/components/ui/button"
import { BenefitCard, FaqAccordion, VideoFacade, TestimonialsSection } from "@/components/home"
import { HeroImageSlider } from "@/components/hero-image-slider"
import { getPosts } from "@/lib/db/queries"
import {
  DEFAULT_OG_IMAGE,
  PRICING_PACKAGES,
  SERVICE_BENEFITS,
  TESTIMONIALS,
  WHATSAPP_LINK,
  WHATSAPP_NUMBER,
  SITE_URL,
  SITE_NAME,
  CONTACT_INFO,
  SOCIAL_URLS,
} from "@/lib/constants"
import Image from "next/image"
import Link from "next/link"
import {
  Star,
  ShieldCheck,
  ArrowRight,
  MessageCircle,
  Clock3,
  Sparkles,
  Check,
  Truck,
  HeartHandshake,
  ArrowUpRight,
  CheckCircle2,
  Calendar,
  MapPin,
  Building2,
} from "lucide-react"
import type { Metadata } from "next"

// SEO & GEO Enhanced FAQ Data
const SEO_GEO_FAQ_DATA = [
  {
    question: "Berapa biaya sewa freezer ASI bulanan di Mum 'n Hun?",
    answer:
      "Biaya sewa freezer ASI di Mum 'n Hun sangat terjangkau, mulai dari Rp160.000 untuk paket 1 bulan, Rp325.000 untuk paket 3 bulan (~Rp3.600/hari), dan Rp550.000 untuk paket 6 bulan (~Rp3.000/hari). Semua paket sewa tanpa deposit dan sudah bergaransi unit selama masa pemakaian.",
  },
  {
    question: "Apa keunggulan rental kulkas ASI khusus dibanding kulkas rumah tangga biasa?",
    answer:
      "Freezer khusus ASI memiliki sistem pendingin deep freeze dengan temperatur stabil (-20°C) yang khusus menjaga kandungan nutrisi, antibodi, dan enzim pada ASI perah (ASIP). Selain itu, freezer khusus ASI 100% bebas dari bau dan kontaminasi silang bahan makanan rumah tangga seperti daging mentah atau bumbu masakan.",
  },
  {
    question: "Area mana saja yang dijangkau pengiriman sewa freezer ASI terdekat di Jabodetabek?",
    answer:
      "Kami melayani pengiriman sewa freezer ASI dan rental kulkas ASI ke seluruh wilayah Jakarta (Jakarta Selatan, Barat, Timur, Pusat, Utara), Depok (Cinere, Sawangan, Margonda, Cimanggis), Tangerang & Tangerang Selatan (BSD City, Bintaro, Serpong, Ciputat, Alam Sutera), Bekasi, dan Bogor.",
  },
  {
    question: "Bagaimana standar higienis dan sterilisasi unit freezer sebelum dikirim?",
    answer:
      "Setiap unit freezer ASI Mum 'n Hun melalui proses pembersihan food-grade bertingkat dan sterilisasi menyeluruh sebelum diantar ke rumah pelanggan. Unit dipastikan dalam kondisi 100% bersih, steril, bebas bau, dan langsung siap dipakai.",
  },
  {
    question: "Berapa watt konsumsi listrik freezer ASI?",
    answer:
      "Freezer ASI kami sangat hemat energi dan ramah listrik rumah tangga, dengan daya operasional rata-rata hanya berkisar 100 - 120 Watt, sehingga tidak memberatkan tagihan listrik bulanan keluarga.",
  },
  {
    question: "Apakah ada garansi jika kulkas atau freezer ASI mengalami kendala teknis?",
    answer:
      "Ya, kami memberikan garansi unit 100% selama masa sewa. Jika terjadi penurunan performa pendingin atau kendala teknis yang bukan karena kelalaian, tim kami siap melakukan pengecekan dan penggantian unit cadangan dalam 24 jam kerja.",
  },
]

// Regional GEO Coverage Areas
const GEO_REGIONS = [
  {
    region: "DKI Jakarta",
    subregions: ["Jakarta Selatan", "Jakarta Barat", "Jakarta Timur", "Jakarta Pusat", "Jakarta Utara"],
    desc: "Layanan sewa freezer ASI Jakarta dengan pengantaran cepat langsung ke rumah.",
    highlight: "Antar Langsung",
  },
  {
    region: "Depok & Bogor",
    subregions: ["Cinere", "Sawangan", "Margonda", "Cimanggis", "Cibubur", "Bogor Kota"],
    desc: "Rental kulkas ASI Depok dan Bogor terdekat dengan respon cepat.",
    highlight: "Respon Cepat",
  },
  {
    region: "Tangerang & Tangsel",
    subregions: ["BSD City", "Bintaro Jaya", "Serpong", "Ciputat", "Alam Sutera", "Karawaci"],
    desc: "Sewa freezer ASI Tangerang Selatan & Bintaro siap pakai dan tanpa deposit.",
    highlight: "Tanpa Deposit",
  },
  {
    region: "Bekasi Raya",
    subregions: ["Bekasi Barat", "Bekasi Timur", "Galaxy", "Harapan Indah", "Tambun", "Cikarang"],
    desc: "Layanan rental kulkas ASI Bekasi bergaransi unit dan hemat listrik.",
    highlight: "Garansi Unit",
  },
]

const RENTAL_STEPS = [
  {
    step: "01",
    title: "Konsultasi Cepat via WhatsApp",
    description:
      "Hubungi customer service kami via WhatsApp. Sampaikan durasi sewa yang diinginkan serta alamat tujuan di area Jabodetabek.",
    icon: MessageCircle,
  },
  {
    step: "02",
    title: "Pilih Paket & Konfirmasi Jadwal",
    description:
      "Pilih paket sewa freezer ASI yang paling sesuai. Tim kami menjadwalkan pengiriman unit steril tepat waktu sesuai kebutuhan Anda.",
    icon: Calendar,
  },
  {
    step: "03",
    title: "Freezer Diantar & Siap Digunakan",
    description:
      "Unit rental kulkas ASI higienis diantar langsung ke rumah Anda, siap menjaga kesegaran nutrisi ASI perah Si Kecil.",
    icon: Truck,
  },
]

const rupiahFormatter = new Intl.NumberFormat("id-ID")
type LatestPost = Awaited<ReturnType<typeof getPosts>>["posts"][number]

function getPackageWhatsAppLink(duration: string, priceDisplay: string) {
  const message = `Halo Mum 'n Hun, saya ingin sewa freezer ASI paket ${duration} (${priceDisplay}). Mohon info ketersediaan unit dan jadwal pengiriman ke rumah saya. Terima kasih!`
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`
}

function getGeoWhatsAppLink(regionName: string) {
  const message = `Halo Mum 'n Hun, saya ingin konsultasi sewa freezer ASI / rental kulkas ASI untuk area ${regionName}. Mohon info jadwal antar dan paket sewanya.`
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`
}

// Homepage SEO metadata
export const metadata: Metadata = {
  title: { absolute: "Sewa Freezer ASI Jabodetabek | Mum 'n Hun" },
  description:
    "Layanan sewa freezer ASI & rental kulkas ASI terdekat di Jakarta, Depok, Tangerang, Bekasi & Bogor. 100% steril food-grade, hemat listrik, garansi unit 24 jam. Mulai Rp160.000/bulan.",
  keywords: [
    "Sewa Freezer ASI",
    "Rental Kulkas ASI",
    "Sewa Freezer ASI Jakarta",
    "Sewa Freezer ASI Terdekat",
    "Sewa Freezer ASI Bulanan",
    "Sewa Freezer ASI Jabodetabek",
    "Sewa Freezer ASI Depok",
    "Sewa Freezer ASI Tangerang",
    "Sewa Freezer ASI Bekasi",
    "Sewa Freezer ASI Bogor",
    "Harga Sewa Freezer ASI",
    "Penyimpanan ASI Perah",
  ],
  alternates: {
    canonical: `${SITE_URL}/`,
  },
  openGraph: {
    title: "Sewa Freezer ASI & Rental Kulkas ASI Jabodetabek | Mum 'n Hun",
    description:
      "Layanan sewa freezer ASI dan rental kulkas ASI bulanan terpercaya di Jabodetabek. Unit 100% steril food-grade, hemat listrik, garansi unit 24 jam, dan pengantaran langsung ke rumah.",
    url: `${SITE_URL}/`,
    type: "website",
    siteName: SITE_NAME,
    locale: "id_ID",
    images: [
      {
        url: DEFAULT_OG_IMAGE,
        width: 1200,
        height: 630,
        alt: "Sewa Freezer ASI & Rental Kulkas ASI Jabodetabek - Mum 'n Hun",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Sewa Freezer ASI & Rental Kulkas ASI | Mum 'n Hun",
    description:
      "Sewa freezer ASI terdekat area Jakarta, Depok, Tangerang, Bekasi, Bogor. Unit steril food-grade, bergaransi, respon cepat.",
    images: [DEFAULT_OG_IMAGE],
  },
}

export default async function HomePage() {
  const { posts: latestPosts } = await getPosts({ page: 1, limit: 5 })

  const averageRating = Number(
    (
      TESTIMONIALS.reduce((total, testimonial) => total + testimonial.rating, 0) /
      TESTIMONIALS.length
    ).toFixed(1)
  )

  const pricingOffers = PRICING_PACKAGES.map((pkg) => ({
    "@type": "Offer",
    name: `Paket Sewa Freezer ASI ${pkg.duration}`,
    price: pkg.price,
    priceCurrency: "IDR",
    availability: "https://schema.org/InStock",
    url: `${SITE_URL}/#pricing`,
    itemOffered: {
      "@type": "Service",
      name: `Sewa Freezer ASI ${pkg.duration}`,
      description: `Layanan rental kulkas ASI paket sewa ${pkg.duration} di area Jabodetabek.`,
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
    name: "Mum 'n Hun - Sewa Freezer ASI & Rental Kulkas ASI",
    url: SITE_URL,
    logo: `${SITE_URL}/logo.png`,
    image: [DEFAULT_OG_IMAGE],
    description:
      "Layanan sewa freezer ASI dan rental kulkas ASI terpercaya untuk wilayah Jakarta, Depok, Tangerang, Bekasi, dan Bogor sejak tahun 2010.",
    telephone: CONTACT_INFO.phone,
    email: CONTACT_INFO.email,
    priceRange: "Rp160.000 - Rp550.000",
    sameAs: [
      SOCIAL_URLS.instagram,
      SOCIAL_URLS.facebook,
      SOCIAL_URLS.youtube,
      SOCIAL_URLS.twitter,
    ],
    geo: {
      "@type": "GeoCoordinates",
      latitude: -6.2088,
      longitude: 106.8456,
    },
    areaServed: [
      { "@type": "City", name: "Jakarta Selatan" },
      { "@type": "City", name: "Jakarta Barat" },
      { "@type": "City", name: "Jakarta Timur" },
      { "@type": "City", name: "Jakarta Pusat" },
      { "@type": "City", name: "Jakarta Utara" },
      { "@type": "City", name: "Depok" },
      { "@type": "City", name: "Tangerang" },
      { "@type": "City", name: "Tangerang Selatan" },
      { "@type": "City", name: "Bekasi" },
      { "@type": "City", name: "Bogor" },
    ],
    openingHoursSpecification: [
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Saturday", "Sunday"],
        opens: "09:00",
        closes: "17:00",
      },
    ],
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
      addressRegion: "DKI Jakarta",
      addressCountry: "ID",
    },
  }

  const serviceJsonLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: "Sewa Freezer ASI & Rental Kulkas ASI",
    serviceType: "Penyewaan Freezer ASI Bulanan",
    provider: {
      "@type": "LocalBusiness",
      name: SITE_NAME,
      url: SITE_URL,
    },
    areaServed: [
      "Jakarta", "Bogor", "Depok", "Tangerang", "Bekasi",
      "Jakarta Selatan", "Jakarta Barat", "Jakarta Timur", "Jakarta Utara", "Jakarta Pusat",
      "BSD", "Bintaro", "Serpong", "Cinere", "Tangerang Selatan", "Ciputat",
    ],
    offers: pricingOffers,
  }

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: SEO_GEO_FAQ_DATA.map((faq) => ({
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
      {/* SECTION 1: HERO - Perfectly Balanced Fullscreen View     */}
      {/* ═══════════════════════════════════════════════════════ */}
      <section className="relative min-h-[calc(100svh-4.5rem)] lg:min-h-[calc(100vh-4rem)] pt-20 sm:pt-24 lg:pt-24 pb-8 sm:pb-10 lg:pb-12 px-4 sm:px-6 overflow-hidden bg-gradient-to-b from-[#FCFAF7] via-[#F7F3EE] to-white flex items-center justify-center">
        {/* Soft Background Accent Glows */}
        <div className="absolute top-16 left-1/2 -translate-x-1/2 w-[750px] h-[350px] bg-gradient-to-tr from-[#2E5650]/5 to-[#C87860]/5 rounded-full blur-[90px] pointer-events-none -z-10" />

        <Container className="relative z-10 w-full py-2 sm:py-4">
          <div className="flex flex-col lg:flex-row items-center gap-8 lg:gap-10 xl:gap-14">
            {/* LEFT: Hero Content */}
            <div className="flex-1 text-center lg:text-left space-y-4 sm:space-y-5 lg:space-y-5.5 w-full">
              {/* Trust Pill */}
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/90 border border-stone-200/80 shadow-2xs backdrop-blur-md">
                <span className="flex h-2 w-2 relative shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#2E5650] opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#2E5650]" />
                </span>
                <span className="text-[11px] sm:text-xs font-bold tracking-wide text-[#281E19]">
                  Jasa Sewa Freezer ASI Terpercaya Sejak 2010
                </span>
              </div>

              {/* Strict Keyword-Optimized H1 */}
              <div className="space-y-1.5">
                <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-[2.65rem] font-bold text-[#281E19] leading-[1.15] tracking-tight">
                  Sewa Freezer ASI & Rental Kulkas ASI Jabodetabek
                </h1>
                <p className="text-base sm:text-lg md:text-xl font-semibold text-[#2E5650]">
                  Solusi Higienis & Aman untuk Penyimpanan Stok ASI Perah
                </p>
              </div>

              {/* Description with LSI & Semantic Density */}
              <p className="text-xs sm:text-sm md:text-base text-[#382821]/75 leading-relaxed max-w-xl mx-auto lg:mx-0">
                Layanan <strong className="text-[#281E19] font-semibold">sewa freezer ASI terdekat</strong> untuk area Jakarta, Depok, Tangerang, Bekasi, dan Bogor. Unit steril food-grade, hemat listrik, suhu stabil (-20°C), dan siap antar langsung ke rumah Anda.
              </p>

              {/* CTA Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center gap-3 justify-center lg:justify-start pt-1.5 w-full">
                <Button
                  size="lg"
                  className="w-full sm:w-auto bg-gradient-to-r from-[#2E5650] to-[#244742] hover:from-[#244742] hover:to-[#1D3A36] text-white px-6 sm:px-7 py-3 sm:py-3.5 rounded-full font-bold text-sm sm:text-base shadow-md shadow-[#2E5650]/20 hover:shadow-lg hover:shadow-[#2E5650]/30 active:scale-[0.98] transition-all flex items-center justify-center gap-2 animate-shimmer"
                  asChild
                >
                  <Link
                    href={WHATSAPP_LINK}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Konsultasi sewa freezer ASI via WhatsApp"
                  >
                    <MessageCircle className="w-4 h-4 sm:w-5 sm:h-5 fill-white/20" />
                    <span>Sewa via WhatsApp</span>
                    <ArrowRight className="w-4 h-4 ml-0.5" />
                  </Link>
                </Button>

                <Button
                  size="lg"
                  variant="outline"
                  className="w-full sm:w-auto bg-white hover:bg-stone-50 border border-stone-300/90 text-[#281E19] px-6 sm:px-7 py-3 sm:py-3.5 rounded-full font-bold text-sm sm:text-base shadow-2xs hover:shadow-sm active:scale-[0.98] transition-all"
                  asChild
                >
                  <Link href="#pricing" aria-label="Lihat harga sewa freezer ASI bulanan">
                    Lihat Paket Bulanan
                  </Link>
                </Button>
              </div>

              {/* Micro Trust Indicators */}
              <div className="pt-1 flex flex-wrap items-center justify-center lg:justify-start gap-x-4 sm:gap-x-5 gap-y-1.5 text-xs text-[#382821]/75 font-medium">
                <div className="flex items-center gap-1.5">
                  <Clock3 className="w-3.5 h-3.5 text-[#2E5650] shrink-0" />
                  <span>Respon WA ±5 Menit</span>
                </div>
                <span className="text-stone-300 hidden sm:inline">•</span>
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#2E5650] shrink-0" />
                  <span>Garansi Unit 24 Jam</span>
                </div>
                <span className="text-stone-300 hidden sm:inline">•</span>
                <div className="flex items-center gap-1.5">
                  <HeartHandshake className="w-3.5 h-3.5 text-[#C87860] shrink-0" />
                  <span>5.000+ Ibu Terbantu</span>
                </div>
              </div>
            </div>

            {/* RIGHT: Hero Image Slider & Proof Elements */}
            <div className="flex-1 w-full max-w-md lg:max-w-[460px] xl:max-w-[500px] relative mx-auto">
              {/* Desktop Only Floating Rating Card */}
              <div className="hidden sm:flex absolute -top-3 -left-3 sm:-left-4 z-20 bg-white/95 backdrop-blur-xl px-3.5 py-2.5 rounded-2xl shadow-lg border border-white items-center gap-2.5">
                <div className="flex -space-x-1.5">
                  {["M", "N", "H"].map((initial, i) => (
                    <div
                      key={i}
                      className="w-6 h-6 rounded-full bg-gradient-to-br from-[#2E5650] to-[#1F3E3A] border-2 border-white flex items-center justify-center text-white text-[9px] font-bold"
                    >
                      {initial}
                    </div>
                  ))}
                </div>
                <div>
                  <div className="flex text-amber-400 gap-0.5">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Star key={i} className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <p className="text-[10px] font-bold text-[#281E19] mt-0.5">
                    4.9/5.0 dari 5.000+ Mums
                  </p>
                </div>
              </div>

              {/* Slider Component */}
              <HeroImageSlider />

              {/* Desktop Only Hygiene Badge */}
              <div className="hidden sm:flex absolute -bottom-3 -right-2 sm:-right-3 z-20 bg-white px-3.5 py-2.5 rounded-2xl shadow-lg border border-stone-200/80 items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#2E5650]/10 flex items-center justify-center text-[#2E5650]">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[9px] text-stone-400 uppercase tracking-wider font-bold">Standar Higienis</p>
                  <p className="text-[11px] font-bold text-[#281E19]">100% Steril Food Grade</p>
                </div>
              </div>

              {/* Mobile Only Clean Horizontal Badges (Underneath Slider, 0% Overlap) */}
              <div className="grid grid-cols-2 gap-2 mt-2.5 sm:hidden">
                <div className="bg-white/95 px-3 py-2 rounded-xl border border-stone-200/80 shadow-2xs flex items-center gap-2">
                  <div className="flex text-amber-400">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-[#281E19] leading-tight">4.9/5.0</p>
                    <p className="text-[10px] text-stone-400 leading-tight">5.000+ Mums</p>
                  </div>
                </div>

                <div className="bg-white/95 px-3 py-2 rounded-xl border border-stone-200/80 shadow-2xs flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-[#2E5650]/10 flex items-center justify-center text-[#2E5650] shrink-0">
                    <Sparkles className="w-3 h-3" />
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-[#281E19] leading-tight">100% Steril</p>
                    <p className="text-[10px] text-stone-400 leading-tight">Food Grade</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* ═══════════════════════════════════════════════════════ */}
      {/* SECTION 2: STATS & IMPACT BAR                           */}
      {/* ═══════════════════════════════════════════════════════ */}
      <section className="py-8 sm:py-10 bg-white border-y border-stone-200/70" aria-label="Statistik Layanan Rental Kulkas ASI">
        <Container>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 text-center">
            <div className="p-2 sm:p-3">
              <p className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-[#2E5650]">2010</p>
              <p className="text-xs sm:text-sm text-[#382821]/70 font-medium mt-1">Berdiri Sejak</p>
            </div>
            <div className="p-2 sm:p-3 border-l border-stone-200/60">
              <p className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-[#281E19]">5.000+</p>
              <p className="text-xs sm:text-sm text-[#382821]/70 font-medium mt-1">Ibu Menyusui</p>
            </div>
            <div className="p-2 sm:p-3 border-l-0 md:border-l border-stone-200/60">
              <p className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-[#C87860]">100%</p>
              <p className="text-xs sm:text-sm text-[#382821]/70 font-medium mt-1">Garansi Steril</p>
            </div>
            <div className="p-2 sm:p-3 border-l border-stone-200/60">
              <p className="text-base sm:text-xl md:text-2xl lg:text-3xl font-bold text-[#281E19] tracking-tight">Jabodetabek</p>
              <p className="text-xs sm:text-sm text-[#382821]/70 font-medium mt-1">Area Antar</p>
            </div>
          </div>
        </Container>
      </section>

      {/* ═══════════════════════════════════════════════════════ */}
      {/* SECTION 3: GEO COVERAGE HUB (LOCAL SEO TARGETING)       */}
      {/* ═══════════════════════════════════════════════════════ */}
      <section className="py-16 md:py-24 px-4 sm:px-6 bg-[#FCFAF7] relative" aria-labelledby="geo-coverage-heading">
        <Container>
          <div className="text-center max-w-3xl mx-auto mb-14">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#2E5650]/10 text-[#2E5650] text-xs font-bold uppercase tracking-wider mb-3">
              <MapPin className="w-3.5 h-3.5" />
              Cakupan Wilayah Pengantaran
            </div>
            <h2 id="geo-coverage-heading" className="text-3xl md:text-4xl font-bold text-[#281E19] tracking-tight">
              Area Layanan Sewa Freezer ASI Jakarta & Jabodetabek
            </h2>
            <p className="text-sm md:text-base text-[#382821]/75 mt-3 leading-relaxed">
              Kami melayani pengiriman rental kulkas ASI langsung ke depan pintu rumah Anda di seluruh wilayah Jakarta, Depok, Tangerang, Tangerang Selatan, Bekasi, dan Bogor.
            </p>
          </div>

          {/* 4 GEO Region Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {GEO_REGIONS.map((geo) => (
              <div
                key={geo.region}
                className="flex flex-col p-6 rounded-3xl bg-white border border-stone-200/80 shadow-xs hover:shadow-lg hover:border-[#2E5650]/40 transition-all duration-300 group"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 rounded-2xl bg-[#2E5650]/10 text-[#2E5650] flex items-center justify-center font-bold">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-[#FCFAF7] text-[#C87860] border border-[#C87860]/20">
                    {geo.highlight}
                  </span>
                </div>

                <h3 className="text-lg font-bold text-[#281E19] group-hover:text-[#2E5650] transition-colors mb-2">
                  {geo.region}
                </h3>
                <p className="text-xs text-[#382821]/70 leading-relaxed mb-4">
                  {geo.desc}
                </p>

                {/* Subregions tags */}
                <div className="flex flex-wrap gap-1.5 mt-auto pt-4 border-t border-stone-100">
                  {geo.subregions.map((sub) => (
                    <span
                      key={sub}
                      className="px-2 py-0.5 text-[11px] font-medium rounded-md bg-[#FCFAF7] text-[#382821]/80 border border-stone-200/60"
                    >
                      {sub}
                    </span>
                  ))}
                </div>

                {/* WhatsApp button per region */}
                <Link
                  href={getGeoWhatsAppLink(geo.region)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 pt-2 text-xs font-bold text-[#2E5650] hover:text-[#1D3A36] flex items-center justify-between group/link"
                >
                  <span>Cek jadwal kirim ke {geo.region}</span>
                  <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover/link:translate-x-1" />
                </Link>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* ═══════════════════════════════════════════════════════ */}
      {/* SECTION 4: TENTANG KAMI & VIDEO PROFILE                */}
      {/* ═══════════════════════════════════════════════════════ */}
      <section className="py-14 sm:py-20 md:py-28 px-4 sm:px-6 relative overflow-hidden bg-gradient-to-b from-white via-[#FAF7F4] to-white" aria-labelledby="about-heading">
        {/* Subtle Ambient Decorative Glows */}
        <div className="absolute top-1/2 left-0 w-72 h-72 bg-[#E8DDD4]/40 rounded-full blur-3xl -translate-y-1/2 -z-10 pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-80 h-80 bg-[#2E5650]/5 rounded-full blur-3xl -z-10 pointer-events-none" />

        <Container>
          {/* Mobile Only Section Header: Heading -> Video -> Description */}
          <div className="text-center lg:hidden space-y-2 mb-6 sm:mb-8">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#C87860]/10 text-[#C87860] text-xs font-bold uppercase tracking-wider">
              Layanan Terpercaya Sejak 2010
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-[#281E19] leading-snug tracking-tight">
              Spesialis Jasa Sewa Freezer ASI & Rental Kulkas ASI
            </h2>
          </div>

          <div className="flex flex-col lg:flex-row items-center gap-8 sm:gap-12 lg:gap-16">
            {/* Left: Enlarged Video Player with Decorative Pattern & Warm Outline */}
            <div className="w-full lg:flex-[1.2] relative group">
              {/* Outer Decorative Background Card with Warm Outline */}
              <div className="absolute -inset-2.5 sm:-inset-4 bg-gradient-to-br from-[#E8DDD4]/90 via-[#E4D2C3]/80 to-[#D4BCAA]/90 rounded-2xl md:rounded-[3rem] -z-10 rotate-1 sm:rotate-2 group-hover:rotate-0 transition-transform duration-500 shadow-xl shadow-[#382821]/5 border border-[#C87860]/30" />

              {/* Second Outer Accent Frame with Subtle Dashed Brown Motif */}
              <div className="absolute -inset-4 sm:-inset-6 rounded-2xl md:rounded-[3.2rem] border-2 border-dashed border-[#C87860]/20 -z-20 rotate-[-1deg] group-hover:rotate-0 transition-transform duration-500 pointer-events-none hidden sm:block" />

              {/* Corner Dot Matrix Pattern Motif */}
              <div
                className="absolute -top-4 -left-4 w-24 h-24 opacity-25 -z-10 pointer-events-none hidden sm:block"
                style={{
                  backgroundImage: "radial-gradient(#C87860 1.5px, transparent 1.5px)",
                  backgroundSize: "10px 10px",
                }}
              />

              {/* YouTube Video Facade - Enlarged & Clean */}
              <VideoFacade
                videoId="N9FIL22ro7I"
                title="Profil Layanan Sewa Freezer ASI Mum 'n Hun"
              />
            </div>

            {/* Right: Sincere Brand Story & Description */}
            <div className="w-full lg:flex-1 space-y-4 sm:space-y-5 text-left">
              {/* Desktop Only Heading */}
              <div className="hidden lg:block space-y-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#C87860]/10 text-[#C87860] text-xs font-bold uppercase tracking-wider">
                  Layanan Terpercaya Sejak 2010
                </div>
                <h2 id="about-heading" className="text-3xl md:text-4xl font-bold text-[#281E19] leading-snug tracking-tight">
                  Spesialis Jasa Sewa Freezer ASI & Rental Kulkas ASI
                </h2>
              </div>

              {/* Description */}
              <div className="space-y-3 text-sm md:text-base text-[#382821]/75 leading-relaxed">
                <p>
                  Kami memahami betapa berharganya setiap tetes ASI bagi tumbuh kembang Si Kecil. Sebagai penyedia layanan <strong className="text-[#281E19] font-semibold">sewa freezer ASI Jakarta & Jabodetabek</strong> terpercaya, Mum &apos;n Hun menyediakan unit freezer khusus yang dirancang untuk menjaga nutrisi dan kesegaran ASI perah (ASIP) dalam jangka panjang.
                </p>
                <p>
                  Lebih dari <strong className="text-[#281E19] font-semibold">5.000+ ibu menyusui</strong> telah mempercayakan penyimpanan ASI perah mereka kepada kami karena unit selalu steril, hemat daya listrik, dan didukung garansi penggantian unit cepat.
                </p>
              </div>

              {/* Checklist */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 text-xs sm:text-sm font-medium text-[#281E19]">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#2E5650] shrink-0" />
                  <span>Bebas bau & steril food-grade</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#2E5650] shrink-0" />
                  <span>Hemat konsumsi listrik</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#2E5650] shrink-0" />
                  <span>Layanan antar & jemput unit</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#2E5650] shrink-0" />
                  <span>Respon admin ramah & solutif</span>
                </div>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* ═══════════════════════════════════════════════════════ */}
      {/* SECTION 5: CARA SEWA - 3 LANGKAH MUDAH                 */}
      {/* ═══════════════════════════════════════════════════════ */}
      <section className="py-16 md:py-24 px-4 sm:px-6 bg-white" aria-labelledby="cara-sewa-heading">
        <Container>
          <div className="text-center max-w-2xl mx-auto mb-14">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#2E5650]/10 text-[#2E5650] text-xs font-bold uppercase tracking-wider mb-3">
              Proses Cepat & Praktis
            </div>
            <h2 id="cara-sewa-heading" className="text-3xl md:text-4xl font-bold text-[#281E19] tracking-tight">
              Cara Mudah Sewa Freezer ASI dalam 3 Langkah
            </h2>
            <p className="text-sm md:text-base text-[#382821]/70 mt-3 leading-relaxed">
              Proses pemesanan rental kulkas ASI yang transparan dan tanpa ribet agar Mums bisa fokus memberikan yang terbaik untuk Si Kecil.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 lg:gap-8 relative">
            {RENTAL_STEPS.map((step) => {
              const Icon = step.icon
              return (
                <div
                  key={step.step}
                  className="relative flex flex-col p-7 sm:p-8 rounded-3xl bg-[#FCFAF7] border border-stone-200/80 shadow-[0_4px_20px_rgba(56,40,33,0.03)] hover:shadow-lg hover:border-[#2E5650]/30 transition-all duration-300"
                >
                  <div className="flex items-center justify-between mb-6">
                    <div className="w-12 h-12 rounded-2xl bg-[#2E5650]/10 text-[#2E5650] flex items-center justify-center font-bold">
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className="text-2xl font-black text-stone-200 font-serif">
                      {step.step}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-[#281E19] mb-2 leading-snug">
                    {step.title}
                  </h3>
                  <p className="text-sm text-[#382821]/70 leading-relaxed">
                    {step.description}
                  </p>
                </div>
              )
            })}
          </div>

          <div className="mt-10 text-center">
            <Link
              href={WHATSAPP_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm font-bold text-[#2E5650] hover:text-[#1D3A36] underline underline-offset-4"
            >
              <span>Mulai konsultasi sewa via WhatsApp sekarang</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </Container>
      </section>

      {/* ═══════════════════════════════════════════════════════ */}
      {/* SECTION 6: BENEFITS - 6 Keunggulan Layanan             */}
      {/* ═══════════════════════════════════════════════════════ */}
      <section className="py-16 md:py-24 px-4 sm:px-6 bg-[#FCFAF7]" aria-labelledby="benefits-heading">
        <Container>
          <div className="text-center max-w-2xl mx-auto mb-14">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#2E5650]/10 text-[#2E5650] text-xs font-bold uppercase tracking-wider mb-3">
              Keunggulan Kami
            </div>
            <h2 id="benefits-heading" className="text-3xl md:text-4xl font-bold text-[#281E19] tracking-tight">
              Kenapa Memilih Rental Kulkas ASI di Mum &apos;n Hun?
            </h2>
            <p className="text-sm md:text-base text-[#382821]/70 mt-3 leading-relaxed">
              Standar kebersihan tertinggi dan kepuasan pelanggan adalah komitmen utama kami.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
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
      {/* SECTION 7: PRICING - Pilihan Paket Sewa Bulanan        */}
      {/* ═══════════════════════════════════════════════════════ */}
      <section id="pricing" className="py-20 md:py-28 px-4 sm:px-6 bg-white relative" aria-labelledby="pricing-heading">
        <Container>
          <div className="text-center max-w-2xl mx-auto mb-16">
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#C87860]/10 text-[#C87860] text-xs font-bold uppercase tracking-wider mb-3">
              Tarif Transparan
            </div>
            <h2 id="pricing-heading" className="text-3xl md:text-5xl font-bold text-[#281E19] tracking-tight">
              Pilihan Paket Sewa Freezer ASI Bulanan
            </h2>
            <p className="text-sm md:text-base text-[#382821]/70 mt-3 leading-relaxed">
              Biaya sewa jelas tanpa deposit. Pilih paket yang paling pas dengan masa menyusui buah hati Anda.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 items-stretch max-w-5xl mx-auto">
            {PRICING_PACKAGES.map((pkg) => {
              const isPopular = pkg.popular
              const days = pkg.duration.includes("1") ? 30 : pkg.duration.includes("3") ? 90 : 180
              const dailyPrice = Math.round(pkg.price / days)

              return (
                <div
                  key={pkg.id}
                  className={`relative flex flex-col rounded-3xl p-7 sm:p-8 transition-all duration-300 ${
                    isPopular
                      ? "bg-[#FCFAF7] border-2 border-[#2E5650] shadow-xl shadow-[#2E5650]/10 ring-4 ring-[#2E5650]/5 md:-translate-y-2"
                      : "bg-white border border-stone-200/80 shadow-sm hover:border-[#2E5650]/40 hover:shadow-lg"
                  }`}
                >
                  {/* Popular Tag */}
                  {isPopular && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-[#2E5650] to-[#244742] text-white text-xs font-bold px-4 py-1 rounded-full shadow-md">
                      ⭐ Paling Banyak Dipilih
                    </div>
                  )}

                  {/* Header Tier */}
                  <div className="text-center pb-6 border-b border-stone-200/70">
                    <p className="text-xs font-bold uppercase tracking-widest text-[#382821]/60 mb-2">
                      Paket Sewa {pkg.duration}
                    </p>
                    <div className="flex items-baseline justify-center gap-1">
                      <span className="text-sm font-semibold text-stone-400">Rp</span>
                      <span className="text-4xl font-extrabold text-[#281E19] tracking-tight">
                        {rupiahFormatter.format(pkg.price)}
                      </span>
                    </div>
                    <p className="text-xs text-[#2E5650] font-semibold mt-1.5">
                      ~Rp {rupiahFormatter.format(dailyPrice)} / hari
                    </p>
                  </div>

                  {/* Feature list */}
                  <ul className="space-y-3 py-6 flex-1 text-xs sm:text-sm text-[#382821]/80">
                    {pkg.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2.5">
                        <div className="w-4 h-4 rounded-full bg-[#2E5650]/10 text-[#2E5650] flex items-center justify-center mt-0.5 shrink-0">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </div>
                        <span className="leading-snug">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {/* WhatsApp CTA Button */}
                  <Button
                    className={`w-full py-3.5 rounded-2xl font-bold text-sm transition-all active:scale-[0.98] ${
                      isPopular
                        ? "bg-gradient-to-r from-[#2E5650] to-[#244742] hover:from-[#244742] hover:to-[#1D3A36] text-white shadow-md shadow-[#2E5650]/25"
                        : "bg-stone-100 hover:bg-[#2E5650] text-[#281E19] hover:text-white"
                    }`}
                    asChild
                  >
                    <Link
                      href={getPackageWhatsAppLink(pkg.duration, pkg.priceDisplay)}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Pilih paket sewa ${pkg.duration} via WhatsApp`}
                    >
                      <MessageCircle className="w-4 h-4 mr-2" />
                      Pilih Paket {pkg.duration}
                    </Link>
                  </Button>
                </div>
              )
            })}
          </div>
        </Container>
      </section>

      {/* ═══════════════════════════════════════════════════════ */}
      {/* SECTION 8: TESTIMONIALS                                */}
      {/* ═══════════════════════════════════════════════════════ */}
      <TestimonialsSection />

      {/* ═══════════════════════════════════════════════════════ */}
      {/* SECTION 9: FAQ & LATEST ARTICLES (SEO ENRICHED)        */}
      {/* ═══════════════════════════════════════════════════════ */}
      <section className="py-20 md:py-28 px-4 sm:px-6 bg-white" aria-labelledby="faq-latest-heading">
        <Container>
          <div className="grid lg:grid-cols-12 gap-12 lg:gap-16">
            {/* Left: FAQ (7 Cols) */}
            <div className="lg:col-span-7 space-y-6">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#2E5650]/10 text-[#2E5650] text-xs font-bold uppercase tracking-wider mb-2">
                  Tanya Jawab Lengkap
                </div>
                <h2 id="faq-latest-heading" className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#281E19] tracking-tight">
                  Tanya Jawab Seputar Sewa Freezer ASI
                </h2>
              </div>
              <FaqAccordion faqs={SEO_GEO_FAQ_DATA} />
            </div>

            {/* Right: Latest Articles (5 Cols) */}
            <div className="lg:col-span-5 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#C87860]/10 text-[#C87860] text-xs font-bold uppercase tracking-wider mb-2">
                    Edukasi & Tips ASIP
                  </div>
                  <h3 className="text-2xl font-bold text-[#281E19] tracking-tight">
                    Artikel & Panduan Terbaru
                  </h3>
                </div>
                <Link
                  href="/blog"
                  className="text-xs font-bold text-[#2E5650] hover:text-[#1D3A36] flex items-center gap-1 group"
                >
                  Lihat Semua
                  <ArrowUpRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </Link>
              </div>

              <div className="space-y-3">
                {latestPosts.length > 0 ? (
                  latestPosts.slice(0, 5).map((post: LatestPost) => (
                    <Link
                      key={post.id}
                      href={`/${post.slug}`}
                      className="group flex gap-3.5 p-3 rounded-2xl bg-[#FCFAF7] hover:bg-white border border-stone-200/70 hover:border-stone-300 hover:shadow-md transition-all duration-200"
                    >
                      <div className="w-18 h-18 sm:w-20 sm:h-20 shrink-0 rounded-xl overflow-hidden bg-stone-200 relative">
                        <Image
                          src={
                            post.featuredImage ||
                            "https://res.cloudinary.com/dvqcs0zqi/image/upload/v1769914192/Sewa_Freezer_ASI_Jakarta_g6mjoz.webp"
                          }
                          alt={post.title}
                          fill
                          sizes="80px"
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                        />
                      </div>
                      <div className="flex flex-col justify-center flex-1 min-w-0">
                        <h4 className="font-bold text-[#281E19] text-xs sm:text-sm leading-snug group-hover:text-[#2E5650] transition-colors line-clamp-2">
                          {post.title}
                        </h4>
                        <p className="text-[11px] text-stone-400 mt-1 flex items-center gap-1">
                          <Clock3 className="w-3 h-3" />
                          <span>Baca artikel lengkap</span>
                        </p>
                      </div>
                    </Link>
                  ))
                ) : (
                  <div className="p-6 rounded-2xl bg-stone-50 text-center text-sm text-stone-500">
                    Artikel sedang diperbarui.
                  </div>
                )}
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* ═══════════════════════════════════════════════════════ */}
      {/* SECTION 10: BOTTOM CONVERSION BANNER                    */}
      {/* ═══════════════════════════════════════════════════════ */}
      <section className="py-16 md:py-20 px-4 sm:px-6 bg-gradient-to-br from-[#2E5650] to-[#1F3E3A] text-white relative overflow-hidden" aria-labelledby="cta-banner-heading">
        <Container className="relative z-10 text-center max-w-3xl mx-auto space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md text-xs font-semibold text-[#B0D5D0] border border-white/10 mx-auto">
            <Sparkles className="w-3.5 h-3.5 text-[#F9D0C3]" />
            Layanan Pengantaran Cepat Seluruh Jabodetabek
          </div>
          <h2 id="cta-banner-heading" className="text-2xl sm:text-4xl md:text-5xl font-bold tracking-tight text-white leading-tight">
            Butuh Sewa Freezer ASI Cepat & Siap Pakai?
          </h2>
          <p className="text-sm sm:text-base text-white/80 leading-relaxed max-w-xl mx-auto">
            Konsultasikan kebutuhan Anda sekarang dengan tim {SITE_NAME}. Unit higienis food-grade, bersih, dan bergaransi siap diantar langsung ke rumah Anda di Jabodetabek.
          </p>
          <div className="pt-2 flex justify-center items-center w-full">
            <Button
              size="lg"
              className="w-full sm:w-auto bg-white text-[#2E5650] hover:bg-[#FCFAF7] hover:text-[#1F3E3A] px-8 sm:px-10 py-4 rounded-full font-bold text-base shadow-xl active:scale-[0.98] transition-all flex items-center justify-center gap-2 mx-auto"
              asChild
            >
              <Link
                href={WHATSAPP_LINK}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Hubungi WhatsApp Mum 'n Hun sekarang"
              >
                <MessageCircle className="w-5 h-5 fill-[#2E5650]/20" />
                <span>Hubungi Sekarang</span>
              </Link>
            </Button>
          </div>
        </Container>
      </section>
    </>
  )
}
