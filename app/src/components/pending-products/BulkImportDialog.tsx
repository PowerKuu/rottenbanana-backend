"use client"

import { useState } from "react"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle
} from "@/components/ui/dialog"
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
    const [urls, setUrls] = useState("")
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        const reader = new FileReader()
        reader.onload = (event) => {
            try {
                const json = JSON.parse(event.target?.result as string)
                // Expect array of URLs or array of objects with url property
                let urlList: string[] = []

                if (Array.isArray(json)) {
                    urlList = json
                        .map((item) => (typeof item === "string" ? item : item.url))
                        .filter(Boolean)
                }

                setUrls(urlList.join("\n"))
            } catch (err) {
                setError("Invalid JSON file format")
            }
        }
        reader.readAsText(file)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError("")

        if (!urls.trim()) {
            setError("Please enter at least one URL")
            return
        }

        const urlList = urls
            .split("\n")
            .map((url) => url.trim())
            .filter((url) => url.length > 0)

        if (urlList.length === 0) {
            setError("No valid URLs found")
            return
        }

        setLoading(true)

        try {
            const results = await createBulkPendingProducts({ urls: urlList })

            let message = `Created ${results.created.length} products`
            if (results.duplicates.length > 0) {
                message += `, ${results.duplicates.length} duplicates skipped`
            }
            if (results.errors.length > 0) {
                message += `, ${results.errors.length} errors`
            }

            toast.success(message)

            if (results.errors.length > 0) {
                console.error("Import errors:", results.errors)
            }

            setUrls("")
            onOpenChange(false)
            onSuccess?.()
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Failed to import URLs"
            )
        } finally {
            setLoading(false)
        }
    }

    const handleClose = () => {
        setUrls("")
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
                        <Label htmlFor="urls">Product URLs</Label>
                        <Textarea
                            id="urls"
                            value={urls}
                            onChange={(e) => setUrls(e.target.value)}
                            placeholder="Paste URLs (one per line) or upload JSON file"
                            className="min-h-50 font-mono text-sm"
                            disabled={loading}
                        />
                        <p className="text-xs text-muted-foreground">
                            Enter one URL per line, or upload a JSON file
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
                                onClick={() =>
                                    document.getElementById("file")?.click()
                                }
                                disabled={loading}
                            >
                                <Upload className="h-4 w-4 mr-2" />
                                Upload JSON
                            </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Expected format: ["url1", "url2"] or
                            [{'"url": "url1"'}, {'"url": "url2"'}]
                        </p>
                    </div>

                    {error && (
                        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                            {error}
                        </div>
                    )}

                    <div className="flex justify-end gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleClose}
                            disabled={loading}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Importing...
                                </>
                            ) : (
                                "Import URLs"
                            )}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    )
}
