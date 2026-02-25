"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { ExternalLink, Package } from "lucide-react"
import { getProductById } from "@/server/actions/products"
import { formatPrice } from "@/lib/utils"

export function ProductDetailsDialog({
    productId,
    open,
    onOpenChange
}: {
    productId: string | null
    open: boolean
    onOpenChange: (open: boolean) => void
}) {
    const [product, setProduct] = useState<any>(null)
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        if (productId && open) {
            setLoading(true)
            getProductById(productId)
                .then((result) => {
                    setProduct(result)
                })
                .finally(() => setLoading(false))
        } else {
            setProduct(null)
        }
    }, [productId, open])

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
                {loading ? (
                    <div className="space-y-4">
                        <Skeleton className="h-8 w-3/4" />
                        <Skeleton className="h-64 w-full" />
                        <Skeleton className="h-32 w-full" />
                    </div>
                ) : product ? (
                    <>
                        <DialogHeader>
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex-1">
                                    <DialogTitle className="text-2xl">{product.name}</DialogTitle>
                                    <DialogDescription className="mt-2 text-lg font-semibold">
                                        {formatPrice(product.price)}
                                    </DialogDescription>
                                </div>
                                <Badge variant="outline" className="shrink-0">
                                    {product.slot}
                                </Badge>
                            </div>
                        </DialogHeader>

                        <div className="space-y-6">
                            <div className="space-y-4">
                                <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-muted">
                                    {product.primaryImageUrl ? (
                                        <Image
                                            src={product.primaryImageUrl}
                                            alt={product.name}
                                            fill
                                            className="object-cover"
                                            sizes="(max-width: 1200px) 100vw, 800px"
                                        />
                                    ) : (
                                        <div className="flex h-full items-center justify-center">
                                            <Package className="h-24 w-24 text-muted-foreground/50" />
                                        </div>
                                    )}
                                </div>

                                {product.imageUrls && product.imageUrls.length > 0 && (
                                    <div className="grid grid-cols-4 gap-2">
                                        {product.imageUrls.map((url: string, index: number) => (
                                            <div
                                                key={index}
                                                className="relative aspect-square overflow-hidden rounded-md bg-muted"
                                            >
                                                <Image
                                                    src={url}
                                                    alt={`${product.name} ${index + 1}`}
                                                    fill
                                                    className="object-cover"
                                                    sizes="200px"
                                                />
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {product.description && (
                                <div>
                                    <h3 className="mb-2 font-semibold">Description</h3>
                                    <p className="text-sm text-muted-foreground">{product.description}</p>
                                </div>
                            )}

                            {product.store && (
                                <div>
                                    <h3 className="mb-2 font-semibold">Store</h3>
                                    <p className="text-sm">
                                        {product.store.name}
                                        {product.store.websiteUrl && (
                                            <a
                                                href={product.store.websiteUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="ml-2 text-primary hover:underline"
                                            >
                                                Visit Store <ExternalLink className="inline h-3 w-3" />
                                            </a>
                                        )}
                                    </p>
                                </div>
                            )}

                            {product.metadata && Object.keys(product.metadata).length > 0 && (
                                <div>
                                    <h3 className="mb-2 font-semibold">Additional Information</h3>
                                    <pre className="rounded-md bg-muted p-4 text-xs overflow-x-auto">
                                        {JSON.stringify(product.metadata, null, 2)}
                                    </pre>
                                </div>
                            )}

                            {product.url && (
                                <Button asChild className="w-full">
                                    <a href={product.url} target="_blank" rel="noopener noreferrer">
                                        View on Store Website
                                        <ExternalLink className="ml-2 h-4 w-4" />
                                    </a>
                                </Button>
                            )}
                        </div>
                    </>
                ) : null}
            </DialogContent>
        </Dialog>
    )
}
