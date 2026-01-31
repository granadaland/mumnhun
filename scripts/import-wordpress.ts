/**
 * WordPress Import Script
 * 
 * Imports WordPress content (posts, categories, tags, pages) into Supabase via Prisma.
 * 
 * Usage:
 *   npx tsx scripts/import-wordpress.ts --dry-run    # Preview what will be imported
 *   npx tsx scripts/import-wordpress.ts              # Actually import data
 * 
 * Prerequisites:
 *   1. Export WordPress data as JSON (using WP All Export or similar)
 *   2. Place exports in ./wordpress-backup/ folder:
 *      - posts.json
 *      - categories.json
 *      - tags.json
 *      - pages.json (optional)
 */

import { PrismaClient, PostStatus } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'
import type {
    WordPressPost,
    WordPressCategory,
    WordPressTag,
    ImportResult,
    ImportError
} from '../types/wordpress'

const prisma = new PrismaClient()

// Configuration
const WP_BACKUP_PATH = process.env.WP_BACKUP_PATH || './wordpress-backup'
const DRY_RUN = process.argv.includes('--dry-run')

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function log(message: string, type: 'info' | 'success' | 'error' | 'warn' = 'info') {
    const icons = {
        info: 'ℹ️',
        success: '✅',
        error: '❌',
        warn: '⚠️'
    }
    console.log(`${icons[type]} ${message}`)
}

function loadJSON<T>(filename: string): T | null {
    const filepath = path.join(WP_BACKUP_PATH, filename)

    if (!fs.existsSync(filepath)) {
        log(`File not found: ${filepath}`, 'warn')
        return null
    }

    try {
        const content = fs.readFileSync(filepath, 'utf-8')
        return JSON.parse(content) as T
    } catch (error) {
        log(`Failed to parse ${filename}: ${error}`, 'error')
        return null
    }
}

function mapPostStatus(wpStatus: string): PostStatus {
    const statusMap: Record<string, PostStatus> = {
        'publish': 'PUBLISHED',
        'draft': 'DRAFT',
        'pending': 'DRAFT',
        'private': 'ARCHIVED',
    }
    return statusMap[wpStatus] || 'DRAFT'
}

function parseDate(dateString: string): Date {
    // WordPress format: "2024-01-15 10:30:00"
    return new Date(dateString.replace(' ', 'T') + 'Z')
}

// =============================================================================
// IMPORT FUNCTIONS
// =============================================================================

async function importCategories(categories: WordPressCategory[]): Promise<ImportResult> {
    const result: ImportResult = { success: true, imported: 0, skipped: 0, errors: [] }

    log(`\n📁 Importing ${categories.length} categories...`)

    for (const cat of categories) {
        try {
            // Skip if already exists
            const existing = await prisma.category.findFirst({
                where: { OR: [{ wpId: cat.term_id }, { slug: cat.slug }] }
            })

            if (existing) {
                log(`  Skipping "${cat.name}" (already exists)`, 'warn')
                result.skipped++
                continue
            }

            if (!DRY_RUN) {
                await prisma.category.create({
                    data: {
                        name: cat.name,
                        slug: cat.slug,
                        description: cat.description || null,
                        wpId: cat.term_id,
                        wpTermId: cat.term_taxonomy_id,
                    }
                })
            }

            log(`  ${DRY_RUN ? '[DRY-RUN] Would import' : 'Imported'}: ${cat.name}`, 'success')
            result.imported++

        } catch (error) {
            const err: ImportError = {
                item: cat.name,
                error: String(error),
                wpId: cat.term_id
            }
            result.errors.push(err)
            log(`  Failed to import "${cat.name}": ${error}`, 'error')
        }
    }

    return result
}

async function importTags(tags: WordPressTag[]): Promise<ImportResult> {
    const result: ImportResult = { success: true, imported: 0, skipped: 0, errors: [] }

    log(`\n🏷️  Importing ${tags.length} tags...`)

    for (const tag of tags) {
        try {
            const existing = await prisma.tag.findFirst({
                where: { OR: [{ wpId: tag.term_id }, { slug: tag.slug }] }
            })

            if (existing) {
                result.skipped++
                continue
            }

            if (!DRY_RUN) {
                await prisma.tag.create({
                    data: {
                        name: tag.name,
                        slug: tag.slug,
                        wpId: tag.term_id,
                        wpTermId: tag.term_taxonomy_id,
                    }
                })
            }

            result.imported++

        } catch (error) {
            result.errors.push({
                item: tag.name,
                error: String(error),
                wpId: tag.term_id
            })
        }
    }

    log(`  ${DRY_RUN ? '[DRY-RUN] Would import' : 'Imported'}: ${result.imported} tags`, 'success')
    if (result.skipped > 0) log(`  Skipped: ${result.skipped} (already exist)`, 'warn')

    return result
}

