import { Metadata } from "next"
import { Container } from "@/components/layout"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
    ShieldCheck,
    Database,
    Lock,
    Share2,
    Cookie,
    UserCog,
    Clock,
    Phone,
    Mail,
    ChevronDown,
} from "lucide-react"
import { SITE_NAME, SITE_URL, CONTACT_INFO } from "@/lib/constants"

const PRIVACY_TITLE = "Kebijakan Privasi"
const PRIVACY_DESCRIPTION =
    "Kebijakan privasi Mum 'n Hun: bagaimana kami mengumpulkan, menggunakan, menyimpan, dan melindungi data pribadi pelanggan layanan sewa freezer ASI di Jabodetabek."

export const metadata: Metadata = {
    title: PRIVACY_TITLE,
    description: PRIVACY_DESCRIPTION,
    alternates: {
        canonical: `${SITE_URL}/kebijakan-privasi`,
    },
    openGraph: {
        title: `${PRIVACY_TITLE} | ${SITE_NAME}`,
        description: PRIVACY_DESCRIPTION,
        url: `${SITE_URL}/kebijakan-privasi`,
        type: "article",
        siteName: SITE_NAME,
    },
    twitter: {
        card: "summary_large_image",
        title: `${PRIVACY_TITLE} | ${SITE_NAME}`,
        description: PRIVACY_DESCRIPTION,
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
            name: "Kebijakan Privasi",
            item: `${SITE_URL}/kebijakan-privasi`,
        },
    ],
}

const LAST_UPDATED = "22 Agustus 2026"

