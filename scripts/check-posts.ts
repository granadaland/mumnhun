import 'dotenv/config'
import { config } from 'dotenv'
config({ path: '.env.local' })
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
  const posts = await prisma.post.findMany({
    select: {
      id: true,
      wpId: true,
      title: true,
      slug: true,
      status: true,
      publishedAt: true,
    },
    orderBy: { publishedAt: 'desc' }
  })
  
  console.log(`📊 Total posts in database: ${posts.length}\n`)
  
  posts.forEach((post, i) => {
    console.log(`${i + 1}. [WP:${post.wpId}] ${post.title}`)
    console.log(`   Slug: ${post.slug}`)
    console.log(`   Status: ${post.status}`)
    console.log(`   Published: ${post.publishedAt?.toISOString().split('T')[0]}\n`)
  })
  
  await prisma.$disconnect()
}

main()
