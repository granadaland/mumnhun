"use client"

import {
    Pagination as PaginationRoot,
    PaginationContent,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from "@/components/ui/pagination"
import { useSearchParams } from "next/navigation"

interface PaginationProps {
    totalPages: number
    currentPage: number
}

export function Pagination({ totalPages, currentPage }: PaginationProps) {
    const searchParams = useSearchParams()

    const createPageURL = (pageNumber: number | string) => {
        const params = new URLSearchParams(searchParams)
        params.set("page", pageNumber.toString())
        return `/blog?${params.toString()}`
    }

    if (totalPages <= 1) return null

    return (
        <PaginationRoot className="my-10">
            <PaginationContent>
                {/* Previous Button */}
                <PaginationItem>
                    <PaginationPrevious
                        href={currentPage > 1 ? createPageURL(currentPage - 1) : "#"}
                        aria-disabled={currentPage <= 1}
                        className={currentPage <= 1 ? "pointer-events-none opacity-50" : ""}
                    />
                </PaginationItem>

                {/* Page Numbers */}
                {[...Array(totalPages)].map((_, i) => {
                    const page = i + 1
                    // Show first, last, and pages around current
                    if (
                        page === 1 ||
                        page === totalPages ||
                        (page >= currentPage - 1 && page <= currentPage + 1)
                    ) {
                        return (
                            <PaginationItem key={page}>
                                <PaginationLink
                                    href={createPageURL(page)}
                                    isActive={page === currentPage}
                                >
                                    {page}
                                </PaginationLink>
                            </PaginationItem>
                        )
                    } else if (
                        page === currentPage - 2 ||
                        page === currentPage + 2
                    ) {
                        return (
                            <PaginationItem key={page}>
                                <span className="px-4 py-2">...</span>
                            </PaginationItem>
                        )
                    }
                    return null
                })}

                {/* Next Button */}
                <PaginationItem>
                    <PaginationNext
                        href={currentPage < totalPages ? createPageURL(currentPage + 1) : "#"}
                        aria-disabled={currentPage >= totalPages}
                        className={currentPage >= totalPages ? "pointer-events-none opacity-50" : ""}
                    />
                </PaginationItem>
            </PaginationContent>
        </PaginationRoot>
    )
}
