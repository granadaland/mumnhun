import { Metadata } from "next"
import { Container } from "@/components/layout"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
    Snowflake,
    Clock,
    ThermometerSnowflake,
    AlertTriangle,
    Zap,
    Move,
    Droplets,
    Phone,
    CheckCircle,
    Timer,
    PlugZap,
    Gauge,
    Shield,
    ChevronDown,
} from "lucide-react"
import { SITE_NAME, SITE_URL } from "@/lib/constants"

export const metadata: Metadata = {
    title: "Petunjuk Penggunaan Freezer ASI",
    description:
        "Panduan lengkap penggunaan freezer ASI dari Mum 'N Hun. Tips penyimpanan ASI yang benar, cara defrost, dan perawatan freezer.",
    alternates: {
        canonical: `${SITE_URL}/petunjuk-pemakaian`,
    },
    openGraph: {
        title: "Petunjuk Penggunaan Freezer ASI",
        description:
            "Panduan lengkap penggunaan freezer ASI dari Mum 'N Hun. Tips penyimpanan ASI yang benar, cara defrost, dan perawatan freezer.",
        url: `${SITE_URL}/petunjuk-pemakaian`,
        type: "article",
        siteName: SITE_NAME,
    },
    twitter: {
        card: "summary_large_image",
        title: "Petunjuk Penggunaan Freezer ASI",
        description:
            "Panduan lengkap penggunaan freezer ASI dari Mum 'N Hun. Tips penyimpanan ASI yang benar, cara defrost, dan perawatan freezer.",
    },
}

