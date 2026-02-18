"use client"

import { usePathname } from "next/navigation"
import { Header, Footer } from "@/components/layout"

export function LayoutWrapper({ children }: { children: React.ReactNode }) {
    const pathname = usePathname()
    const isAdminOrLogin = pathname.startsWith("/admin") || pathname === "/login"

    if (isAdminOrLogin) {
        return <>{children}</>
    }

    return (
        <div className="relative flex min-h-screen flex-col">
            <Header />
            <main className="flex-1">{children}</main>
            <Footer />
        </div>
    )
}