export default function KebijakanPrivasiPage() {
    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
            />

            {/* ═══════════════════════════════════════════════════════ */}
            {/* HERO SECTION                                           */}
            {/* ═══════════════════════════════════════════════════════ */}
            <section className="relative pt-32 pb-16 md:pt-40 md:pb-20 px-6 overflow-hidden">
                {/* Background Gradient */}
                <div className="absolute inset-0 bg-gradient-to-br from-[#FFFBF7] via-[#F3E7DB] to-[#E2CDBA] -z-20" />

                {/* Decorative Elements */}
                <div className="absolute top-20 right-10 w-64 h-64 bg-[#466A68]/5 rounded-full blur-3xl -z-10" />
                <div className="absolute bottom-10 left-10 w-48 h-48 bg-[#C48B77]/10 rounded-full blur-3xl -z-10" />

                <Container className="relative z-10">
                    <div className="text-center max-w-3xl mx-auto">
                        {/* Badge */}
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/60 border border-white/50 backdrop-blur-sm shadow-sm mb-6">
                            <ShieldCheck size={16} className="text-[#466A68]" />
                            <span className="text-xs font-semibold tracking-wide text-[#382821] uppercase">
                                Perlindungan Data
                            </span>
                        </div>

                        {/* Title */}
                        <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold text-[#382821] leading-tight mb-6">
                            Kebijakan{" "}
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#466A68] to-[#2F4A48]">
                                Privasi
                            </span>
                        </h1>

                        {/* Subtitle */}
                        <p className="text-[#382821]/70 text-lg md:text-xl leading-relaxed">
                            Mum &apos;n Hun berkomitmen menjaga kerahasiaan dan keamanan data
                            pribadi setiap Ayah/Bunda yang menggunakan layanan sewa freezer ASI
                            dan rental kulkas ASI kami.
                        </p>

                        <p className="text-[#382821]/50 text-sm mt-4">
                            Terakhir diperbarui: {LAST_UPDATED}
                        </p>
                    </div>
                </Container>
            </section>

            {/* ═══════════════════════════════════════════════════════ */}
            {/* SECTION A: DATA YANG KAMI KUMPULKAN                    */}
            {/* ═══════════════════════════════════════════════════════ */}
            <section className="py-16 md:py-20 px-6 bg-white">
                <Container>
                    <div className="max-w-4xl mx-auto">
                        <div className="flex items-center gap-4 mb-10">
                            <div className="w-12 h-12 rounded-2xl bg-[#466A68] flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-[#466A68]/30">
                                A
                            </div>
                            <h2 className="text-2xl md:text-3xl font-bold text-[#382821]">
                                Data yang Kami Kumpulkan
                            </h2>
                        </div>

                        <div className="space-y-6">
                            <div className="p-6 rounded-2xl bg-gradient-to-br from-[#FFFBF7] to-[#F3E7DB] border border-[#E2CDBA]">
                                <div className="flex items-start gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-[#466A68]/10 flex items-center justify-center flex-shrink-0">
                                        <Database size={24} className="text-[#466A68]" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-[#382821] mb-2">
                                            Data Identitas &amp; Kontak
                                        </h3>
                                        <p className="text-[#382821]/70">
                                            Untuk memproses pemesanan sewa, kami mengumpulkan nama,
                                            nomor telepon/WhatsApp, alamat pengiriman, dan foto KTP
                                            (untuk verifikasi). Anda diperbolehkan menutup bagian
                                            data KTP yang bersifat rahasia.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="p-6 rounded-2xl bg-gradient-to-br from-[#FFFBF7] to-[#F3E7DB] border border-[#E2CDBA]">
                                <div className="flex items-start gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-[#466A68]/10 flex items-center justify-center flex-shrink-0">
                                        <Cookie size={24} className="text-[#466A68]" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-[#382821] mb-2">
                                            Data Teknis &amp; Penggunaan Situs
                                        </h3>
                                        <p className="text-[#382821]/70">
                                            Saat mengakses situs, kami dapat mengumpulkan data teknis
                                            terbatas seperti jenis perangkat, browser, dan halaman
                                            yang dikunjungi melalui cookie serta layanan analitik
                                            untuk meningkatkan kualitas layanan.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </Container>
            </section>

            {/* ═══════════════════════════════════════════════════════ */}
            {/* SECTION B: PENGGUNAAN & PERLINDUNGAN (ACCORDION)      */}
            {/* ═══════════════════════════════════════════════════════ */}
            <section className="py-16 md:py-20 px-6 bg-gradient-to-b from-[#F8F4F0] to-white">
                <Container>
                    <div className="max-w-4xl mx-auto">
                        <div className="flex items-center gap-4 mb-10">
                            <div className="w-12 h-12 rounded-2xl bg-[#466A68] flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-[#466A68]/30">
                                B
                            </div>
                            <h2 className="text-2xl md:text-3xl font-bold text-[#382821]">
                                Penggunaan &amp; Perlindungan Data
                            </h2>
                        </div>

                        <div className="space-y-4">
                            {/* 1. Penggunaan Data */}
                            <details className="group rounded-2xl bg-white border border-[#466A68]/10 shadow-sm overflow-hidden">
                                <summary className="flex items-center justify-between p-5 cursor-pointer list-none hover:bg-[#466A68]/5 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
                                            <UserCog size={20} className="text-green-600" />
                                        </div>
                                        <span className="font-semibold text-[#382821] text-lg">
                                            1. Bagaimana Kami Menggunakan Data
                                        </span>
                                    </div>
                                    <ChevronDown
                                        size={20}
                                        className="text-[#382821]/40 group-open:rotate-180 transition-transform"
                                    />
                                </summary>
                                <div className="px-5 pb-5 pt-0">
                                    <div className="pl-14">
                                        <ul className="space-y-3 list-disc list-inside marker:text-[#466A68] text-[#382821]/80">
                                            <li>Memproses pemesanan, pengiriman, dan pengambilan unit sewa.</li>
                                            <li>Melakukan verifikasi identitas dan keamanan transaksi.</li>
                                            <li>Menghubungi Anda terkait status sewa, perpanjangan, atau kendala unit.</li>
                                            <li>Meningkatkan layanan dan pengalaman penggunaan situs.</li>
                                        </ul>
                                    </div>
                                </div>
                            </details>

                            {/* 2. Keamanan Data */}
                            <details className="group rounded-2xl bg-white border border-[#466A68]/10 shadow-sm overflow-hidden">
                                <summary className="flex items-center justify-between p-5 cursor-pointer list-none hover:bg-[#466A68]/5 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-teal-100 flex items-center justify-center">
                                            <Lock size={20} className="text-teal-600" />
                                        </div>
                                        <span className="font-semibold text-[#382821] text-lg">
                                            2. Keamanan &amp; Penyimpanan Data
                                        </span>
                                    </div>
                                    <ChevronDown
                                        size={20}
                                        className="text-[#382821]/40 group-open:rotate-180 transition-transform"
                                    />
                                </summary>
                                <div className="px-5 pb-5 pt-0">
                                    <div className="pl-14">
                                        <p className="text-[#382821]/80">
                                            Kami menyimpan data pribadi hanya selama diperlukan untuk
                                            keperluan layanan dan kepatuhan. Data disimpan secara aman
                                            dan hanya diakses oleh tim yang berwenang. Data KTP untuk
                                            verifikasi tidak dibagikan kepada pihak lain.
                                        </p>
                                    </div>
                                </div>
                            </details>

                            {/* 3. Berbagi Data */}
                            <details className="group rounded-2xl bg-white border border-[#466A68]/10 shadow-sm overflow-hidden">
                                <summary className="flex items-center justify-between p-5 cursor-pointer list-none hover:bg-[#466A68]/5 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                                            <Share2 size={20} className="text-blue-600" />
                                        </div>
                                        <span className="font-semibold text-[#382821] text-lg">
                                            3. Berbagi Data dengan Pihak Ketiga
                                        </span>
                                    </div>
                                    <ChevronDown
                                        size={20}
                                        className="text-[#382821]/40 group-open:rotate-180 transition-transform"
                                    />
                                </summary>
                                <div className="px-5 pb-5 pt-0">
                                    <div className="pl-14">
                                        <p className="text-[#382821]/80">
                                            Kami tidak menjual atau menyewakan data pribadi Anda.
                                            Data hanya dibagikan kepada mitra kurir/logistik sebatas
                                            kebutuhan pengiriman, atau bila diwajibkan oleh hukum yang
                                            berlaku.
                                        </p>
                                    </div>
                                </div>
                            </details>

                            {/* 4. Hak Pengguna */}
                            <details className="group rounded-2xl bg-white border border-[#466A68]/10 shadow-sm overflow-hidden">
                                <summary className="flex items-center justify-between p-5 cursor-pointer list-none hover:bg-[#466A68]/5 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
                                            <Clock size={20} className="text-purple-600" />
                                        </div>
                                        <span className="font-semibold text-[#382821] text-lg">
                                            4. Hak Anda atas Data Pribadi
                                        </span>
                                    </div>
                                    <ChevronDown
                                        size={20}
                                        className="text-[#382821]/40 group-open:rotate-180 transition-transform"
                                    />
                                </summary>
                                <div className="px-5 pb-5 pt-0">
                                    <div className="pl-14">
                                        <p className="text-[#382821]/80">
                                            Anda berhak meminta akses, koreksi, atau penghapusan data
                                            pribadi yang kami simpan, sepanjang tidak bertentangan
                                            dengan kewajiban hukum. Untuk mengajukan permintaan,
                                            silakan hubungi kami melalui kontak di bawah.
                                        </p>
                                    </div>
                                </div>
                            </details>
                        </div>
                    </div>
                </Container>
            </section>

            {/* ═══════════════════════════════════════════════════════ */}
            {/* CLOSING & CTA                                           */}
            {/* ═══════════════════════════════════════════════════════ */}
            <section className="py-16 md:py-20 px-6 bg-gradient-to-br from-[#466A68] to-[#2F4A48] text-white">
                <Container>
                    <div className="max-w-3xl mx-auto text-center">
                        <p className="text-white/90 text-lg md:text-xl leading-relaxed mb-8">
                            Jika ada pertanyaan mengenai kebijakan privasi ini atau penggunaan
                            data pribadi Anda, silakan hubungi kami. Kami siap membantu.
                        </p>

                        <div className="inline-flex flex-col sm:flex-row items-center gap-4 mb-8">
                            <div className="inline-flex items-center gap-3 p-4 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20">
                                <Phone size={18} className="text-white" />
                                <span className="text-white/90 font-semibold">{CONTACT_INFO.phone}</span>
                            </div>
                            <div className="inline-flex items-center gap-3 p-4 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20">
                                <Mail size={18} className="text-white" />
                                <span className="text-white/90 font-semibold">{CONTACT_INFO.email}</span>
                            </div>
                        </div>

                        <div>
                            <Button
                                size="lg"
                                className="bg-white text-[#466A68] hover:bg-white/90 px-8 py-6 rounded-full font-semibold text-lg shadow-xl shadow-black/20 hover:-translate-y-1 transition-all"
                                asChild
                            >
                                <Link href="/kontak">Hubungi Kami</Link>
                            </Button>
                        </div>
                    </div>
                </Container>
            </section>
        </>
    )
}
