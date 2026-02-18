/**
 * Fix Broken Internal Links in URLs
 * 
 * Repairs content where links were incorrectly inserted inside URL attributes
 * (e.g., inside src, href, data-src attributes)
 * 
 * Usage: npx tsx -r dotenv/config scripts/fix-broken-links.ts dotenv_config_path=.env.local
 */

import 'dotenv/config';
import prisma from '../lib/db/prisma';

/**
 * Find and fix anchor tags incorrectly inserted inside HTML attributes
 */
function fixBrokenLinks(content: string): { fixed: string; issuesFound: number } {
    let fixed = content;
    let issuesFound = 0;

    // Pattern: Match anchor tags inside double-quoted attribute values
    // This catches cases like: data-src="...some-<a href="...">text</a>-more.jpg"

    // Pattern 1: Link inside URLs (most common issue)
    // Matches: URL-part<a href="...">text</a>more-url
    const urlLinkPattern = /([a-zA-Z0-9/_.-]+)<a\s+href="[^"]*"\s*(?:title="[^"]*")?\s*>([^<]+)<\/a>([a-zA-Z0-9/_.-]*)/gi;

    let match;
    while ((match = urlLinkPattern.exec(content)) !== null) {
        const fullMatch = match[0];
        const before = match[1];
        const linkText = match[2];
        const after = match[3];

        // Check if this is inside a URL context (has typical URL parts)
        if (before.includes('/') || before.includes('.') ||
            after.includes('/') || after.includes('.') ||
            before.includes('upload') || before.includes('cloudinary') ||
            before.includes('http') || before.includes('image')) {
            // This looks like a broken URL - restore original text
            const restored = before + linkText + after;
            fixed = fixed.replace(fullMatch, restored);
            issuesFound++;
        }
    }

    // Pattern 2: Link breaking data-src, data-srcset, src attributes specifically
    // More targeted fix for image attributes
    const attrPatterns = [
        // data-src with broken link
        /(data-src=")([^"]*)<a\s+[^>]*>([^<]+)<\/a>([^"]*")/gi,
        // data-srcset with broken link  
        /(data-srcset=")([^"]*)<a\s+[^>]*>([^<]+)<\/a>([^"]*")/gi,
        // src with broken link
        /(src=")([^"]*)<a\s+[^>]*>([^<]+)<\/a>([^"]*")/gi,
        // href with broken link (in URLs, not intentional links)
        /(href="https?:\/\/[^"]*)<a\s+[^>]*>([^<]+)<\/a>([^"]*")/gi,
    ];

    for (const pattern of attrPatterns) {
        fixed = fixed.replace(pattern, (match, attrStart, urlBefore, anchorText, urlAfter) => {
            issuesFound++;
            return attrStart + urlBefore + anchorText + urlAfter;
        });
    }

    return { fixed, issuesFound };
}

/**
 * Main execution
 */
async function main() {
    console.log('🔧 Fix Broken Internal Links in URLs');
    console.log('=====================================\n');

    // Fetch all published articles
    console.log('📚 Fetching articles...');
    const posts = await prisma.post.findMany({
        where: { status: 'PUBLISHED' },
        select: {
            id: true,
            slug: true,
            content: true
        }
    });

    console.log(`✅ Found ${posts.length} articles\n`);
    console.log('🔍 Scanning for broken links in URLs...\n');

    let totalFixed = 0;
    let articlesFixed = 0;
    const fixedArticles: { slug: string; issuesFixed: number }[] = [];

    for (const post of posts) {
        const { fixed, issuesFound } = fixBrokenLinks(post.content);

        if (issuesFound > 0) {
            // Update the article
            await prisma.post.update({
                where: { id: post.id },
                data: { content: fixed }
            });

            totalFixed += issuesFound;
            articlesFixed++;
            fixedArticles.push({ slug: post.slug, issuesFixed: issuesFound });

            console.log(`✅ Fixed ${post.slug}: ${issuesFound} issues`);
        }
    }

    // Summary
    console.log('\n=====================================');
    console.log('📊 SUMMARY');
    console.log('=====================================');
    console.log(`Total articles scanned: ${posts.length}`);
    console.log(`Articles with issues: ${articlesFixed}`);
    console.log(`Total issues fixed: ${totalFixed}`);

    if (fixedArticles.length > 0) {
        console.log('\n📋 Fixed articles:');
        for (const article of fixedArticles) {
            console.log(`  - ${article.slug} (${article.issuesFixed} issues)`);
        }
    } else {
        console.log('\n✅ No broken links found!');
    }

    // Verify the specific problematic article
    console.log('\n🔍 Verifying specific article...');
    const targetSlug = 'cara-menyimpan-asip-di-kulkas-yang-benar-7-kesalahan-fatal-yang-harus-dihindari';
    const verifyPost = await prisma.post.findUnique({
        where: { slug: targetSlug },
        select: { content: true }
    });

    if (verifyPost) {
        const hasIssue = verifyPost.content.includes('Cara-Menyimpan-<a href');
        if (hasIssue) {
            console.log(`❌ ${targetSlug} still has broken image URL`);
        } else {
            console.log(`✅ ${targetSlug} image URL is fixed`);
        }
    }
}

main().catch(async (e) => {
    console.error('❌ Error:', e);
    process.exit(1);
});
