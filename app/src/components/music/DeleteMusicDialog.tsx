"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { deleteMusic } from "@/server/admin/actions/music"
import { AlertTriangle } from "lucide-react"

export function DeleteMusicDialog({
    open,
    onOpenChange,
    music,
    onSuccess
}: {
    open: boolean
    onOpenChange: (open: boolean) => void
    music: {
        id: string
        name: string
        postCount: number
        tagCount: number
    } | null
    onSuccess?: () => void
}) {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")

    const handleDelete = async () => {
        if (!music) return

        setLoading(true)
        setError("")

        try {
            await deleteMusic(music.id)
            onSuccess?.()
            onOpenChange(false)
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to delete music")
        } finally {
            setLoading(false)
        }
    }

    if (!music) return null

    const hasRelations = music.postCount > 0 || music.tagCount > 0
    const totalRelations = music.postCount + music.tagCount

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Delete Music</DialogTitle>
                    <DialogDescription>
                        Are you sure you want to delete <strong>{music.name}</strong>?
                    </DialogDescription>
                </DialogHeader>

                {hasRelations && (
                    <div className="flex gap-3 rounded-md border border-amber-500/50 bg-amber-500/10 p-3">
                        <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" />
                        <div className="space-y-1 text-sm">
                            <p className="font-medium text-amber-600">Warning: Cascade Delete</p>
                            <p className="text-muted-foreground">
                                This music has {totalRelations} association{totalRelations === 1 ? "" : "s"}:
                            </p>
                            <ul className="list-disc list-inside text-muted-foreground space-y-1">
                                {music.postCount > 0 && (
                                    <li>
                                        {music.postCount} post{music.postCount === 1 ? "" : "s"}
                                    </li>
                                )}
                                {music.tagCount > 0 && (
                                    <li>
                                        {music.tagCount} preference tag{music.tagCount === 1 ? "" : "s"}
                                    </li>
                                )}
                            </ul>
                            <p className="text-muted-foreground pt-2">All associations will be permanently removed.</p>
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