export default function PetunjukPage() {
    return (
        <>
            {/* ═══════════════════════════════════════════════════════ */}
            {/* HERO SECTION                                           */}
            {/* ═══════════════════════════════════════════════════════ */}
            <section className="relative pt-32 pb-16 md:pt-40 md:pb-20 px-6 overflow-hidden">
                {/* Background Gradient */}
                <div className="absolute inset-0 bg-gradient-to-br from-[#FFFBF7] via-[#F3E7DB] to-[#E2CDBA] -z-20" />

                {/* Hero Background Image */}
                <div
                    className="absolute inset-0 -z-10 opacity-[0.15]"
                    style={{
                        backgroundImage: 'url(https://res.cloudinary.com/dvqcs0zqi/image/upload/v1769976612/Sewa_Freezer_ASI_Terdekat_m4zp5w.webp)',
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                    }}
                />

                {/* Decorative Elements */}
                <div className="absolute top-20 right-10 w-64 h-64 bg-[#466A68]/5 rounded-full blur-3xl -z-10" />
                <div className="absolute bottom-10 left-10 w-48 h-48 bg-[#C48B77]/10 rounded-full blur-3xl -z-10" />

                <Container className="relative z-10">
                    <div className="text-center max-w-3xl mx-auto">
                        {/* Badge */}
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/60 border border-white/50 backdrop-blur-sm shadow-sm mb-6">
                            <Snowflake size={16} className="text-[#466A68]" />
                            <span className="text-xs font-semibold tracking-wide text-[#382821] uppercase">
                                Panduan Resmi
                            </span>
                        </div>

                        {/* Title */}
                        <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold text-[#382821] leading-tight mb-6">
                            Petunjuk Penggunaan{" "}
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#466A68] to-[#2F4A48]">
                                Freezer ASI
                            </span>
                        </h1>

                        {/* Subtitle */}
                        <p className="text-[#382821]/70 text-lg md:text-xl leading-relaxed mb-8">
                            Ayah dan Bunda, terima kasih telah mempercayakan penyimpanan ASI
                            dengan freezer Mum &apos;N Hun. Mohon membaca panduan ini sampai
                            selesai agar penggunaan freezer berjalan aman dan optimal.
                        </p>

                        {/* Contact Badge */}
                        <div className="inline-flex items-center gap-3 px-5 py-3 rounded-2xl bg-white/80 backdrop-blur-sm border border-white/60 shadow-lg">
                            <div className="w-10 h-10 rounded-full bg-[#466A68]/10 flex items-center justify-center">
                                <Phone size={18} className="text-[#466A68]" />
                            </div>
                            <div className="text-left">
                                <p className="text-xs text-[#382821]/60 font-medium">
                                    Service Center
                                </p>
                                <p className="text-[#382821] font-bold">0853-1211-8352</p>
                            </div>
                        </div>
                    </div>
                </Container>
            </section>

            {/* ═══════════════════════════════════════════════════════ */}
            {/* SECTION A: SAAT FREEZER BARU DITERIMA                  */}
            {/* ═══════════════════════════════════════════════════════ */}
            <section className="py-16 md:py-20 px-6 bg-white">
                <Container>
                    <div className="max-w-4xl mx-auto">
                        {/* Section Header */}
                        <div className="flex items-center gap-4 mb-10">
                            <div className="w-12 h-12 rounded-2xl bg-[#466A68] flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-[#466A68]/30">
                                A
                            </div>
                            <h2 className="text-2xl md:text-3xl font-bold text-[#382821]">
                                Saat Freezer Baru Diterima
                            </h2>
                        </div>

                        {/* Steps */}
                        <div className="space-y-6">
                            {/* Step 1 */}
                            <div className="flex gap-5">
                                <div className="flex-shrink-0">
                                    <div className="w-10 h-10 rounded-full bg-[#466A68]/10 border-2 border-[#466A68] flex items-center justify-center text-[#466A68] font-bold">
                                        1
                                    </div>
                                </div>
                                <div className="flex-1 pt-1">
                                    <p className="text-[#382821] text-lg leading-relaxed">
                                        <strong>Letakkan freezer</strong> di lokasi yang diinginkan
                                        (permukaan datar, sirkulasi udara baik).
                                    </p>
                                </div>
                            </div>

                            {/* Step 2 */}
                            <div className="flex gap-5">
                                <div className="flex-shrink-0">
                                    <div className="w-10 h-10 rounded-full bg-[#466A68]/10 border-2 border-[#466A68] flex items-center justify-center text-[#466A68] font-bold">
                                        2
                                    </div>
                                </div>
                                <div className="flex-1 pt-1">
                                    <p className="text-[#382821] text-lg leading-relaxed mb-3">
                                        <strong>Tunggu 3 jam</strong> sebelum dinyalakan.
                                    </p>
                                    <div className="flex items-start gap-3 p-4 rounded-xl bg-[#466A68]/5 border border-[#466A68]/10">
                                        <Clock size={20} className="text-[#466A68] flex-shrink-0 mt-0.5" />
                                        <p className="text-[#382821]/80 text-sm">
                                            Waktu ini diperlukan agar cairan kompresor stabil setelah
                                            proses pengiriman.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Step 3 */}
                            <div className="flex gap-5">
                                <div className="flex-shrink-0">
                                    <div className="w-10 h-10 rounded-full bg-[#466A68]/10 border-2 border-[#466A68] flex items-center justify-center text-[#466A68] font-bold">
                                        3
                                    </div>
                                </div>
                                <div className="flex-1 pt-1">
                                    <p className="text-[#382821] text-lg leading-relaxed mb-3">
                                        Setelah 3 jam, <strong>colokkan freezer ke listrik</strong>{" "}
                                        dan atur suhu pada posisi sedang.
                                    </p>
                                    <div className="flex items-start gap-3 p-4 rounded-xl bg-[#C48B77]/10 border border-[#C48B77]/20">
                                        <ThermometerSnowflake size={20} className="text-[#C48B77] flex-shrink-0 mt-0.5" />
                                        <p className="text-[#382821]/80 text-sm">
                                            <strong>Rekomendasi untuk penyimpanan ASI:</strong> medium
                                            / angka 3–4 (sekitar setengah dari posisi maksimal).
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </Container>
            </section>

            {/* ═══════════════════════════════════════════════════════ */}
            {/* SECTION B: PEMAKAIAN AWAL                               */}
            {/* ═══════════════════════════════════════════════════════ */}
            <section className="py-16 md:py-20 px-6 bg-gradient-to-b from-[#F8F4F0] to-white">
                <Container>
                    <div className="max-w-4xl mx-auto">
                        {/* Section Header */}
                        <div className="flex items-center gap-4 mb-10">
                            <div className="w-12 h-12 rounded-2xl bg-[#466A68] flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-[#466A68]/30">
                                B
                            </div>
                            <div>
                                <h2 className="text-2xl md:text-3xl font-bold text-[#382821]">
                                    Pemakaian Awal
                                </h2>
                                <p className="text-[#C48B77] font-semibold text-sm mt-1">
                                    Wajib Dilakukan
                                </p>
                            </div>
                        </div>

                        {/* Warning Box */}
                        <div className="p-5 rounded-2xl bg-[#C48B77]/10 border border-[#C48B77]/20 mb-8">
                            <div className="flex items-start gap-4">
                                <div className="w-10 h-10 rounded-xl bg-[#C48B77]/20 flex items-center justify-center flex-shrink-0">
                                    <AlertTriangle size={20} className="text-[#C48B77]" />
                                </div>
                                <div>
                                    <p className="text-[#382821] font-semibold mb-1">
                                        Jangan langsung diisi.
                                    </p>
                                    <p className="text-[#382821]/70">
                                        Biarkan freezer menyala kosong selama{" "}
                                        <strong>24 jam</strong> sebagai proses pemanasan awal
                                        sekaligus pengecekan fungsi. Jika diperlukan untuk uji coba,
                                        boleh diisi 1 plastik berisi air.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Success Indicators */}
                        <div className="p-6 rounded-2xl bg-white border border-[#466A68]/10 shadow-lg shadow-stone-200/50">
                            <h3 className="text-lg font-bold text-[#382821] mb-5 flex items-center gap-2">
                                <CheckCircle size={20} className="text-[#466A68]" />
                                Tanda Freezer Beroperasi Normal
                            </h3>

                            <ul className="space-y-4">
                                <li className="flex items-start gap-3">
                                    <div className="w-6 h-6 rounded-full bg-[#466A68]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                                        <CheckCircle size={14} className="text-[#466A68]" />
                                    </div>
                                    <p className="text-[#382821]/80">
                                        Sekitar <strong>30 menit</strong> setelah dinyalakan,
                                        dinding bagian dalam (terutama bagian atas) mulai terasa
                                        dingin dan muncul lapisan es tipis.
                                    </p>
                                </li>
                                <li className="flex items-start gap-3">
                                    <div className="w-6 h-6 rounded-full bg-[#466A68]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                                        <CheckCircle size={14} className="text-[#466A68]" />
                                    </div>
                                    <p className="text-[#382821]/80">
                                        Mesin terdengar bekerja, lalu akan berhenti sementara ketika
                                        suhu sudah tercapai (ini normal).
                                    </p>
                                </li>
                                <li className="flex items-start gap-3">
                                    <div className="w-6 h-6 rounded-full bg-[#466A68]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                                        <CheckCircle size={14} className="text-[#466A68]" />
                                    </div>
                                    <p className="text-[#382821]/80">
                                        Setelah <strong>24 jam</strong>, freezer siap digunakan dan
                                        diisi ASI.
                                    </p>
                                </li>
                            </ul>
                        </div>
                    </div>
                </Container>
            </section>

            {/* ═══════════════════════════════════════════════════════ */}
            {/* SECTION C: PENGATURAN SUHU & PERAWATAN                  */}
            {/* ═══════════════════════════════════════════════════════ */}
            <section className="py-16 md:py-20 px-6 bg-white">
                <Container>
                    <div className="max-w-4xl mx-auto">
                        {/* Section Header */}
                        <div className="flex items-center gap-4 mb-10">
                            <div className="w-12 h-12 rounded-2xl bg-[#466A68] flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-[#466A68]/30">
                                C
                            </div>
                            <h2 className="text-2xl md:text-3xl font-bold text-[#382821]">
                                Pengaturan Suhu dan Perawatan Harian
                            </h2>
                        </div>

                        {/* Tips Grid */}
                        <div className="grid md:grid-cols-2 gap-5 mb-8">
                            {/* Tip 1 */}
                            <div className="p-5 rounded-2xl bg-[#466A68]/5 border border-[#466A68]/10">
                                <div className="w-10 h-10 rounded-xl bg-[#466A68]/10 flex items-center justify-center mb-4">
                                    <Gauge size={20} className="text-[#466A68]" />
                                </div>
                                <h4 className="font-semibold text-[#382821] mb-2">
                                    Jangan Sering Ubah Suhu
                                </h4>
                                <p className="text-[#382821]/70 text-sm">
                                    Hindari terlalu sering mengubah pengatur suhu. Jika sudah
                                    sesuai, sebaiknya tidak perlu diubah-ubah.
                                </p>
                            </div>

                            {/* Tip 2 */}
                            <div className="p-5 rounded-2xl bg-[#466A68]/5 border border-[#466A68]/10">
                                <div className="w-10 h-10 rounded-xl bg-[#466A68]/10 flex items-center justify-center mb-4">
                                    <Shield size={20} className="text-[#466A68]" />
                                </div>
                                <h4 className="font-semibold text-[#382821] mb-2">
                                    Gunakan Stabilizer
                                </h4>
                                <p className="text-[#382821]/70 text-sm">
                                    Jika tersedia, sangat disarankan menggunakan stabilizer untuk
                                    membantu menjaga kestabilan tegangan.
                                </p>
                            </div>
                        </div>

                        {/* Checklist */}
                        <div className="p-6 rounded-2xl bg-gradient-to-br from-[#FFFBF7] to-[#F3E7DB] border border-[#E2CDBA]">
                            <h4 className="font-bold text-[#382821] mb-4">
                                Periksa secara berkala:
                            </h4>
                            <div className="grid sm:grid-cols-3 gap-4">
                                <div className="flex items-center gap-3 p-3 rounded-xl bg-white/60">
                                    <PlugZap size={18} className="text-[#466A68]" />
                                    <span className="text-[#382821]/80 text-sm">
                                        Colokan listrik
                                    </span>
                                </div>
                                <div className="flex items-center gap-3 p-3 rounded-xl bg-white/60">
                                    <ThermometerSnowflake size={18} className="text-[#466A68]" />
                                    <span className="text-[#382821]/80 text-sm">
                                        Posisi pengatur suhu
                                    </span>
                                </div>
                                <div className="flex items-center gap-3 p-3 rounded-xl bg-white/60">
                                    <Snowflake size={18} className="text-[#466A68]" />
                                    <span className="text-[#382821]/80 text-sm">
                                        Ketebalan lapisan es
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Troubleshooting */}
                        <div className="mt-8 p-5 rounded-2xl bg-[#C48B77]/10 border border-[#C48B77]/20">
                            <h4 className="font-bold text-[#382821] mb-4">
                                Jika lapisan es tiba-tiba berkurang atau freezer terasa tidak
                                sedingin biasanya:
                            </h4>
                            <ul className="space-y-3">
                                <li className="flex items-start gap-3">
                                    <span className="w-6 h-6 rounded-full bg-[#C48B77]/20 flex items-center justify-center flex-shrink-0 text-[#C48B77] text-sm font-bold">
                                        1
                                    </span>
                                    <span className="text-[#382821]/80">
                                        Pastikan colokan tidak longgar/terlepas
                                    </span>
                                </li>
                                <li className="flex items-start gap-3">
                                    <span className="w-6 h-6 rounded-full bg-[#C48B77]/20 flex items-center justify-center flex-shrink-0 text-[#C48B77] text-sm font-bold">
                                        2
                                    </span>
                                    <span className="text-[#382821]/80">
                                        Cabut colokan, tunggu 15 menit, lalu colokkan kembali
                                    </span>
                                </li>
                                <li className="flex items-start gap-3">
                                    <span className="w-6 h-6 rounded-full bg-[#C48B77]/20 flex items-center justify-center flex-shrink-0 text-[#C48B77] text-sm font-bold">
                                        3
                                    </span>
                                    <span className="text-[#382821]/80">
                                        Pastikan pengatur suhu tidak berubah ke posisi OFF
                                    </span>
                                </li>
                            </ul>
                        </div>
                    </div>
                </Container>
            </section>

            {/* ═══════════════════════════════════════════════════════ */}
            {/* HAL-HAL YANG PERLU DIPERHATIKAN (ACCORDION)            */}
            {/* ═══════════════════════════════════════════════════════ */}
            <section className="py-16 md:py-20 px-6 bg-gradient-to-b from-[#F8F4F0] to-white">
                <Container>
                    <div className="max-w-4xl mx-auto">
                        {/* Section Header */}
                        <div className="text-center mb-12">
                            <h2 className="text-2xl md:text-3xl font-bold text-[#382821] mb-3">
                                Hal-hal yang Perlu Diperhatikan
                            </h2>
                            <p className="text-[#382821]/60">
                                Klik untuk melihat detail masing-masing panduan
                            </p>
                        </div>

                        {/* Accordion Items */}
                        <div className="space-y-4">
                            {/* Item 1: Listrik Padam */}
                            <details className="group rounded-2xl bg-white border border-[#466A68]/10 shadow-sm overflow-hidden">
                                <summary className="flex items-center justify-between p-5 cursor-pointer list-none hover:bg-[#466A68]/5 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-yellow-100 flex items-center justify-center">
                                            <Zap size={20} className="text-yellow-600" />
                                        </div>
                                        <span className="font-semibold text-[#382821] text-lg">
                                            1. Jika Listrik Padam
                                        </span>
                                    </div>
                                    <ChevronDown
                                        size={20}
                                        className="text-[#382821]/40 group-open:rotate-180 transition-transform"
                                    />
                                </summary>
                                <div className="px-5 pb-5 pt-0">
                                    <div className="pl-14 space-y-4">
                                        <ul className="space-y-3">
                                            <li className="flex items-start gap-3">
                                                <CheckCircle size={18} className="text-[#466A68] flex-shrink-0 mt-0.5" />
                                                <span className="text-[#382821]/80">
                                                    Segera <strong>cabut colokan</strong> saat listrik
                                                    mati.
                                                </span>
                                            </li>
                                            <li className="flex items-start gap-3">
                                                <CheckCircle size={18} className="text-[#466A68] flex-shrink-0 mt-0.5" />
                                                <span className="text-[#382821]/80">
                                                    Setelah listrik menyala kembali,{" "}
                                                    <strong>tunggu 15 menit</strong> sebelum freezer
                                                    dicolokkan kembali untuk menghindari risiko tegangan
                                                    tinggi.
                                                </span>
                                            </li>
                                            <li className="flex items-start gap-3">
                                                <CheckCircle size={18} className="text-[#466A68] flex-shrink-0 mt-0.5" />
                                                <span className="text-[#382821]/80">
                                                    Saat listrik padam, <strong>hindari sering membuka freezer</strong>.
                                                    Berdasarkan pengalaman, dalam kondisi listrik padam
                                                    hingga 16 jam, isi freezer masih dapat tetap beku
                                                    bila pintu tidak sering dibuka.
                                                </span>
                                            </li>
                                        </ul>
                                    </div>
                                </div>
                            </details>

                            {/* Item 2: Dipindahkan */}
                            <details className="group rounded-2xl bg-white border border-[#466A68]/10 shadow-sm overflow-hidden">
                                <summary className="flex items-center justify-between p-5 cursor-pointer list-none hover:bg-[#466A68]/5 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                                            <Move size={20} className="text-blue-600" />
                                        </div>
                                        <span className="font-semibold text-[#382821] text-lg">
                                            2. Jika Freezer Dipindahkan
                                        </span>
                                    </div>
                                    <ChevronDown
                                        size={20}
                                        className="text-[#382821]/40 group-open:rotate-180 transition-transform"
                                    />
                                </summary>
                                <div className="px-5 pb-5 pt-0">
                                    <div className="pl-14 space-y-4">
                                        <ul className="space-y-3">
                                            <li className="flex items-start gap-3">
                                                <CheckCircle size={18} className="text-[#466A68] flex-shrink-0 mt-0.5" />
                                                <span className="text-[#382821]/80">
                                                    Setelah dipindahkan, <strong>jangan langsung dinyalakan</strong>.
                                                </span>
                                            </li>
                                            <li className="flex items-start gap-3">
                                                <CheckCircle size={18} className="text-[#466A68] flex-shrink-0 mt-0.5" />
                                                <span className="text-[#382821]/80">
                                                    Tunggu <strong>1–2 jam</strong> sebelum menyalakan
                                                    kembali (tergantung jarak dan tingkat guncangan saat
                                                    pemindahan). Semakin lama waktu tunggu, semakin baik.
                                                </span>
                                            </li>
                                        </ul>
                                    </div>
                                </div>
                            </details>

                            {/* Item 3: Cara Defrost */}
                            <details className="group rounded-2xl bg-white border border-[#466A68]/10 shadow-sm overflow-hidden">
                                <summary className="flex items-center justify-between p-5 cursor-pointer list-none hover:bg-[#466A68]/5 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-cyan-100 flex items-center justify-center">
                                            <Droplets size={20} className="text-cyan-600" />
                                        </div>
                                        <span className="font-semibold text-[#382821] text-lg">
                                            3. Cara Defrost (Mencairkan Bunga Es)
                                        </span>
                                    </div>
                                    <ChevronDown
                                        size={20}
                                        className="text-[#382821]/40 group-open:rotate-180 transition-transform"
                                    />
                                </summary>
                                <div className="px-5 pb-5 pt-0">
                                    <div className="pl-14 space-y-4">
                                        <p className="text-[#382821]/80">
                                            Selama penggunaan, lapisan es pada dinding freezer akan
                                            menebal. Lakukan defrost sebelum lapisan terlalu tebal,
                                            karena semakin tebal semakin sulit dibersihkan.
                                        </p>

                                        <div className="p-4 rounded-xl bg-[#466A68]/5 border border-[#466A68]/10">
                                            <h5 className="font-semibold text-[#382821] mb-3">
                                                Langkah Defrost:
                                            </h5>
                                            <ol className="space-y-2 text-[#382821]/80">
                                                <li className="flex items-start gap-3">
                                                    <span className="w-5 h-5 rounded-full bg-[#466A68] text-white text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                                                        1
                                                    </span>
                                                    Cabut colokan listrik (tidak perlu memutar pengatur
                                                    suhu).
                                                </li>
                                                <li className="flex items-start gap-3">
                                                    <span className="w-5 h-5 rounded-full bg-[#466A68] text-white text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                                                        2
                                                    </span>
                                                    Pindahkan isi freezer sementara ke kulkas.
                                                </li>
                                                <li className="flex items-start gap-3">
                                                    <span className="w-5 h-5 rounded-full bg-[#466A68] text-white text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                                                        3
                                                    </span>
                                                    <span>
                                                        Hilangkan lapisan es menggunakan:
                                                        <ul className="mt-2 ml-4 space-y-1 list-disc">
                                                            <li>Semprotan air (bila perlu)</li>
                                                            <li>Centong plastik</li>
                                                        </ul>
                                                    </span>
                                                </li>
                                                <li className="flex items-start gap-3">
                                                    <span className="w-5 h-5 rounded-full bg-[#466A68] text-white text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                                                        4
                                                    </span>
                                                    Kumpulkan es yang jatuh, lalu buang air melalui
                                                    saluran pembuangan di bagian bawah freezer.
                                                </li>
                                                <li className="flex items-start gap-3">
                                                    <span className="w-5 h-5 rounded-full bg-[#466A68] text-white text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                                                        5
                                                    </span>
                                                    Masukkan kembali isi yang dipindahkan.
                                                </li>
                                                <li className="flex items-start gap-3">
                                                    <span className="w-5 h-5 rounded-full bg-[#466A68] text-white text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                                                        6
                                                    </span>
                                                    Setelah selesai, tunggu 30 menit, lalu colokkan
                                                    freezer kembali.
                                                </li>
                                            </ol>
                                        </div>

                                        <div className="flex items-start gap-3 p-4 rounded-xl bg-[#C48B77]/10 border border-[#C48B77]/20">
                                            <AlertTriangle size={18} className="text-[#C48B77] flex-shrink-0 mt-0.5" />
                                            <span className="text-[#382821]/80 text-sm">
                                                <strong>Penting:</strong> Hindari benda tajam, dan
                                                jangan menusuk dinding freezer, terutama bagian atas.
                                            </span>
                                        </div>

                                        <p className="text-[#382821]/60 text-sm italic">
                                            Jika lapisan es tidak terlalu tebal, proses ini umumnya
                                            hanya 5–10 menit.
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
                            Ayah dan Bunda, semoga program ASI berjalan lancar. Jika ada
                            kendala atau hal yang ingin ditanyakan, silakan hubungi kami—kami
                            siap membantu.
                        </p>

                        <div className="inline-block p-6 rounded-3xl bg-white/10 backdrop-blur-sm border border-white/20 mb-8">
                            <p className="text-white/70 text-sm mb-2">Hormat kami,</p>
                            <p className="text-xl font-bold text-white mb-1">
                                Service Center Mum &apos;N Hun
                            </p>
                            <p className="text-white/90 font-semibold">0853-1211-8352</p>
                        </div>

                        <div>
                            <Button
                                size="lg"
                                className="bg-white text-[#466A68] hover:bg-white/90 px-8 py-6 rounded-full font-semibold text-lg shadow-xl shadow-black/20 hover:-translate-y-1 transition-all"
                                asChild
                            >
                                <Link
                                    href="https://wa.me/6285312118352"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    <Phone size={20} className="mr-2" />
                                    Hubungi via WhatsApp
                                </Link>
                            </Button>
                        </div>
                    </div>
                </Container>
            </section>
        </>
    )
}
