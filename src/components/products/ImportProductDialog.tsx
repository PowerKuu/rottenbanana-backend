"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"

interface ProductData {
    name: string
    price: number
    imageUrl?: string
    description?: string
    [key: string]: any
}

export function ImportProductDialog({
    open,
    onOpenChange,
    onSuccess
}: {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSuccess?: () => void
}) {
    const [url, setUrl] = useState("")
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")
    const [productData, setProductData] = useState<ProductData | null>(null)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError("")
        setProductData(null)

        if (!url.trim()) {
            setError("Product URL is required")
            return
        }

        setLoading(true)

        try {
            const response = await fetch("/api/products/add", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ url })
            })

            const data = await response.json()

            if (!data.success) {
                setError(data.error || "Failed to import product")
                return
            }

            setProductData(data.product)
            setUrl("")
            onSuccess?.()
        } catch (err) {
            setError(err instanceof Error ? err.message : "An error occurred while importing the product")
        } finally {
            setLoading(false)
        }
    }

    const handleClose = () => {
        setUrl("")
        setError("")
        setProductData(null)
        onOpenChange(false)
    }

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Import Product</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="productUrl">Product URL</Label>
                        <Input
                            id="productUrl"
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            placeholder="https://example.com/product/..."
                            disabled={loading}
                        />
                    </div>

                    {error && (
                        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                            {error}
                        </div>
                    )}

                    {productData && (
                        <div className="rounded-md border bg-muted/50 p-4 space-y-2">
                            <h3 className="font-semibold text-green-600">Product Imported Successfully!</h3>
                            <div className="space-y-1 text-sm">
                                <div>
                                    <span className="font-medium">Name:</span> {productData.name}
                                </div>
                                <div>
                                    <span className="font-medium">Price:</span> ${productData.price}
                                </div>
                                {productData.description && (
                                    <div>
                                        <span className="font-medium">Description:</span>{" "}
                                        {productData.description.substring(0, 100)}
                                        {productData.description.length > 100 ? "..." : ""}
                                    </div>
                                )}
                                {productData.imageUrl && (
                                    <div>
                                        <span className="font-medium">Image:</span>{" "}
                                        <a
                                            href={productData.imageUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-blue-600 hover:underline"
                                        >
                                            View
                                        </a>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    <div className="flex justify-end gap-2">
                        <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
                            {productData ? "Close" : "Cancel"}
                        </Button>
                        {!productData && (
                            <Button type="submit" disabled={loading}>
                                {loading ? (
                                    <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        Importing...
                                    </>
                                ) : (
                                    "Import Product"
                                )}
                            </Button>
                        )}
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    )
}
