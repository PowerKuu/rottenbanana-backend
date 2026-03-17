"use client"

import { useEffect, useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { createRegion, updateRegion } from "@/server/admin/actions/regions"
import { Region } from "@/prisma/client"

export function RegionFormDialog({
    open,
    onOpenChange,
    region,
    onSuccess
}: {
    open: boolean
    onOpenChange: (open: boolean) => void
    region?: Region | null
    onSuccess?: () => void
}) {
    const [name, setName] = useState("")
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")

    useEffect(() => {
        if (region) {
            setName(region.name)
        } else {
            setName("")
        }
        setError("")
    }, [region, open])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError("")

        if (!name.trim()) {
            setError("Region name is required")
            return
        }

        if (name.trim().length < 2) {
            setError("Region name must be at least 2 characters")
            return
        }

        if (name.trim().length > 100) {
            setError("Region name must be less than 100 characters")
            return
        }

        setLoading(true)

        try {
            if (region) {
                await updateRegion({
                    id: region.id,
                    name
                })
            } else {
                await createRegion({
                    name
                })
            }

            onSuccess?.()
            onOpenChange(false)
        } catch (err) {
            if (err instanceof Error) {
                if (err.message.includes("Unique constraint")) {
                    setError("A region with this name already exists")
                } else {
                    setError(err.message)
                }
            } else {
                setError("An error occurred")
            }
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>{region ? "Edit Region" : "Create Region"}</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Region Name</Label>
                        <Input
                            id="name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g., North America, Europe, Asia"
                            disabled={loading}
                            autoFocus
                        />
                        <p className="text-xs text-muted-foreground">
                            A unique name for this geographical region
                        </p>
                    </div>

                    {error && <div className="text-sm text-destructive">{error}</div>}

                    <div className="flex justify-end gap-2">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading ? "Saving..." : region ? "Update" : "Create"}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    )
}
