"use client"

import { useEffect, useState } from "react"
import { PostCard } from "@/components/posts/PostCard"
import { PostsHeader } from "@/components/posts/PostsHeader"
import { PostDetailsDialog } from "@/components/posts/PostDetailsDialog"
import { DeletePostDialog } from "@/components/posts/DeletePostDialog"
import { ProductsPagination } from "@/components/Pagination"
import { Skeleton } from "@/components/ui/skeleton"
import { Images } from "lucide-react"
import { getPosts, createPost } from "@/server/admin/actions/posts"

export default function PostsPage() {
    const [posts, setPosts] = useState<any[]>([])
    const [pagination, setPagination] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [selectedPostId, setSelectedPostId] = useState<string | null>(null)
    const [dialogOpen, setDialogOpen] = useState(false)
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
    const [selectedPost, setSelectedPost] = useState<{ id: string; caption: string | null } | null>(null)
    const [page, setPage] = useState(1)
    const [createLoading, setCreateLoading] = useState(false)

    useEffect(() => {
        const fetchPosts = async () => {
            setLoading(true)
            setError(null)
            try {
                const data = await getPosts({ page })
                setPosts(data.posts)
                setPagination(data.pagination)
            } catch (err) {
                console.error("Error fetching posts:", err)
                setError("Failed to load posts")
            } finally {
                setLoading(false)
            }
        }

        fetchPosts()
    }, [page])

    const handlePostClick = (postId: string) => {
        setSelectedPostId(postId)
        setDialogOpen(true)
    }

    const handleDelete = (post: { id: string; caption: string | null }) => {
        setSelectedPost(post)
        setDeleteDialogOpen(true)
    }

    const handleSuccess = () => {
        // Reload posts after successful deletion
        setLoading(true)
        getPosts({ page }).then((data) => {
            setPosts(data.posts)
            setPagination(data.pagination)
            setLoading(false)
        })
    }

    const handleCreatePost = async () => {
        setCreateLoading(true)
        setError(null)
        try {
            await createPost()
            // Reset to page 1 and refresh
            setPage(1)
            const data = await getPosts({ page: 1 })
            setPosts(data.posts)
            setPagination(data.pagination)
        } catch (err) {
            console.error("Error creating post:", err)
            setError(err instanceof Error ? err.message : "Failed to create post")
        } finally {
            setCreateLoading(false)
        }
    }

    const hasNoPosts = posts.length === 0 && !loading

    return (
        <div className="space-y-6">
            <PostsHeader onCreateClick={handleCreatePost} isLoading={createLoading} />

            {error && (
                <div className="rounded-lg border border-destructive bg-destructive/10 p-4 text-sm text-destructive">
                    {error}
                </div>
            )}

            {loading ? (
                <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
                    {Array.from({ length: 8 }).map((_, i) => (
                        <div key={i} className="space-y-3">
                            <Skeleton className="aspect-square w-full" />
                            <Skeleton className="h-4 w-3/4" />
                            <Skeleton className="h-4 w-1/2" />
                        </div>
                    ))}
                </div>
            ) : hasNoPosts ? (
                <div className="flex min-h-100 flex-col items-center justify-center rounded-lg border border-dashed">
                    <Images className="mb-4 h-12 w-12 text-muted-foreground" />
                    <h3 className="text-lg font-semibold">No posts yet</h3>
                    <p className="text-sm text-muted-foreground">Posts will appear here once created</p>
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
                        {posts.map((post) => (
                            <PostCard
                                key={post.id}
                                id={post.id}
                                caption={post.caption}
                                firstImageId={post.mediaIds?.[0] || null}
                                likeCount={post._count?.likes || 0}
                                viewCount={post._count?.views || 0}
                                productCount={post._count?.products || 0}
                                regionName={post.region?.name || "Unknown"}
                                createdAt={post.createdAt}
                                onClick={() => handlePostClick(post.id)}
                                onDelete={() => handleDelete({ id: post.id, caption: post.caption })}
                            />
                        ))}
                    </div>

                    {pagination && (
                        <ProductsPagination
                            currentPage={pagination.currentPage}
                            totalPages={pagination.totalPages}
                            hasNextPage={pagination.hasNextPage}
                            hasPreviousPage={pagination.hasPreviousPage}
                            onPageChange={setPage}
                        />
                    )}
                </>
            )}

            <PostDetailsDialog postId={selectedPostId} open={dialogOpen} onOpenChange={setDialogOpen} />

            <DeletePostDialog
                open={deleteDialogOpen}
                onOpenChange={setDeleteDialogOpen}
                post={selectedPost}
                onSuccess={handleSuccess}
            />
        </div>
    )
}
