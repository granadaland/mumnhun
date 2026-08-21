import NextAuth from "next-auth"
import { NextResponse } from "next/server"
import { authConfig } from "@/auth.config"

/**
 * Next.js 16 proxy (formerly middleware). Uses the edge-safe auth config only —
 * NO Prisma here — so it stays cheap on every matched request. Role authorization
 * is enforced separately in requireAdminPage / requireAdminApi (defense in depth).
 */
const { auth } = NextAuth(authConfig)

export const proxy = auth((req) => {
    const { pathname } = req.nextUrl
    const isLoggedIn = Boolean(req.auth?.user)

    const isAdminRoute = pathname.startsWith("/admin")
    const isAdminApiRoute = pathname.startsWith("/api/admin")
    const isLoginPage = pathname === "/login"

    if ((isAdminRoute || isAdminApiRoute) && !isLoggedIn) {
        const url = req.nextUrl.clone()
        url.pathname = "/login"
        url.searchParams.set("redirect", pathname)
        return NextResponse.redirect(url)
    }

    if (isLoginPage && isLoggedIn) {
        const url = req.nextUrl.clone()
        url.pathname = "/admin"
        url.search = ""
        return NextResponse.redirect(url)
    }

    return NextResponse.next()
})

export const config = {
    matcher: ["/admin/:path*", "/api/admin/:path*", "/login"],
}