async function importPosts(posts: WordPressPost[]): Promise<ImportResult> {
    const result: ImportResult = { success: true, imported: 0, skipped: 0, errors: [] }

    // Filter only published posts (or include drafts if needed)
    const publishedPosts = posts.filter(p => p.post_type === 'post')

    log(`\n📝 Importing ${publishedPosts.length} posts...`)

    for (const post of publishedPosts) {
        try {
            // Skip if already exists
            const existing = await prisma.post.findFirst({
                where: { OR: [{ wpId: post.ID }, { slug: post.post_name }] }
            })

            if (existing) {
                result.skipped++
                continue
            }

            if (!DRY_RUN) {
                // Create the post
                const newPost = await prisma.post.create({
                    data: {
                        title: post.post_title,
                        slug: post.post_name,
                        content: post.post_content,
                        excerpt: post.post_excerpt || null,
                        featuredImage: post.featured_image || null,
                        status: mapPostStatus(post.post_status),
                        publishedAt: post.post_status === 'publish' ? parseDate(post.post_date) : null,
                        wpId: post.ID,
                        wpGuid: post.guid,
                    }
                })

                // Link categories
                if (post.categories && post.categories.length > 0) {
                    for (const cat of post.categories) {
                        const dbCat = await prisma.category.findFirst({ where: { wpId: cat.term_id } })
                        if (dbCat) {
                            await prisma.categoriesOnPosts.create({
                                data: { postId: newPost.id, categoryId: dbCat.id }
                            })
                        }
                    }
                }

                // Link tags
                if (post.tags && post.tags.length > 0) {
                    for (const tag of post.tags) {
                        const dbTag = await prisma.tag.findFirst({ where: { wpId: tag.term_id } })
                        if (dbTag) {
                            await prisma.tagsOnPosts.create({
                                data: { postId: newPost.id, tagId: dbTag.id }
                            })
                        }
                    }
                }
            }

            result.imported++

            // Progress indicator every 50 posts
            if (result.imported % 50 === 0) {
                log(`  Progress: ${result.imported}/${publishedPosts.length}`, 'info')
            }

        } catch (error) {
            result.errors.push({
                item: post.post_title,
                error: String(error),
                wpId: post.ID
            })
        }
    }

    log(`  ${DRY_RUN ? '[DRY-RUN] Would import' : 'Imported'}: ${result.imported} posts`, 'success')
    if (result.skipped > 0) log(`  Skipped: ${result.skipped} (already exist)`, 'warn')
    if (result.errors.length > 0) log(`  Errors: ${result.errors.length}`, 'error')

    return result
}

async function importPages(pages: WordPressPost[]): Promise<ImportResult> {
    const result: ImportResult = { success: true, imported: 0, skipped: 0, errors: [] }

    const pageContent = pages.filter(p => p.post_type === 'page' && p.post_status === 'publish')

    log(`\n📄 Importing ${pageContent.length} pages...`)

    for (const page of pageContent) {
        try {
            const existing = await prisma.page.findFirst({
                where: { OR: [{ wpId: page.ID }, { slug: page.post_name }] }
            })

            if (existing) {
                result.skipped++
                continue
            }

            if (!DRY_RUN) {
                await prisma.page.create({
                    data: {
                        title: page.post_title,
                        slug: page.post_name,
                        content: page.post_content,
                        status: mapPostStatus(page.post_status),
                        publishedAt: parseDate(page.post_date),
                        wpId: page.ID,
                    }
                })
            }

            log(`  ${DRY_RUN ? '[DRY-RUN] Would import' : 'Imported'}: ${page.post_title}`, 'success')
            result.imported++

        } catch (error) {
            result.errors.push({
                item: page.post_title,
                error: String(error),
                wpId: page.ID
            })
        }
    }

    return result
}

// =============================================================================
// MAIN EXECUTION
// =============================================================================

async function main() {
    console.log('\n' + '='.repeat(60))
    console.log('🚀 WordPress to Next.js Import Script')
    console.log('='.repeat(60))

    if (DRY_RUN) {
        log('\n🔍 DRY-RUN MODE - No data will be modified\n', 'warn')
    }

    // Check if backup folder exists
    if (!fs.existsSync(WP_BACKUP_PATH)) {
        log(`Backup folder not found: ${WP_BACKUP_PATH}`, 'error')
        log('Please create the folder and add your WordPress JSON exports:', 'info')
        log('  - posts.json', 'info')
        log('  - categories.json', 'info')
        log('  - tags.json', 'info')
        log('  - pages.json (optional)', 'info')
        process.exit(1)
    }

    // Load data
    const categories = loadJSON<WordPressCategory[]>('categories.json')
    const tags = loadJSON<WordPressTag[]>('tags.json')
    const posts = loadJSON<WordPressPost[]>('posts.json')
    const pages = loadJSON<WordPressPost[]>('pages.json')

    // Summary
    log('\n📊 Data Summary:', 'info')
    log(`  Categories: ${categories?.length ?? 0}`)
    log(`  Tags: ${tags?.length ?? 0}`)
    log(`  Posts: ${posts?.length ?? 0}`)
    log(`  Pages: ${pages?.length ?? 0}`)

    // Import in order (categories and tags first, then posts)
    const results = {
        categories: categories ? await importCategories(categories) : null,
        tags: tags ? await importTags(tags) : null,
        posts: posts ? await importPosts(posts) : null,
        pages: pages ? await importPages(pages) : null,
    }

    // Final summary
    console.log('\n' + '='.repeat(60))
    console.log('📋 IMPORT SUMMARY')
    console.log('='.repeat(60))

    for (const [key, res] of Object.entries(results)) {
        if (res) {
            console.log(`\n${key.charAt(0).toUpperCase() + key.slice(1)}:`)
            console.log(`  ✅ Imported: ${res.imported}`)
            console.log(`  ⏭️  Skipped: ${res.skipped}`)
            console.log(`  ❌ Errors: ${res.errors.length}`)
        }
    }

    if (DRY_RUN) {
        log('\n🔍 This was a DRY-RUN. Run without --dry-run to actually import.', 'warn')
    } else {
        log('\n✨ Import completed!', 'success')
    }
}

main()
    .catch((error) => {
        console.error('Fatal error:', error)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
