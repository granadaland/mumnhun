import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { z } from "zod"
import prisma from "@/lib/db/prisma"
import { checkRateLimit, peekRateLimit } from "@/lib/security/rate-limit"
import { authConfig } from "@/auth.config"

const LOGIN_RATE_LIMIT = { limit: 5, windowMs: 15 * 60_000 } as const

/** True when the key has already exhausted its login budget (does not consume). */
function isLoginRateLimited(key: string): boolean {
    return !peekRateLimit(key, LOGIN_RATE_LIMIT).ok
}

/** Record one failed login attempt against the budget. */
function consumeLoginAttempt(key: string): void {
    checkRateLimit(key, LOGIN_RATE_LIMIT)
}

/**
 * Constant dummy hash used to keep `bcrypt.compare` running even when the user
 * does not exist, mitigating a user-enumeration timing side channel.
 * (bcrypt hash of a random string, cost 12.)
 */
const DUMMY_PASSWORD_HASH = "$2b$12$aB6GHvxnepm3aXf1wr82meX9sBRklly19wGVRid0XIt0TusEykwya"

const credentialsSchema = z.object({
    email: z.string().trim().toLowerCase().email().max(320),
    password: z.string().min(1).max(200),
})

function getClientIp(request: Request | undefined): string {
    if (!request) return "unknown"
    const forwarded = request.headers.get("x-forwarded-for")
    if (forwarded) {
        const first = forwarded.split(",")[0]?.trim()
        if (first) return first
    }
    const realIp = request.headers.get("x-real-ip")?.trim()
    return realIp || "unknown"
}

export const { handlers, auth, signIn, signOut } = NextAuth({
    ...authConfig,
    providers: [
        Credentials({
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" },
            },
            async authorize(rawCredentials, request) {
                const parsed = credentialsSchema.safeParse(rawCredentials)
                if (!parsed.success) {
                    // Generic failure — do not reveal which field was invalid.
                    return null
                }

                const { email, password } = parsed.data

                // Rate limit by IP + email to slow down brute-force / credential stuffing.
                // Peek first (do not consume) so a successful login does not burn the budget.
                const ip = getClientIp(request)
                const rateLimitKey = `login:${ip}:${email}`
                if (isLoginRateLimited(rateLimitKey)) {
                    // Return null (not throw) so the client always receives a generic
                    // { error } with redirect:false instead of a rejected promise.
                    return null
                }

                const user = await prisma.user.findUnique({
                    where: { email },
                    select: {
                        id: true,
                        email: true,
                        name: true,
                        role: true,
                        passwordHash: true,
                    },
                })

                // Always run a compare (against a dummy hash when the user or hash is
                // missing) so response timing does not leak account existence.
                const hashToCompare = user?.passwordHash ?? DUMMY_PASSWORD_HASH
                const passwordMatches = await bcrypt.compare(password, hashToCompare)

                if (!user || !user.passwordHash || !passwordMatches) {
                    // Only failed attempts consume the rate-limit budget.
                    consumeLoginAttempt(rateLimitKey)
                    return null
                }

                // Never return passwordHash to the session/token layer.
                return {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    role: user.role,
                }
            },
        }),
    ],
})
