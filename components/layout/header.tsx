"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState, useEffect } from "react"
import { Menu, X, MessageCircle, ArrowUpRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Logo } from "@/components/ui/logo"
import { NAV_LINKS, WHATSAPP_LINK } from "@/lib/constants"

export function Header() {
    const [isMenuOpen, setIsMenuOpen] = useState(false)
    const [isScrolled, setIsScrolled] = useState(false)
    const pathname = usePathname()

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 20)
        }
        window.addEventListener("scroll", handleScroll, { passive: true })
        return () => window.removeEventListener("scroll", handleScroll)
    }, [])

    // Close menu when route changes
    useEffect(() => {
        setIsMenuOpen(false)
    }, [pathname])

    return (
        <header
            className={`fixed z-50 top-0 left-0 right-0 w-full flex justify-center transition-all duration-300 ${isScrolled ? "pt-3 md:pt-4 px-3 sm:px-6" : "pt-3 sm:pt-4 md:pt-5 px-4 sm:px-8"
                }`}
        >
            <div
                className={`flex items-center justify-between transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${isScrolled
                    ? "w-full max-w-5xl bg-white/90 backdrop-blur-xl border border-stone-200/80 shadow-[0_10px_30px_rgb(56,40,33,0.08)] rounded-full px-4 sm:px-6 py-2.5"
                    : "w-full max-w-7xl bg-transparent border-transparent shadow-none rounded-none px-2 sm:px-4 py-2 sm:py-2.5"
                    }`}
            >
                {/* Logo */}
                <Link href="/" className="flex items-center group active:scale-[0.98] transition-transform">
                    <Logo
                        className="w-[125px] sm:w-[145px] h-auto transition-transform group-hover:scale-[1.02]"
                        variant="default"
                    />
                </Link>

                {/* Desktop Navigation */}
                <nav className="hidden lg:flex items-center gap-1.5" aria-label="Navigasi Utama">
                    {NAV_LINKS.map((link) => {
                        const isActive = pathname === link.href || (link.href !== "/" && pathname.startsWith(link.href))
                        return (
                            <Link
                                key={link.href}
                                href={link.href}
                                className={`px-4 py-2 text-sm font-medium rounded-full transition-all duration-200 ${isActive
                                    ? "bg-[#2E5650]/10 text-[#2E5650] font-semibold"
                                    : "text-[#382821]/75 hover:text-[#2E5650] hover:bg-[#2E5650]/5"
                                    }`}
                            >
                                {link.label}
                            </Link>
                        )
                    })}
                </nav>

                {/* Desktop WhatsApp CTA */}
                <div className="hidden lg:flex items-center gap-3">
                    <Button
                        asChild
                        className="bg-gradient-to-r from-[#2E5650] to-[#244742] hover:from-[#244742] hover:to-[#1D3A36] text-white rounded-full font-semibold text-sm px-5 py-2.5 shadow-md shadow-[#2E5650]/20 hover:shadow-lg hover:shadow-[#2E5650]/30 active:scale-[0.98] transition-all"
                    >
                        <Link
                            href={WHATSAPP_LINK}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label="Konsultasi Sewa Freezer ASI via WhatsApp"
                        >
                            <MessageCircle className="h-4 w-4 mr-2 fill-white/20" />
                            <span>Konsultasi WA</span>
                            <ArrowUpRight className="h-3.5 w-3.5 ml-1 opacity-70" />
                        </Link>
                    </Button>
                </div>

                {/* Mobile Menu Button */}
                <Button
                    variant="ghost"
                    size="icon"
                    className="lg:hidden text-[#382821] hover:bg-stone-100/80 rounded-full w-10 h-10"
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    aria-label={isMenuOpen ? "Tutup menu navigasi" : "Buka menu navigasi"}
                    aria-expanded={isMenuOpen}
                >
                    {isMenuOpen ? (
                        <X className="h-5 w-5" />
                    ) : (
                        <Menu className="h-5 w-5" />
                    )}
                </Button>
            </div>

            {/* Mobile Navigation Dropdown */}
            {isMenuOpen && (
                <div
                    role="dialog"
                    aria-modal="true"
                    aria-label="Menu Navigasi Mobile"
                    className="lg:hidden fixed top-20 left-4 right-4 bg-white/95 backdrop-blur-2xl border border-stone-200/80 p-5 shadow-2xl rounded-3xl animate-in slide-in-from-top-4 duration-300 z-50"
                >
                    <nav className="flex flex-col gap-1.5">
                        {NAV_LINKS.map((link) => {
                            const isActive = pathname === link.href || (link.href !== "/" && pathname.startsWith(link.href))
                            return (
                                <Link
                                    key={link.href}
                                    href={link.href}
                                    className={`px-4 py-3 text-sm font-medium rounded-2xl transition-all ${isActive
                                        ? "bg-[#2E5650]/10 text-[#2E5650] font-bold"
                                        : "text-[#382821]/80 hover:text-[#2E5650] hover:bg-[#2E5650]/5 active:bg-[#2E5650]/10"
                                        }`}
                                    onClick={() => setIsMenuOpen(false)}
                                >
                                    {link.label}
                                </Link>
                            )
                        })}
                    </nav>

                    {/* Mobile WhatsApp Quick Action */}
                    <div className="mt-4 pt-4 border-t border-stone-100 flex flex-col gap-2">
                        <Button
                            asChild
                            className="w-full bg-gradient-to-r from-[#2E5650] to-[#244742] hover:from-[#244742] hover:to-[#1D3A36] text-white rounded-2xl py-3.5 font-bold shadow-md shadow-[#2E5650]/20 active:scale-[0.98]"
                        >
                            <Link
                                href={WHATSAPP_LINK}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={() => setIsMenuOpen(false)}
                            >
                                <MessageCircle className="h-4 w-4 mr-2 fill-white/20" />
                                Chat WhatsApp Sekarang
                            </Link>
                        </Button>
                        <p className="text-center text-[11px] text-[#382821]/50 mt-1">
                            Layanan sewa freezer ASI Jabodetabek sejak 2010
                        </p>
                    </div>
                </div>
            )}
        </header>
    )
}

