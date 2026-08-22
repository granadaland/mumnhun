import { defineConfig } from "prisma/config"
import "dotenv/config"

// Schema operations (db push, migrate, studio) need a direct connection.
// The pgBouncer pooler on port 6543 runs in transaction mode, which does not
// support the advisory locks and session state the migration engine relies on —
// routing DDL through it makes every statement crawl or hang and retry.
// DATABASE_URL (the pooler) stays the app runtime connection; see lib/db/prisma.ts.
const schemaConnectionUrl = process.env.DIRECT_URL || process.env.DATABASE_URL

if (!schemaConnectionUrl) {
    throw new Error(
        "Set DIRECT_URL (preferred) or DATABASE_URL before running Prisma schema commands."
    )
}

export default defineConfig({
    datasource: {
        url: schemaConnectionUrl,
    },
})
