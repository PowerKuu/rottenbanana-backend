"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { deleteStore } from "@/server/admin/actions/stores"
import { AlertTriangle } from "lucide-react"

export function DeleteStoreDialog({
    open,
    onOpenChange,
    store,
    onSuccess
}: {
    open: boolean
    onOpenChange: (open: boolean) => void
    store: {
        id: string
        name: string
        productCount: number
    } | null
    onSuccess?: () => void
}) {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")

    const handleDelete = async () => {
        if (!store) return

        setLoading(true)
        setError("")

        try {
            await deleteStore(store.id)
            onSuccess?.()
            onOpenChange(false)
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to delete store")
        } finally {
            setLoading(false)
        }
    }

    if (!store) return null

    const hasProducts = store.productCount > 0

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Delete Store</DialogTitle>
                    <DialogDescription>
                        Are you sure you want to delete <strong>{store.name}</strong>?
                    </DialogDescription>
                </DialogHeader>

                {hasProducts && (
                    <div className="flex gap-3 rounded-md border border-destructive/50 bg-destructive/10 p-3">
                        <AlertTriangle className="h-5 w-5 shrink-0 text-destructive" />
                        <div className="space-y-1 text-sm">
                            <p className="font-medium text-destructive">Cannot delete this store</p>
                            <p className="text-muted-foreground">
                                This store has {store.productCount} {store.productCount === 1 ? "product" : "products"}.
                                Please remove all products first.
                            </p>
                        </div>
                    </div>
                )}

                {error && <div className="text-sm text-destructive">{error}</div>}

                <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
                        Cancel
                    </Button>
                    <Button variant="destructive" onClick={handleDelete} disabled={loading || hasProducts}>
                        {loading ? "Deleting..." : "Delete"}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}
