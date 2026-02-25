import { getAllStores } from "@/server/actions/stores"
import { StoreCard } from "@/components/products/StoreCard"
import { Package } from "lucide-react"

export default async function ProductsPage() {
    const stores = await getAllStores()

    if (stores.length === 0) {
        return (
            <div className="space-y-4">
                <h2 className="text-2xl font-bold tracking-tight">Stores</h2>
                <div className="flex min-h-100 flex-col items-center justify-center rounded-lg border border-dashed">
                    <Package className="mb-4 h-12 w-12 text-muted-foreground" />
                    <h3 className="text-lg font-semibold">No stores found</h3>
                    <p className="text-sm text-muted-foreground">Add stores to start managing products</p>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-4">
            <div>
                <h2 className="text-2xl font-bold tracking-tight">Stores</h2>
                <p className="text-muted-foreground">Select a store to view and manage its products</p>
            </div>

            <div className="grid grid-cols-2 gap-6 lg:grid-cols-3 xl:grid-cols-4">
                {stores.map((store) => (
                    <StoreCard
                        key={store.id}
                        id={store.id}
                        name={store.name}
                        imageUrl={store.imageUrl}
                        productCount={store._count.products}
                    />
                ))}
            </div>
        </div>
    )
}
