"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { deleteProduct } from "@/server/admin/actions/products"

export function DeleteProductDialog({
    open,
    onOpenChange,
    product,
    onSuccess
}: {
    open: boolean
    onOpenChange: (open: boolean) => void
    product: {
        id: string
        name: string
    } | null
    onSuccess?: () => void
}) {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")

    const handleDelete = async () => {
        if (!product) return

        setLoading(true)
        setError("")

        try {
            await deleteProduct(product.id)
            onSuccess?.()
            onOpenChange(false)
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to delete product")
        } finally {
            setLoading(false)
        }
    }

    if (!product) return null

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Delete Product</DialogTitle>
                    <DialogDescription>
                        Are you sure you want to delete <strong>{product.name}</strong>?
                    </DialogDescription>
                </DialogHeader>

                {error && <div className="text-sm text-destructive">{error}</div>}

                <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
                        Cancel
                    </Button>
                    <Button variant="destructive" onClick={handleDelete} disabled={loading}>
                        {loading ? "Deleting..." : "Delete"}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}
