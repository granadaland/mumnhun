import type { Metadata } from "next"
import Link from "next/link"
import { Container } from "@/components/layout"
import { Button } from "@/components/ui/button"
import { LOCATIONS } from "@/lib/data/locations"
import {
  SITE_URL,
  SITE_NAME,
  DEFAULT_OG_IMAGE,
  WHATSAPP_LINK,
  PRICING_PACKAGES,
} from "@/lib/constants"
import { MapPin, ArrowRight, MessageCircle, Building2, ShieldCheck, Truck, Clock3 } from "lucide-react"

const PILLAR_URL = `${SITE_URL}/sewa-freezer-asi`

// Halaman PILAR: menargetkan kata kunci umum "Sewa Freezer ASI" (tanpa kota).
// Halaman anak per lokasi menargetkan "Sewa Freezer ASI [Kota]". Pemisahan ini
// mencegah kanibalisasi kata kunci antara pilar dan anak.
// Title memimpin dengan "Area Layanan" (bukan mengulang head term homepage
// "Sewa Freezer ASI Jabodetabek") supaya pilar mengklaim query navigasional
// "area layanan/daftar kota" dan tidak rebutan dengan beranda.
export const metadata: Metadata = {
  title: { absolute: `Area Layanan Sewa Freezer ASI Jabodetabek | ${SITE_NAME}` },
  description:
    "Sewa freezer ASI & rental kulkas ASI di Jabodetabek. Pilih area layanan Anda: Jakarta Selatan, Depok, Tangerang, Tangerang Selatan, Bekasi, dan Bogor. Unit steril, tanpa deposit, bergaransi.",
  keywords: [
    "Area Layanan Sewa Freezer ASI",
    "Sewa Freezer ASI Jabodetabek",
    "Rental Kulkas ASI Terdekat",
    "Sewa Freezer ASI Depok Tangerang Bekasi Bogor",
  ],
  alternates: { canonical: PILLAR_URL },
  openGraph: {
    title: `Area Layanan Sewa Freezer ASI Jabodetabek | ${SITE_NAME}`,
    description:
      "Pilih area layanan sewa freezer ASI Anda di Jabodetabek. Unit steril food-grade, tanpa deposit, bergaransi unit, dengan pengantaran langsung ke rumah.",
    url: PILLAR_URL,
    type: "website",
    siteName: SITE_NAME,
    locale: "id_ID",
    images: [
      {
        url: DEFAULT_OG_IMAGE,
        width: 1200,
        height: 630,
        alt: "Area Layanan Sewa Freezer ASI Jabodetabek",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `Area Layanan Sewa Freezer ASI Jabodetabek | ${SITE_NAME}`,
    description:
      "Pilih area layanan sewa freezer ASI di Jabodetabek. Unit steril, tanpa deposit, bergaransi.",
    images: [DEFAULT_OG_IMAGE],
  },
}

export default function SewaFreezerAsiPillarPage() {
  const startingPrice = Math.min(...PRICING_PACKAGES.map((pkg) => pkg.price))

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Sewa Freezer ASI", item: PILLAR_URL },
    ],
  }

  // ItemList schema: daftar area layanan (baik untuk pemahaman entitas oleh AI/mesin).
  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Area Layanan Sewa Freezer ASI",
    itemListElement: LOCATIONS.map((location, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: `Sewa Freezer ASI ${location.city}`,
      url: `${PILLAR_URL}/${location.slug}`,
    })),
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }}
      />

      {/* Breadcrumb */}
      <section className="pt-28 pb-4 px-4 sm:px-6 border-b border-stone-200/70 bg-[#FCFAF7]">
        <Container>
          <div className="flex items-center gap-2 text-sm text-[#382821]/60">
            <Link href="/" className="hover:text-[#2E5650] transition-colors">
              Home
            </Link>
            <span>/</span>
            <span className="text-[#281E19]">Sewa Freezer ASI</span>
          </div>
        </Container>
      </section>

      {/* Hero pilar */}
      <section className="py-14 md:py-20 px-4 sm:px-6 bg-gradient-to-b from-[#FCFAF7] to-white">
        <Container>
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#2E5650]/10 text-[#2E5650] text-xs font-bold uppercase tracking-wider mb-4">
              <MapPin className="w-3.5 h-3.5" />
              Area Layanan Jabodetabek
            </div>
            <h1 className="text-3xl md:text-5xl font-bold text-[#281E19] tracking-tight leading-tight">
              Sewa Freezer ASI &amp; Rental Kulkas ASI Jabodetabek
            </h1>
            <p className="text-sm md:text-base text-[#382821]/75 mt-4 leading-relaxed">
              Pilih kota Anda di bawah untuk melihat detail area cakupan, estimasi
              pengiriman, dan biaya antar spesifik lokasi. Semua paket sewa mulai{" "}
              <strong className="text-[#281E19] font-semibold">
                Rp{startingPrice.toLocaleString("id-ID")}/bulan
              </strong>
              , tanpa deposit, unit steril food-grade, dan bergaransi selama masa sewa.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 mt-6">
              <Button
                size="lg"
                className="bg-gradient-to-r from-[#2E5650] to-[#244742] hover:from-[#244742] hover:to-[#1D3A36] text-white rounded-full font-bold"
                asChild
              >
                <Link href={WHATSAPP_LINK} target="_blank" rel="noopener noreferrer">
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Konsultasi via WhatsApp
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </Button>
            </div>

            {/* Micro trust indicators */}
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mt-6 text-xs text-[#382821]/75 font-medium">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-[#2E5650]" /> Garansi Unit 24 Jam
              </span>
              <span className="flex items-center gap-1.5">
                <Truck className="w-4 h-4 text-[#C87860]" /> Antar Langsung ke Rumah
              </span>
              <span className="flex items-center gap-1.5">
                <Clock3 className="w-4 h-4 text-[#2E5650]" /> Respon Cepat
              </span>
            </div>
          </div>
        </Container>
      </section>

      {/* Grid area layanan → internal link ke tiap halaman lokasi */}
      <section className="pb-16 md:pb-24 px-4 sm:px-6 bg-white" aria-labelledby="area-layanan-heading">
        <Container>
          <h2 id="area-layanan-heading" className="text-2xl md:text-3xl font-bold text-[#281E19] tracking-tight mb-8">
            Pilih Area Layanan Sewa Freezer ASI
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {LOCATIONS.map((location) => (
              <Link
                key={location.slug}
                href={`/sewa-freezer-asi/${location.slug}`}
                className="group flex flex-col p-6 rounded-3xl bg-[#FCFAF7] border border-stone-200/80 shadow-xs hover:shadow-lg hover:border-[#2E5650]/40 transition-all duration-300"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 rounded-2xl bg-[#2E5650]/10 text-[#2E5650] flex items-center justify-center">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-white text-[#C87860] border border-[#C87860]/20">
                    {location.region}
                  </span>
                </div>

                <h3 className="text-lg font-bold text-[#281E19] group-hover:text-[#2E5650] transition-colors mb-2">
                  Sewa Freezer ASI {location.city}
                </h3>
                <p className="text-xs text-[#382821]/70 leading-relaxed mb-4 line-clamp-3">
                  {location.intro}
                </p>

                <div className="flex flex-wrap gap-1.5 mt-auto pt-4 border-t border-stone-200/60">
                  {location.coverageAreas.slice(0, 4).map((area) => (
                    <span
                      key={area}
                      className="px-2 py-0.5 text-[11px] font-medium rounded-md bg-white text-[#382821]/80 border border-stone-200/60"
                    >
                      {area}
                    </span>
                  ))}
                </div>

                <span className="mt-4 text-xs font-bold text-[#2E5650] flex items-center justify-between">
                  Lihat detail {location.city}
                  <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                </span>
              </Link>
            ))}
          </div>
        </Container>
      </section>
    </>
  )
}
