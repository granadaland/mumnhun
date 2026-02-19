'use client'

import { Container } from '@/components/ui/container'
import Link from 'next/link'
import { ArrowRight, FileText, FolderOpen, Layers, Tag as TagIcon } from 'lucide-react'
import { motion } from 'framer-motion'

// Define types based on the query result
type Post = {
    id: string
    title: string
    slug: string
    publishedAt: Date | null
}

type Page = {
    id: string
    title: string
    slug: string
    publishedAt: Date | null
}

type Tag = {
    id: string
    name: string
    slug: string
    _count: {
        posts: number
    }
}

type CategoryWithPosts = {
    id: string
    name: string
    slug: string
    description: string | null
    posts: {
        post: Post
    }[]
}

type SitemapClientProps = {
    categories: CategoryWithPosts[]
    pages: Page[]
    tags: Tag[]
    uncategorizedPosts: Post[]
}

export default function SitemapClient({ categories, pages, tags, uncategorizedPosts }: SitemapClientProps) {
    // Filter categories that have at least one published post
    const activeCategories = categories.filter((cat) => cat.posts.length > 0)

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    }

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
    }

    return (
        <main className="min-h-screen bg-gradient-to-b from-[#FFFBF7] to-white pt-40 md:pt-48 pb-20">
            <Container className="max-w-7xl px-6">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="text-center mb-16"
                >
                    <h1 className="text-4xl md:text-5xl font-bold text-[#382821] mb-4">
                        Peta Situs
                    </h1>
                    <p className="text-[#382821]/60 text-lg max-w-2xl mx-auto">
                        Navigasi lengkap ke seluruh halaman, artikel, dan topik di website kami.
                    </p>
                </motion.div>

                <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    className="space-y-16"
                >
                    {/* 1. Static Pages Section */}
                    {pages.length > 0 && (
                        <section>
                            <h2 className="text-2xl font-bold text-[#382821] mb-6 flex items-center gap-2 border-b border-gray-100 pb-2">
                                <Layers className="text-[#466A68]" size={24} />
                                Halaman Utama
                            </h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                                {pages.map((page) => (
                                    <motion.div key={page.id} variants={itemVariants}>
                                        <Link
                                            href={`/${page.slug}`}
                                            className="block p-4 bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md hover:border-[#466A68]/20 transition-all group"
                                        >
                                            <div className="flex items-center justify-between">
                                                <span className="font-semibold text-[#382821] group-hover:text-[#466A68] transition-colors">{page.title}</span>
                                                <ArrowRight size={16} className="text-gray-300 group-hover:text-[#466A68] transition-colors" />
                                            </div>
                                        </Link>
                                    </motion.div>
                                ))}
                                {/* Add Home and Blog manually if not in DB pages */}
                                <motion.div variants={itemVariants}>
                                    <Link href="/" className="block p-4 bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md hover:border-[#466A68]/20 transition-all group">
                                        <div className="flex items-center justify-between">
                                            <span className="font-semibold text-[#382821] group-hover:text-[#466A68] transition-colors">Beranda</span>
                                            <ArrowRight size={16} className="text-gray-300 group-hover:text-[#466A68] transition-colors" />
                                        </div>
                                    </Link>
                                </motion.div>
                                <motion.div variants={itemVariants}>
                                    <Link href="/blog" className="block p-4 bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md hover:border-[#466A68]/20 transition-all group">
                                        <div className="flex items-center justify-between">
                                            <span className="font-semibold text-[#382821] group-hover:text-[#466A68] transition-colors">Blog</span>
                                            <ArrowRight size={16} className="text-gray-300 group-hover:text-[#466A68] transition-colors" />
                                        </div>
                                    </Link>
                                </motion.div>
                            </div>
                        </section>
                    )}

                    {/* 2. Categories & Articles Section */}
                    <section>
                        <h2 className="text-2xl font-bold text-[#382821] mb-6 flex items-center gap-2 border-b border-gray-100 pb-2">
                            <FolderOpen className="text-[#466A68]" size={24} />
                            Artikel berdasarkan Kategori
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {activeCategories.map((category) => (
                                <motion.div
                                    key={category.id}
                                    variants={itemVariants}
                                    className="group h-full"
                                >
                                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 h-full overflow-hidden flex flex-col transform hover:-translate-y-1">
                                        {/* Category Header */}
                                        <div className="p-6 border-b border-gray-50 bg-gradient-to-r from-[#466A68]/5 to-transparent">
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-2 text-[#466A68] font-bold text-xl">
                                                    <FolderOpen size={24} />
                                                    <h2>{category.name}</h2>
                                                </div>
                                                <span className="bg-[#466A68]/10 text-[#466A68] text-xs font-bold px-2 py-1 rounded-full">
                                                    {category.posts.length} Artikel
                                                </span>
                                            </div>
                                            {category.description && (
                                                <p className="text-sm text-[#382821]/60 line-clamp-2 mt-2">
                                                    {category.description}
                                                </p>
                                            )}
                                        </div>

                                        {/* Posts List */}
                                        <div className="p-6 flex-1">
                                            <ul className="space-y-4">
                                                {category.posts.map(({ post }) => (
                                                    <li key={post.id} className="group/item">
                                                        <Link
                                                            href={`/${post.slug}`}
                                                            className="flex items-start gap-3 text-[#382821]/80 hover:text-[#466A68] transition-colors"
                                                        >
                                                            <FileText size={18} className="mt-0.5 flex-shrink-0 text-gray-300 group-hover/item:text-[#466A68] transition-colors" />
                                                            <span className="text-sm font-medium line-clamp-2 group-hover/item:translate-x-1 transition-transform duration-300">
                                                                {post.title}
                                                            </span>
                                                        </Link>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>

                                        {/* Footer Link */}
                                        <div className="p-4 bg-gray-50 mt-auto border-t border-gray-100">
                                            <Link
                                                href={`/category/${category.slug}`}
                                                className="flex items-center justify-center gap-2 text-sm font-bold text-[#466A68] hover:gap-3 transition-all w-full py-2 rounded-lg hover:bg-[#466A68]/5"
                                            >
                                                Lihat Kategori
                                                <ArrowRight size={16} />
                                            </Link>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </section>

                    {/* Uncategorized Posts Section */}
                    {uncategorizedPosts.length > 0 && (
                        <section>
                            <h2 className="text-2xl font-bold text-[#382821] mb-6 flex items-center gap-2 border-b border-gray-100 pb-2">
                                <FileText className="text-[#466A68]" size={24} />
                                Artikel Lainnya
                            </h2>
                            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all p-6">
                                <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-4">
                                    {uncategorizedPosts.map((post) => (
                                        <li key={post.id} className="group/item">
                                            <Link
                                                href={`/${post.slug}`}
                                                className="flex items-start gap-3 text-[#382821]/80 hover:text-[#466A68] transition-colors"
                                            >
                                                <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-gray-300 group-hover/item:bg-[#466A68] transition-colors flex-shrink-0" />
                                                <span className="text-sm font-medium line-clamp-2 group-hover/item:translate-x-1 transition-transform duration-300">
                                                    {post.title}
                                                </span>
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </section>
                    )}

                    {/* 3. Tags Section */}
                    {tags.length > 0 && (
                        <section>
                            <h2 className="text-2xl font-bold text-[#382821] mb-6 flex items-center gap-2 border-b border-gray-100 pb-2">
                                <TagIcon className="text-[#466A68]" size={24} />
                                Topik Populer
                            </h2>
                            <div className="flex flex-wrap gap-3">
                                {tags.map((tag) => (
                                    <motion.div key={tag.id} variants={itemVariants}>
                                        <Link
                                            href={`/tag/${tag.slug}`}
                                            className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-full border border-gray-200 text-[#382821]/80 hover:border-[#466A68] hover:text-[#466A68] hover:shadow-sm transition-all text-sm group"
                                        >
                                            <span>#{tag.name}</span>
                                            <span className="bg-gray-100 text-gray-500 text-xs px-1.5 py-0.5 rounded-full group-hover:bg-[#466A68]/10 group-hover:text-[#466A68]">
                                                {tag._count.posts}
                                            </span>
                                        </Link>
                                    </motion.div>
                                ))}
                            </div>
                        </section>
                    )}
                </motion.div>
            </Container>
        </main>
    )
}
