"use client"

import { useState } from "react"
import Image from "next/image"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Check, X, ExternalLink, Trash2 } from "lucide-react"
import { PendingProduct } from "@/prisma/client"
import { StatusBadge } from "./StatusBadge"
import {
    updatePendingProductStatus,
    deletePendingProduct
} from "@/server/admin/actions/pendingProducts"
import { toast } from "sonner"

export function PendingProductCard({
    pendingProduct,
    onSuccess
}: {
    pendingProduct: PendingProduct
    onSuccess?: () => void
}) {
    const [loading, setLoading] = useState(false)

    const getDomainFromUrl = (url: string): string => {
        try {
            const hostname = new URL(url).hostname
            return hostname.replace("www.", "")
        } catch {
            return "Product"
        }
    }

    const handleApprove = async () => {
        setLoading(true)
        try {
            await updatePendingProductStatus({
                id: pendingProduct.id,
                status: "APPROVED"
            })
            toast.success("Product approved")
            onSuccess?.()
        } catch (error) {
            toast.error("Failed to approve product")
        } finally {
            setLoading(false)
        }
    }

    const handleReject = async () => {
        setLoading(true)
        try {
            await updatePendingProductStatus({
                id: pendingProduct.id,
                status: "REJECTED"
            })
            toast.success("Product rejected")
            onSuccess?.()
        } catch (error) {
            toast.error("Failed to reject product")
        } finally {
            setLoading(false)
        }
    }

    const handleDelete = async () => {
        setLoading(true)
        try {
            await deletePendingProduct(pendingProduct.id)
            toast.success("Product deleted")
            onSuccess?.()
        } catch (error) {
            toast.error("Failed to delete product")
        } finally {
            setLoading(false)
        }
    }

    return (
        <Card className="overflow-hidden">
            <CardContent className="p-0">
                <div className="relative aspect-video w-full overflow-hidden bg-muted">
                    <Image
                        src={pendingProduct.imageUrl}
                        alt={getDomainFromUrl(pendingProduct.url)}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        unoptimized
                    />
                    <div className="absolute top-2 right-2">
                        <StatusBadge status={pendingProduct.status} />
                    </div>
                </div>
            </CardContent>
            <CardFooter className="flex flex-col items-start gap-3 p-4">
                <div className="w-full space-y-1">
                    <h3 className="line-clamp-2 text-sm font-semibold">
                        {getDomainFromUrl(pendingProduct.url)}
                    </h3>
                    <p className="line-clamp-2 text-xs text-muted-foreground">
                        {pendingProduct.url}
                    </p>
                    <a
                        href={pendingProduct.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                        View product <ExternalLink className="h-3 w-3" />
                    </a>
                </div>

                {pendingProduct.status === "PENDING" && (
                    <div className="flex w-full gap-2">
                        <Button
                            size="sm"
                            variant="default"
                            className="flex-1"
                            onClick={handleApprove}
                            disabled={loading}
                        >
                            <Check className="h-4 w-4 mr-1" />
                            Approve
                        </Button>
                        <Button
                            size="sm"
                            variant="outline"
                            className="flex-1"
                            onClick={handleReject}
                            disabled={loading}
                        >
                            <X className="h-4 w-4 mr-1" />
                            Reject
                        </Button>
                    </div>
                )}

                {(pendingProduct.status === "APPROVED" ||
                    pendingProduct.status === "REJECTED") && (
                    <Button
                        size="sm"
                        variant="outline"
                        className="w-full"
                        onClick={handleDelete}
                        disabled={loading}
                    >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Delete
                    </Button>
                )}
            </CardFooter>
        </Card>
    )
}
