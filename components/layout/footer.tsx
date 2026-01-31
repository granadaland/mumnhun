import Link from "next/link"
import { Mail, Phone, MapPin, Clock, Instagram, Facebook, Twitter } from "lucide-react"
import { Container } from "./container"
import { SITE_NAME, CONTACT_INFO, WHATSAPP_LINK } from "@/lib/constants"

export function Footer() {
    return (
        <footer className="bg-brown-900 border-t border-brown-800 text-brown-100">
            <Container>
                <div className="py-12 md:py-16">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
                        {/* Column 1: Hubungi Kami */}
                        <div>
                            <h3 className="text-lg font-bold text-white mb-6">
                                Hubungi Kami
                            </h3>
                            <ul className="space-y-4">
                                <li className="flex items-start gap-3">
                                    <Phone className="h-5 w-5 text-teal-400 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <Link
                                            href={WHATSAPP_LINK}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-sm font-medium hover:text-white transition-colors"
                                        >
                                            {CONTACT_INFO.phone}
                                        </Link>
                                        <p className="text-xs text-brown-100/70 mt-0.5">WhatsApp</p>
                                    </div>
                                </li>
                                <li className="flex items-start gap-3">
                                    <Mail className="h-5 w-5 text-teal-400 flex-shrink-0 mt-0.5" />
                                    <Link
                                        href={`mailto:${CONTACT_INFO.email}`}
                                        className="text-sm font-medium hover:text-white transition-colors"
                                    >
                                        {CONTACT_INFO.email}
                                    </Link>
                                </li>
                                <li className="flex items-start gap-3">
                                    <MapPin className="h-5 w-5 text-teal-400 flex-shrink-0 mt-0.5" />
                                    <span className="text-sm font-medium">
                                        {CONTACT_INFO.address}
                                    </span>
                                </li>
                                <li className="flex items-start gap-3">
                                    <Clock className="h-5 w-5 text-teal-400 flex-shrink-0 mt-0.5" />
                                    <span className="text-sm font-medium">
                                        {CONTACT_INFO.workHours}
                                    </span>
                                </li>
                            </ul>
                        </div>

                        {/* Column 2: Layanan */}
                        <div>
                            <h3 className="text-lg font-bold text-white mb-6">
                                Layanan
                            </h3>
                            <ul className="space-y-3">
                                <li>
                                    <Link
                                        href="/#pricing"
                                        className="text-sm hover:text-white transition-colors"
                                    >
                                        Sewa Freezer ASI
                                    </Link>
                                </li>
                                <li>
                                    <Link
                                        href="/petunjuk"
                                        className="text-sm hover:text-white transition-colors"
                                    >
                                        Petunjuk Penggunaan
                                    </Link>
                                </li>
                                <li>
                                    <Link
                                        href="/syarat-ketentuan"
                                        className="text-sm hover:text-white transition-colors"
                                    >
                                        Syarat & Ketentuan
                                    </Link>
                                </li>
                                <li>
                                    <Link
                                        href="/blog"
                                        className="text-sm hover:text-white transition-colors"
                                    >
                                        Artikel & Tips
                                    </Link>
                                </li>
                                <li>
                                    <Link
                                        href="/kontak"
                                        className="text-sm hover:text-white transition-colors"
                                    >
                                        Kontak Kami
                                    </Link>
                                </li>
                            </ul>
                        </div>

                        {/* Column 3: Ikuti Kami */}
                        <div>
                            <h3 className="text-lg font-bold text-white mb-6">
                                Ikuti Kami
                            </h3>
                            <div className="flex gap-4 mb-8">
                                <Link
                                    href="#"
                                    className="w-10 h-10 rounded-full bg-brown-800 flex items-center justify-center text-white hover:bg-teal-600 transition-colors"
                                    aria-label="Instagram"
                                >
                                    <Instagram className="h-5 w-5" />
                                </Link>
                                <Link
                                    href="#"
                                    className="w-10 h-10 rounded-full bg-brown-800 flex items-center justify-center text-white hover:bg-teal-600 transition-colors"
                                    aria-label="Facebook"
                                >
                                    <Facebook className="h-5 w-5" />
                                </Link>
                                <Link
                                    href="#"
                                    className="w-10 h-10 rounded-full bg-brown-800 flex items-center justify-center text-white hover:bg-teal-600 transition-colors"
                                    aria-label="Twitter"
                                >
                                    <Twitter className="h-5 w-5" />
                                </Link>
                            </div>

                            {/* About Text */}
                            <p className="text-sm leading-relaxed text-brown-100/90">
                                <strong className="text-white block mb-1">{SITE_NAME}</strong>
                                Solusi terpercaya untuk kebutuhan penyimpanan ASI ibu bekerja. Kami berkomitmen mendukung pemberian ASI eksklusif dengan layanan sewa freezer yang aman, higienis, dan terjangkau.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Bottom Copyright */}
                <div className="py-6 border-t border-brown-800">
                    <Container>
                        <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-brown-100/60">
                            <p>
                                © {new Date().getFullYear()} {SITE_NAME}. All rights reserved.
                            </p>
                            <div className="flex gap-6">
                                <Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
                                <Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link>
                            </div>
                        </div>
                    </Container>
                </div>
            </Container>
        </footer>
    )
}
