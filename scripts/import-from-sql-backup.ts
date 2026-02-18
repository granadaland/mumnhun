/**
 * WordPress SQL Backup Import Script
 *
 * Imports WordPress posts from a MySQL/MariaDB SQL backup file into PostgreSQL.
 * Uses Prisma v7.3.0 with the pg adapter for Supabase/PostgreSQL.
 *
 * Usage: npx tsx scripts/import-from-sql-backup.ts [./backup.sql]
 */
import 'dotenv/config'
import { config } from 'dotenv'
config({ path: '.env.local' })

import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import { readFileSync } from 'fs'

// --- Prisma Client Initialization (v7.3.0 with pg adapter) ---
const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  console.error('❌ DATABASE_URL environment variable is not set.')
  console.error('   Make sure you have a .env.local or .env file with DATABASE_URL.')
  process.exit(1)
}

const pool = new Pool({ connectionString })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

const SQL_FILE = process.argv[2] || './backup.sql'

// --- Types ---
interface WPPost {
  ID: number
  post_title: string
  post_name: string
  post_content: string
  post_excerpt: string
  post_status: string
  post_type: string
  post_date: string
  post_modified: string
  guid: string
}

// --- Helper Functions ---
function unescapeSQL(str: string): string {
  return str
    .replace(/\\'/g, "'")
    .replace(/\\"/g, '"')
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\\\\/g, '\\')
}

function parseValue(value: string): string {
  value = value.trim()
  if (value === 'NULL' || value === 'null') {
    return ''
  }
  if ((value.startsWith("'") && value.endsWith("'")) ||
    (value.startsWith('"') && value.endsWith('"'))) {
    value = value.slice(1, -1)
  }
  return unescapeSQL(value)
}

/**
 * Parses the SQL file to extract published WordPress posts.
 */
function parseSQLFile(filePath: string): WPPost[] {
  console.log(`📂 Reading SQL file: ${filePath}`)

  const sqlContent = readFileSync(filePath, 'utf-8')
  const posts: WPPost[] = []

  console.log(`📊 File size: ${(sqlContent.length / 1024 / 1024).toFixed(2)} MB`)
  console.log('🔍 Scanning for all wp_posts INSERT statements...')

  // Find all INSERT INTO wp_posts blocks
  const insertRegex = /INSERT INTO `wp_posts` VALUES\s*\n?([\s\S]*?);/gi
  let match: RegExpExecArray | null
  let totalRowsFound = 0

  while ((match = insertRegex.exec(sqlContent)) !== null) {
    const valuesSection = match[1]
    const rows = valuesSection.split(/\),\s*\n\(/g)
    totalRowsFound += rows.length

    for (let i = 0; i < rows.length; i++) {
      let rowData = rows[i]
      rowData = rowData.replace(/^\(/, '').replace(/\)$/, '')

      try {
        const values: string[] = []
        let currentValue = ''
        let inQuote = false
        let quoteChar = ''
        let escapeNext = false

        for (let j = 0; j < rowData.length; j++) {
          const char = rowData[j]

          if (escapeNext) {
            currentValue += char
            escapeNext = false
            continue
          }

          if (char === '\\') {
            currentValue += char
            escapeNext = true
            continue
          }

          if ((char === "'" || char === '"') && !escapeNext) {
            if (!inQuote) {
              inQuote = true
              quoteChar = char
              currentValue += char
            } else if (char === quoteChar) {
              inQuote = false
              currentValue += char
            } else {
              currentValue += char
            }
            continue
          }

          if (char === ',' && !inQuote) {
            values.push(currentValue.trim())
            currentValue = ''
          } else {
            currentValue += char
          }
        }

        if (currentValue) {
          values.push(currentValue.trim())
        }

        // WordPress wp_posts columns (standard):
        // 0: ID, 1: post_author, 2: post_date, 3: post_date_gmt,
        // 4: post_content, 5: post_title, 6: post_excerpt, 7: post_status,
        // ..., 11: post_name (slug), 14: post_modified, ..., 20: post_type, ..., 22: guid
        if (values.length >= 21) {
          const postType = parseValue(values[20])
          const postStatus = parseValue(values[7])

          if (postType === 'post' && postStatus === 'publish') {
            const post: WPPost = {
              ID: parseInt(parseValue(values[0])),
              post_title: parseValue(values[5]),
              post_name: parseValue(values[11]),
              post_content: parseValue(values[4]),
              post_excerpt: parseValue(values[6]),
              post_status: postStatus,
              post_type: postType,
              post_date: parseValue(values[2]),
              post_modified: parseValue(values[14]),
              guid: values.length > 22 ? parseValue(values[22]) : '',
            }

            if (post.post_title && post.post_name && post.ID) {
              posts.push(post)
            }
          }
        }
      } catch {
        // Silently skip malformed rows
      }
    }
  }

  console.log(`📝 Scanned ${totalRowsFound} total records in wp_posts`)
  console.log(`✅ Extracted ${posts.length} published blog posts`)
  return posts
}

/**
 * Imports posts into the PostgreSQL database via Prisma.
 */
async function importPosts(posts: WPPost[]) {
  console.log('\n📝 Importing posts to database...')

  const author = await prisma.user.upsert({
    where: { email: 'admin@mumnhun.id' },
    update: {},
    create: {
      name: 'Santika Reja',
      email: 'admin@mumnhun.id',
    }
  })

  console.log(`👤 Using author: ${author.name} (${author.email})`)

  let imported = 0
  let skipped = 0
  let failed = 0

  for (const post of posts) {
    try {
      const excerpt = post.post_excerpt.replace(/<[^>]*>/g, '').substring(0, 500)

      await prisma.post.create({
        data: {
          wpId: post.ID,
          wpGuid: post.guid || undefined,
          title: post.post_title,
          slug: post.post_name,
          content: post.post_content,
          excerpt: excerpt || post.post_title.substring(0, 160),
          status: 'PUBLISHED',
          authorId: author.id,
          publishedAt: new Date(post.post_date),
          updatedAt: new Date(post.post_modified),
        }
      })

      imported++
      const progress = `[${imported + skipped}/${posts.length}]`
      console.log(`✅ ${progress} ${post.post_title.substring(0, 60)}...`)

    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
        skipped++
        console.log(`⚠️  [${imported + skipped}/${posts.length}] Skipped (exists): ${post.post_title.substring(0, 50)}`)
      } else {
        failed++
        console.error(`❌ [${imported + skipped + failed}/${posts.length}] Failed: ${post.post_title.substring(0, 50)}`)
      }
    }
  }

  console.log(`\n🎉 Import complete!`)
  console.log(`   ✅ Imported: ${imported}`)
  console.log(`   ⚠️  Skipped: ${skipped}`)
  console.log(`   ❌ Failed: ${failed}`)
}

// --- Main Execution ---
async function main() {
  try {
    console.log('🚀 Starting SQL backup import (Prisma v7.3.0 + pg adapter)...\n')

    const posts = parseSQLFile(SQL_FILE)

    if (posts.length === 0) {
      console.log('❌ No posts found. Check SQL file format.')
      process.exit(1)
    }

    console.log('\n📊 Sample posts found:')
    posts.slice(0, 3).forEach(p => {
      console.log(`  - ${p.post_title.substring(0, 60)}...`)
    })

    await importPosts(posts)

  } catch (error) {
    console.error('❌ Import failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
    pool.end()
  }
}

main()
