"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Loader2, Upload } from "lucide-react"
import { createBulkPendingProducts } from "@/server/admin/actions/pendingProducts"
import { toast } from "sonner"

export function BulkImportDialog({
    open,
    onOpenChange,
    onSuccess
}: {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSuccess?: () => void
}) {
    const [input, setInput] = useState("")
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        const reader = new FileReader()
        reader.onload = (event) => {
            try {
                const json = JSON.parse(event.target?.result as string)

                if (!Array.isArray(json)) {
                    setError("JSON must be an array")
                    return
                }

                // Validate and convert to pipe-delimited format
                const formatted = json
                    .map((item) => {
                        if (!item.url || !item.imageUrl) {
                            setError("Each item must have both 'url' and 'imageUrl' fields")
                            return null
                        }
                        return `${item.url}|${item.imageUrl}`
                    })
                    .filter(Boolean)
                    .join("\n")

                if (formatted) {
                    setInput(formatted)
                    setError("")
                }
            } catch (err) {
                setError("Invalid JSON file format")
            }
        }
        reader.readAsText(file)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError("")

        if (!input.trim()) {
            setError("Please enter at least one product")
            return
        }

        // Parse input - format: url|imageUrl (both required)
        const lines = input
            .split("\n")
            .map((line) => line.trim())
            .filter((line) => line.length > 0)

        try {
            const products = lines.map((line) => {
                const parts = line.split("|")
                if (parts.length !== 2) {
                    throw new Error(`Invalid format: "${line}". Expected: url|imageUrl`)
                }
                const url = parts[0].trim()
                const imageUrl = parts[1].trim()

                if (!url || !imageUrl) {
                    throw new Error("Both url and imageUrl are required for each product")
                }

                return { url, imageUrl }
            })

            if (products.length === 0) {
                setError("No valid products found")
                return
            }

            setLoading(true)

            const results = await createBulkPendingProducts({ products })

            let message = `Created ${results.created.length} product(s)`
            if (results.duplicates.length > 0) {
                message += `, ${results.duplicates.length} duplicate(s) skipped`
            }
            if (results.errors.length > 0) {
                message += `, ${results.errors.length} error(s)`
            }

            toast.success(message)

            if (results.errors.length > 0) {
                console.error("Import errors:", results.errors)
            }

            setInput("")
            onOpenChange(false)
            onSuccess?.()
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to import products")
        } finally {
            setLoading(false)
        }
    }

    const handleClose = () => {
        setInput("")
        setError("")
        onOpenChange(false)
    }

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Bulk Import Products</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="products">Products</Label>
                        <Textarea
                            id="products"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Format: url|imageUrl (one per line)&#10;Example: https://example.com/product|https://example.com/image.jpg"
                            className="min-h-50 font-mono text-sm"
                            disabled={loading}
                        />
                        <p className="text-xs text-muted-foreground">
                            Enter one product per line (url|imageUrl), or upload a JSON file
                        </p>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="file">Or upload JSON file</Label>
                        <div className="flex items-center gap-2">
                            <input
                                id="file"
                                type="file"
                                accept=".json"
                                onChange={handleFileUpload}
                                className="hidden"
                                disabled={loading}
                            />
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => document.getElementById("file")?.click()}
                                disabled={loading}
                            >
                                <Upload className="h-4 w-4 mr-2" />
                                Upload JSON
                            </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Expected format: {'[{"url": "...", "imageUrl": "..."}]'}. Both fields required.
                        </p>
                    </div>

                    {error && <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}

                    <div className="flex justify-end gap-2">
                        <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Importing...
                                </>
                            ) : (
                                "Import Products"
                            )}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    )
}
