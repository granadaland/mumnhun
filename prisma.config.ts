import path from 'node:path'
import { defineConfig } from 'prisma/config'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()
dotenv.config({ path: '.env.local' })

export default defineConfig({
    schema: path.join(__dirname, 'prisma', 'schema.prisma'),

    // Database connection for schema push and migrations
    datasource: {
        url: process.env.DATABASE_URL!,
    },
})
