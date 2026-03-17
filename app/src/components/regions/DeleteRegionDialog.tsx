"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { deleteRegion } from "@/server/admin/actions/regions"
import { AlertTriangle } from "lucide-react"

export function DeleteRegionDialog({
    open,
    onOpenChange,
    region,
    onSuccess
}: {
    open: boolean
    onOpenChange: (open: boolean) => void
    region: {
        id: string
        name: string
        postCount: number
        storeCount: number
        userCount: number
    } | null
    onSuccess?: () => void
}) {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")

    const handleDelete = async () => {
        if (!region) return

        setLoading(true)
        setError("")

        try {
            await deleteRegion(region.id)
            onSuccess?.()
            onOpenChange(false)
        } catch (err) {
            if (err instanceof Error) {
                if (err.message.includes("posts")) {
                    setError("Cannot delete region with existing posts. Please remove or reassign all posts first.")
                } else {
                    setError(err.message)
                }
            } else {
                setError("Failed to delete region")
            }
        } finally {
            setLoading(false)
        }
    }

    if (!region) return null

    const hasRelations = region.postCount > 0 || region.storeCount > 0 || region.userCount > 0
    const totalRelations = region.postCount + region.storeCount + region.userCount

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Delete Region</DialogTitle>
                    <DialogDescription>
                        Are you sure you want to delete <strong>{region.name}</strong>?
                    </DialogDescription>
                </DialogHeader>

                {hasRelations && (
                    <div className="flex gap-3 rounded-md border border-amber-500/50 bg-amber-500/10 p-3">
                        <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" />
                        <div className="space-y-1 text-sm">
                            <p className="font-medium text-amber-600">Warning: Relations Exist</p>
                            <p className="text-muted-foreground">
                                This region has {totalRelations} association{totalRelations === 1 ? "" : "s"}:
                            </p>
                            <ul className="list-disc list-inside text-muted-foreground space-y-1">
                                {region.postCount > 0 && (
                                    <li>
                                        {region.postCount} post{region.postCount === 1 ? "" : "s"} (DELETE WILL BE
                                        BLOCKED)
                                    </li>
                                )}
                                {region.storeCount > 0 && (
                                    <li>
                                        {region.storeCount} store{region.storeCount === 1 ? "" : "s"} (associations
                                        removed)
                                    </li>
                                )}
                                {region.userCount > 0 && (
                                    <li>
                                        {region.userCount} user{region.userCount === 1 ? "" : "s"} (region set to null)
                                    </li>
                                )}
                            </ul>
                            {region.postCount > 0 && (
                                <p className="text-amber-600 pt-2 font-medium">
                                    You must reassign or delete all posts before deleting this region.
                                </p>
                            )}
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
