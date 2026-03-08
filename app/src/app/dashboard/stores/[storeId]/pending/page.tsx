"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select"
import { PendingProductCard } from "@/components/pending-products/PendingProductCard"
import { ProductsPagination } from "@/components/Pagination"
import { ArrowLeft } from "lucide-react"
import { getPendingProducts } from "@/server/admin/actions/pendingProducts"
import { getStoreById } from "@/server/admin/actions/stores"
import { PendingProduct, PendingProductStatus, Store } from "@/prisma/client"


export default function StorePendingProductsPage() {
    const params = useParams()
    const router = useRouter()
    const storeId = params.storeId as string

    const [store, setStore] = useState<Store | null>(null)
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

    useEffect(() => {
        loadStoreAndProducts()
    }, [currentPage, statusFilter, storeId])

    const loadStoreAndProducts = async () => {
        setLoading(true)

        const [storeData, productsData] = await Promise.all([
            getStoreById(storeId),
            getPendingProducts({
                page: currentPage,
                status: statusFilter,
                storeId
            })
        ])

        setStore(storeData)
        setPendingProducts(productsData.pendingProducts)
        setPagination(productsData.pagination)
        setLoading(false)
    }

    const handleSuccess = () => {
        loadPendingProducts()
    }

    const loadPendingProducts = async () => {
        const data = await getPendingProducts({
            page: currentPage,
            status: statusFilter,
            storeId
        })
        setPendingProducts(data.pendingProducts)
        setPagination(data.pagination)
    }

    const handleStatusChange = (value: string) => {
        setStatusFilter(value === "ALL" ? null : (value as PendingProductStatus))
        setCurrentPage(1)
    }

    if (!store) {
        return (
            <div className="flex items-center justify-center py-12">
                <p className="text-muted-foreground">Loading...</p>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => router.push(`/dashboard/stores`)}
                        >
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                        <h1 className="text-2xl font-bold tracking-tight">
                            Pending Products - {store.name}
                        </h1>
                    </div>
                    <p className="text-sm text-muted-foreground ml-10">
                        Review and manage product imports for this store
                    </p>
                </div>
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
                        <SelectItem value="APPROVED">Approved</SelectItem>
                        <SelectItem value="REJECTED">Rejected</SelectItem>
                        <SelectItem value="PROCCESSING">Processing</SelectItem>
                        <SelectItem value="FAILED">Failed</SelectItem>
                    </SelectContent>
                </Select>
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
                                No pending products found for this store
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
    )
}
