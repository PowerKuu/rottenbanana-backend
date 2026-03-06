"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select"
import { PendingProductCard } from "@/components/pending-products/PendingProductCard"
import { BulkImportDialog } from "@/components/pending-products/BulkImportDialog"
import { ProductsPagination } from "@/components/Pagination"
import { FileUp, Download } from "lucide-react"
import { getPendingProducts } from "@/server/admin/actions/pendingProducts"
import { PendingProduct, PendingProductStatus } from "@/prisma/client"


export default function PendingProductsPage() {
    const [pendingProducts, setPendingProducts] = useState<PendingProduct[]>([])
    const [loading, setLoading] = useState(true)
    const [statusFilter, setStatusFilter] = useState<PendingProductStatus | null>(null)
    const [currentPage, setCurrentPage] = useState(1)
    const [pagination, setPagination] = useState({
        currentPage: 1,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false
    })
    const [bulkImportDialogOpen, setBulkImportDialogOpen] = useState(false)
    useEffect(() => {
        loadPendingProducts()
    }, [currentPage, statusFilter])

    const loadPendingProducts = async () => {
        setLoading(true)
        const data = await getPendingProducts({
            page: currentPage,
            status: statusFilter
        })
        setPendingProducts(data.pendingProducts)
        setPagination(data.pagination)
        setLoading(false)
    }

    const handleSuccess = () => {
        loadPendingProducts()
    }

    const handleStatusChange = (value: string) => {
        setStatusFilter(value === "ALL" ? null : (value as PendingProductStatus))
        setCurrentPage(1)
    }

    const approvedCount = pendingProducts.filter(
        (p) => p.status === "APPROVED"
    ).length

    return (
        <>
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">
                            Pending Products
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            Review and manage product imports
                        </p>
                    </div>
                    <div className="flex gap-2 items-center">
                        <Select
                            value={statusFilter ?? "ALL"}
                            onValueChange={handleStatusChange}
                        >
                            <SelectTrigger className="w-45">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">All</SelectItem>
                                <SelectItem value="PENDING">Pending</SelectItem>
                                <SelectItem value="APPROVED">
                                    Approved
                                </SelectItem>
                                <SelectItem value="REJECTED">
                                    Rejected
                                </SelectItem>
                                <SelectItem value="PROCCESSING">
                                    Processing
                                </SelectItem>
                            </SelectContent>
                        </Select>
                        <Button
                            onClick={() => setBulkImportDialogOpen(true)}
                        >
                            <FileUp className="h-4 w-4 mr-2" />
                            Bulk Import
                        </Button>
                    </div>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <p className="text-muted-foreground">Loading...</p>
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {pendingProducts.map((product) => (
                                <PendingProductCard
                                    key={product.id}
                                    pendingProduct={product}
                                    onSuccess={handleSuccess}
                                />
                            ))}
                        </div>

                        {pendingProducts.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-12 text-center">
                                <p className="text-muted-foreground">
                                    No pending products found
                                </p>
                            </div>
                        )}
                    </>
                )}

                {pagination.totalPages > 1 && (
                    <ProductsPagination
                        currentPage={pagination.currentPage}
                        totalPages={pagination.totalPages}
                        hasNextPage={pagination.hasNextPage}
                        hasPreviousPage={pagination.hasPreviousPage}
                        onPageChange={setCurrentPage}
                    />
                )}
            </div>

            <BulkImportDialog
                open={bulkImportDialogOpen}
                onOpenChange={setBulkImportDialogOpen}
                onSuccess={handleSuccess}
            />
        </>
    )
}
