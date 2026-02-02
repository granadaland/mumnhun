"use client"

import Link from "next/link"
import Image from "next/image"
import { useState, useEffect } from "react"
import { Menu, X, MessageCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SITE_NAME, NAV_LINKS, WHATSAPP_LINK } from "@/lib/constants"

export function Header() {
    const [isMenuOpen, setIsMenuOpen] = useState(false)
    const [isScrolled, setIsScrolled] = useState(false)

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 50)
        }
        window.addEventListener("scroll", handleScroll)
        return () => window.removeEventListener("scroll", handleScroll)
    }, [])

    return (
        <nav className="fixed z-[60] w-full flex justify-center pt-4 md:pt-6 transition-all">
            <div
                className={`flex items-center justify-between transition-all duration-500 ${isScrolled
                    ? "w-[92%] md:w-[85%] max-w-5xl bg-white/80 backdrop-blur-md border border-white/50 shadow-soft rounded-full px-4 md:px-6 py-2"
                    : "w-full container max-w-7xl px-4 md:px-6 py-2 bg-transparent"
                    }`}
            >
                {/* Logo */}
                <Link href="/">
                    <Image
                        src="https://res.cloudinary.com/dvqcs0zqi/image/upload/v1769979416/Logo_MumNhun_krpo1l.webp"
                        alt="Mum 'N Hun Logo"
                        width={140}
                        height={56}
                        className="w-[100px] h-auto md:w-[130px] object-contain"
                        priority
                    />
                </Link>

                {/* Desktop Navigation */}
                <nav className="hidden md:flex items-center gap-1">
                    {NAV_LINKS.map((link) => (
                        <Link
                            key={link.href}
                            href={link.href}
                            className={`px-4 py-2 text-base font-medium rounded-full transition-all ${isScrolled
                                ? "text-[#382821]/80 hover:text-[#466A68] hover:bg-[#466A68]/5"
                                : "text-[#382821]/80 hover:text-[#466A68] hover:bg-white/50"
                                }`}
                        >
                            {link.label}
                        </Link>
                    ))}
                </nav>

                {/* Desktop WhatsApp CTA */}
                <div className="hidden md:flex items-center">
                    <Button
                        asChild
                        className={`rounded-full font-semibold transition-all ${isScrolled
                            ? "bg-[#466A68] text-white hover:bg-[#2F4A48] shadow-lg shadow-[#466A68]/25 px-6 py-2.5"
                            : "bg-[#466A68] text-white hover:bg-[#2F4A48] shadow-lg shadow-[#466A68]/30 px-6 py-2.5"
                            }`}
                    >
                        <Link
                            href={WHATSAPP_LINK}
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            <MessageCircle className="h-4 w-4 mr-2" />
                            WhatsApp
                        </Link>
                    </Button>
                </div>

                {/* Mobile Menu Button */}
                <Button
                    variant="ghost"
                    size="icon"
                    className="md:hidden text-[#382821]"
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
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
                <div className="md:hidden fixed top-20 left-4 right-4 bg-white/95 backdrop-blur-2xl border border-white/60 p-4 shadow-2xl rounded-[2rem] animate-in slide-in-from-top-5 duration-300">
                    <nav className="flex flex-col gap-2">
                        {NAV_LINKS.map((link) => (
                            <Link
                                key={link.href}
                                href={link.href}
                                className="px-4 py-3 text-sm font-medium text-[#382821]/80 hover:text-[#466A68] hover:bg-[#466A68]/5 rounded-xl transition-all"
                                onClick={() => setIsMenuOpen(false)}
                            >
                                {link.label}
                            </Link>
                        ))}
                    </nav>

                    {/* Mobile WhatsApp Button */}
                    <div className="mt-4 pt-4 border-t border-gray-100">
                        <Button
                            asChild
                            className="w-full bg-[#466A68] hover:bg-[#2F4A48] text-white rounded-xl py-3"
                        >
                            <Link
                                href={WHATSAPP_LINK}
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                <MessageCircle className="h-4 w-4 mr-2" />
                                Hubungi via WhatsApp
                            </Link>
                        </Button>
                    </div>
                </div>
            )}
        </nav>
    )
}

