"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { StoreCard } from "@/components/store/StoreCard"
import { StoreFormDialog } from "@/components/store/EditStoreDialog"
import { DeleteStoreDialog } from "@/components/store/DeleteStoreDialog"
import { ImportProductDialog } from "@/components/products/ImportProductDialog"
import { BulkImportDialog } from "@/components/pending-products/BulkImportDialog"
import { Plus, Download, FileUp } from "lucide-react"
import { getAllStores } from "@/server/admin/actions/stores"
import { Store } from "@/prisma/client"

type StoreWithCount = Store & {
    regions: { id: string; name: string }[]
    _count: {
        products: number
    }
}

export default function StoresPage() {
    const [stores, setStores] = useState<StoreWithCount[]>([])
    const [loading, setLoading] = useState(true)
    const [createDialogOpen, setCreateDialogOpen] = useState(false)
    const [editDialogOpen, setEditDialogOpen] = useState(false)
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
    const [importDialogOpen, setImportDialogOpen] = useState(false)
    const [bulkImportDialogOpen, setBulkImportDialogOpen] = useState(false)
    const [selectedStore, setSelectedStore] = useState<StoreWithCount | null>(null)

    useEffect(() => {
        loadStores()
    }, [])

    const loadStores = async () => {
        setLoading(true)
        const data = await getAllStores()
        setStores(data)
        setLoading(false)
    }

    const handleSuccess = () => {
        loadStores()
    }

    const handleEdit = (store: StoreWithCount) => {
        setSelectedStore(store)
        setEditDialogOpen(true)
    }

    const handleDelete = (store: StoreWithCount) => {
        setSelectedStore(store)
        setDeleteDialogOpen(true)
    }

    if (loading) {
        return <div>Loading...</div>
    }

    return (
        <>
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Stores</h1>
                        <p className="text-sm text-muted-foreground">Select a store to view products</p>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => setImportDialogOpen(true)}>
                            <Download className="h-4 w-4 mr-2" />
                            Import Product
                        </Button>
                        <Button variant="outline" onClick={() => setBulkImportDialogOpen(true)}>
                            <FileUp className="h-4 w-4 mr-2" />
                            Bulk Import
                        </Button>
                        <Button onClick={() => setCreateDialogOpen(true)}>
                            <Plus className="h-4 w-4 mr-2" />
                            Create Store
                        </Button>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                    {stores.map((store) => (
                        <StoreCard
                            key={store.id}
                            id={store.id}
                            name={store.name}
                            displayName={store.displayName}
                            displayColorHex={store.displayColorHex}
                            imageId={store.imageId}
                            productCount={store._count.products}
                            regions={store.regions}
                            onEdit={() => handleEdit(store)}
                            onDelete={() => handleDelete(store)}
                        />
                    ))}
                </div>
            </div>

            <ImportProductDialog open={importDialogOpen} onOpenChange={setImportDialogOpen} onSuccess={handleSuccess} />

            <StoreFormDialog open={createDialogOpen} onOpenChange={setCreateDialogOpen} onSuccess={handleSuccess} />

            <StoreFormDialog
                open={editDialogOpen}
                onOpenChange={setEditDialogOpen}
                store={selectedStore}
                onSuccess={handleSuccess}
            />

            <DeleteStoreDialog
                open={deleteDialogOpen}
                onOpenChange={setDeleteDialogOpen}
                store={
                    selectedStore
                        ? {
                              id: selectedStore.id,
                              name: selectedStore.name,
                              productCount: selectedStore._count.products
                          }
                        : null
                }
                onSuccess={handleSuccess}
            />

            <BulkImportDialog
                open={bulkImportDialogOpen}
                onOpenChange={setBulkImportDialogOpen}
                onSuccess={handleSuccess}
            />
        </>
    )
}
