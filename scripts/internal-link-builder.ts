/**
 * Internal Link Builder for mumnhun.id
 * 
 * Analyzes 305 articles and adds contextual internal links
 * using SEO best practices.
 * 
 * Usage: npx tsx scripts/internal-link-builder.ts
 */

// Load environment variables first
import 'dotenv/config';
import prisma from '../lib/db/prisma';

// Configuration
const CONFIG = {
    MAX_LINKS_PER_ARTICLE: 5,
    MIN_KEYWORD_LENGTH: 4,
    DOMAIN: 'mumnhun.id', // For reference, using relative URLs
};

// Types
interface ArticleData {
    id: string;
    title: string;
    slug: string;
    content: string;
    keywords: string[];
    categoryId?: string;
    tagIds: string[];
}

interface LinkCandidate {
    targetSlug: string;
    targetTitle: string;
    anchorText: string;
    score: number;
}

/**
 * Clean title by removing brand suffix and common patterns
 */
function cleanTitle(title: string): string {
    return title
        .replace(/\s*-\s*Sewa Freezer ASI\s*\|\s*Mum\s*['']N\s*Hun\s*$/i, '')
        .replace(/\s*\|\s*Mum\s*['']N\s*Hun\s*$/i, '')
        .trim();
}

/**
 * Extract keywords from title
 */
function extractTitleKeywords(title: string): string[] {
    const cleaned = cleanTitle(title);

    // Extract meaningful phrases (2-4 words)
    const keywords: string[] = [];

    // Full cleaned title as a keyword phrase
    if (cleaned.length > 10 && cleaned.length < 80) {
        keywords.push(cleaned.toLowerCase());
    }

    // Extract key phrases from title
    const patterns = [
        // Common Indonesian patterns
        /cara\s+\w+(\s+\w+){0,3}/gi,
        /tips\s+\w+(\s+\w+){0,2}/gi,
        /panduan\s+\w+(\s+\w+){0,2}/gi,
        /manfaat\s+\w+(\s+\w+){0,2}/gi,
        /penyebab\s+\w+(\s+\w+){0,2}/gi,
        /tanda[- ]tanda?\s+\w+(\s+\w+){0,2}/gi,
        // Specific topic patterns
        /freezer\s+asi(\s+\w+){0,2}/gi,
        /asi\s+(perah|eksklusif|beku)/gi,
        /asip/gi,
        /menyusui(\s+\w+){0,2}/gi,
        /mpasi(\s+\w+){0,2}/gi,
        /bayi(\s+\w+){0,2}/gi,
        /ibu\s+menyusui/gi,
        /penyimpanan\s+asi/gi,
        /produksi\s+asi/gi,
    ];

    for (const pattern of patterns) {
        const matches = cleaned.match(pattern);
        if (matches) {
            keywords.push(...matches.map(m => m.toLowerCase().trim()));
        }
    }

    return [...new Set(keywords)].filter(k => k.length >= CONFIG.MIN_KEYWORD_LENGTH);
}

/**
 * Extract heading keywords from content
 */
function extractHeadingKeywords(content: string): string[] {
    const keywords: string[] = [];

    // Match H2 and H3 headings
    const headingPattern = /<h[23][^>]*>([^<]+)<\/h[23]>/gi;
    let match;

    while ((match = headingPattern.exec(content)) !== null) {
        const heading = match[1]
            .replace(/<[^>]+>/g, '')
            .replace(/&nbsp;/g, ' ')
            .replace(/\d+\.\s*/, '')
            .trim()
            .toLowerCase();

        if (heading.length >= CONFIG.MIN_KEYWORD_LENGTH && heading.length < 60) {
            keywords.push(heading);
        }
    }

    return keywords;
}

/**
 * Check if paragraph already has links
 */
function paragraphHasLinks(paragraph: string): boolean {
    return /<a\s+[^>]*href/i.test(paragraph);
}

/**
 * Check if text is inside a heading, list item with links, CTA block, or URL attribute
 */
