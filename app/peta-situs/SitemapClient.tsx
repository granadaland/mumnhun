'use client'

import { Container } from '@/components/ui/container'
import Link from 'next/link'
import { ArrowRight, FileText, FolderOpen } from 'lucide-react'
import { motion } from 'framer-motion'

// Define types based on the query result
type Post = {
    id: string
    title: string
    slug: string
    publishedAt: Date | null
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

export default function SitemapClient({ categories }: { categories: CategoryWithPosts[] }) {
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
        <main className="min-h-screen bg-gradient-to-b from-[#FFFBF7] to-white pt-32 pb-20">
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
                        Temukan semua artikel dan panduan lengkap yang telah kami susun untuk perjalanan mengasihi Anda.
                    </p>
                </motion.div>

                <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
                >
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
                </motion.div>
            </Container>
        </main>
    )
}
