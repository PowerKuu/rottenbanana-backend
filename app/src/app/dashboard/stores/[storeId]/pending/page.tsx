"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { PendingProductCard } from "@/components/pending-products/PendingProductCard"
import { ProductsPagination } from "@/components/Pagination"
import { ArrowLeft, Shuffle } from "lucide-react"
import { getPendingProducts, getAllPendingProducts } from "@/server/admin/actions/pendingProducts"
import { getStoreById } from "@/server/admin/actions/stores"
import { PendingProduct, PendingProductStatus, Store } from "@/prisma/client"

const PAGE_SIZE = 24

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

    // Shuffle mode state
    const [shuffleMode, setShuffleMode] = useState(false)
    const [allShuffled, setAllShuffled] = useState<PendingProduct[]>([])
    const [shufflePage, setShufflePage] = useState(1)

    useEffect(() => {
        if (shuffleMode) return
        loadStoreAndProducts()
    }, [currentPage, statusFilter, storeId, shuffleMode])

    useEffect(() => {
        const loadStore = async () => {
            const storeData = await getStoreById(storeId)
            setStore(storeData)
        }
        loadStore()
    }, [storeId])

    const loadStoreAndProducts = async () => {
        setLoading(true)
        const [storeData, productsData] = await Promise.all([
            getStoreById(storeId),
            getPendingProducts({ page: currentPage, status: statusFilter, storeId })
        ])
        setStore(storeData)
        setPendingProducts(productsData.pendingProducts)
        setPagination(productsData.pagination)
        setLoading(false)
    }

    const loadPendingProducts = async () => {
        if (shuffleMode) {
            // Reload and re-shuffle all
            const all = await getAllPendingProducts({ status: statusFilter, storeId })
            const shuffled = [...all].sort(() => Math.random() - 0.5)
            setAllShuffled(shuffled)
            return
        }
        const data = await getPendingProducts({ page: currentPage, status: statusFilter, storeId })
        setPendingProducts(data.pendingProducts)
        setPagination(data.pagination)
    }

    const handleStatusChange = (value: string) => {
        setStatusFilter(value === "ALL" ? null : (value as PendingProductStatus))
        setCurrentPage(1)
        setShufflePage(1)
    }

    const handleShuffle = async () => {
        if (shuffleMode) {
            // Re-shuffle in place
            setAllShuffled((prev) => [...prev].sort(() => Math.random() - 0.5))
            setShufflePage(1)
            return
        }
        setLoading(true)
        setShuffleMode(true)
        const all = await getAllPendingProducts({ status: statusFilter, storeId })
        const shuffled = [...all].sort(() => Math.random() - 0.5)
        setAllShuffled(shuffled)
        setShufflePage(1)
        setLoading(false)
    }

    const handleExitShuffle = () => {
        setShuffleMode(false)
        setAllShuffled([])
        setShufflePage(1)
        loadStoreAndProducts()
    }

    // Compute current page of shuffled products
    const shuffleTotalPages = Math.ceil(allShuffled.length / PAGE_SIZE)
    const shuffleStart = (shufflePage - 1) * PAGE_SIZE
    const currentProducts = shuffleMode ? allShuffled.slice(shuffleStart, shuffleStart + PAGE_SIZE) : pendingProducts

    const activePagination = shuffleMode
        ? {
              currentPage: shufflePage,
              totalPages: shuffleTotalPages,
              hasNextPage: shufflePage < shuffleTotalPages,
              hasPreviousPage: shufflePage > 1
          }
        : pagination

    const handlePageChange = (page: number) => {
        if (shuffleMode) setShufflePage(page)
        else setCurrentPage(page)
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
                        <Button variant="ghost" size="icon" onClick={() => router.push(`/dashboard/stores`)}>
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                        <h1 className="text-2xl font-bold tracking-tight">Pending Products - {store.name}</h1>
                    </div>
                    <p className="text-sm text-muted-foreground ml-10">
                        Review and manage product imports for this store
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {shuffleMode && (
                        <Button variant="ghost" size="sm" onClick={handleExitShuffle}>
                            Exit shuffle
                        </Button>
                    )}
                    <Button
                        variant={shuffleMode ? "default" : "outline"}
                        size="icon"
                        onClick={handleShuffle}
                        title={shuffleMode ? "Re-shuffle all products" : "Shuffle all products"}
                    >
                        <Shuffle className="h-4 w-4" />
                    </Button>
                    <Select value={statusFilter ?? "ALL"} onValueChange={handleStatusChange}>
                        <SelectTrigger className="w-45">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ALL">All</SelectItem>
                            <SelectItem value="PENDING">Pending</SelectItem>
                            <SelectItem value="APPROVED">Approved</SelectItem>
                            <SelectItem value="REJECTED">Rejected</SelectItem>
                            <SelectItem value="PROCESSING">Processing</SelectItem>
                            <SelectItem value="COMPLETED">Completed</SelectItem>
                            <SelectItem value="FAILED">Failed</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <p className="text-muted-foreground">Loading...</p>
                </div>
            ) : (
                <>
                    <div className="flex flex-wrap gap-4">
                        {currentProducts.map((product) => (
                            <PendingProductCard
                                key={product.id}
                                pendingProduct={product}
                                onSuccess={loadPendingProducts}
                            />
                        ))}
                    </div>

                    {currentProducts.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <p className="text-muted-foreground">No pending products found for this store</p>
                        </div>
                    )}
                </>
            )}

            {activePagination.totalPages > 1 && (
                <ProductsPagination
                    currentPage={activePagination.currentPage}
                    totalPages={activePagination.totalPages}
                    hasNextPage={activePagination.hasNextPage}
                    hasPreviousPage={activePagination.hasPreviousPage}
                    onPageChange={handlePageChange}
                />
            )}
        </div>
    )
}
