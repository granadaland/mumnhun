import fetch from 'node-fetch'
import { parse } from 'node-html-parser'

async function scrapeFirst10() {
  const sitemapUrl = 'https://mumnhun.id/post-sitemap.xml'
  const response = await fetch(sitemapUrl)
  const xml = await response.text()
  
  const urlMatches = xml.match(/<loc>https:\/\/mumnhun\.id\/blog\/[^<]+<\/loc>/g) || []
  const postUrls = urlMatches.slice(1, 11).map(u => u.match(/<loc>([^<]+)<\/loc>/)?.[1] || '') // Skip blog/
  
  console.log(`🕷️  Scraping 10 posts...\n`)
  
  for (let i = 0; i < postUrls.length; i++) {
    const url = postUrls[i]
    console.log(`${i+1}. ${url}`)
    
    const res = await fetch(url)
    const html = await res.text()
    const root = parse(html)
    
    const title = root.querySelector('h1')?.text.trim() || 'No title'
    const excerpt = root.querySelector('.entry-summary')?.text.trim() || root.querySelector('p')?.text.trim() || 'No excerpt'
    
    console.log(`   Title: ${title.substring(0, 60)}...\n   Excerpt: ${excerpt.substring(0, 100)}...\n`)
  }
}

scrapeFirst10().catch(console.error)
