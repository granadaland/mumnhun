import { Metadata } from "next"
import { Container } from "@/components/layout"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
    FileText,
    CreditCard,
    Truck,
    Calendar,
    Clock,
    Shield,
    Phone,
    UserCheck,
    MapPin,
    Snowflake,
    ChevronDown,
    CheckCircle,
    AlertTriangle,
    XCircle,
    RefreshCw,
    Headphones,
} from "lucide-react"
import { SITE_NAME, SITE_URL } from "@/lib/constants"

export const metadata: Metadata = {
    title: "Syarat dan Ketentuan",
    description:
        "Syarat dan ketentuan penyewaan freezer ASI Mum 'n Hun. Informasi lengkap tentang pembayaran, pengiriman, dan ketentuan sewa.",
    alternates: {
        canonical: `${SITE_URL}/syarat-ketentuan`,
    },
    openGraph: {
        title: "Syarat dan Ketentuan",
        description:
            "Syarat dan ketentuan penyewaan freezer ASI Mum 'n Hun. Informasi lengkap tentang pembayaran, pengiriman, dan ketentuan sewa.",
        url: `${SITE_URL}/syarat-ketentuan`,
        type: "article",
        siteName: SITE_NAME,
    },
    twitter: {
        card: "summary_large_image",
        title: "Syarat dan Ketentuan",
        description:
            "Syarat dan ketentuan penyewaan freezer ASI Mum 'n Hun. Informasi lengkap tentang pembayaran, pengiriman, dan ketentuan sewa.",
    },
}

