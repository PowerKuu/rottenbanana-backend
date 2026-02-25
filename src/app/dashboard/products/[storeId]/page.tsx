"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { ProductCard } from "@/components/products/ProductCard"
import { ProductsHeader } from "@/components/products/ProductsHeader"
import { ProductsPagination } from "@/components/products/ProductsPagination"
import { ProductDetailsDialog } from "@/components/products/ProductDetailsDialog"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Package } from "lucide-react"
import { getStoreById } from "@/server/actions/stores"
import { getProductsByStore, getProductSlots } from "@/server/actions/products"
import Link from "next/link"
import { ProductSlot } from "@/prisma/client"

export default function StoreProductsPage() {
    const params = useParams()
    const storeId = params.storeId as string

    const [store, setStore] = useState<any>(null)
    const [products, setProducts] = useState<any[]>([])
    const [pagination, setPagination] = useState<any>(null)
    const [availableSlots, setAvailableSlots] = useState<ProductSlot[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [selectedProductId, setSelectedProductId] = useState<string | null>(null)
    const [dialogOpen, setDialogOpen] = useState(false)

    const [page, setPage] = useState(1)
    const [search, setSearch] = useState("")
    const [slot, setSlot] = useState<ProductSlot | null>(null)

    useEffect(() => {
        const getProducts = async () => {
            setLoading(true)
            setError(null)
            const store = await getStoreById(storeId)
            if (!store) {
                setError("Store not found")
                setLoading(false)
                return
            }

            setStore(store)
            const products = await getProductsByStore({
                storeId,
                page,
                search,
                slot
            })

            setProducts(products.products)
            setPagination(products.pagination)

            if (availableSlots.length === 0) {
                const slots = await getProductSlots(storeId)
                setAvailableSlots(slots)
            }
        }

        try {
            getProducts()
        } catch (err) {
            console.error("Error fetching data:", err)
            setError("An unexpected error occurred")
        } finally {
            setLoading(false)
        }
    }, [storeId, page, search, slot])

    const handleProductClick = (productId: string) => {
        setSelectedProductId(productId)
        setDialogOpen(true)
    }

    const handleSearchChange = (value: string) => {
        setSearch(value)
        setPage(1)
    }

    const handleSlotChange = (value: ProductSlot | null) => {
        setSlot(value)
        setPage(1)
    }

    if (loading) {
        return (
            <div className="space-y-4">
                <div className="flex items-center gap-4">
                    <Skeleton className="h-10 w-10" />
                    <div>
                        <Skeleton className="h-8 w-48" />
                        <Skeleton className="mt-2 h-5 w-64" />
                    </div>
                </div>
                <div className="flex gap-4">
                    <Skeleton className="h-10 flex-1" />
                    <Skeleton className="h-10 w-50" />
                </div>
                <div className="grid grid-cols-3 gap-4 lg:grid-cols-4 xl:grid-cols-6">
                    {Array.from({ length: 24 }).map((_, i) => (
                        <div key={i} className="space-y-2">
                            <Skeleton className="aspect-square w-full rounded-md" />
                            <Skeleton className="h-4 w-3/4" />
                            <Skeleton className="h-6 w-1/2" />
                        </div>
                    ))}
                </div>
            </div>
        )
    }

    if (error || !store) {
        return (
            <div className="space-y-4">
                <h2 className="text-2xl font-bold tracking-tight">Store Not Found</h2>
                <div className="flex min-h-100 flex-col items-center justify-center rounded-lg border border-dashed">
                    <Package className="mb-4 h-12 w-12 text-muted-foreground" />
                    <h3 className="text-lg font-semibold">{error || "Store not found"}</h3>
                    <Button asChild className="mt-4">
                        <Link href="/dashboard/products">Back to Stores</Link>
                    </Button>
                </div>
            </div>
        )
    }

    const hasNoProducts = products.length === 0 && !search && !slot
    const hasNoSearchResults = products.length === 0 && (search || slot)

    return (
        <div className="space-y-6">
            <ProductsHeader
                storeName={store.name}
                availableSlots={availableSlots}
                search={search}
                slot={slot}
                onSearchChange={handleSearchChange}
                onSlotChange={handleSlotChange}
            />

            {hasNoProducts ? (
                <div className="flex min-h-100 flex-col items-center justify-center rounded-lg border border-dashed">
                    <Package className="mb-4 h-12 w-12 text-muted-foreground" />
                    <h3 className="text-lg font-semibold">No products in this store</h3>
                    <p className="text-sm text-muted-foreground">Products will appear here once they are added</p>
                </div>
            ) : hasNoSearchResults ? (
                <div className="flex min-h-100 flex-col items-center justify-center rounded-lg border border-dashed">
                    <Package className="mb-4 h-12 w-12 text-muted-foreground" />
                    <h3 className="text-lg font-semibold">No products found</h3>
                    <p className="text-sm text-muted-foreground">
                        {search && `No results for "${search}"`}
                        {search && slot && " with "}
                        {slot && `the selected category`}
                    </p>
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-3 gap-4 lg:grid-cols-4 xl:grid-cols-6">
                        {products.map((product) => (
                            <ProductCard
                                key={product.id}
                                id={product.id}
                                name={product.name}
                                price={product.price}
                                primaryImageUrl={product.primaryImageUrl}
                                slot={product.slot}
                                onClick={() => handleProductClick(product.id)}
                            />
                        ))}
                    </div>

                    {pagination && (
                        <ProductsPagination
                            currentPage={pagination.currentPage}
                            totalPages={pagination.totalPages}
                            hasNextPage={pagination.hasNextPage}
                            hasPreviousPage={pagination.hasPreviousPage}
                            onPageChange={setPage}
                        />
                    )}
                </>
            )}

            <ProductDetailsDialog productId={selectedProductId} open={dialogOpen} onOpenChange={setDialogOpen} />
        </div>
    )
}
