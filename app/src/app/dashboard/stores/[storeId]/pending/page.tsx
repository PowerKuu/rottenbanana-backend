"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { PendingProductCard } from "@/components/pending-products/PendingProductCard"
import { SwipeCard } from "@/components/pending-products/SwipeCard"
import { ProductsPagination } from "@/components/Pagination"
import { ArrowLeft, Check, Layers, X } from "lucide-react"
import { getPendingProducts, getAllPendingProducts, updatePendingProductStatus } from "@/server/admin/actions/pendingProducts"

function fisherYates<T>(arr: T[]): T[] {
    const a = [...arr]
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[a[i], a[j]] = [a[j], a[i]]
    }
    return a
}
import { getStoreById } from "@/server/admin/actions/stores"
import { PendingProduct, PendingProductStatus, Store } from "@/prisma/client"
import { toast } from "sonner"

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

    // Swipe mode state
    const [swipeMode, setSwipeMode] = useState(false)
    const [swipeProducts, setSwipeProducts] = useState<PendingProduct[]>([])
    const [swipeIndex, setSwipeIndex] = useState(0)

    useEffect(() => {
        const loadStore = async () => {
            const storeData = await getStoreById(storeId)
            setStore(storeData)
        }
        loadStore()
    }, [storeId])

    useEffect(() => {
        if (swipeMode) return
        loadGridProducts()
    }, [currentPage, statusFilter, storeId, swipeMode])

    const loadGridProducts = async () => {
        setLoading(true)
        const data = await getPendingProducts({ page: currentPage, status: statusFilter, storeId })
        setPendingProducts(data.pendingProducts)
        setPagination(data.pagination)
        setLoading(false)
    }

    const handleEnterSwipeMode = async () => {
        setLoading(true)
        setSwipeMode(true)
        const all = await getAllPendingProducts({ status: statusFilter, storeId })
        setSwipeProducts(fisherYates(all))
        setSwipeIndex(0)
        setLoading(false)
    }

    const handleExitSwipeMode = () => {
        setSwipeMode(false)
        setSwipeProducts([])
        setSwipeIndex(0)
        loadGridProducts()
    }

    const handleDecision = useCallback((status: "APPROVED" | "REJECTED") => {
        const product = swipeProducts[swipeIndex]
        if (!product) return
        setSwipeIndex((i) => i + 1)
        updatePendingProductStatus({ id: product.id, status }).catch(() => {
            toast.error(`Failed to ${status === "APPROVED" ? "approve" : "reject"} product`)
        })
    }, [swipeProducts, swipeIndex])

    useEffect(() => {
        if (!swipeMode) return
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === "ArrowRight") handleDecision("APPROVED")
            else if (e.key === "ArrowLeft") handleDecision("REJECTED")
        }
        window.addEventListener("keydown", onKeyDown)
        return () => window.removeEventListener("keydown", onKeyDown)
    }, [swipeMode, handleDecision])

    const handleStatusChange = (value: string) => {
        setStatusFilter(value === "ALL" ? null : (value as PendingProductStatus))
        setCurrentPage(1)
        if (swipeMode) {
            // Re-fetch and randomize for new filter
            getAllPendingProducts({ status: value === "ALL" ? null : (value as PendingProductStatus), storeId }).then((all) => {
                setSwipeProducts(fisherYates(all))
                setSwipeIndex(0)
            })
        }
    }

    const currentSwipeProduct = swipeProducts[swipeIndex]
    const nextSwipeProduct = swipeProducts[swipeIndex + 1] ?? null
    const swipeDone = swipeMode && !loading && swipeIndex >= swipeProducts.length && swipeProducts.length > 0

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
                    {swipeMode && (
                        <>
                            {!loading && swipeProducts.length > 0 && (
                                <span className="text-sm text-muted-foreground tabular-nums">
                                    {swipeIndex} / {swipeProducts.length}
                                </span>
                            )}
                            <Button variant="ghost" size="sm" onClick={handleExitSwipeMode}>
                                Exit swipe
                            </Button>
                        </>
                    )}
                    <Button
                        variant={swipeMode ? "default" : "outline"}
                        size="icon"
                        onClick={swipeMode ? handleExitSwipeMode : handleEnterSwipeMode}
                        title={swipeMode ? "Exit swipe mode" : "Swipe mode"}
                    >
                        <Layers className="h-4 w-4" />
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
            ) : swipeMode ? (
                swipeDone ? (
                    <div className="flex flex-col items-center justify-center py-24 gap-4">
                        <div className="text-6xl">✓</div>
                        <h2 className="text-xl font-semibold">All done!</h2>
                        <p className="text-muted-foreground text-sm">
                            {swipeProducts.length} product{swipeProducts.length !== 1 ? "s" : ""} reviewed
                        </p>
                        <Button variant="outline" onClick={handleEnterSwipeMode}>Reload</Button>
                    </div>
                ) : swipeProducts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 text-center">
                        <p className="text-muted-foreground">No products found</p>
                    </div>
                ) : currentSwipeProduct ? (
                    <div className="flex flex-col items-center gap-6 py-4">
                        <SwipeCard
                            key={currentSwipeProduct.id}
                            product={currentSwipeProduct}
                            nextProduct={nextSwipeProduct}
                            onApprove={() => handleDecision("APPROVED")}
                            onReject={() => handleDecision("REJECTED")}
                        />
                        <div className="flex items-center gap-6">
                            <Button
                                variant="outline"
                                size="icon"
                                className="h-14 w-14 rounded-full border-2 border-red-400 text-red-500 hover:bg-red-50 hover:border-red-500"
                                onClick={() => handleDecision("REJECTED")}
                            >
                                <X className="h-6 w-6" />
                            </Button>
                            <p className="text-xs text-muted-foreground select-none">← → or drag</p>
                            <Button
                                variant="outline"
                                size="icon"
                                className="h-14 w-14 rounded-full border-2 border-green-400 text-green-600 hover:bg-green-50 hover:border-green-500"
                                onClick={() => handleDecision("APPROVED")}
                            >
                                <Check className="h-6 w-6" />
                            </Button>
                        </div>
                    </div>
                ) : null
            ) : (
                <>
                    <div className="flex flex-wrap gap-4">
                        {pendingProducts.map((product) => (
                            <PendingProductCard
                                key={product.id}
                                pendingProduct={product}
                                onSuccess={loadGridProducts}
                            />
                        ))}
                    </div>

                    {pendingProducts.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <p className="text-muted-foreground">No pending products found for this store</p>
                        </div>
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
                </>
            )}
        </div>
    )
}
