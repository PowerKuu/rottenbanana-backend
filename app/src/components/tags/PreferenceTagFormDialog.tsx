"use client"

import { useEffect, useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { createPreferenceTag, updatePreferenceTag } from "@/server/admin/actions/tags"
import { PreferenceTag } from "@/prisma/client"

export function PreferenceTagFormDialog({
    open,
    onOpenChange,
    tag,
    onSuccess
}: {
    open: boolean
    onOpenChange: (open: boolean) => void
    tag?: PreferenceTag | null
    onSuccess?: () => void
}) {
    const [tagName, setTagName] = useState("")
    const [description, setDescription] = useState("")
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")

    useEffect(() => {
        if (tag) {
            setTagName(tag.tag)
            setDescription(tag.description)
        } else {
            setTagName("")
            setDescription("")
        }
        setError("")
    }, [tag, open])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError("")

        if (!tagName.trim()) {
            setError("Tag name is required")
            return
        }

        if (tagName.trim().length < 2) {
            setError("Tag name must be at least 2 characters")
            return
        }

        if (tagName.trim().length > 50) {
            setError("Tag name must be less than 50 characters")
            return
        }

        if (!description.trim()) {
            setError("Description is required")
            return
        }

        if (description.trim().length < 10) {
            setError("Description must be at least 10 characters")
            return
        }

        if (description.trim().length > 500) {
            setError("Description must be less than 500 characters")
            return
        }

        setLoading(true)

        try {
            if (tag) {
                await updatePreferenceTag({
                    id: tag.id,
                    tag: tagName,
                    description
                })
            } else {
                await createPreferenceTag({
                    tag: tagName,
                    description
                })
            }

            onSuccess?.()
            onOpenChange(false)
        } catch (err) {
            setError(err instanceof Error ? err.message : "An error occurred")
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>{tag ? "Edit Preference Tag" : "Create Preference Tag"}</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="tag">Tag Name</Label>
                        <Input
                            id="tag"
                            value={tagName}
                            onChange={(e) => setTagName(e.target.value)}
                            placeholder="e.g., Streetwear, Minimalist, Vintage"
                            disabled={loading}
                            autoFocus
                        />
                        <p className="text-xs text-muted-foreground">
                            A short, memorable name for this preference tag
                        </p>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                            id="description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Describe what this tag represents..."
                            disabled={loading}
                            className="min-h-24"
                        />
                        <p className="text-xs text-muted-foreground">
                            Explain what this tag means and when it should be used
                        </p>
                    </div>

                    {error && <div className="text-sm text-destructive">{error}</div>}

                    <div className="flex justify-end gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            disabled={loading}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading ? "Saving..." : tag ? "Update" : "Create"}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    )
}
