"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { deletePreferenceTag } from "@/server/admin/actions/tags"
import { AlertTriangle } from "lucide-react"

export function DeletePreferenceTagDialog({
    open,
    onOpenChange,
    tag,
    onSuccess
}: {
    open: boolean
    onOpenChange: (open: boolean) => void
    tag: {
        id: string
        tag: string
        userCount: number
        productCount: number
        postCount: number
    } | null
    onSuccess?: () => void
}) {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")

    const handleDelete = async () => {
        if (!tag) return

        setLoading(true)
        setError("")

        try {
            await deletePreferenceTag(tag.id)
            onSuccess?.()
            onOpenChange(false)
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to delete preference tag")
        } finally {
            setLoading(false)
        }
    }

    if (!tag) return null

    const hasRelations = tag.userCount > 0 || tag.productCount > 0 || tag.postCount > 0
    const totalRelations = tag.userCount + tag.productCount + tag.postCount

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Delete Preference Tag</DialogTitle>
                    <DialogDescription>
                        Are you sure you want to delete <strong>{tag.tag}</strong>?
                    </DialogDescription>
                </DialogHeader>

                {hasRelations && (
                    <div className="flex gap-3 rounded-md border border-amber-500/50 bg-amber-500/10 p-3">
                        <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" />
                        <div className="space-y-1 text-sm">
                            <p className="font-medium text-amber-600">Warning: Cascade Delete</p>
                            <p className="text-muted-foreground">
                                This tag has {totalRelations} association{totalRelations === 1 ? "" : "s"}:
                            </p>
                            <ul className="list-disc list-inside text-muted-foreground space-y-1">
                                {tag.userCount > 0 && (
                                    <li>{tag.userCount} user preference{tag.userCount === 1 ? "" : "s"}</li>
                                )}
                                {tag.productCount > 0 && (
                                    <li>{tag.productCount} product{tag.productCount === 1 ? "" : "s"}</li>
                                )}
                                {tag.postCount > 0 && (
                                    <li>{tag.postCount} post{tag.postCount === 1 ? "" : "s"}</li>
                                )}
                            </ul>
                            <p className="text-muted-foreground pt-2">
                                All associations will be permanently removed.
                            </p>
                        </div>
                    </div>
                )}

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
