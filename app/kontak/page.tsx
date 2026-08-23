import { Metadata } from "next"
import {
    Mail,
    MapPin,
    Clock,
    MessageCircle,
    ArrowRight,
    Instagram,
    Facebook,
    Youtube,
    ExternalLink,
    ShieldCheck,
    Send,
    Sparkles,
} from "lucide-react"
import { Container } from "@/components/layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { SITE_NAME, SITE_URL, CONTACT_INFO, SOCIAL_URLS, WHATSAPP_LINK } from "@/lib/constants"
import Link from "next/link"

const KONTAK_TITLE = "Hubungi Kami – Sewa Freezer ASI & Rental Kulkas ASI"
const KONTAK_DESCRIPTION =
    "Hubungi Mum 'n Hun untuk konsultasi sewa freezer ASI dan rental kulkas ASI di Jabodetabek. Respon WhatsApp ±5 menit, siap antar ke rumah Anda."

export const metadata: Metadata = {
    title: KONTAK_TITLE,
    description: KONTAK_DESCRIPTION,
    alternates: {
        canonical: `${SITE_URL}/kontak`,
    },
    openGraph: {
        title: `${KONTAK_TITLE} | ${SITE_NAME}`,
        description: KONTAK_DESCRIPTION,
        url: `${SITE_URL}/kontak`,
        type: "website",
        siteName: SITE_NAME,
    },
    twitter: {
        card: "summary_large_image",
        title: `${KONTAK_TITLE} | ${SITE_NAME}`,
        description: KONTAK_DESCRIPTION,
    },
}

const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
        {
            "@type": "ListItem",
            position: 1,
            name: "Beranda",
            item: SITE_URL,
        },
        {
            "@type": "ListItem",
            position: 2,
            name: "Kontak",
            item: `${SITE_URL}/kontak`,
        },
    ],
}

