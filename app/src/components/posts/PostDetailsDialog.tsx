"use client"

import { useEffect, useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { getPostById, deletePostImage } from "@/server/admin/actions/posts"
import Image from "next/image"
import Link from "next/link"
import { format } from "date-fns"
import { Heart, Package, Calendar, Tag, ChevronLeft, ChevronRight, Eye, Trash2 } from "lucide-react"
import { formatPrice, getFileUrl } from "@/lib/utils"

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
    const [currentImageIndex, setCurrentImageIndex] = useState(0)
    const [imageUrls, setImageUrls] = useState<string[]>([])
    const [productImageUrls, setProductImageUrls] = useState<{ [key: string]: string }>({})
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
    const [deleting, setDeleting] = useState(false)
    const [deleteError, setDeleteError] = useState<string | null>(null)

    useEffect(() => {
        if (!open || !postId) {
            setPost(null)
            setError(null)
            setCurrentImageIndex(0)
            setImageUrls([])
            setProductImageUrls({})
            return
        }

        const fetchPost = async () => {
            setLoading(true)
            setError(null)
            setCurrentImageIndex(0)
            setImageUrls([])
            setProductImageUrls({})
            try {
                const data = await getPostById(postId)
                if (!data) {
                    setError("Post not found")
                } else {
                    setPost(data)

                    // Load post images
                    if (data.mediaIds && data.mediaIds.length > 0) {
                        setImageUrls(data.mediaIds.map((id: string) => getFileUrl(id)))
                    }

                    // Load product images
                    if (data.products && data.products.length > 0) {
                        const productUrls: { [key: string]: string } = {}
                        data.products.forEach((productRelation: any) => {
                            const product = productRelation.product
                            if (product.productOnlyImageId) {
                                productUrls[product.id] = getFileUrl(product.productOnlyImageId)
                            }
                        })
                        setProductImageUrls(productUrls)
                    }
                }
            } catch (err) {
                setError(err instanceof Error ? err.message : "Failed to load post details")
            } finally {
                setLoading(false)
            }
        }

        fetchPost()
    }, [postId, open])

    const handleDeleteImage = async () => {
        if (!post || !postId) return

        const imageIdToDelete = post.mediaIds[currentImageIndex]
        setDeleting(true)
        setDeleteError(null)

        try {
            const result = await deletePostImage(postId, imageIdToDelete)

            // Update the post state
            const updatedPost = {
                ...post,
                mediaIds: post.mediaIds.filter((_: string, index: number) => index !== currentImageIndex)
            }
            setPost(updatedPost)

            // Update image URLs
            const updatedImageUrls = imageUrls.filter((_, index) => index !== currentImageIndex)
            setImageUrls(updatedImageUrls)

            // Adjust current image index if needed
            if (currentImageIndex >= updatedImageUrls.length && updatedImageUrls.length > 0) {
                setCurrentImageIndex(updatedImageUrls.length - 1)
            } else if (updatedImageUrls.length === 0) {
                setCurrentImageIndex(0)
            }

            setDeleteConfirmOpen(false)
        } catch (err) {
            setDeleteError(err instanceof Error ? err.message : "Failed to delete image")
        } finally {
            setDeleting(false)
        }
    }

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
                            {/* Images Carousel */}
                            {imageUrls.length > 0 && (
                                <div className="space-y-2">
                                    <h3 className="text-lg font-semibold">Images</h3>
                                    <div className="relative mx-auto max-w-md">
                                        <div className="relative aspect-9/16 overflow-hidden rounded-lg bg-black">
                                            <Image
                                                src={imageUrls[currentImageIndex]}
                                                alt={`Post image ${currentImageIndex + 1}`}
                                                fill
                                                className="object-cover"
                                            />
                                        </div>

                                        {/* Delete Image Button */}
                                        <Button
                                            variant="destructive"
                                            size="icon"
                                            className="absolute right-2 top-2 bg-destructive/80 backdrop-blur-sm hover:bg-destructive"
                                            onClick={() => setDeleteConfirmOpen(true)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>

                                        {imageUrls.length > 1 && (
                                            <>
                                                <Button
                                                    variant="outline"
                                                    size="icon"
                                                    className="absolute left-2 top-1/2 -translate-y-1/2 bg-background/80 backdrop-blur-sm"
                                                    onClick={() =>
                                                        setCurrentImageIndex((prev) =>
                                                            prev === 0 ? imageUrls.length - 1 : prev - 1
                                                        )
                                                    }
                                                >
                                                    <ChevronLeft className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="icon"
                                                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-background/80 backdrop-blur-sm"
                                                    onClick={() =>
                                                        setCurrentImageIndex((prev) =>
                                                            prev === imageUrls.length - 1 ? 0 : prev + 1
                                                        )
                                                    }
                                                >
                                                    <ChevronRight className="h-4 w-4" />
                                                </Button>
                                                <div className="mt-2 flex justify-center gap-1">
                                                    {imageUrls.map((_: string, index: number) => (
                                                        <button
                                                            key={index}
                                                            onClick={() => setCurrentImageIndex(index)}
                                                            className={`h-1.5 w-1.5 rounded-full transition-all ${
                                                                index === currentImageIndex
                                                                    ? "bg-primary w-4"
                                                                    : "bg-muted-foreground/30"
                                                            }`}
                                                        />
                                                    ))}
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Music Player */}
                            {post.musicId && (
                                <div className="space-y-2">
                                    <h3 className="text-lg font-semibold">Music ({post.music.name})</h3>
                                    <audio controls className="w-full" preload="metadata">
                                        <source src={getFileUrl(post.music.musicId)} type="audio/mpeg" />
                                        Your browser does not support the audio element.
                                    </audio>
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
                                        <Eye className="mr-1 h-3 w-3" />
                                        {post.views?.length || 0} views
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
                                    <div className="space-y-3">
                                        {post.products.map((productRelation: any) => {
                                            const product = productRelation.product
                                            const productImageUrl = productImageUrls[product.id]
                                            return (
                                                <Link
                                                    key={product.id}
                                                    href={product.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex gap-4 rounded-lg border p-4 min-w-0 hover:bg-accent transition-colors"
                                                >
                                                    {productImageUrl && (
                                                        <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded">
                                                            <Image
                                                                src={productImageUrl}
                                                                alt={product.name}
                                                                fill
                                                                className="object-cover"
                                                            />
                                                        </div>
                                                    )}
                                                    <div className="flex-1 flex flex-col justify-between min-w-0 overflow-hidden">
                                                        <div className="space-y-1 min-w-0">
                                                            <p className="text-sm font-semibold line-clamp-2 wrap-break-word">
                                                                {product.name}
                                                            </p>
                                                            <p className="text-xs text-muted-foreground truncate">
                                                                {product.store.name}
                                                            </p>
                                                        </div>
                                                        <p className="text-base font-bold mt-2">
                                                            {formatPrice(product.priceGross, product.currency)}
                                                        </p>
                                                    </div>
                                                </Link>
                                            )
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    </>
                ) : null}
            </DialogContent>

            {/* Delete Image Confirmation Dialog */}
            <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Delete Image</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete this image? This action cannot be undone and will
                            permanently remove the image from the post and from storage.
                        </DialogDescription>
                    </DialogHeader>

                    {deleteError && <div className="text-sm text-destructive">{deleteError}</div>}

                    <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)} disabled={deleting}>
                            Cancel
                        </Button>
                        <Button variant="destructive" onClick={handleDeleteImage} disabled={deleting}>
                            {deleting ? "Deleting..." : "Delete"}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </Dialog>
    )
}
