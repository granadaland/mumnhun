import Link from "next/link"
import { Mail, Phone, Instagram, Facebook, Twitter, Youtube, Clock, ShieldCheck, MapPin, Sparkles } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { Container } from "./container"
import { Logo } from "@/components/ui/logo"
import { SITE_NAME, CONTACT_INFO, WHATSAPP_LINK, SOCIAL_URLS } from "@/lib/constants"

type SocialLink = {
    name: string
    href: string | null
    icon: LucideIcon
}

const SOCIAL_LINKS: SocialLink[] = [
    {
        name: "Instagram",
        href: SOCIAL_URLS.instagram,
        icon: Instagram,
    },
    {
        name: "Facebook",
        href: SOCIAL_URLS.facebook,
        icon: Facebook,
    },
    {
        name: "X (Twitter)",
        href: SOCIAL_URLS.twitter,
        icon: Twitter,
    },
    {
        name: "YouTube",
        href: SOCIAL_URLS.youtube,
        icon: Youtube,
    },
]

const FOOTER_LEGAL_LINKS = [
    { href: "/syarat-ketentuan", label: "Syarat & Ketentuan" },
    { href: "/kebijakan-privasi", label: "Kebijakan Privasi" },
    { href: "/petunjuk-pemakaian", label: "Petunjuk Penggunaan" },
    { href: "/kontak", label: "Kontak" },
    { href: "/html-sitemap", label: "Sitemap" },
]

const COVERAGE_AREAS = [
    "Jakarta Selatan", "Jakarta Barat", "Jakarta Pusat", "Jakarta Timur", "Jakarta Utara",
    "Depok", "Tangerang", "Tangerang Selatan", "BSD", "Bintaro", "Bekasi", "Bogor"
]

