"use client"

import { usePathname } from "next/navigation"
import { Header, Footer, MobileStickyBar } from "@/components/layout"

export function LayoutWrapper({ children }: { children: React.ReactNode }) {
    const pathname = usePathname()
    const isAdminOrLogin = pathname.startsWith("/admin") || pathname === "/login"

    if (isAdminOrLogin) {
        return <>{children}</>
    }

    return (
        <div className="relative flex min-h-screen flex-col pb-16 md:pb-0">
            <Header />
            <main className="flex-1">{children}</main>
            <Footer />
            <MobileStickyBar />
        </div>
    )
}

