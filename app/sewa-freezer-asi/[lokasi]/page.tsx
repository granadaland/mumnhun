import { notFound } from "next/navigation"
import type { Metadata } from "next"
import Link from "next/link"
import { Container } from "@/components/layout"
import { Button } from "@/components/ui/button"
import { FaqAccordion } from "@/components/home"
import { LOCATIONS, getLocation, getOtherLocations } from "@/lib/data/locations"
import {
  SITE_URL,
  SITE_NAME,
  DEFAULT_OG_IMAGE,
  WHATSAPP_NUMBER,
  PRICING_PACKAGES,
  CONTACT_INFO,
} from "@/lib/constants"
import {
  MapPin,
  MessageCircle,
  ArrowRight,
  ArrowLeft,
  Truck,
  Clock3,
  Check,
  Quote,
  Building2,
} from "lucide-react"

const rupiahFormatter = new Intl.NumberFormat("id-ID")

// Pre-render semua halaman lokasi saat build (SSG). Menambah lokasi cukup
// dengan mengedit lib/data/locations.ts.
export function generateStaticParams() {
  return LOCATIONS.map((location) => ({ lokasi: location.slug }))
}

// Metadata UNIK per lokasi. Canonical berbeda tiap halaman mencegah duplikat,
// dan judul/keyword spesifik-kota mencegah kanibalisasi dengan halaman pilar.
export async function generateMetadata(
  { params }: { params: Promise<{ lokasi: string }> }
): Promise<Metadata> {
  const { lokasi } = await params
  const location = getLocation(lokasi)

  if (!location) {
    return {
      title: "Area Tidak Ditemukan",
      robots: { index: false, follow: false },
    }
  }

  const startingPrice = Math.min(...PRICING_PACKAGES.map((pkg) => pkg.price))
  const title = `Sewa Freezer ASI ${location.city} | Antar Cepat & Bergaransi - ${SITE_NAME}`
  const description = `Sewa freezer ASI di ${location.city} mulai Rp${rupiahFormatter.format(
    startingPrice
  )}/bulan. Antar ${location.deliveryEstimate}, unit steril food-grade, tanpa deposit. Melayani ${location.coverageAreas
    .slice(0, 3)
    .join(", ")}, dan sekitarnya.`
  const url = `${SITE_URL}/sewa-freezer-asi/${location.slug}`

  return {
    title: { absolute: title },
    description,
    keywords: [
      `Sewa Freezer ASI ${location.city}`,
      `Rental Kulkas ASI ${location.city}`,
      `Sewa Freezer ASI Terdekat ${location.city}`,
      `Harga Sewa Freezer ASI ${location.city}`,
    ],
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      type: "website",
      siteName: SITE_NAME,
      locale: "id_ID",
      images: [
        {
          url: DEFAULT_OG_IMAGE,
          width: 1200,
          height: 630,
          alt: `Sewa Freezer ASI ${location.city} - ${SITE_NAME}`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [DEFAULT_OG_IMAGE],
    },
  }
}

export default async function LokasiPage(
  { params }: { params: Promise<{ lokasi: string }> }
) {
  const { lokasi } = await params
  const location = getLocation(lokasi)

  if (!location) {
    notFound()
  }

  // Narrow once so nested closures below don't need a non-null assertion.
  const city = location.city
  const url = `${SITE_URL}/sewa-freezer-asi/${location.slug}`
  const otherLocations = getOtherLocations(location.slug, 4)
  const startingPrice = Math.min(...PRICING_PACKAGES.map((pkg) => pkg.price))

  const waLink = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
    `Halo Mum 'n Hun, saya mau sewa freezer ASI di ${city} dari mumnhun.id. Mohon info jadwal antar & paket sewanya.`
  )}`

  function getPackageWhatsAppLink(duration: string) {
    const message = `Halo Mum 'n Hun, saya ingin sewa freezer ASI paket ${duration} untuk area ${city} dari mumnhun.id. Mohon info ketersediaan unit dan jadwal pengiriman.`
    return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`
  }

  // Schema Service dengan areaServed SPESIFIK lokasi ini.
  const serviceJsonLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: `Sewa Freezer ASI ${location.city}`,
    serviceType: "Penyewaan Freezer ASI Bulanan",
    description: location.intro,
    areaServed: [
      { "@type": "City", name: location.city },
      ...location.coverageAreas.map((area) => ({ "@type": "Place", name: area })),
    ],
    provider: {
      "@type": "LocalBusiness",
      name: SITE_NAME,
      url: SITE_URL,
      telephone: CONTACT_INFO.phone,
      email: CONTACT_INFO.email,
      geo: {
        "@type": "GeoCoordinates",
        latitude: location.geo.lat,
        longitude: location.geo.lng,
      },
    },
    offers: PRICING_PACKAGES.map((pkg) => ({
      "@type": "Offer",
      name: `Paket Sewa Freezer ASI ${pkg.duration} - ${location.city}`,
      price: pkg.price,
      priceCurrency: "IDR",
      availability: "https://schema.org/InStock",
      url,
    })),
  }

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: location.faq.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: { "@type": "Answer", text: faq.answer },
    })),
  }

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Sewa Freezer ASI", item: `${SITE_URL}/sewa-freezer-asi` },
      { "@type": "ListItem", position: 3, name: location.city, item: url },
    ],
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      {/* Breadcrumb */}
      <section className="pt-28 pb-4 px-4 sm:px-6 border-b border-stone-200/70 bg-[#FCFAF7]">
        <Container>
          <div className="flex items-center gap-2 text-sm text-[#382821]/60">
            <Link href="/" className="hover:text-[#2E5650] transition-colors">
              Home
            </Link>
            <span>/</span>
            <Link href="/sewa-freezer-asi" className="hover:text-[#2E5650] transition-colors">
              Sewa Freezer ASI
            </Link>
            <span>/</span>
            <span className="text-[#281E19]">{location.city}</span>
          </div>
        </Container>
      </section>

      {/* Hero lokasi */}
      <section className="py-12 md:py-16 px-4 sm:px-6 bg-gradient-to-b from-[#FCFAF7] to-white">
        <Container>
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#2E5650]/10 text-[#2E5650] text-xs font-bold uppercase tracking-wider mb-4">
              <MapPin className="w-3.5 h-3.5" />
              {location.region}
            </div>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-[#281E19] tracking-tight leading-tight">
              Sewa Freezer ASI {location.city}
            </h1>
            <p className="text-sm md:text-base text-[#382821]/75 mt-4 leading-relaxed">
              {location.intro}
            </p>

            <div className="flex flex-col sm:flex-row gap-3 mt-6">
              <Button
                size="lg"
                className="bg-gradient-to-r from-[#2E5650] to-[#244742] hover:from-[#244742] hover:to-[#1D3A36] text-white rounded-full font-bold"
                asChild
              >
                <Link href={waLink} target="_blank" rel="noopener noreferrer">
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Sewa untuk {location.city}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </Button>
            </div>
          </div>
        </Container>
      </section>

      {/* Info antar & area cakupan (konten unik) */}
      <section className="py-8 md:py-12 px-4 sm:px-6 bg-white">
        <Container>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-3xl bg-[#FCFAF7] border border-stone-200/80">
              <div className="w-10 h-10 rounded-2xl bg-[#2E5650]/10 text-[#2E5650] flex items-center justify-center mb-4">
                <Truck className="w-5 h-5" />
              </div>
              <h2 className="text-base font-bold text-[#281E19] mb-1">Estimasi Pengiriman</h2>
              <p className="text-sm text-[#382821]/70 leading-relaxed">{location.deliveryEstimate}</p>
            </div>
            <div className="p-6 rounded-3xl bg-[#FCFAF7] border border-stone-200/80">
              <div className="w-10 h-10 rounded-2xl bg-[#2E5650]/10 text-[#2E5650] flex items-center justify-center mb-4">
                <MapPin className="w-5 h-5" />
              </div>
              <h2 className="text-base font-bold text-[#281E19] mb-1">Biaya Antar</h2>
              <p className="text-sm text-[#382821]/70 leading-relaxed">{location.deliveryFee}</p>
            </div>
            <div className="p-6 rounded-3xl bg-[#FCFAF7] border border-stone-200/80">
              <div className="w-10 h-10 rounded-2xl bg-[#2E5650]/10 text-[#2E5650] flex items-center justify-center mb-4">
                <Clock3 className="w-5 h-5" />
              </div>
              <h2 className="text-base font-bold text-[#281E19] mb-1">Mulai Dari</h2>
              <p className="text-sm text-[#382821]/70 leading-relaxed">
                Rp{rupiahFormatter.format(startingPrice)}/bulan, tanpa deposit, bergaransi unit.
              </p>
            </div>
          </div>

          {/* Area cakupan spesifik */}
          <div className="mt-8">
            <h2 className="text-xl md:text-2xl font-bold text-[#281E19] mb-4 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-[#2E5650]" />
              Area yang Dilayani di {location.city}
            </h2>
            <div className="flex flex-wrap gap-2">
              {location.coverageAreas.map((area) => (
                <span
                  key={area}
                  className="px-3 py-1.5 text-sm font-medium rounded-lg bg-[#FCFAF7] text-[#382821]/85 border border-stone-200/70"
                >
                  {area}
                </span>
              ))}
            </div>
            {location.landmarks && location.landmarks.length > 0 && (
              <p className="text-xs text-[#382821]/60 mt-3">
                Patokan: {location.landmarks.join(" • ")}
              </p>
            )}
          </div>
        </Container>
      </section>

      {/* Paket harga */}
      <section className="py-12 md:py-16 px-4 sm:px-6 bg-[#FCFAF7]" aria-labelledby="paket-heading">
        <Container>
          <h2 id="paket-heading" className="text-2xl md:text-3xl font-bold text-[#281E19] tracking-tight mb-8">
            Paket Sewa Freezer ASI di {location.city}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl">
            {PRICING_PACKAGES.map((pkg) => {
              const days = pkg.duration.includes("1") ? 30 : pkg.duration.includes("3") ? 90 : 180
              const dailyPrice = Math.round(pkg.price / days)
              return (
                <div
                  key={pkg.id}
                  className={`flex flex-col rounded-3xl p-6 sm:p-7 transition-all ${
                    pkg.popular
                      ? "bg-white border-2 border-[#2E5650] shadow-lg"
                      : "bg-white border border-stone-200/80 shadow-sm"
                  }`}
                >
                  <p className="text-xs font-bold uppercase tracking-widest text-[#382821]/60 mb-2">
                    Paket {pkg.duration}
                  </p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-sm font-semibold text-stone-400">Rp</span>
                    <span className="text-3xl font-extrabold text-[#281E19]">
                      {rupiahFormatter.format(pkg.price)}
                    </span>
                  </div>
                  <p className="text-xs text-[#2E5650] font-semibold mt-1">
                    ~Rp{rupiahFormatter.format(dailyPrice)}/hari
                  </p>
                  <ul className="space-y-2.5 py-5 flex-1 text-sm text-[#382821]/80">
                    {pkg.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2.5">
                        <span className="w-4 h-4 rounded-full bg-[#2E5650]/10 text-[#2E5650] flex items-center justify-center mt-0.5 shrink-0">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </span>
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    className={`w-full rounded-2xl font-bold ${
                      pkg.popular
                        ? "bg-gradient-to-r from-[#2E5650] to-[#244742] hover:from-[#244742] hover:to-[#1D3A36] text-white"
                        : "bg-stone-100 hover:bg-[#2E5650] text-[#281E19] hover:text-white"
                    }`}
                    asChild
                  >
                    <Link
                      href={getPackageWhatsAppLink(pkg.duration)}
                      target="_blank"
                      rel="noopener noreferrer"
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

      {/* Testimoni lokal (konten unik) */}
      {location.localTestimonial && (
        <section className="py-12 md:py-16 px-4 sm:px-6 bg-white">
          <Container>
            <div className="max-w-3xl p-7 md:p-8 rounded-3xl bg-[#FCFAF7] border border-stone-200/80">
              <Quote className="w-8 h-8 text-[#2E5650]/40 mb-3" />
              <p className="text-base md:text-lg text-[#281E19] leading-relaxed italic">
                &ldquo;{location.localTestimonial.text}&rdquo;
              </p>
              <p className="text-sm font-bold text-[#2E5650] mt-4">
                — {location.localTestimonial.name}, {location.localTestimonial.area}
              </p>
            </div>
          </Container>
        </section>
      )}

      {/* FAQ spesifik lokasi */}
      <section className="py-12 md:py-16 px-4 sm:px-6 bg-[#FCFAF7]" aria-labelledby="faq-heading">
        <Container>
          <div className="max-w-3xl">
            <h2 id="faq-heading" className="text-2xl md:text-3xl font-bold text-[#281E19] tracking-tight mb-6">
              Tanya Jawab Sewa Freezer ASI {location.city}
            </h2>
            <FaqAccordion faqs={location.faq} />
          </div>
        </Container>
      </section>

      {/* Internal linking: pilar + lokasi tetangga */}
      <section className="py-12 md:py-16 px-4 sm:px-6 bg-white">
        <Container>
          <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
            <h2 className="text-xl md:text-2xl font-bold text-[#281E19] tracking-tight">
              Area Layanan Lainnya
            </h2>
            <Link
              href="/sewa-freezer-asi"
              className="text-sm font-bold text-[#2E5650] hover:text-[#1D3A36] flex items-center gap-1"
            >
              Lihat semua area
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {otherLocations.map((other) => (
              <Link
                key={other.slug}
                href={`/sewa-freezer-asi/${other.slug}`}
                className="group flex items-center justify-between gap-2 p-4 rounded-2xl bg-[#FCFAF7] border border-stone-200/70 hover:border-[#2E5650]/40 hover:shadow-md transition-all"
              >
                <span className="text-sm font-bold text-[#281E19] group-hover:text-[#2E5650] transition-colors">
                  {other.city}
                </span>
                <ArrowRight className="w-3.5 h-3.5 text-[#2E5650] transition-transform group-hover:translate-x-1" />
              </Link>
            ))}
          </div>

          <div className="mt-10">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm font-semibold text-[#382821]/70 hover:text-[#2E5650] transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Kembali ke Beranda
            </Link>
          </div>
        </Container>
      </section>
    </>
  )
}
