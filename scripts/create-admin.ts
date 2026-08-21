/**
 * Create or update an ADMIN user with a locally-hashed password.
 *
 * Usage:
 *   npm run admin:create -- --email you@example.com --password "your-strong-pass" [--name "Your Name"]
 *   npm run admin:create               (will prompt interactively)
 *
 * This is a CLI-only tool. There is intentionally no public signup endpoint.
 */
import "dotenv/config"
import { createInterface } from "node:readline/promises"
import { stdin, stdout } from "node:process"
import bcrypt from "bcryptjs"
import prisma from "../lib/db/prisma"

const MIN_PASSWORD_LENGTH = 12
const BCRYPT_COST = 12

type Args = {
    email?: string
    password?: string
    name?: string
}

function parseArgs(argv: string[]): Args {
    const args: Args = {}
    for (let i = 0; i < argv.length; i += 1) {
        const key = argv[i]
        const value = argv[i + 1]
        if (key === "--email") {
            args.email = value
            i += 1
        } else if (key === "--password") {
            args.password = value
            i += 1
        } else if (key === "--name") {
            args.name = value
            i += 1
        }
    }
    return args
}

function isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

async function main() {
    const args = parseArgs(process.argv.slice(2))

    let email = args.email?.trim().toLowerCase()
    let password = args.password
    let name = args.name?.trim()

    const needsPrompt = !email || !password
    if (needsPrompt) {
        const rl = createInterface({ input: stdin, output: stdout })
        try {
            if (!email) {
                email = (await rl.question("Admin email: ")).trim().toLowerCase()
            }
            if (!name) {
                const answered = (await rl.question("Admin name (optional): ")).trim()
                name = answered || undefined
            }
            if (!password) {
                // Note: readline echoes input; acceptable for a local one-off admin bootstrap.
                password = await rl.question("Admin password (min 12 chars): ")
            }
        } finally {
            rl.close()
        }
    }

    if (!email || !isValidEmail(email)) {
        console.error("Error: a valid --email is required.")
        process.exit(1)
    }

    if (!password || password.length < MIN_PASSWORD_LENGTH) {
        console.error(`Error: --password must be at least ${MIN_PASSWORD_LENGTH} characters.`)
        process.exit(1)
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_COST)

    const user = await prisma.user.upsert({
        where: { email },
        update: {
            passwordHash,
            role: "ADMIN",
            ...(name ? { name } : {}),
        },
        create: {
            email,
            name: name ?? null,
            role: "ADMIN",
            passwordHash,
        },
        select: { id: true, email: true, role: true },
    })

    // Never log the password or its hash.
    console.log(`Admin ready: ${user.email} (id=${user.id}, role=${user.role})`)
}

main()
    .catch((error) => {
        console.error("Failed to create admin:", error instanceof Error ? error.message : error)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