export default function SyaratKetentuanPage() {
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
                        backgroundImage:
                            "url(https://res.cloudinary.com/dvqcs0zqi/image/upload/v1769978885/Rental_Kulkas_ASI_uimlbz.webp)",
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                    }}
                />

                {/* Decorative Elements */}
                <div className="absolute top-20 right-10 w-64 h-64 bg-[#466A68]/5 rounded-full blur-3xl -z-10" />
                <div className="absolute bottom-10 left-10 w-48 h-48 bg-[#C48B77]/10 rounded-full blur-3xl -z-10" />

                <Container className="relative z-10">
                    <div className="text-center max-w-3xl mx-auto">
                        {/* Badge */}
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/60 border border-white/50 backdrop-blur-sm shadow-sm mb-6">
                            <FileText size={16} className="text-[#466A68]" />
                            <span className="text-xs font-semibold tracking-wide text-[#382821] uppercase">
                                Ketentuan Resmi
                            </span>
                        </div>

                        {/* Title */}
                        <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold text-[#382821] leading-tight mb-6">
                            Syarat dan Ketentuan{" "}
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#466A68] to-[#2F4A48]">
                                Penyewaan
                            </span>
                        </h1>

                        {/* Subtitle */}
                        <p className="text-[#382821]/70 text-lg md:text-xl leading-relaxed">
                            Selamat datang di layanan rental freezer ASI Mum &apos;n Hun.
                            Dengan melakukan pemesanan, Ayah/Bunda dianggap telah membaca,
                            memahami, dan menyetujui seluruh ketentuan di bawah ini.
                        </p>
                    </div>
                </Container>
            </section>

            {/* ═══════════════════════════════════════════════════════ */}
            {/* SECTION A: SYARAT PENYEWAAN                            */}
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
                                Syarat Penyewaan
                            </h2>
                        </div>

                        {/* Content Cards */}
                        <div className="space-y-6">
                            {/* Data Identitas */}
                            <div className="p-6 rounded-2xl bg-gradient-to-br from-[#FFFBF7] to-[#F3E7DB] border border-[#E2CDBA]">
                                <div className="flex items-start gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-[#466A68]/10 flex items-center justify-center flex-shrink-0">
                                        <UserCheck size={24} className="text-[#466A68]" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-[#382821] mb-2">
                                            Data Identitas
                                        </h3>
                                        <p className="text-[#382821]/70 mb-3">
                                            Setiap penyewa wajib mengirimkan foto KTP untuk keperluan
                                            verifikasi dan keamanan transaksi.
                                        </p>
                                        <div className="flex items-start gap-2 p-3 rounded-xl bg-white/60 border border-white/80">
                                            <Shield size={16} className="text-[#466A68] flex-shrink-0 mt-0.5" />
                                            <p className="text-sm text-[#382821]/60">
                                                Untuk menjaga privasi, Ayah/Bunda diperbolehkan menutup
                                                bagian data yang bersifat rahasia (confidential).
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Alamat Pengiriman */}
                            <div className="p-6 rounded-2xl bg-gradient-to-br from-[#FFFBF7] to-[#F3E7DB] border border-[#E2CDBA]">
                                <div className="flex items-start gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-[#466A68]/10 flex items-center justify-center flex-shrink-0">
                                        <MapPin size={24} className="text-[#466A68]" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-[#382821] mb-2">
                                            Alamat Pengiriman
                                        </h3>
                                        <p className="text-[#382821]/70">
                                            Ayah/Bunda wajib memberikan alamat pengiriman yang jelas
                                            dan lengkap, termasuk patokan bila diperlukan. Pastikan
                                            alamat mudah diakses agar proses pengiriman berjalan
                                            lancar dan menghindari kesalahan.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Penggunaan Freezer */}
                            <div className="p-6 rounded-2xl bg-gradient-to-br from-[#FFFBF7] to-[#F3E7DB] border border-[#E2CDBA]">
                                <div className="flex items-start gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-[#466A68]/10 flex items-center justify-center flex-shrink-0">
                                        <Snowflake size={24} className="text-[#466A68]" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-[#382821] mb-2">
                                            Penggunaan Freezer
                                        </h3>
                                        <p className="text-[#382821]/70">
                                            Freezer yang disewakan hanya digunakan untuk penyimpanan
                                            ASI. Ayah/Bunda bertanggung jawab menjaga kebersihan serta
                                            kondisi freezer selama masa sewa.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </Container>
            </section>

            {/* ═══════════════════════════════════════════════════════ */}
            {/* SECTION B: KETENTUAN LAYANAN (ACCORDION)               */}
            {/* ═══════════════════════════════════════════════════════ */}
            <section className="py-16 md:py-20 px-6 bg-gradient-to-b from-[#F8F4F0] to-white">
                <Container>
                    <div className="max-w-4xl mx-auto">
                        {/* Section Header */}
                        <div className="flex items-center gap-4 mb-10">
                            <div className="w-12 h-12 rounded-2xl bg-[#466A68] flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-[#466A68]/30">
                                B
                            </div>
                            <h2 className="text-2xl md:text-3xl font-bold text-[#382821]">
                                Ketentuan Layanan
                            </h2>
                        </div>

                        {/* Accordion Items */}
                        <div className="space-y-4">
                            {/* 1. Pembayaran */}
                            <details className="group rounded-2xl bg-white border border-[#466A68]/10 shadow-sm overflow-hidden">
                                <summary className="flex items-center justify-between p-5 cursor-pointer list-none hover:bg-[#466A68]/5 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
                                            <CreditCard size={20} className="text-green-600" />
                                        </div>
                                        <span className="font-semibold text-[#382821] text-lg">
                                            1. Pembayaran
                                        </span>
                                    </div>
                                    <ChevronDown
                                        size={20}
                                        className="text-[#382821]/40 group-open:rotate-180 transition-transform"
                                    />
                                </summary>
                                <div className="px-5 pb-5 pt-0">
                                    <div className="pl-14 space-y-3">
                                        <ul className="space-y-3">
                                            <li className="flex items-start gap-3">
                                                <CheckCircle size={18} className="text-[#466A68] flex-shrink-0 mt-0.5" />
                                                <span className="text-[#382821]/80">
                                                    Pembayaran sewa dilakukan melalui{" "}
                                                    <strong>transfer bank</strong> ke rekening resmi Mum
                                                    &apos;n Hun.
                                                </span>
                                            </li>
                                            <li className="flex items-start gap-3">
                                                <CheckCircle size={18} className="text-[#466A68] flex-shrink-0 mt-0.5" />
                                                <span className="text-[#382821]/80">
                                                    Informasi rekening akan diberikan saat proses
                                                    pemesanan.
                                                </span>
                                            </li>
                                            <li className="flex items-start gap-3">
                                                <CheckCircle size={18} className="text-[#466A68] flex-shrink-0 mt-0.5" />
                                                <span className="text-[#382821]/80">
                                                    Setelah transfer, Ayah/Bunda dimohon mengirimkan{" "}
                                                    <strong>bukti pembayaran</strong> agar verifikasi
                                                    dapat diproses lebih cepat.
                                                </span>
                                            </li>
                                        </ul>
                                    </div>
                                </div>
                            </details>

                            {/* 2. Pembatalan dan Pengembalian Dana */}
                            <details className="group rounded-2xl bg-white border border-[#466A68]/10 shadow-sm overflow-hidden">
                                <summary className="flex items-center justify-between p-5 cursor-pointer list-none hover:bg-[#466A68]/5 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
                                            <RefreshCw size={20} className="text-orange-600" />
                                        </div>
                                        <span className="font-semibold text-[#382821] text-lg">
                                            2. Pembatalan dan Pengembalian Dana
                                        </span>
                                    </div>
                                    <ChevronDown
                                        size={20}
                                        className="text-[#382821]/40 group-open:rotate-180 transition-transform"
                                    />
                                </summary>
                                <div className="px-5 pb-5 pt-0">
                                    <div className="pl-14 space-y-3">
                                        <ul className="space-y-3">
                                            <li className="flex items-start gap-3">
                                                <CheckCircle size={18} className="text-[#466A68] flex-shrink-0 mt-0.5" />
                                                <span className="text-[#382821]/80">
                                                    Pembatalan sewa dapat dilakukan minimal{" "}
                                                    <strong>3 hari sebelum</strong> tanggal pengiriman
                                                    terjadwal untuk mendapatkan pengembalian dana penuh.
                                                </span>
                                            </li>
                                            <li className="flex items-start gap-3">
                                                <AlertTriangle size={18} className="text-[#C48B77] flex-shrink-0 mt-0.5" />
                                                <span className="text-[#382821]/80">
                                                    Pembatalan yang dilakukan kurang dari 3 hari sebelum
                                                    pengiriman akan dikenakan{" "}
                                                    <strong>biaya administrasi</strong>.
                                                </span>
                                            </li>
                                        </ul>
                                    </div>
                                </div>
                            </details>

                            {/* 3. Pengiriman dan Pengembalian Unit */}
                            <details className="group rounded-2xl bg-white border border-[#466A68]/10 shadow-sm overflow-hidden">
                                <summary className="flex items-center justify-between p-5 cursor-pointer list-none hover:bg-[#466A68]/5 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                                            <Truck size={20} className="text-blue-600" />
                                        </div>
                                        <span className="font-semibold text-[#382821] text-lg">
                                            3. Pengiriman dan Pengembalian Unit
                                        </span>
                                    </div>
                                    <ChevronDown
                                        size={20}
                                        className="text-[#382821]/40 group-open:rotate-180 transition-transform"
                                    />
                                </summary>
                                <div className="px-5 pb-5 pt-0">
                                    <div className="pl-14 space-y-4">
                                        <div className="grid sm:grid-cols-2 gap-4">
                                            <div className="p-4 rounded-xl bg-[#466A68]/5 border border-[#466A68]/10">
                                                <p className="text-sm font-semibold text-[#466A68] mb-2">
                                                    Jadwal Pengiriman
                                                </p>
                                                <p className="text-[#382821]/80 text-sm">
                                                    Sabtu–Kamis, pukul 09.00–17.00 WIB
                                                </p>
                                            </div>
                                            <div className="p-4 rounded-xl bg-[#466A68]/5 border border-[#466A68]/10">
                                                <p className="text-sm font-semibold text-[#466A68] mb-2">
                                                    Jadwal Pengambilan
                                                </p>
                                                <p className="text-[#382821]/80 text-sm">
                                                    Sabtu–Kamis (sesuai kesepakatan)
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-start gap-2 p-3 rounded-xl bg-[#C48B77]/10 border border-[#C48B77]/20">
                                            <XCircle size={16} className="text-[#C48B77] flex-shrink-0 mt-0.5" />
                                            <p className="text-sm text-[#382821]/70">
                                                <strong>Tidak ada pengiriman/pengambilan pada hari
                                                    Jumat.</strong>
                                            </p>
                                        </div>
                                        <p className="text-[#382821]/80 text-sm">
                                            Saat pengembalian, freezer harus dalam kondisi bersih dan
                                            siap diambil sesuai jadwal yang telah disepakati.
                                        </p>
                                    </div>
                                </div>
                            </details>

                            {/* 4. Hari Libur Operasional */}
                            <details className="group rounded-2xl bg-white border border-[#466A68]/10 shadow-sm overflow-hidden">
                                <summary className="flex items-center justify-between p-5 cursor-pointer list-none hover:bg-[#466A68]/5 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
                                            <Calendar size={20} className="text-red-600" />
                                        </div>
                                        <span className="font-semibold text-[#382821] text-lg">
                                            4. Hari Libur Operasional
                                        </span>
                                    </div>
                                    <ChevronDown
                                        size={20}
                                        className="text-[#382821]/40 group-open:rotate-180 transition-transform"
                                    />
                                </summary>
                                <div className="px-5 pb-5 pt-0">
                                    <div className="pl-14 space-y-3">
                                        <p className="text-[#382821]/80">
                                            Mum &apos;n Hun tidak melakukan pengiriman maupun
                                            pengambilan unit pada <strong>hari Jumat</strong>.
                                            Ayah/Bunda mohon merencanakan jadwal sewa dengan
                                            mempertimbangkan ketentuan ini.
                                        </p>
                                    </div>
                                </div>
                            </details>

                            {/* 5. Durasi Sewa dan Perpanjangan */}
                            <details className="group rounded-2xl bg-white border border-[#466A68]/10 shadow-sm overflow-hidden">
                                <summary className="flex items-center justify-between p-5 cursor-pointer list-none hover:bg-[#466A68]/5 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
                                            <Clock size={20} className="text-purple-600" />
                                        </div>
                                        <span className="font-semibold text-[#382821] text-lg">
                                            5. Durasi Sewa dan Perpanjangan
                                        </span>
                                    </div>
                                    <ChevronDown
                                        size={20}
                                        className="text-[#382821]/40 group-open:rotate-180 transition-transform"
                                    />
                                </summary>
                                <div className="px-5 pb-5 pt-0">
                                    <div className="pl-14 space-y-3">
                                        <ul className="space-y-3">
                                            <li className="flex items-start gap-3">
                                                <CheckCircle size={18} className="text-[#466A68] flex-shrink-0 mt-0.5" />
                                                <span className="text-[#382821]/80">
                                                    Durasi sewa minimum adalah{" "}
                                                    <strong>1 (satu) bulan</strong>.
                                                </span>
                                            </li>
                                            <li className="flex items-start gap-3">
                                                <CheckCircle size={18} className="text-[#466A68] flex-shrink-0 mt-0.5" />
                                                <span className="text-[#382821]/80">
                                                    Perpanjangan sewa dapat dilakukan dengan menghubungi
                                                    layanan pelanggan sebelum masa sewa berakhir.
                                                </span>
                                            </li>
                                            <li className="flex items-start gap-3">
                                                <AlertTriangle size={18} className="text-[#C48B77] flex-shrink-0 mt-0.5" />
                                                <span className="text-[#382821]/80">
                                                    Pembayaran perpanjangan wajib dilakukan{" "}
                                                    <strong>sebelum masa sewa berjalan habis</strong>.
                                                </span>
                                            </li>
                                        </ul>
                                    </div>
                                </div>
                            </details>

                            {/* 6. Garansi, Perawatan, dan Kerusakan */}
                            <details className="group rounded-2xl bg-white border border-[#466A68]/10 shadow-sm overflow-hidden">
                                <summary className="flex items-center justify-between p-5 cursor-pointer list-none hover:bg-[#466A68]/5 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-teal-100 flex items-center justify-center">
                                            <Shield size={20} className="text-teal-600" />
                                        </div>
                                        <span className="font-semibold text-[#382821] text-lg">
                                            6. Garansi, Perawatan, dan Kerusakan
                                        </span>
                                    </div>
                                    <ChevronDown
                                        size={20}
                                        className="text-[#382821]/40 group-open:rotate-180 transition-transform"
                                    />
                                </summary>
                                <div className="px-5 pb-5 pt-0">
                                    <div className="pl-14 space-y-3">
                                        <ul className="space-y-3">
                                            <li className="flex items-start gap-3">
                                                <CheckCircle size={18} className="text-[#466A68] flex-shrink-0 mt-0.5" />
                                                <span className="text-[#382821]/80">
                                                    Jika terjadi kendala atau kerusakan, Ayah/Bunda
                                                    dimohon segera menghubungi layanan pelanggan.
                                                </span>
                                            </li>
                                            <li className="flex items-start gap-3">
                                                <CheckCircle size={18} className="text-[#466A68] flex-shrink-0 mt-0.5" />
                                                <span className="text-[#382821]/80">
                                                    Mum &apos;n Hun akan membantu perbaikan atau
                                                    penggantian unit secepatnya.
                                                </span>
                                            </li>
                                            <li className="flex items-start gap-3">
                                                <AlertTriangle size={18} className="text-[#C48B77] flex-shrink-0 mt-0.5" />
                                                <span className="text-[#382821]/80">
                                                    Biaya perbaikan/penggantian <strong>gratis</strong>,
                                                    kecuali kerusakan akibat kelalaian atau penggunaan di
                                                    luar ketentuan, yang menjadi tanggung jawab
                                                    Ayah/Bunda.
                                                </span>
                                            </li>
                                        </ul>
                                    </div>
                                </div>
                            </details>

                            {/* 7. Layanan Pelanggan */}
                            <details className="group rounded-2xl bg-white border border-[#466A68]/10 shadow-sm overflow-hidden">
                                <summary className="flex items-center justify-between p-5 cursor-pointer list-none hover:bg-[#466A68]/5 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-cyan-100 flex items-center justify-center">
                                            <Headphones size={20} className="text-cyan-600" />
                                        </div>
                                        <span className="font-semibold text-[#382821] text-lg">
                                            7. Layanan Pelanggan
                                        </span>
                                    </div>
                                    <ChevronDown
                                        size={20}
                                        className="text-[#382821]/40 group-open:rotate-180 transition-transform"
                                    />
                                </summary>
                                <div className="px-5 pb-5 pt-0">
                                    <div className="pl-14 space-y-3">
                                        <div className="p-4 rounded-xl bg-[#466A68]/5 border border-[#466A68]/10">
                                            <p className="text-[#382821]/80">
                                                Layanan pelanggan siap membantu{" "}
                                                <strong>Sabtu–Kamis, pukul 09.00–17.00 WIB</strong>.
                                            </p>
                                            <p className="text-[#C48B77] text-sm mt-2 font-medium">
                                                Tidak beroperasi pada hari Jumat.
                                            </p>
                                        </div>
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
                            Dengan menyetujui syarat dan ketentuan ini, Ayah/Bunda bersedia
                            mematuhi ketentuan selama masa sewa. Terima kasih telah memilih
                            Mum &apos;n Hun. Kami berkomitmen memberikan layanan terbaik demi
                            kenyamanan dan keamanan Ayah/Bunda serta buah hati.
                        </p>

                        <div className="inline-block p-6 rounded-3xl bg-white/10 backdrop-blur-sm border border-white/20 mb-8">
                            <p className="text-white/70 text-sm mb-2">Hubungi Kami</p>
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
