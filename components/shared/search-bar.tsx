"use client"

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Search, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

interface SearchBarProps {
    placeholder?: string
    defaultValue?: string
    className?: string
}

export function SearchBar({
    placeholder = "Cari artikel...",
    defaultValue = "",
    className = ""
}: SearchBarProps) {
    const [query, setQuery] = useState(defaultValue)
    const router = useRouter()

    const handleSearch = useCallback((e: React.FormEvent) => {
        e.preventDefault()
        if (query.trim()) {
            router.push(`/search?q=${encodeURIComponent(query.trim())}`)
        }
    }, [query, router])

    const handleClear = useCallback(() => {
        setQuery("")
    }, [])

    return (
        <form onSubmit={handleSearch} className={`relative ${className}`}>
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={placeholder}
                    className="pl-10 pr-10"
                />
                {query && (
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                        onClick={handleClear}
                    >
                        <X className="h-4 w-4" />
                        <span className="sr-only">Hapus pencarian</span>
                    </Button>
                )}
            </div>
        </form>
    )
}
