import Link from "next/link"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"

interface PaginationProps {
    currentPage: number
    totalPages: number
    baseUrl: string
}

export function Pagination({ currentPage, totalPages, baseUrl }: PaginationProps) {
    if (totalPages <= 1) return null

    const hasPrevPage = currentPage > 1
    const hasNextPage = currentPage < totalPages

    // Calculate page numbers to show
    const getPageNumbers = () => {
        const pages: (number | "...")[] = []
        const delta = 2 // Number of pages to show around current page

        for (let i = 1; i <= totalPages; i++) {
            if (
                i === 1 ||
                i === totalPages ||
                (i >= currentPage - delta && i <= currentPage + delta)
            ) {
                pages.push(i)
            } else if (pages[pages.length - 1] !== "...") {
                pages.push("...")
            }
        }

        return pages
    }

    const pageNumbers = getPageNumbers()

    const getPageUrl = (page: number) => {
        if (page === 1) return baseUrl
        return `${baseUrl}?page=${page}`
    }

    return (
        <nav aria-label="Pagination" className="flex items-center justify-center gap-2 mt-12">
            {/* Previous Button */}
            <Button
                asChild={hasPrevPage}
                variant="outline"
                size="sm"
                disabled={!hasPrevPage}
                className={!hasPrevPage ? "opacity-50 cursor-not-allowed" : ""}
            >
                {hasPrevPage ? (
                    <Link href={getPageUrl(currentPage - 1)}>
                        <ChevronLeft className="h-4 w-4 mr-1" />
                        Sebelumnya
                    </Link>
                ) : (
                    <span>
                        <ChevronLeft className="h-4 w-4 mr-1" />
                        Sebelumnya
                    </span>
                )}
            </Button>

            {/* Page Numbers */}
            <div className="hidden sm:flex items-center gap-1">
                {pageNumbers.map((page, index) =>
                    page === "..." ? (
                        <span key={`ellipsis-${index}`} className="px-2 text-muted-foreground">
                            ...
                        </span>
                    ) : (
                        <Button
                            key={page}
                            asChild={page !== currentPage}
                            variant={page === currentPage ? "default" : "outline"}
                            size="sm"
                            className={page === currentPage ? "bg-mumnhun-600 hover:bg-mumnhun-700" : ""}
                        >
                            {page === currentPage ? (
                                <span>{page}</span>
                            ) : (
                                <Link href={getPageUrl(page)}>{page}</Link>
                            )}
                        </Button>
                    )
                )}
            </div>

            {/* Mobile Page Indicator */}
            <span className="sm:hidden text-sm text-muted-foreground">
                {currentPage} / {totalPages}
            </span>

            {/* Next Button */}
            <Button
                asChild={hasNextPage}
                variant="outline"
                size="sm"
                disabled={!hasNextPage}
                className={!hasNextPage ? "opacity-50 cursor-not-allowed" : ""}
            >
                {hasNextPage ? (
                    <Link href={getPageUrl(currentPage + 1)}>
                        Selanjutnya
                        <ChevronRight className="h-4 w-4 ml-1" />
                    </Link>
                ) : (
                    <span>
                        Selanjutnya
                        <ChevronRight className="h-4 w-4 ml-1" />
                    </span>
                )}
            </Button>
        </nav>
    )
}
