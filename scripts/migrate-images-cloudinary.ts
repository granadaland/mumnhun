import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import { v2 as cloudinary } from 'cloudinary'

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
})

// Database connection
const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

// Cache to avoid re-uploading same images
const uploadCache = new Map<string, string>()

interface UploadResult {
    success: boolean
    originalUrl: string
    cloudinaryUrl?: string
    error?: string
}

async function uploadToCloudinary(imageUrl: string): Promise<UploadResult> {
    // Check cache first
    if (uploadCache.has(imageUrl)) {
        return {
            success: true,
            originalUrl: imageUrl,
            cloudinaryUrl: uploadCache.get(imageUrl)!
        }
    }

    try {
        // Clean URL
        const cleanUrl = imageUrl.split('?')[0]

        // Extract filename for public_id
        const urlParts = cleanUrl.split('/')
        const filename = urlParts[urlParts.length - 1].split('.')[0]
        const folder = 'mumnhun/blog'

        // Upload to Cloudinary from URL
        const result = await cloudinary.uploader.upload(imageUrl, {
            folder,
            public_id: filename,
            overwrite: false, // Don't re-upload if exists
            resource_type: 'image',
            transformation: [
                { quality: 'auto:good', fetch_format: 'auto' }
            ]
        })

        const cloudinaryUrl = result.secure_url
        uploadCache.set(imageUrl, cloudinaryUrl)

        return {
            success: true,
            originalUrl: imageUrl,
            cloudinaryUrl
        }
    } catch (error: any) {
        // If already exists, try to get the existing URL
        if (error.message?.includes('already exists')) {
            const urlParts = imageUrl.split('/')
            const filename = urlParts[urlParts.length - 1].split('.')[0]
            const cloudinaryUrl = `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload/mumnhun/blog/${filename}`
            uploadCache.set(imageUrl, cloudinaryUrl)
            return {
                success: true,
                originalUrl: imageUrl,
                cloudinaryUrl
            }
        }

        return {
            success: false,
            originalUrl: imageUrl,
            error: error.message || String(error)
        }
    }
}

async function migrateImages() {
    console.log('🖼️  Starting Cloudinary image migration...\n')
    console.log('📦 Cloudinary Config:', {
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        folder: 'mumnhun/blog'
    })

    // Get all posts with WordPress images
    const posts = await prisma.post.findMany({
        where: {
            OR: [
                { content: { contains: 'mumnhun.id/wp-content' } },
                { featuredImage: { contains: 'mumnhun.id/wp-content' } }
            ]
        },
        select: {
            id: true,
            slug: true,
            content: true,
            featuredImage: true
        }
    })

    console.log(`\n📊 Found ${posts.length} posts with WordPress images\n`)

    let totalImages = 0
    let successCount = 0
    let failCount = 0
    let postsUpdated = 0

    for (let i = 0; i < posts.length; i++) {
        const post = posts[i]
        console.log(`\n[${i + 1}/${posts.length}] ${post.slug}`)

        let updatedContent = post.content || ''
        let updatedFeaturedImage = post.featuredImage

        // Find all WordPress image URLs in content
        const wpImageRegex = /https?:\/\/mumnhun\.id\/wp-content\/uploads\/[^"'\s\)]+\.(jpg|jpeg|png|gif|webp)/gi
        const contentImages = updatedContent.match(wpImageRegex) || []
        const uniqueImages = [...new Set(contentImages)]

        console.log(`   📷 Found ${uniqueImages.length} unique images`)

        // Upload each image to Cloudinary
        for (const imageUrl of uniqueImages) {
            totalImages++
            const result = await uploadToCloudinary(imageUrl)

            if (result.success && result.cloudinaryUrl) {
                successCount++
                // Replace all occurrences in content
                updatedContent = updatedContent.split(imageUrl).join(result.cloudinaryUrl)
                console.log(`   ✅ ${imageUrl.split('/').pop()}`)
            } else {
                failCount++
                console.log(`   ❌ ${imageUrl.split('/').pop()}: ${result.error}`)
            }

            // Small delay to avoid rate limiting
            await new Promise(r => setTimeout(r, 200))
        }

        // Handle featured image
        if (updatedFeaturedImage?.includes('mumnhun.id/wp-content')) {
            totalImages++
            const result = await uploadToCloudinary(updatedFeaturedImage)

            if (result.success && result.cloudinaryUrl) {
                successCount++
                updatedFeaturedImage = result.cloudinaryUrl
                console.log(`   ✅ Featured: ${post.featuredImage?.split('/').pop()}`)
            } else {
                failCount++
                console.log(`   ❌ Featured: ${result.error}`)
            }
        }

        // Update post if any changes
        if (updatedContent !== post.content || updatedFeaturedImage !== post.featuredImage) {
            try {
                await prisma.post.update({
                    where: { id: post.id },
                    data: {
                        content: updatedContent,
                        featuredImage: updatedFeaturedImage
                    }
                })
                postsUpdated++
                console.log(`   💾 Post updated`)
            } catch (err) {
                console.log(`   ❌ DB update failed: ${(err as Error).message}`)
            }
        }
    }

    console.log('\n' + '='.repeat(60))
    console.log('🎉 Migration complete!')
    console.log(`   📊 Total images processed: ${totalImages}`)
    console.log(`   ✅ Successfully uploaded: ${successCount}`)
    console.log(`   ❌ Failed: ${failCount}`)
    console.log(`   💾 Posts updated: ${postsUpdated}`)
    console.log('='.repeat(60))

    await prisma.$disconnect()
    await pool.end()
}

migrateImages().catch(console.error)
