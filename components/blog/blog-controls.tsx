"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useDebouncedCallback } from "use-debounce"
import { Search } from "lucide-react"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"

interface BlogControlsProps {
    categories: {
        id: string
        name: string
        slug: string
        _count: { posts: number }
    }[]
}

export function BlogControls({ categories }: BlogControlsProps) {
    const searchParams = useSearchParams()
    const { replace } = useRouter()

    const handleSearch = useDebouncedCallback((term: string) => {
        const params = new URLSearchParams(searchParams)
        if (term) {
            params.set("search", term)
        } else {
            params.delete("search")
        }
        params.set("page", "1") // Reset to page 1 on search
        replace(`/blog?${params.toString()}`)
    }, 500)

    const handleCategoryChange = (categorySlug: string) => {
        const params = new URLSearchParams(searchParams)
        if (categorySlug && categorySlug !== "all") {
            params.set("category", categorySlug)
        } else {
            params.delete("category")
        }
        params.set("page", "1") // Reset to page 1 on filter
        replace(`/blog?${params.toString()}`)
    }

    return (
        <div className="flex flex-col md:flex-row gap-4 mb-8">
            {/* Search Input */}
            <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                    placeholder="Cari artikel..."
                    onChange={(e) => handleSearch(e.target.value)}
                    defaultValue={searchParams.get("search")?.toString()}
                    className="pl-9 bg-white rounded-full border-gray-200 focus-visible:ring-[#466A68] text-base h-11"
                />
            </div>

            {/* Category Filter */}
            <div className="md:w-64">
                <Select
                    defaultValue={searchParams.get("category")?.toString() || "all"}
                    onValueChange={handleCategoryChange}
                >
                    <SelectTrigger className="w-full bg-white rounded-full border-gray-200 focus:ring-[#466A68] h-11 px-4">
                        <SelectValue placeholder="Pilih Kategori" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Semua Kategori</SelectItem>
                        {categories.map((category) => (
                            <SelectItem key={category.id} value={category.slug}>
                                {category.name} ({category._count.posts})
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
        </div>
    )
}
