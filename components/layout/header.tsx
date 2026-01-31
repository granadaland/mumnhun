"use client"

import Link from "next/link"
import { useState } from "react"
import { Menu, X, MessageCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SITE_NAME, NAV_LINKS, WHATSAPP_LINK } from "@/lib/constants"

export function Header() {
    const [isMenuOpen, setIsMenuOpen] = useState(false)

    return (
        <header className="sticky top-0 z-50 w-full bg-white shadow-sm">
            <div className="container mx-auto px-4">
                <div className="flex h-16 items-center justify-between">
                    {/* Logo */}
                    <Link href="/" className="flex items-center space-x-2">
                        <span className="text-xl font-bold text-teal-700">
                            {SITE_NAME}
                        </span>
                    </Link>

                    {/* Desktop Navigation */}
                    <nav className="hidden md:flex items-center space-x-8">
                        {NAV_LINKS.map((link) => (
                            <Link
                                key={link.href}
                                href={link.href}
                                className="text-sm font-medium text-muted-foreground transition-colors hover:text-teal-600"
                            >
                                {link.label}
                            </Link>
                        ))}
                    </nav>

                    {/* Desktop WhatsApp CTA */}
                    <div className="hidden md:flex items-center">
                        <Button
                            asChild
                            className="bg-teal-500 hover:bg-teal-600 text-white"
                        >
                            <Link
                                href={WHATSAPP_LINK}
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                <MessageCircle className="h-4 w-4 mr-2" />
                                Hubungi Kami via WhatsApp
                            </Link>
                        </Button>
                    </div>

                    {/* Mobile Menu Button */}
                    <Button
                        variant="ghost"
                        size="icon"
                        className="md:hidden"
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                    >
                        {isMenuOpen ? (
                            <X className="h-5 w-5" />
                        ) : (
                            <Menu className="h-5 w-5" />
                        )}
                    </Button>
                </div>

                {/* Mobile Navigation */}
                {isMenuOpen && (
                    <div className="md:hidden py-4 border-t">
                        <nav className="flex flex-col space-y-4">
                            {NAV_LINKS.map((link) => (
                                <Link
                                    key={link.href}
                                    href={link.href}
                                    className="text-sm font-medium text-muted-foreground hover:text-teal-600"
                                    onClick={() => setIsMenuOpen(false)}
                                >
                                    {link.label}
                                </Link>
                            ))}
                        </nav>

                        {/* Mobile WhatsApp Button */}
                        <div className="mt-4 pt-4 border-t">
                            <Button
                                asChild
                                className="w-full bg-teal-500 hover:bg-teal-600 text-white"
                            >
                                <Link
                                    href={WHATSAPP_LINK}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    <MessageCircle className="h-4 w-4 mr-2" />
                                    Hubungi Kami via WhatsApp
                                </Link>
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </header>
    )
}
