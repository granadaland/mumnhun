import type { NextAuthConfig } from "next-auth"

/**
 * Edge-safe Auth.js configuration.
 *
 * This file intentionally contains NO Prisma / bcrypt imports so that it can be
 * consumed by `proxy.ts` (which runs on every matched request) without pulling
 * the database client into that code path. The Credentials provider (which needs
 * Prisma + bcrypt) is added separately in `auth.ts`.
 */
export const authConfig = {
    pages: {
        signIn: "/login",
    },
    session: {
        strategy: "jwt",
        // Admin sessions should not live forever. 8 hours.
        maxAge: 60 * 60 * 8,
    },
    // Providers are declared in auth.ts; keep empty here so the edge bundle stays light.
    providers: [],
    callbacks: {
        // Persist id + role on the token at sign-in, then expose them on the session.
        jwt({ token, user }) {
            if (user) {
                token.id = (user as { id: string }).id
                token.role = (user as { role?: "ADMIN" | "AUTHOR" }).role ?? "AUTHOR"
            }
            return token
        },
        session({ session, token }) {
            if (session.user) {
                session.user.id = token.id as string
                session.user.role = (token.role as "ADMIN" | "AUTHOR") ?? "AUTHOR"
            }
            return session
        },
    },
} satisfies NextAuthConfig
