"use client"

import { useEffect, useState } from "react"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle
} from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { getPostById } from "@/server/admin/actions/posts"
import Image from "next/image"
import { format } from "date-fns"
import { Heart, Package, Calendar, Tag } from "lucide-react"
import { formatPrice } from "@/lib/utils"

export function PostDetailsDialog({
    postId,
    open,
    onOpenChange
}: {
    postId: string | null
    open: boolean
    onOpenChange: (open: boolean) => void
}) {
    const [post, setPost] = useState<any>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (!open || !postId) {
            setPost(null)
            setError(null)
            return
        }

        const fetchPost = async () => {
            setLoading(true)
            setError(null)
            try {
                const data = await getPostById(postId)
                if (!data) {
                    setError("Post not found")
                } else {
                    setPost(data)
                }
            } catch (err) {
                setError(err instanceof Error ? err.message : "Failed to load post details")
            } finally {
                setLoading(false)
            }
        }

        fetchPost()
    }, [postId, open])

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[90vh] w-[95vw] max-w-7xl overflow-y-auto">
                {loading ? (
                    <>
                        <DialogHeader>
                            <DialogTitle>Loading Post Details</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                            <Skeleton className="h-64 w-full" />
                            <Skeleton className="h-32 w-full" />
                            <Skeleton className="h-24 w-full" />
                        </div>
                    </>
                ) : error ? (
                    <>
                        <DialogHeader>
                            <DialogTitle>Error</DialogTitle>
                        </DialogHeader>
                        <div className="text-sm text-destructive">{error}</div>
                    </>
                ) : post ? (
                    <>
                        <DialogHeader>
                            <DialogTitle>Post Details</DialogTitle>
                        </DialogHeader>

                        <div className="space-y-6">
                            {/* Images Gallery */}
                            {post.imageUrls && post.imageUrls.length > 0 && (
                                <div className="space-y-2">
                                    <h3 className="text-lg font-semibold">Images</h3>
                                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                        {post.imageUrls.map((url: string, index: number) => (
                                            <div
                                                key={index}
                                                className="relative aspect-square overflow-hidden rounded-lg"
                                            >
                                                <Image
                                                    src={url}
                                                    alt={`Post image ${index + 1}`}
                                                    fill
                                                    className="object-cover"
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Caption */}
                            {post.caption && (
                                <div className="space-y-2">
                                    <h3 className="text-lg font-semibold">Caption</h3>
                                    <p className="text-sm text-muted-foreground">{post.caption}</p>
                                </div>
                            )}

                            {/* Metadata */}
                            <div className="space-y-2">
                                <h3 className="text-lg font-semibold">Metadata</h3>
                                <div className="flex flex-wrap gap-2">
                                    <Badge variant="outline">
                                        <Calendar className="mr-1 h-3 w-3" />
                                        Created: {format(new Date(post.createdAt), "MMM d, yyyy HH:mm")}
                                    </Badge>
                                    <Badge variant="secondary">
                                        <Heart className="mr-1 h-3 w-3" />
                                        {post.likes?.length || 0} likes
                                    </Badge>
                                    <Badge variant="secondary">
                                        <Package className="mr-1 h-3 w-3" />
                                        {post.products?.length || 0} products
                                    </Badge>
                                    {post.isOfficial && (
                                        <Badge variant="default">
                                            <Tag className="mr-1 h-3 w-3" />
                                            Official
                                        </Badge>
                                    )}
                                </div>
                            </div>

                            {/* Preference Tags */}
                            {post.preferenceTags && post.preferenceTags.length > 0 && (
                                <div className="space-y-2">
                                    <h3 className="text-lg font-semibold">Tags</h3>
                                    <div className="flex flex-wrap gap-2">
                                        {post.preferenceTags.map((tagRelation: any) => (
                                            <Badge key={tagRelation.preferenceTag.id} variant="outline">
                                                {tagRelation.preferenceTag.tag}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Products */}
                            {post.products && post.products.length > 0 && (
                                <div className="space-y-2">
                                    <h3 className="text-lg font-semibold">Featured Products</h3>
                                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                        {post.products.map((productRelation: any) => {
                                            const product = productRelation.product
                                            return (
                                                <div
                                                    key={product.id}
                                                    className="flex gap-3 rounded-lg border p-3"
                                                >
                                                    <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded">
                                                        <Image
                                                            src={product.productOnlyImageUrl}
                                                            alt={product.name}
                                                            fill
                                                            className="object-cover"
                                                        />
                                                    </div>
                                                    <div className="flex-1 space-y-1">
                                                        <p className="text-sm font-semibold line-clamp-2">
                                                            {product.name}
                                                        </p>
                                                        <p className="text-xs text-muted-foreground">
                                                            {product.store.name}
                                                        </p>
                                                        <p className="text-sm font-bold">
                                                            {formatPrice(product.priceGross, product.currency)}
                                                        </p>
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    </>
                ) : null}
            </DialogContent>
        </Dialog>
    )
}
