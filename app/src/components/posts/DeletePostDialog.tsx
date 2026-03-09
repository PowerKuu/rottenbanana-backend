"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { deletePost } from "@/server/admin/actions/posts"

export function DeletePostDialog({
    open,
    onOpenChange,
    post,
    onSuccess
}: {
    open: boolean
    onOpenChange: (open: boolean) => void
    post: {
        id: string
        caption: string | null
    } | null
    onSuccess?: () => void
}) {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")

    const handleDelete = async () => {
        if (!post) return

        setLoading(true)
        setError("")

        try {
            await deletePost(post.id)
            onSuccess?.()
            onOpenChange(false)
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to delete post")
        } finally {
            setLoading(false)
        }
    }

    if (!post) return null

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Delete Post</DialogTitle>
                    <DialogDescription>
                        Are you sure you want to delete{" "}
                        {post.caption ? (
                            <>
                                the post "<strong>{post.caption}</strong>"
                            </>
                        ) : (
                            "this post"
                        )}
                        ?
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
