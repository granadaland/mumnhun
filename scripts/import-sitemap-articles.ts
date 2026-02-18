import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import * as cheerio from 'cheerio'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

interface Article {
    url: string
    slug: string
    title: string
    content: string
    excerpt: string
    metaTitle: string
    metaDescription: string
    featuredImage: string
    publishedAt: Date
}

async function fetchWithRetry(url: string, retries = 3): Promise<string> {
    for (let i = 0; i < retries; i++) {
        try {
            const response = await fetch(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.5',
                }
            })
            if (!response.ok) throw new Error(`HTTP ${response.status}`)
            return await response.text()
        } catch (error) {
            if (i === retries - 1) throw error
            await new Promise(r => setTimeout(r, 2000 * (i + 1)))
        }
    }
    return ''
}

async function parseArticle(url: string): Promise<Article | null> {
    try {
        const html = await fetchWithRetry(url)
        const $ = cheerio.load(html)

        // Extract slug from URL
        const slug = url.replace('https://mumnhun.id/', '').replace(/\/$/, '')
        if (!slug || slug.includes('blog')) return null

        // Get title from OG or h1 or title tag
        const ogTitle = $('meta[property="og:title"]').attr('content')
        const h1Title = $('h1').first().text().trim()
        const pageTitle = $('title').text().split(' - ')[0]?.trim()
        const title = ogTitle || h1Title || pageTitle || ''

        if (!title) {
            console.log(`   ⚠️  No title found`)
            return null
        }

        // Get main content - try different selectors
        let content = ''
        const contentSelectors = [
            '.entry-content',
            '.post-content',
            'article .content',
            'article',
            '.single-post-content',
            'main article'
        ]

        for (const selector of contentSelectors) {
            const el = $(selector)
            if (el.length > 0) {
                // Remove unwanted elements
                el.find('script, style, .lwptoc, .sharedaddy, .related-posts, nav, .comments').remove()
                content = el.html() || ''
                if (content.length > 100) break
            }
        }

        // If still no content, try getting all p tags
        if (!content || content.length < 100) {
            const paragraphs = $('article p, .post p, main p').map((_, el) => $.html(el)).get()
            content = paragraphs.join('\n')
        }

        // Get meta description
        const metaDescription = $('meta[name="description"]').attr('content') ||
            $('meta[property="og:description"]').attr('content') || ''

        // Get featured image
        const featuredImage = $('meta[property="og:image"]').attr('content') ||
            $('.wp-post-image').first().attr('src') ||
            $('article img').first().attr('src') || ''

        // Get published date
        const dateStr = $('time[datetime]').attr('datetime') ||
            $('meta[property="article:published_time"]').attr('content') ||
            new Date().toISOString()

        // Create excerpt
        const plainText = content.replace(/<[^>]*>/g, '').trim()
        const excerpt = metaDescription || plainText.substring(0, 200).trim() + '...'

        return {
            url,
            slug,
            title,
            content,
            excerpt,
            metaTitle: ogTitle || title,
            metaDescription,
            featuredImage,
            publishedAt: new Date(dateStr)
        }
    } catch (error) {
        console.log(`   ❌ Parse error: ${(error as Error).message}`)
        return null
    }
}

async function importArticles() {
    console.log('🚀 Starting article import from mumnhun.id sitemap...\n')

    // Create or get author
    const author = await prisma.user.upsert({
        where: { email: 'admin@mumnhun.id' },
        update: {},
        create: {
            name: 'Santika Reja',
            email: 'admin@mumnhun.id'
        }
    })
    console.log('👤 Author ID:', author.id)

    // Fetch sitemap
    console.log('📥 Fetching sitemap...')
    const sitemapUrl = 'https://mumnhun.id/post-sitemap.xml'
    const xml = await fetchWithRetry(sitemapUrl)

    // Extract all post URLs
    const urlMatches = xml.match(/<loc>(https:\/\/mumnhun\.id\/[^<]+)<\/loc>/g) || []
    const postUrls = urlMatches
        .map(u => u.match(/<loc>([^<]+)<\/loc>/)?.[1] || '')
        .filter(u => u &&
            !u.includes('blog/') &&
            !u.includes('wp-content') &&
            !u.includes('sitemap') &&
            u !== 'https://mumnhun.id/')

    console.log(`📊 Found ${postUrls.length} articles in sitemap\n`)

    let imported = 0
    let skipped = 0
    let failed = 0

    for (let i = 0; i < postUrls.length; i++) {
        const url = postUrls[i]
        const slug = url.replace('https://mumnhun.id/', '').replace(/\/$/, '')

        console.log(`[${i + 1}/${postUrls.length}] ${slug}`)

        // Check if already exists
        const existing = await prisma.post.findUnique({ where: { slug } })
        if (existing) {
            skipped++
            console.log('   ⏭️  Already exists')
            continue
        }

        // Parse and import
        const article = await parseArticle(url)

        if (!article || !article.content || article.content.length < 50) {
            failed++
            console.log('   ❌ Failed to parse or empty content')
            continue
        }

        // Calculate reading time
        const wordCount = article.content.replace(/<[^>]*>/g, '').split(/\s+/).length
        const readingTime = Math.ceil(wordCount / 200)

        try {
            await prisma.post.create({
                data: {
                    title: article.title,
                    slug: article.slug,
                    content: article.content,
                    excerpt: article.excerpt,
                    metaTitle: article.metaTitle,
                    metaDescription: article.metaDescription,
                    featuredImage: article.featuredImage,
                    status: 'PUBLISHED',
                    authorId: author.id,
                    publishedAt: article.publishedAt,
                    readingTime,
                }
            })

            imported++
            console.log(`   ✅ ${article.title.substring(0, 50)}...`)
        } catch (err) {
            failed++
            console.log(`   ❌ DB Error: ${(err as Error).message}`)
        }

        // Rate limit - wait 500ms between requests
        await new Promise(r => setTimeout(r, 500))
    }

    console.log('\n' + '='.repeat(50))
    console.log('🎉 Import complete!')
    console.log(`   ✅ Imported: ${imported}`)
    console.log(`   ⏭️  Skipped: ${skipped}`)
    console.log(`   ❌ Failed: ${failed}`)
    console.log('='.repeat(50))

    await prisma.$disconnect()
    await pool.end()
}

importArticles().catch(console.error)
