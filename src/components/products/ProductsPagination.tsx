"use client"

import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight } from "lucide-react"

export function ProductsPagination({
    currentPage,
    totalPages,
    hasNextPage,
    hasPreviousPage,
    onPageChange
}: {
    currentPage: number
    totalPages: number
    hasNextPage: boolean
    hasPreviousPage: boolean
    onPageChange: (page: number) => void
}) {
    const getPageNumbers = () => {
        const pages: (number | string)[] = []
        const maxVisible = 7

        if (totalPages <= maxVisible) {
            return Array.from({ length: totalPages }, (_, i) => i + 1)
        }

        pages.push(1)

        if (currentPage > 3) pages.push("...")

        const start = Math.max(2, currentPage - 1)
        const end = Math.min(totalPages - 1, currentPage + 1)

        for (let i = start; i <= end; i++) {
            pages.push(i)
        }

        if (currentPage < totalPages - 2) pages.push("...")
        if (totalPages > 1) pages.push(totalPages)

        return pages
    }

    if (totalPages <= 1) {
        return null
    }

    return (
        <div className="flex items-center justify-center gap-2">
            <Button
                variant="outline"
                size="icon"
                onClick={() => onPageChange(currentPage - 1)}
                disabled={!hasPreviousPage}
            >
                <ChevronLeft className="h-4 w-4" />
            </Button>

            {getPageNumbers().map((page, index) => {
                if (page === "...") {
                    return (
                        <span key={`ellipsis-${index}`} className="px-2 text-muted-foreground">
                            ...
                        </span>
                    )
                }

                return (
                    <Button
                        key={page}
                        variant={currentPage === page ? "default" : "outline"}
                        size="icon"
                        onClick={() => onPageChange(page as number)}
                    >
                        {page}
                    </Button>
                )
            })}

            <Button variant="outline" size="icon" onClick={() => onPageChange(currentPage + 1)} disabled={!hasNextPage}>
                <ChevronRight className="h-4 w-4" />
            </Button>
        </div>
    )
}
