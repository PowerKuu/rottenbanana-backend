"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { ProductCard } from "@/components/products/ProductCard"
import { ProductsHeader } from "@/components/products/ProductsHeader"
import { ProductsPagination } from "@/components/Pagination"
import { ProductDetailsDialog } from "@/components/products/ProductDetailsDialog"
import { DeleteProductDialog } from "@/components/products/DeleteProductDialog"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Package } from "lucide-react"
import { getStoreById } from "@/server/admin/actions/stores"
import { getProductsByStore, getProductSlots } from "@/server/admin/actions/products"
import Link from "next/link"
import { ProductSlot } from "@/prisma/client"

export default function ProductsPage() {
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
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
    const [selectedProduct, setSelectedProduct] = useState<{ id: string; name: string } | null>(null)

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

    const handleDelete = (product: { id: string; name: string }) => {
        setSelectedProduct(product)
        setDeleteDialogOpen(true)
    }

    const handleSuccess = () => {
        // Reload products after successful deletion
        setLoading(true)
        getProductsByStore({
            storeId,
            page,
            search,
            slot
        }).then((data) => {
            setProducts(data.products)
            setPagination(data.pagination)
            setLoading(false)
        })
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
                        {slot && `the selected slot`}
                    </p>
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                        {products.map((product) => (
                            <ProductCard
                                key={product.id}
                                id={product.id}
                                name={product.name}
                                priceGross={product.priceGross}
                                originalPriceGross={product.originalPriceGross}
                                currency={product.currency}
                                productOnlyImageId={product.productOnlyImageId}
                                slot={product.slot}
                                category={product.category}
                                gender={product.gender}
                                brand={product.brand}
                                preferenceTags={product.preferenceTags}
                                onClick={() => handleProductClick(product.id)}
                                onDelete={() => handleDelete({ id: product.id, name: product.name })}
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

            <DeleteProductDialog
                open={deleteDialogOpen}
                onOpenChange={setDeleteDialogOpen}
                product={selectedProduct}
                onSuccess={handleSuccess}
            />
        </div>
    )
}
