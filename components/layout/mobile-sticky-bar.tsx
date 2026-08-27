"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { MessageCircle, Tag } from "lucide-react"
import { WHATSAPP_LINK } from "@/lib/constants"

export function MobileStickyBar() {
    const [isVisible, setIsVisible] = useState(false)

    useEffect(() => {
        const handleScroll = () => {
            // Sembunyikan saat di first screen / hero area (threshold ~340px atau 45% tinggi layar)
            // Munculkan secara halus saat user menggulir ke bawah
            const threshold = Math.max(320, window.innerHeight * 0.45)
            setIsVisible(window.scrollY > threshold)
        }

        handleScroll()
        window.addEventListener("scroll", handleScroll, { passive: true })
        return () => window.removeEventListener("scroll", handleScroll)
    }, [])

    const handleCekPaketClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
        if (window.location.pathname === "/") {
            e.preventDefault()
            const element = document.getElementById("pricing")
            if (element) {
                element.scrollIntoView({ behavior: "smooth" })
            }
        }
    }

    return (
        <aside
            aria-label="Aksi Cepat Sewa Freezer ASI"
            className={`md:hidden fixed bottom-0 left-0 right-0 z-50 p-3 bg-white/95 backdrop-blur-xl border-t border-stone-200/80 shadow-[0_-8px_24px_rgba(56,40,33,0.08)] transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] ${
                isVisible
                    ? "translate-y-0 opacity-100 pointer-events-auto"
                    : "translate-y-full opacity-0 pointer-events-none"
            }`}
        >
            <div className="flex items-center gap-2 max-w-md mx-auto">
                <Link
                    href="/#pricing"
                    onClick={handleCekPaketClick}
                    className="flex-1 flex items-center justify-center gap-2 py-3 px-3 rounded-2xl bg-[#FCFAF7] border border-stone-200/80 text-[#382821] font-semibold text-xs active:scale-[0.98] transition-transform text-center shadow-xs"
                >
                    <Tag className="w-3.5 h-3.5 text-[#C87860] shrink-0" />
                    <span className="truncate">Cek Paket</span>
                </Link>

                <Link
                    href={WHATSAPP_LINK}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-[2] flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-gradient-to-r from-[#2E5650] to-[#244742] text-white font-bold text-xs shadow-md shadow-[#2E5650]/20 active:scale-[0.98] transition-transform text-center animate-shimmer"
                >
                    <MessageCircle className="w-4 h-4 fill-white/20 shrink-0" />
                    <span className="truncate">Sewa via WhatsApp</span>
                </Link>
            </div>
        </aside>
    )
}