function isInProtectedContext(content: string, position: number): boolean {
    // Find the enclosing tag/context
    const beforePos = content.substring(Math.max(0, position - 500), position);

    // Check if we're inside protected elements
    const protectedPatterns = [
        /<h[1-6][^>]*>[^<]*$/i,  // Inside heading
        /<a\s+[^>]*>[^<]*$/i,    // Inside existing link
        /<div[^>]*class="[^"]*cta[^"]*"[^>]*>[^<]*$/i, // Inside CTA
        /<div[^>]*class="[^"]*article-credits[^"]*"[^>]*>[^<]*$/i, // Article credits
        /Baca Juga:[^<]*$/i,     // Inside "Baca Juga" text
        // CRITICAL: Prevent injection inside HTML attributes (URLs, image paths, etc.)
        /(?:src|href|data-src|data-srcset|srcset)=["'][^"']*$/i, // Inside URL attribute
        /cloudinary\.com[^"']*$/i, // Inside Cloudinary URL
        /https?:\/\/[^"'\s]*$/i, // Inside any URL
    ];

    return protectedPatterns.some(pattern => pattern.test(beforePos));
}

/**
 * Find best anchor text position in content
 */
function findAnchorPosition(
    content: string,
    keyword: string,
    existingLinks: Set<string>
): { start: number; end: number; text: string } | null {
    const lowerContent = content.toLowerCase();
    const lowerKeyword = keyword.toLowerCase();

    // Skip if already linked
    if (existingLinks.has(keyword)) return null;

    // Find all occurrences
    let pos = 0;
    while ((pos = lowerContent.indexOf(lowerKeyword, pos)) !== -1) {
        // Check if inside paragraph (not heading, not existing link)
        const before = content.substring(Math.max(0, pos - 100), pos);
        const after = content.substring(pos, Math.min(content.length, pos + keyword.length + 100));

        // Skip if in protected context
        if (isInProtectedContext(content, pos)) {
            pos += keyword.length;
            continue;
        }

        // Skip if already inside an anchor tag
        if (/<a[^>]*>[^<]*$/.test(before) && /^[^<]*<\/a>/.test(after)) {
            pos += keyword.length;
            continue;
        }

        // Skip if in script or style
        if (/<(script|style)[^>]*>[^<]*$/.test(before)) {
            pos += keyword.length;
            continue;
        }

        // Get actual text (preserve original case)
        const actualText = content.substring(pos, pos + keyword.length);

        return { start: pos, end: pos + keyword.length, text: actualText };
    }

    return null;
}

/**
 * Calculate relevance score between two articles
 */
function calculateRelevanceScore(
    source: ArticleData,
    target: ArticleData
): number {
    let score = 0;

    // Same category bonus
    if (source.categoryId && source.categoryId === target.categoryId) {
        score += 10;
    }

    // Overlapping tags
    const commonTags = source.tagIds.filter(t => target.tagIds.includes(t));
    score += commonTags.length * 5;

    // Keyword overlap in titles
    const sourceKeywords = new Set(source.keywords);
    const targetKeywords = new Set(target.keywords);

    for (const kw of sourceKeywords) {
        if (targetKeywords.has(kw)) {
            score += 8;
        }
        // Partial match
        for (const tkw of targetKeywords) {
            if (kw.includes(tkw) || tkw.includes(kw)) {
                score += 3;
            }
        }
    }

    return score;
}

/**
 * Find link candidates for an article
 */
function findLinkCandidates(
    source: ArticleData,
    allArticles: ArticleData[]
): LinkCandidate[] {
    const candidates: LinkCandidate[] = [];

    for (const target of allArticles) {
        // Skip self
        if (target.id === source.id) continue;

        const score = calculateRelevanceScore(source, target);

        if (score > 5) {
            // Find the best anchor text from target's keywords that appears in source content
            const sourceContentLower = source.content.toLowerCase();

            for (const keyword of target.keywords) {
                if (sourceContentLower.includes(keyword.toLowerCase())) {
                    candidates.push({
                        targetSlug: target.slug,
                        targetTitle: cleanTitle(target.title),
                        anchorText: keyword,
                        score: score + keyword.length, // Longer keywords preferred
                    });
                }
            }

            // Also try the cleaned title
            const cleanedTitle = cleanTitle(target.title).toLowerCase();
            if (cleanedTitle.length < 50 && sourceContentLower.includes(cleanedTitle)) {
                candidates.push({
                    targetSlug: target.slug,
                    targetTitle: cleanTitle(target.title),
                    anchorText: cleanedTitle,
                    score: score + 15, // Title matches are valuable
                });
            }
        }
    }

    // Sort by score descending, dedupe by target
    const seen = new Set<string>();
    return candidates
        .sort((a, b) => b.score - a.score)
        .filter(c => {
            if (seen.has(c.targetSlug)) return false;
            seen.add(c.targetSlug);
            return true;
        })
        .slice(0, CONFIG.MAX_LINKS_PER_ARTICLE * 2); // Get extras for fallback
}

/**
 * Inject internal links into content
 */
function injectLinks(
    content: string,
    candidates: LinkCandidate[]
): { newContent: string; linksAdded: number; linkDetails: string[] } {
    let newContent = content;
    let linksAdded = 0;
    const linkedSlugs = new Set<string>();
    const existingAnchors = new Set<string>();
    const linkDetails: string[] = [];

    // Extract existing links to avoid duplicating
    const existingLinkPattern = /href=["']\/([^"']+)["']/gi;
    let match;
    while ((match = existingLinkPattern.exec(content)) !== null) {
        linkedSlugs.add(match[1]);
    }

    for (const candidate of candidates) {
        if (linksAdded >= CONFIG.MAX_LINKS_PER_ARTICLE) break;
        if (linkedSlugs.has(candidate.targetSlug)) continue;

        const position = findAnchorPosition(newContent, candidate.anchorText, existingAnchors);

        if (position) {
            const link = `<a href="/${candidate.targetSlug}" title="${candidate.targetTitle}">${position.text}</a>`;

            newContent =
                newContent.substring(0, position.start) +
                link +
                newContent.substring(position.end);

            linkedSlugs.add(candidate.targetSlug);
            existingAnchors.add(candidate.anchorText.toLowerCase());
            linksAdded++;
            linkDetails.push(`"${position.text}" → /${candidate.targetSlug}`);
        }
    }

    return { newContent, linksAdded, linkDetails };
}

/**
 * Main execution
 */
async function main() {
    console.log('🔗 Internal Link Builder for mumnhun.id');
    console.log('=========================================\n');

    // Fetch all published articles
    console.log('📚 Fetching articles...');
    const posts = await prisma.post.findMany({
        where: { status: 'PUBLISHED' },
        select: {
            id: true,
            title: true,
            slug: true,
            content: true,
            focusKeyword: true,
            categories: {
                select: { categoryId: true }
            },
            tags: {
                select: { tagId: true }
            }
        }
    });

    console.log(`✅ Found ${posts.length} published articles\n`);

    // Build article data with keywords
    console.log('🔍 Extracting keywords...');
    const articles: ArticleData[] = posts.map(post => {
        const titleKeywords = extractTitleKeywords(post.title);
        const headingKeywords = extractHeadingKeywords(post.content);
        const focusKeyword = post.focusKeyword ? [post.focusKeyword.toLowerCase()] : [];

        return {
            id: post.id,
            title: post.title,
            slug: post.slug,
            content: post.content,
            keywords: [...new Set([...titleKeywords, ...headingKeywords, ...focusKeyword])],
            categoryId: post.categories[0]?.categoryId,
            tagIds: post.tags.map(t => t.tagId),
        };
    });

    // Process each article
    console.log('🔗 Building internal links...\n');

    let totalLinksAdded = 0;
    let articlesModified = 0;
    const report: { slug: string; linksAdded: number; details: string[] }[] = [];

    for (const article of articles) {
        // Find link candidates
        const candidates = findLinkCandidates(article, articles);

        if (candidates.length === 0) continue;

        // Inject links
        const { newContent, linksAdded, linkDetails } = injectLinks(article.content, candidates);

        if (linksAdded > 0) {
            // Update database
            await prisma.post.update({
                where: { id: article.id },
                data: { content: newContent }
            });

            totalLinksAdded += linksAdded;
            articlesModified++;

            report.push({
                slug: article.slug,
                linksAdded,
                details: linkDetails
            });

            console.log(`✅ ${article.slug}: +${linksAdded} links`);
        }
    }

    // Summary
    console.log('\n=========================================');
    console.log('📊 SUMMARY');
    console.log('=========================================');
    console.log(`Total articles processed: ${articles.length}`);
    console.log(`Articles modified: ${articlesModified}`);
    console.log(`Total links added: ${totalLinksAdded}`);
    console.log(`Average links per modified article: ${(totalLinksAdded / articlesModified || 0).toFixed(1)}`);

    // Save detailed report
    const reportPath = './internal-links-report.json';
    const fs = await import('fs');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n📄 Detailed report saved to: ${reportPath}`);

    await prisma.$disconnect();
}

main().catch(async (e) => {
    console.error('❌ Error:', e);
    await prisma.$disconnect();
    process.exit(1);
});