export function Footer() {
    return (
        <footer className="relative bg-[#281E19] text-[#F7F3EE] pt-16 md:pt-20 pb-12 overflow-hidden">
            {/* Ambient Warm Gradient Overlay */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-[#2E5650]/20 rounded-full blur-[100px] pointer-events-none -z-0" />
            <div className="absolute bottom-0 left-0 w-80 h-80 bg-[#C87860]/10 rounded-full blur-[100px] pointer-events-none -z-0" />

            <Container className="relative z-10">
                {/* Top Trust Highlights */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pb-12 mb-12 border-b border-white/10">
                    <div className="flex items-center gap-3.5 p-3 rounded-2xl bg-white/5 border border-white/5">
                        <div className="w-10 h-10 rounded-xl bg-[#2E5650]/40 flex items-center justify-center text-[#B0D5D0] shrink-0">
                            <ShieldCheck className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-white uppercase tracking-wider">Garansi Unit</p>
                            <p className="text-xs text-[#F7F3EE]/70">Tukar unit cepat 24 jam</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3.5 p-3 rounded-2xl bg-white/5 border border-white/5">
                        <div className="w-10 h-10 rounded-xl bg-[#C87860]/30 flex items-center justify-center text-[#F9D0C3] shrink-0">
                            <Sparkles className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-white uppercase tracking-wider">100% Steril</p>
                            <p className="text-xs text-[#F7F3EE]/70">Pembersihan food grade</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3.5 p-3 rounded-2xl bg-white/5 border border-white/5">
                        <div className="w-10 h-10 rounded-xl bg-[#2E5650]/40 flex items-center justify-center text-[#B0D5D0] shrink-0">
                            <MapPin className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-white uppercase tracking-wider">Antar Cepat</p>
                            <p className="text-xs text-[#F7F3EE]/70">Seluruh area Jabodetabek</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3.5 p-3 rounded-2xl bg-white/5 border border-white/5">
                        <div className="w-10 h-10 rounded-xl bg-[#C87860]/30 flex items-center justify-center text-[#F9D0C3] shrink-0">
                            <Clock className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-white uppercase tracking-wider">Sejak 2010</p>
                            <p className="text-xs text-[#F7F3EE]/70">5.000+ ibu terbantu</p>
                        </div>
                    </div>
                </div>

                {/* Main 4-Column Footer Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-10 lg:gap-8 pb-12 border-b border-white/10">
                    {/* Brand & Mission (Col 1 - 4 Cols) */}
                    <div className="lg:col-span-4 space-y-5">
                        <Link href="/" className="inline-block group">
                            <Logo className="w-[145px] h-auto" variant="light" />
                        </Link>
                        <p className="text-sm text-[#F7F3EE]/75 leading-relaxed max-w-sm">
                            Solusi terpercaya sewa freezer ASI dan rental kulkas ASI untuk ibu menyusui dan ibu bekerja. Mendukung pemberian ASI eksklusif dengan unit steril, hemat energi, dan pengantaran langsung ke rumah.
                        </p>
                        {/* Social Links */}
                        <div className="flex items-center gap-2.5 pt-2">
                            {SOCIAL_LINKS.map((social) => {
                                const Icon = social.icon
                                if (!social.href) {
                                    return (
                                        <span
                                            key={social.name}
                                            aria-label={`${social.name} belum tersedia`}
                                            title={`${social.name} segera tersedia`}
                                            className="w-9 h-9 rounded-full bg-white/5 text-white/30 flex items-center justify-center cursor-not-allowed"
                                        >
                                            <Icon className="h-4 w-4" />
                                        </span>
                                    )
                                }
                                return (
                                    <Link
                                        key={social.name}
                                        href={social.href}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="w-9 h-9 rounded-full bg-white/10 text-[#F7F3EE] flex items-center justify-center hover:bg-[#2E5650] hover:text-white hover:-translate-y-0.5 transition-all"
                                        aria-label={`Kunjungi ${social.name} Mum 'n Hun`}
                                    >
                                        <Icon className="h-4 w-4" />
                                    </Link>
                                )
                            })}
                        </div>
                    </div>

                    {/* Quick Navigation (Col 2 - 3 Cols) */}
                    <div className="lg:col-span-3">
                        <p className="text-xs font-bold text-white uppercase tracking-widest mb-4">
                            Navigasi Cepat
                        </p>
                        <ul className="space-y-2.5 text-sm">
                            {[
                                { href: "/#pricing", label: "Paket Sewa Bulanan" },
                                { href: "/petunjuk-pemakaian", label: "Petunjuk Penggunaan" },
                                { href: "/syarat-ketentuan", label: "Syarat & Ketentuan" },
                                { href: "/blog", label: "Artikel & Tips ASI" },
                                { href: "/kontak", label: "Kontak & Konsultasi" },
                            ].map((link) => (
                                <li key={link.href}>
                                    <Link
                                        href={link.href}
                                        className="text-[#F7F3EE]/75 hover:text-[#B0D5D0] hover:translate-x-1 inline-flex items-center gap-2 transition-all"
                                    >
                                        <span className="w-1.5 h-1.5 rounded-full bg-[#B0D5D0]/60" />
                                        {link.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Service Areas (Col 3 - 5 Cols) */}
                    <div className="lg:col-span-5 space-y-4">
                        <p className="text-xs font-bold text-white uppercase tracking-widest">
                            Area Layanan Pengiriman
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                            {COVERAGE_AREAS.map((area) => (
                                <span
                                    key={area}
                                    className="px-2.5 py-1 text-xs rounded-lg bg-white/5 text-[#F7F3EE]/80 border border-white/5"
                                >
                                    {area}
                                </span>
                            ))}
                        </div>

                        {/* Direct Contact Card */}
                        <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2.5 mt-4">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-[#2E5650] flex items-center justify-center text-white shrink-0">
                                    <Phone className="w-4 h-4" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[11px] text-[#F7F3EE]/60 uppercase font-semibold">WhatsApp Layanan</p>
                                    <Link
                                        href={WHATSAPP_LINK}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-sm font-bold text-white hover:text-[#B0D5D0] transition-colors"
                                    >
                                        {CONTACT_INFO.phone}
                                    </Link>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white shrink-0">
                                    <Mail className="w-4 h-4" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[11px] text-[#F7F3EE]/60 uppercase font-semibold">Email Resmi</p>
                                    <Link
                                        href={`mailto:${CONTACT_INFO.email}`}
                                        className="text-sm text-[#F7F3EE]/90 hover:text-white transition-colors truncate block"
                                    >
                                        {CONTACT_INFO.email}
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Bottom Legal & Copyright */}
                <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#F7F3EE]/50">
                    <p>&copy; {new Date().getFullYear()} {SITE_NAME}. Semua Hak Dilindungi Undang-Undang.</p>
                    <nav className="flex flex-wrap gap-4 sm:gap-6" aria-label="Tautan Hukum">
                        {FOOTER_LEGAL_LINKS.map((link) => (
                            <Link
                                key={link.href}
                                href={link.href}
                                className="hover:text-[#F7F3EE] transition-colors"
                            >
                                {link.label}
                            </Link>
                        ))}
                    </nav>
                </div>
            </Container>
        </footer>
    )
}

