"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { ExternalLink, Package } from "lucide-react"
import { getProductById } from "@/server/admin/actions/products"
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
            <DialogContent className="max-h-[90vh] max-w-7xl overflow-x-hidden overflow-y-auto w-[95vw]">
                {loading ? (
                    <>
                        <DialogHeader>
                            <DialogTitle>Loading Product Details</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                            <Skeleton className="h-8 w-3/4" />
                            <Skeleton className="h-64 w-full" />
                            <Skeleton className="h-32 w-full" />
                        </div>
                    </>
                ) : product ? (
                    <>
                        <DialogHeader>
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex-1">
                                    <DialogTitle className="text-2xl">{product.name}</DialogTitle>
                                    <DialogDescription className="mt-2 flex items-center gap-2">
                                        <span className="text-lg font-semibold">
                                            {formatPrice(product.priceGross, product.currency)}
                                        </span>
                                        {product.originalPriceGross &&
                                            product.originalPriceGross > product.priceGross && (
                                                <>
                                                    <span className="text-sm line-through text-muted-foreground">
                                                        {formatPrice(product.originalPriceGross, product.currency)}
                                                    </span>
                                                    <Badge variant="destructive" className="text-xs">
                                                        -
                                                        {Math.round(
                                                            (1 - product.priceGross / product.originalPriceGross) * 100
                                                        )}
                                                        %
                                                    </Badge>
                                                </>
                                            )}
                                    </DialogDescription>
                                    <div className="mt-2 flex flex-wrap gap-2">
                                        <Badge variant="secondary">{product.gender}</Badge>
                                        {product.brand && <Badge variant="outline">{product.brand}</Badge>}
                                    </div>
                                    {product.preferenceTags && product.preferenceTags.length > 0 && (
                                        <div className="mt-3">
                                            <span className="text-sm font-medium text-muted-foreground">
                                                Preference Tags:
                                            </span>
                                            <div className="mt-1 flex flex-wrap gap-1">
                                                {product.preferenceTags.map((pt: any) => (
                                                    <Badge
                                                        key={pt.preferenceTag.tag}
                                                        variant="default"
                                                        className="text-xs"
                                                    >
                                                        {pt.preferenceTag.tag}
                                                    </Badge>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <Badge variant="outline" className="shrink-0">
                                    {product.slot}
                                </Badge>
                            </div>
                        </DialogHeader>

                        <div className="space-y-6 w-full">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <h3 className="text-sm font-semibold">Product Image</h3>
                                    <div className="relative w-full h-100 overflow-hidden rounded-lg bg-muted">
                                        {product.productOnlyImageUrl ? (
                                            <Image
                                                src={product.productOnlyImageUrl}
                                                alt={product.name}
                                                fill
                                                className="object-contain"
                                                sizes="(max-width: 1024px) 100vw, 50vw"
                                            />
                                        ) : (
                                            <div className="flex h-full items-center justify-center">
                                                <Package className="h-24 w-24 text-muted-foreground/50" />
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {product.imageUrls && product.imageUrls.length > 0 && (
                                    <div className="space-y-4">
                                        <h3 className="text-sm font-semibold">
                                            All Product Images ({product.imageUrls.length})
                                        </h3>
                                        <div className="grid grid-cols-2 gap-3 max-h-100 overflow-y-auto pr-2">
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
                                                        sizes="250px"
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <h3 className="mb-2 text-sm font-semibold">Product Details</h3>
                                    <div className="space-y-2 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">ID:</span>
                                            <span className="font-mono text-xs">{product.id}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Price:</span>
                                            <span className="font-semibold">
                                                {formatPrice(product.priceGross, product.currency)}
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Gender:</span>
                                            <Badge variant="secondary" className="text-xs">
                                                {product.gender}
                                            </Badge>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Slot:</span>
                                            <Badge variant="outline" className="text-xs">
                                                {product.slot}
                                            </Badge>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Category:</span>
                                            <Badge variant="outline" className="text-xs">
                                                {product.category}
                                            </Badge>
                                        </div>
                                        {product.brand && (
                                            <div className="flex justify-between">
                                                <span className="text-muted-foreground">Brand:</span>
                                                <span>{product.brand}</span>
                                            </div>
                                        )}
                                        {product.primaryColorHex && (
                                            <div className="flex justify-between items-center">
                                                <span className="text-muted-foreground">Primary Color:</span>
                                                <div className="flex items-center gap-2">
                                                    <div
                                                        className="w-5 h-5 rounded border"
                                                        style={{ backgroundColor: product.primaryColorHex }}
                                                    />
                                                    <span className="font-mono text-xs">{product.primaryColorHex}</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {product.store && (
                                    <div>
                                        <h3 className="mb-2 text-sm font-semibold">Store Information</h3>
                                        <div className="space-y-2 text-sm">
                                            <div>
                                                <span className="text-muted-foreground">Name: </span>
                                                <span>{product.store.name}</span>
                                            </div>
                                            {product.store.websiteUrl && (
                                                <div>
                                                    <a
                                                        href={product.store.websiteUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-primary hover:underline inline-flex items-center gap-1"
                                                    >
                                                        Visit Store <ExternalLink className="h-3 w-3" />
                                                    </a>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {product.description && (
                                <div>
                                    <h3 className="mb-2 text-sm font-semibold">Description</h3>
                                    <p className="text-sm text-muted-foreground">{product.description}</p>
                                </div>
                            )}

                            {product.metadata && Object.keys(product.metadata).length > 0 && (
                                <div className="min-w-0">
                                    <h3 className="mb-2 text-sm font-semibold">AI Analysis</h3>
                                    <div className="rounded-md bg-muted p-4 space-y-2 overflow-hidden">
                                        {product.metadata.description && (
                                            <div>
                                                <span className="text-sm text-muted-foreground">AI Description: </span>
                                                <p className="text-sm mt-1">{product.metadata.description}</p>
                                            </div>
                                        )}
                                        <details className="mt-2">
                                            <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                                                View Raw Metadata
                                            </summary>
                                            <pre className="mt-2 text-xs max-h-96 overflow-auto p-2 bg-background rounded border whitespace-pre-wrap wrap-break-words w-full">
                                                {JSON.stringify(product.metadata, null, 2)}
                                            </pre>
                                        </details>
                                    </div>
                                </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                {product.createdAt && (
                                    <div className="text-xs text-muted-foreground">
                                        <span>Created: </span>
                                        {new Date(product.createdAt).toLocaleDateString("en-US", {
                                            year: "numeric",
                                            month: "short",
                                            day: "numeric",
                                            hour: "2-digit",
                                            minute: "2-digit"
                                        })}
                                    </div>
                                )}
                                {product.updatedAt && (
                                    <div className="text-xs text-muted-foreground">
                                        <span>Updated: </span>
                                        {new Date(product.updatedAt).toLocaleDateString("en-US", {
                                            year: "numeric",
                                            month: "short",
                                            day: "numeric",
                                            hour: "2-digit",
                                            minute: "2-digit"
                                        })}
                                    </div>
                                )}
                            </div>

                            {product.url && (
                                <Button asChild className="w-full">
                                    <a href={product.url} target="_blank" rel="noopener noreferrer">
                                        View Original Product Page
                                        <ExternalLink className="ml-2 h-4 w-4" />
                                    </a>
                                </Button>
                            )}
                        </div>
                    </>
                ) : (
                    <DialogHeader>
                        <DialogTitle>Product Details</DialogTitle>
                    </DialogHeader>
                )}
            </DialogContent>
        </Dialog>
    )
}
