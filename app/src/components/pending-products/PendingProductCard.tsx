"use client"

import { useState } from "react"
import Image from "next/image"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Check, X, ExternalLink, RotateCcw } from "lucide-react"
import { PendingProduct } from "@/prisma/client"
import { StatusBadge } from "./StatusBadge"
import { updatePendingProductStatus } from "@/server/admin/actions/pendingProducts"
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

    const handleSetPending = async () => {
        setLoading(true)
        try {
            await updatePendingProductStatus({
                id: pendingProduct.id,
                status: "PENDING"
            })
            toast.success("Product set to pending")
            onSuccess?.()
        } catch (error) {
            toast.error("Failed to update product")
        } finally {
            setLoading(false)
        }
    }

    return (
        <Card className="overflow-hidden w-100">
            <CardContent className="p-0">
                <div className="relative aspect-square w-full overflow-hidden bg-muted">
                    <Image
                        src={pendingProduct.imageUrl}
                        alt={getDomainFromUrl(pendingProduct.url)}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        unoptimized
                    />
                    <div className="absolute top-1.5 right-1.5">
                        <StatusBadge status={pendingProduct.status} />
                    </div>
                </div>
            </CardContent>
            <CardFooter className="flex flex-col items-start gap-2 px-2.5">
                <div className="w-full space-y-0.5">
                    <p className="line-clamp-1 text-sm text-muted-foreground">{pendingProduct.url}</p>
                    <a
                        href={pendingProduct.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-0.5 text-xs text-primary hover:underline"
                    >
                        View product <ExternalLink className="h-2.5 w-2.5" />
                    </a>
                </div>

                {pendingProduct.status === "PENDING" && (
                    <div className="flex w-full gap-1.5">
                        <Button
                            size="sm"
                            variant="default"
                            className="flex-1"
                            onClick={handleApprove}
                            disabled={loading}
                        >
                            <Check className="h-3 w-3 mr-1" />
                            Approve
                        </Button>
                        <Button
                            size="sm"
                            variant="outline"
                            className="flex-1"
                            onClick={handleReject}
                            disabled={loading}
                        >
                            <X className="h-3 w-3 mr-1" />
                            Reject
                        </Button>
                    </div>
                )}

                {pendingProduct.status === "APPROVED" && (
                    <div className="flex w-full gap-1.5">
                        <Button
                            size="sm"
                            variant="outline"
                            className="flex-1"
                            onClick={handleSetPending}
                            disabled={loading}
                        >
                            <RotateCcw className="h-3 w-3 mr-1" />
                            Pending
                        </Button>
                        <Button
                            size="sm"
                            variant="outline"
                            className="flex-1"
                            onClick={handleReject}
                            disabled={loading}
                        >
                            <X className="h-3 w-3 mr-1" />
                            Reject
                        </Button>
                    </div>
                )}

                {pendingProduct.status === "REJECTED" && (
                    <div className="flex w-full gap-1.5">
                        <Button
                            size="sm"
                            variant="outline"
                            className="flex-1"
                            onClick={handleSetPending}
                            disabled={loading}
                        >
                            <RotateCcw className="h-3 w-3 mr-1" />
                            Pending
                        </Button>
                        <Button
                            size="sm"
                            variant="default"
                            className="flex-1"
                            onClick={handleApprove}
                            disabled={loading}
                        >
                            <Check className="h-3 w-3 mr-1" />
                            Approve
                        </Button>
                    </div>
                )}

                {pendingProduct.status === "FAILED" && (
                    <div className="flex w-full gap-1.5">
                        <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 h-7 text-xs"
                            onClick={handleSetPending}
                            disabled={loading}
                        >
                            <RotateCcw className="h-3 w-3 mr-1" />
                            Pending
                        </Button>
                        <Button
                            size="sm"
                            variant="default"
                            className="flex-1 h-7 text-xs"
                            onClick={handleApprove}
                            disabled={loading}
                        >
                            <Check className="h-3 w-3 mr-1" />
                            Approve
                        </Button>
                    </div>
                )}
            </CardFooter>
        </Card>
    )
}
