import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import fetch from 'node-fetch'
import { parse } from 'node-html-parser'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function migratePosts() {
  console.log('🚀 Full migration: 306 posts...\n')

  // BUAT AUTHOR DULU (ganti dengan ID dari step sebelumnya)
  const author = await prisma.user.upsert({
    where: { email: 'admin@mumnhun.id' },
    update: {},
    create: {
      name: 'Santika Reja',
      email: 'admin@mumnhun.id'
    }
  })
  console.log('👤 Author ID:', author.id)

  const sitemapUrl = 'https://mumnhun.id/post-sitemap.xml'
  const response = await fetch(sitemapUrl)
  const xml = await response.text()

  // Extract all post URLs from sitemap (skip blog/ and wp-content)
  const urlMatches = xml.match(/<loc>(https:\/\/mumnhun\.id\/[^<]+)<\/loc>/g) || []
  const postUrls = urlMatches
    .map(u => u.match(/<loc>([^<]+)<\/loc>/)?.[1] || '')
    .filter(u => u && !u.includes('blog/') && !u.includes('wp-content') && !u.includes('sitemap') && u !== 'https://mumnhun.id/')
  console.log(`📊 Total posts: ${postUrls.length}\n`)

  let imported = 0
  let skipped = 0

  for (let i = 0; i < postUrls.length; i++) {
    const url = postUrls[i]
    console.log(`\n[${i + 1}/${postUrls.length}] ${url}`)

    try {
      const res = await fetch(url)
      const html = await res.text()
      const root = parse(html)

      // Extract data
      const title = root.querySelector('h1')?.text.trim() || ''
      const slug = url.split('/').pop() || ''

      if (!title || !slug) {
        console.log(`   ❌ No title/slug`)
        continue
      }

      // Check if exists
      const existing = await prisma.post.findUnique({ where: { slug } })
      if (existing) {
        skipped++
        console.log(`   ⚠️  Skipped (exists)`)
        continue
      }

      const content = root.querySelector('.entry-content')?.innerHTML || root.querySelector('.post-content')?.innerHTML || ''
      const excerpt = root.querySelector('.entry-summary')?.text.trim() || root.querySelector('meta[name="description"]')?.getAttribute('content')?.substring(0, 160) || title.substring(0, 160)

      // Meta SEO
      const metaTitle = root.querySelector('meta[property="og:title"]')?.getAttribute('content') || title
      const metaDesc = root.querySelector('meta[name="description"]')?.getAttribute('content') || excerpt

      // Featured image
      const featuredImg = root.querySelector('.wp-post-image')?.getAttribute('src') || root.querySelector('meta[property="og:image"]')?.getAttribute('content') || ''

      // Create post
      await prisma.post.create({
        data: {
          title,
          slug,
          content,
          excerpt,
          metaTitle,
          metaDescription: metaDesc,
          featuredImage: featuredImg,
          status: 'PUBLISHED',
          authorId: author.id,
          publishedAt: new Date(),
          readingTime: Math.ceil((content.replace(/<[^>]*>/g, '').split(/\s+/).length || 0) / 200),
        }
      })

      imported++
      console.log(`   ✅ Imported: ${title.substring(0, 60)}...`)

      // Delay 1 detik (rate limit)
      await new Promise(r => setTimeout(r, 1000))

    } catch (error: any) {
      console.log(`   ❌ Error: ${error.message || error}`)
    }
  }

  console.log(`\n🎉 Migration complete!`)
  console.log(`   ✅ Imported: ${imported}`)
  console.log(`   ⚠️  Skipped: ${skipped}`)

  await prisma.$disconnect()
}

migratePosts().catch(console.error)

