import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import fetch from 'node-fetch'
import { parse } from 'node-html-parser'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function scrapePosts() {
  console.log('🔍 Scraping sitemap...')
  
  const sitemapUrl = 'https://mumnhun.id/post-sitemap.xml'
  const response = await fetch(sitemapUrl)
  const xml = await response.text()
  
  // Parse XML to get post URLs
  const urls = xml.match(/<loc>https:\/\/mumnhun\.id\/[^<]+<\/loc>/g) || []
  console.log(`📊 Found ${urls.length} posts in sitemap`)
  
  // Print first 10
  urls.slice(0, 10).forEach((url, i) => {
    console.log(`${i+1}. ${url.match(/<loc>([^<]+)<\/loc>/)?.[1]}`)
  })
  
  await prisma.$disconnect()
}

scrapePosts().catch(console.error)
