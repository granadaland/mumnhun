import Link from "next/link"
import Image from "next/image"
import { Mail, Phone, Instagram, Facebook, Twitter } from "lucide-react"
import { Container } from "./container"
import { SITE_NAME, CONTACT_INFO, WHATSAPP_LINK } from "@/lib/constants"

export function Footer() {
    return (
        <footer className="relative bg-gradient-to-r from-[#D4BCAA] to-[#F4EEE7] border-t border-[#382821]/10 pt-20 pb-10">
            <Container>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-12 lg:gap-8">
                    {/* Column 1: Brand + Social (lg:col-span-4) */}
                    <div className="lg:col-span-4">
                        {/* Logo - same as header */}
                        <Link href="/" className="inline-block mb-6">
                            <Image
                                src="https://res.cloudinary.com/dvqcs0zqi/image/upload/v1769979416/Logo_MumNhun_krpo1l.webp"
                                alt="Mum 'N Hun Logo"
                                width={140}
                                height={56}
                                className="w-[120px] h-auto object-contain"
                            />
                        </Link>

                        {/* Description */}
                        <p className="text-[#382821]/70 text-sm leading-relaxed mb-6 max-w-xs">
                            Solusi terpercaya untuk kebutuhan penyimpanan ASI ibu bekerja. Kami berkomitmen mendukung pemberian ASI eksklusif dengan layanan sewa freezer yang aman, higienis, dan terjangkau.
                        </p>

                        {/* Social Icons */}
                        <div className="flex gap-3">
                            <Link
                                href="#"
                                className="w-10 h-10 rounded-full bg-[#382821] text-[#D4BCAA] flex items-center justify-center hover:bg-[#466A68] hover:-translate-y-1 transition-all shadow-lg"
                                aria-label="Instagram"
                            >
                                <Instagram className="h-4 w-4" />
                            </Link>
                            <Link
                                href="#"
                                className="w-10 h-10 rounded-full bg-[#382821] text-[#D4BCAA] flex items-center justify-center hover:bg-[#466A68] hover:-translate-y-1 transition-all shadow-lg"
                                aria-label="Facebook"
                            >
                                <Facebook className="h-4 w-4" />
                            </Link>
                            <Link
                                href="#"
                                className="w-10 h-10 rounded-full bg-[#382821] text-[#D4BCAA] flex items-center justify-center hover:bg-[#466A68] hover:-translate-y-1 transition-all shadow-lg"
                                aria-label="Twitter"
                            >
                                <Twitter className="h-4 w-4" />
                            </Link>
                        </div>
                    </div>

                    {/* Column 2: Layanan (lg:col-span-3) */}
                    <div className="lg:col-span-3">
                        <h3 className="text-sm font-bold text-[#382821] uppercase tracking-wider mb-6">
                            Layanan
                        </h3>
                        <ul className="space-y-3">
                            {[
                                { href: "/#pricing", label: "Sewa Freezer ASI" },
                                { href: "/petunjuk", label: "Petunjuk Penggunaan" },
                                { href: "/syarat-ketentuan", label: "Syarat & Ketentuan" },
                                { href: "/blog", label: "Artikel & Tips" },
                                { href: "/kontak", label: "Kontak Kami" },
                            ].map((link) => (
                                <li key={link.href}>
                                    <Link
                                        href={link.href}
                                        className="text-[#382821]/70 hover:text-[#466A68] hover:font-medium hover:translate-x-1 inline-flex items-center gap-2 text-sm transition-all"
                                    >
                                        <span className="w-1.5 h-1.5 rounded-full bg-[#466A68]/50" />
                                        {link.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Column 3: Kontak (lg:col-span-5) */}
                    <div className="lg:col-span-5">
                        <h3 className="text-sm font-bold text-[#382821] uppercase tracking-wider mb-6">
                            Hubungi Kami
                        </h3>
                        <div className="space-y-4">
                            {/* Phone */}
                            <div className="bg-[#382821]/5 p-4 rounded-2xl hover:bg-[#382821]/10 transition-colors">
                                <div className="flex items-start gap-3">
                                    <div className="w-10 h-10 rounded-full bg-[#466A68]/10 flex items-center justify-center text-[#466A68]">
                                        <Phone className="h-4 w-4" />
                                    </div>
                                    <div>
                                        <Link
                                            href={WHATSAPP_LINK}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-[#382821] font-semibold hover:text-[#466A68] transition-colors"
                                        >
                                            {CONTACT_INFO.phone}
                                        </Link>
                                        <p className="text-xs text-[#382821]/50 mt-0.5">WhatsApp</p>
                                    </div>
                                </div>
                            </div>

                            {/* Email */}
                            <div className="bg-[#382821]/5 p-4 rounded-2xl hover:bg-[#382821]/10 transition-colors">
                                <div className="flex items-start gap-3">
                                    <div className="w-10 h-10 rounded-full bg-[#466A68]/10 flex items-center justify-center text-[#466A68]">
                                        <Mail className="h-4 w-4" />
                                    </div>
                                    <div>
                                        <Link
                                            href={`mailto:${CONTACT_INFO.email}`}
                                            className="text-[#382821] font-semibold hover:text-[#466A68] transition-colors"
                                        >
                                            {CONTACT_INFO.email}
                                        </Link>
                                    </div>
                                </div>
                            </div>

                        </div>
                    </div>
                </div>

                {/* Bottom Copyright */}
                <div className="border-t border-[#382821]/10 pt-8 mt-12 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-[#382821]/50">
                    <p>
                        © {new Date().getFullYear()} {SITE_NAME}. All rights reserved.
                    </p>
                    <div className="flex gap-6">
                        <Link href="/privacy" className="hover:text-[#466A68] transition-colors">Privacy Policy</Link>
                        <Link href="/terms" className="hover:text-[#466A68] transition-colors">Terms of Service</Link>
                    </div>
                </div>
            </Container>
        </footer>
    )
}
