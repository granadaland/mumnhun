import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

// Create a PostgreSQL connection pool
const connectionString = process.env.DATABASE_URL

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
