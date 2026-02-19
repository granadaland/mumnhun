
import { getSitemapData } from '@/lib/db/queries'
import { Metadata } from 'next'
import { SITE_NAME, SITE_URL } from '@/lib/constants'
import SitemapClient from './SitemapClient'

export const metadata: Metadata = {
    title: `Peta Situs | ${SITE_NAME}`,
    description: `Jelajahi semua artikel dan kategori di ${SITE_NAME}. Temukan informasi lengkap seputar ASI, menyusui, dan parenting.`,
    alternates: {
        canonical: `${SITE_URL}/sitemap`,
    },
    openGraph: {
        title: `Peta Situs | ${SITE_NAME}`,
        description: `Jelajahi semua artikel dan kategori di ${SITE_NAME}.`,
        url: `${SITE_URL}/sitemap`,
        siteName: SITE_NAME,
        type: 'website',
    },
}

export default async function SitemapPage() {
    const { categories, pages, tags, uncategorizedPosts } = await getSitemapData()

    return <SitemapClient categories={categories} pages={pages} tags={tags} uncategorizedPosts={uncategorizedPosts} />
}
