/**
 * Verify Internal Links for mumnhun.id
 * 
 * Validates internal links added by the builder script
 * 
 * Usage: npx tsx scripts/verify-internal-links.ts
 */

import prisma from '../lib/db/prisma';

interface LinkInfo {
    href: string;
    text: string;
}

interface ArticleStats {
    slug: string;
    title: string;
    internalLinkCount: number;
    links: LinkInfo[];
    hasExcessiveLinks: boolean;
    hasBrokenLinks: boolean;
    brokenLinks: string[];
}

/**
 * Extract all internal links from content
 */
function extractInternalLinks(content: string): LinkInfo[] {
    const links: LinkInfo[] = [];
    const pattern = /<a\s+[^>]*href=["']\/([^"'#]+)["'][^>]*>([^<]+)<\/a>/gi;

    let match;
    while ((match = pattern.exec(content)) !== null) {
        links.push({
            href: '/' + match[1],
            text: match[2].replace(/&nbsp;/g, ' ').trim()
        });
    }

    return links;
}

/**
 * Main verification
 */
async function main() {
    console.log('🔍 Internal Links Verification');
    console.log('===============================\n');

    // Fetch all published articles
    const posts = await prisma.post.findMany({
        where: { status: 'PUBLISHED' },
        select: {
            id: true,
            title: true,
            slug: true,
            content: true
        }
    });

    // Build slug lookup
    const validSlugs = new Set(posts.map(p => p.slug));

    console.log(`📚 Checking ${posts.length} articles...\n`);

    const stats: ArticleStats[] = [];
    let totalLinks = 0;
    let articlesWithLinks = 0;
    let articlesWithExcessiveLinks = 0;
    let brokenLinkCount = 0;

    for (const post of posts) {
        const links = extractInternalLinks(post.content);
        const brokenLinks = links
            .map(l => l.href.replace('/', ''))
            .filter(slug => !validSlugs.has(slug));

        const articleStats: ArticleStats = {
            slug: post.slug,
            title: post.title.substring(0, 60) + '...',
            internalLinkCount: links.length,
            links,
            hasExcessiveLinks: links.length > 10,
            hasBrokenLinks: brokenLinks.length > 0,
            brokenLinks
        };

        stats.push(articleStats);
        totalLinks += links.length;

        if (links.length > 0) articlesWithLinks++;
        if (links.length > 10) articlesWithExcessiveLinks++;
        brokenLinkCount += brokenLinks.length;

        // Report issues
        if (articleStats.hasBrokenLinks) {
            console.log(`❌ ${post.slug}: ${brokenLinks.length} broken links`);
            brokenLinks.forEach(l => console.log(`   → /${l}`));
        }
        if (articleStats.hasExcessiveLinks) {
            console.log(`⚠️  ${post.slug}: ${links.length} links (excessive)`);
        }
    }

    // Summary statistics
    console.log('\n===============================');
    console.log('📊 VERIFICATION SUMMARY');
    console.log('===============================');
    console.log(`Total articles: ${posts.length}`);
    console.log(`Articles with internal links: ${articlesWithLinks}`);
    console.log(`Total internal links: ${totalLinks}`);
    console.log(`Average links per article: ${(totalLinks / posts.length).toFixed(1)}`);
    console.log(`Average links (articles with links): ${(totalLinks / articlesWithLinks || 0).toFixed(1)}`);
    console.log('');
    console.log(`❌ Articles with excessive links (>10): ${articlesWithExcessiveLinks}`);
    console.log(`❌ Total broken links: ${brokenLinkCount}`);

    // Link distribution
    const linkDistribution: Record<string, number> = {};
    for (const stat of stats) {
        const bucket = stat.internalLinkCount > 10
            ? '11+'
            : stat.internalLinkCount.toString();
        linkDistribution[bucket] = (linkDistribution[bucket] || 0) + 1;
    }

    console.log('\n📈 Link Distribution:');
    for (let i = 0; i <= 10; i++) {
        const count = linkDistribution[i.toString()] || 0;
        const bar = '█'.repeat(Math.ceil(count / 5));
        console.log(`  ${i.toString().padStart(2)} links: ${count.toString().padStart(3)} articles ${bar}`);
    }
    if (linkDistribution['11+']) {
        console.log(`  11+ links: ${linkDistribution['11+'].toString().padStart(3)} articles`);
    }

    // Final verdict
    console.log('\n===============================');
    if (brokenLinkCount === 0 && articlesWithExcessiveLinks === 0) {
        console.log('✅ All checks passed!');
    } else {
        console.log('⚠️  Issues found - review above');
    }

    await prisma.$disconnect();
}

main().catch(async (e) => {
    console.error('Error:', e);
    await prisma.$disconnect();
    process.exit(1);
});
