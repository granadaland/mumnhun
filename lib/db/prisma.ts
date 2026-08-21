import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

// Create a PostgreSQL connection pool
const connectionString = process.env.DATABASE_URL

// Fail fast with an actionable message. Without this, `pg` silently falls back
// to localhost:5432, producing a confusing ECONNREFUSED surfaced by Prisma as
// a generic `PrismaClientKnownRequestError` on the first query.
if (!connectionString) {
    throw new Error(
        "DATABASE_URL is not set. Ensure it is defined in .env / .env.local and restart the dev server so the connection pool is recreated with the correct value."
    )
}

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined
    pool: Pool | undefined
}

// Reuse pool in development to prevent connection exhaustion
const pool = globalForPrisma.pool ?? new Pool({ connectionString })

if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.pool = pool
}

// Create Prisma adapter
const adapter = new PrismaPg(pool)

// Create Prisma client with adapter
export const prisma = globalForPrisma.prisma ?? new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
})

if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = prisma
}

export default prisma