export default function KontakPage() {
    return (
        <div className="min-h-screen bg-gradient-to-b from-[#FCFAF7] via-[#F7F3EE]/50 to-white">
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
            />

            {/* Header Hero */}
            <section className="pt-28 sm:pt-32 pb-10 sm:pb-14 px-4 sm:px-6 relative overflow-hidden">
                {/* Ambient Soft Glows */}
                <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[600px] h-[280px] bg-gradient-to-tr from-[#2E5650]/5 to-[#C87860]/5 rounded-full blur-[80px] pointer-events-none -z-10" />

                <Container>
                    <div className="text-center max-w-3xl mx-auto space-y-3 sm:space-y-4">
                        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white border border-stone-200/80 shadow-2xs text-xs font-semibold text-[#281E19]">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#2E5650]" />
                            <span>Bantuan & Layanan Pelanggan</span>
                        </div>
                        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-[#281E19] leading-tight tracking-tight">
                            Kami Siap Membantu <span className="text-[#2E5650]">Kebutuhan ASI Mums</span>
                        </h1>
                        <p className="text-sm sm:text-base md:text-lg text-[#382821]/75 max-w-2xl mx-auto leading-relaxed">
                            Punya pertanyaan seputar kapasitas unit, ketersediaan, atau biaya sewa? Tim Mum &apos;n Hun siap memberikan solusi cepat dan terpercaya.
                        </p>
                    </div>

                    {/* 3 Top Fast Contact Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 mt-10 sm:mt-12">
                        {/* WhatsApp Fast CS */}
                        <div className="bg-white p-6 rounded-3xl border border-stone-200/80 shadow-2xs hover:shadow-md hover:border-[#2E5650]/40 transition-all group flex flex-col justify-between">
                            <div className="flex items-start gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-[#2E5650]/10 border border-[#2E5650]/15 flex items-center justify-center text-[#2E5650] shrink-0 group-hover:scale-110 transition-transform">
                                    <MessageCircle className="w-6 h-6" />
                                </div>
                                <div className="space-y-1">
                                    <h3 className="font-bold text-[#281E19] text-base">WhatsApp CS</h3>
                                    <p className="text-xs text-[#382821]/60">Respon cepat ±5 menit</p>
                                    <p className="text-sm font-semibold text-[#2E5650]">
                                        {CONTACT_INFO.phone}
                                    </p>
                                </div>
                            </div>
                            <div className="pt-4 mt-2 border-t border-stone-100">
                                <Link
                                    href={WHATSAPP_LINK}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs font-bold text-[#2E5650] hover:text-[#1D3A36] flex items-center justify-between group/link"
                                >
                                    <span>Chat WhatsApp Sekarang</span>
                                    <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover/link:translate-x-1" />
                                </Link>
                            </div>
                        </div>

                        {/* Email Official */}
                        <div className="bg-white p-6 rounded-3xl border border-stone-200/80 shadow-2xs hover:shadow-md hover:border-[#C87860]/40 transition-all group flex flex-col justify-between">
                            <div className="flex items-start gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-[#C87860]/10 border border-[#C87860]/15 flex items-center justify-center text-[#C87860] shrink-0 group-hover:scale-110 transition-transform">
                                    <Mail className="w-6 h-6" />
                                </div>
                                <div className="space-y-1">
                                    <h3 className="font-bold text-[#281E19] text-base">Email Resmi</h3>
                                    <p className="text-xs text-[#382821]/60">Untuk kerjasama & bantuan umum</p>
                                    <p className="text-sm font-semibold text-[#281E19]">
                                        {CONTACT_INFO.email}
                                    </p>
                                </div>
                            </div>
                            <div className="pt-4 mt-2 border-t border-stone-100">
                                <a
                                    href={`mailto:${CONTACT_INFO.email}`}
                                    className="text-xs font-bold text-[#C87860] hover:text-[#A95D47] flex items-center justify-between group/link"
                                >
                                    <span>Kirim Pesan Email</span>
                                    <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover/link:translate-x-1" />
                                </a>
                            </div>
                        </div>

                        {/* Work Hours */}
                        <div className="bg-white p-6 rounded-3xl border border-stone-200/80 shadow-2xs hover:shadow-md hover:border-stone-300 transition-all group flex flex-col justify-between">
                            <div className="flex items-start gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-stone-100 border border-stone-200/60 flex items-center justify-center text-[#281E19] shrink-0 group-hover:scale-110 transition-transform">
                                    <Clock className="w-6 h-6 text-[#2E5650]" />
                                </div>
                                <div className="space-y-1">
                                    <h3 className="font-bold text-[#281E19] text-base">Jam Operasional</h3>
                                    <p className="text-xs text-[#382821]/60">Pengiriman & Customer Support</p>
                                    <p className="text-xs font-medium text-[#281E19] leading-relaxed">
                                        {CONTACT_INFO.workHours}
                                    </p>
                                </div>
                            </div>
                            <div className="pt-4 mt-2 border-t border-stone-100 flex items-center gap-1.5 text-xs text-[#2E5650] font-medium">
                                <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                                <span>Layanan Siap Antar Se-Jabodetabek</span>
                            </div>
                        </div>
                    </div>
                </Container>
            </section>

            {/* Main Content: Interactive Form & Google Maps Studio */}
            <section className="py-8 sm:py-12 px-4 sm:px-6 pb-20">
                <Container>
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
                        {/* LEFT: Contact Form (7 Cols) */}
                        <div className="lg:col-span-7 bg-white rounded-3xl sm:rounded-[2rem] p-6 sm:p-8 md:p-10 border border-stone-200/80 shadow-[0_10px_35px_-8px_rgba(40,30,25,0.06)] space-y-6">
                            <div className="space-y-2 border-b border-stone-100 pb-5">
                                <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#2E5650] uppercase tracking-wider">
                                    <Sparkles className="w-3.5 h-3.5" />
                                    <span>Formulir Kontak</span>
                                </div>
                                <h2 className="text-2xl sm:text-3xl font-bold text-[#281E19] tracking-tight">
                                    Kirim Pesan Langsung
                                </h2>
                                <p className="text-xs sm:text-sm text-[#382821]/70 leading-relaxed">
                                    Silakan isi data di bawah ini. Tim kami akan segera menanggapi konsultasi Mums.
                                </p>
                            </div>

                            <form className="space-y-5">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                                    <div className="space-y-1.5">
                                        <label className="text-xs sm:text-sm font-bold text-[#281E19]">
                                            Nama Lengkap <span className="text-[#C87860]">*</span>
                                        </label>
                                        <Input
                                            placeholder="Contoh: Bunda Sarah"
                                            className="h-11 sm:h-12 rounded-xl border-stone-200 bg-stone-50/60 focus:bg-white focus:border-[#2E5650] text-xs sm:text-sm transition-colors"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs sm:text-sm font-bold text-[#281E19]">
                                            Nomor WhatsApp <span className="text-[#C87860]">*</span>
                                        </label>
                                        <Input
                                            type="tel"
                                            placeholder="0812-xxxx-xxxx"
                                            className="h-11 sm:h-12 rounded-xl border-stone-200 bg-stone-50/60 focus:bg-white focus:border-[#2E5650] text-xs sm:text-sm transition-colors"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                                    <div className="space-y-1.5">
                                        <label className="text-xs sm:text-sm font-bold text-[#281E19]">
                                            Email <span className="text-stone-400 font-normal text-xs">(Opsional)</span>
                                        </label>
                                        <Input
                                            type="email"
                                            placeholder="email@contoh.com"
                                            className="h-11 sm:h-12 rounded-xl border-stone-200 bg-stone-50/60 focus:bg-white focus:border-[#2E5650] text-xs sm:text-sm transition-colors"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs sm:text-sm font-bold text-[#281E19]">
                                            Wilayah Domisili <span className="text-[#C87860]">*</span>
                                        </label>
                                        <Input
                                            placeholder="Contoh: Jakarta Selatan, Depok, dll."
                                            className="h-11 sm:h-12 rounded-xl border-stone-200 bg-stone-50/60 focus:bg-white focus:border-[#2E5650] text-xs sm:text-sm transition-colors"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs sm:text-sm font-bold text-[#281E19]">
                                        Kebutuhan / Pesan <span className="text-[#C87860]">*</span>
                                    </label>
                                    <textarea
                                        placeholder="Tuliskan kebutuhan paket sewa (1/3/6 bulan) atau pertanyaan Mums di sini..."
                                        rows={4}
                                        className="w-full rounded-xl border border-stone-200 bg-stone-50/60 focus:bg-white p-3.5 sm:p-4 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#2E5650]/20 focus:border-[#2E5650] transition-all resize-none"
                                        required
                                    />
                                </div>

                                <Button
                                    type="submit"
                                    className="w-full h-11 sm:h-12 rounded-full bg-[#2E5650] hover:bg-[#244742] text-white font-bold text-sm sm:text-base shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
                                >
                                    <Send className="w-4 h-4" />
                                    <span>Kirim Formulir Konsultasi</span>
                                </Button>
                            </form>
                        </div>

                        {/* RIGHT: Google Maps Embed & Studio Profile (5 Cols) */}
                        <div className="lg:col-span-5 space-y-6">
                            {/* Studio Card with Maps */}
                            <div className="bg-white rounded-3xl sm:rounded-[2rem] p-5 sm:p-6 border border-stone-200/80 shadow-[0_10px_35px_-8px_rgba(40,30,25,0.06)] space-y-4">
                                <div className="flex items-center justify-between pb-2 border-b border-stone-100">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-lg bg-[#2E5650]/10 text-[#2E5650] flex items-center justify-center shrink-0">
                                            <MapPin className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-[#281E19] text-sm sm:text-base">
                                                Lokasi Kantor & Workshop
                                            </h3>
                                            <p className="text-[11px] text-[#382821]/60">
                                                Sewa Freezer Asi Mum &amp; Hun
                                            </p>
                                        </div>
                                    </div>
                                    <a
                                        href="https://maps.google.com/?q=Sewa+Freezer+Asi+Mum+%26+Hun"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-[11px] font-bold text-[#2E5650] hover:text-[#1D3A36] inline-flex items-center gap-1 bg-stone-50 px-2.5 py-1 rounded-full border border-stone-200/60"
                                    >
                                        <span>Buka Maps</span>
                                        <ExternalLink className="w-3 h-3" />
                                    </a>
                                </div>

                                {/* Google Maps Responsive Embed */}
                                <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden border border-stone-200/80 shadow-inner bg-stone-100">
                                    <iframe
                                        src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d126900.74387727914!2d106.66255635297213!3d-6.309857477046962!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x2e69eeb889dcbd95%3A0x8773c8ac8f585881!2sSewa%20Freezer%20Asi%20Mum%20%26%20Hun!5e0!3m2!1sid!2sid!4v1787499145129!5m2!1sid!2sid"
                                        width="100%"
                                        height="100%"
                                        style={{ border: 0 }}
                                        allowFullScreen
                                        loading="lazy"
                                        referrerPolicy="strict-origin-when-cross-origin"
                                        title="Peta Lokasi Sewa Freezer Asi Mum & Hun"
                                        className="absolute inset-0 w-full h-full"
                                    />
                                </div>

                                <p className="text-xs text-[#382821]/70 leading-relaxed">
                                    📍 Layanan pengantaran dan penjemputan unit freezer ASI mencakup seluruh wilayah <strong>Jakarta, Depok, Tangerang, Tangerang Selatan, Bekasi, dan Bogor</strong>.
                                </p>
                            </div>

                            {/* Social Media Channels */}
                            <div className="bg-[#2E5650] p-6 sm:p-7 rounded-3xl text-white relative overflow-hidden group shadow-md">
                                <div className="absolute top-0 right-0 w-36 h-36 bg-white/5 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none" />

                                <h3 className="text-lg font-bold mb-1.5 relative z-10">
                                    Komunitas &amp; Media Sosial
                                </h3>
                                <p className="text-white/80 text-xs sm:text-sm mb-5 relative z-10 leading-relaxed">
                                    Ikuti media sosial kami untuk tips laktasi harian, panduan penyimpanan ASIP, dan testimoni Mums.
                                </p>
                                <div className="flex items-center gap-3 relative z-10">
                                    <a
                                        href={SOCIAL_URLS.instagram || "#"}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        aria-label="Instagram Mum 'n Hun"
                                        className="w-10 h-10 rounded-full bg-white/15 hover:bg-white hover:text-[#2E5650] flex items-center justify-center transition-all shadow-2xs"
                                    >
                                        <Instagram className="w-5 h-5" />
                                    </a>
                                    <a
                                        href={SOCIAL_URLS.facebook}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        aria-label="Facebook Mum 'n Hun"
                                        className="w-10 h-10 rounded-full bg-white/15 hover:bg-white hover:text-[#2E5650] flex items-center justify-center transition-all shadow-2xs"
                                    >
                                        <Facebook className="w-5 h-5" />
                                    </a>
                                    <a
                                        href={SOCIAL_URLS.youtube}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        aria-label="YouTube Mum 'n Hun"
                                        className="w-10 h-10 rounded-full bg-white/15 hover:bg-white hover:text-[#2E5650] flex items-center justify-center transition-all shadow-2xs"
                                    >
                                        <Youtube className="w-5 h-5" />
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* FAQ Teaser */}
                    <div className="mt-14 sm:mt-20 text-center bg-white rounded-3xl sm:rounded-[2rem] p-8 md:p-12 border border-stone-200/80 shadow-2xs relative overflow-hidden">
                        <div className="relative z-10 max-w-2xl mx-auto space-y-3 sm:space-y-4">
                            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#C87860]/10 text-[#C87860] text-xs font-bold uppercase tracking-wider">
                                Pusat Bantuan &amp; Edukasi
                            </div>
                            <h2 className="text-2xl sm:text-3xl font-bold text-[#281E19] tracking-tight">
                                Butuh Jawaban Cepat Seputar Sewa?
                            </h2>
                            <p className="text-xs sm:text-sm md:text-base text-[#382821]/70 leading-relaxed">
                                Temukan panduan lengkap tentang prosedur sewa, standar sterilisasi, hingga tips perawatan suhu freezer di halaman Petunjuk kami.
                            </p>
                            <div className="pt-2">
                                <Button
                                    variant="outline"
                                    className="h-11 sm:h-12 px-6 sm:px-8 rounded-full border-2 border-[#2E5650] text-[#2E5650] hover:bg-[#2E5650] hover:text-white font-bold text-xs sm:text-sm transition-all"
                                    asChild
                                >
                                    <Link href="/petunjuk-pemakaian">
                                        <span>Lihat Panduan &amp; FAQ Lengkap</span>
                                        <ArrowRight className="w-4 h-4 ml-1.5" />
                                    </Link>
                                </Button>
                            </div>
                        </div>
                    </div>
                </Container>
            </section>
        </div>
    )
}
