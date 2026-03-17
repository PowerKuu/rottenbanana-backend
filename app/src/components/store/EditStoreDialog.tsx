"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { MultiSelect } from "@/components/ui/multi-select"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createStore, updateStore } from "@/server/admin/actions/stores"
import { getAllRegions } from "@/server/admin/actions/regions"
import { SCRAPER_IDENTIFIERS } from "@/server/scraper/constants"
import { validateUrl, parseTextfieldList, getFileUrl } from "@/lib/utils"
import { Store } from "@/prisma/client"
import { Store as StoreIcon } from "lucide-react"

export function StoreFormDialog({
    open,
    onOpenChange,
    store,
    onSuccess
}: {
    open: boolean
    onOpenChange: (open: boolean) => void
    store?: Store | null
    onSuccess?: () => void
}) {
    const [name, setName] = useState("")
    const [scraperIdentifier, setScraperIdentifier] = useState("")
    const [websiteUrl, setWebsiteUrl] = useState("")
    const [websiteHostnames, setWebsiteHostnames] = useState("")
    const [image, setImage] = useState<File | null>(null)
    const [imagePreview, setImagePreview] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")
    const [selectedRegionIds, setSelectedRegionIds] = useState<string[]>([])
    const [availableRegions, setAvailableRegions] = useState<{ id: string; name: string }[]>([])

    // Fetch regions on mount
    useEffect(() => {
        const loadRegions = async () => {
            try {
                const regions = await getAllRegions()
                setAvailableRegions(regions.map((r) => ({ id: r.id, name: r.name })))
            } catch (err) {
                console.error("Failed to load regions:", err)
            }
        }
        if (open) {
            loadRegions()
        }
    }, [open])

    useEffect(() => {
        if (store) {
            setName(store.name)
            setScraperIdentifier(store.scraperIdentifier)
            setWebsiteUrl(store.websiteUrl)
            setWebsiteHostnames(store.websiteHostnames.join("\n"))
            setImagePreview(getFileUrl(store.imageId))
            // @ts-expect-error - Store type doesn't include regions yet
            setSelectedRegionIds(store.regions?.map((r: { id: string }) => r.id) || [])
        } else {
            setName("")
            setScraperIdentifier("")
            setWebsiteUrl("")
            setWebsiteHostnames("")
            setImage(null)
            setImagePreview(null)
            setSelectedRegionIds([])
        }
        setError("")
    }, [store, open])

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        if (file.size > 5 * 1024 * 1024) {
            setError("Image file must be under 5MB")
            return
        }

        const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"]
        if (!allowedTypes.includes(file.type)) {
            setError("Only image files (jpg, png, webp, gif) are allowed")
            return
        }

        setImage(file)
        setError("")

        const reader = new FileReader()
        reader.onloadend = () => {
            setImagePreview(reader.result as string)
        }
        reader.readAsDataURL(file)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError("")

        if (selectedRegionIds.length === 0) {
            setError("At least one region is required")
            return
        }

        if (!name.trim()) {
            setError("Store name is required")
            return
        }

        if (!scraperIdentifier) {
            setError("Scraper Identifier is required")
            return
        }

        if (!websiteUrl.trim()) {
            setError("Website URL is required")
            return
        }

        if (!validateUrl(websiteUrl)) {
            setError("Please enter a valid website URL")
            return
        }

        if (websiteHostnames.length <= 0) {
            setError("At least one website origin is required")
            return
        }

        if (!store && !image) {
            setError("Please select an image")
            return
        }

        setLoading(true)

        let imageId = store?.imageId || ""

        if (image) {
            const formData = new FormData()
            formData.append("file", image)
            formData.append("removeBackground", "true")
            formData.append("namespace", "stores")

            const uploadResponse = await fetch("/api/uploads/upload", {
                method: "POST",
                body: formData
            })

            const uploadData = await uploadResponse.json()

            if (uploadData.error) {
                throw new Error(uploadData.error || "Failed to upload image")
            }

            imageId = uploadData.id
        }

        const hostnames = parseTextfieldList(websiteHostnames)

        if (store) {
            await updateStore({
                id: store.id,
                name,
                scraperIdentifier: scraperIdentifier,
                websiteUrl,
                websiteHostnames: hostnames,
                imageId,
                regionIds: selectedRegionIds
            })
        } else {
            await createStore({
                name,
                scraperIdentifier: scraperIdentifier,
                websiteUrl,
                websiteHostnames: hostnames,
                imageId,
                regionIds: selectedRegionIds
            })
        }

        onSuccess?.()
        onOpenChange(false)
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{store ? "Edit Store" : "Create Store"}</DialogTitle>
                </DialogHeader>

                <form
                    onSubmit={(event) => {
                        try {
                            handleSubmit(event)
                        } catch (err) {
                            setError(err instanceof Error ? err.message : "An error occurred")
                        } finally {
                            setLoading(false)
                        }
                    }}
                    className="space-y-4"
                >
                    <div className="space-y-2">
                        <Label htmlFor="name">Store Name</Label>
                        <Input
                            id="name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Nike Store"
                            disabled={loading}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="scraperIdentifier">Scraper Identifier</Label>
                        <Select value={scraperIdentifier} onValueChange={setScraperIdentifier} disabled={loading}>
                            <SelectTrigger id="scraperIdentifier" className="w-full">
                                <SelectValue placeholder="Select a scraper" />
                            </SelectTrigger>
                            <SelectContent>
                                {SCRAPER_IDENTIFIERS.map((identifier: string) => (
                                    <SelectItem key={identifier} value={identifier}>
                                        {identifier}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="websiteUrl">Website URL</Label>
                        <Input
                            id="websiteUrl"
                            value={websiteUrl}
                            onChange={(e) => setWebsiteUrl(e.target.value)}
                            placeholder="https://example.com"
                            disabled={loading}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="websiteHostnames">Website Hostnames</Label>
                        <Textarea
                            id="websiteHostnames"
                            value={websiteHostnames}
                            onChange={(e) => setWebsiteHostnames(e.target.value)}
                            placeholder="example.com, www.example.com"
                            disabled={loading}
                            className="min-h-24"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="regions">
                            Regions <span className="text-destructive">*</span>
                        </Label>
                        <MultiSelect
                            options={availableRegions}
                            value={selectedRegionIds}
                            onChange={setSelectedRegionIds}
                            placeholder="Select regions"
                            disabled={loading}
                        />
                        <p className="text-xs text-muted-foreground">Select which regions this store operates in</p>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="image">
                            Store Image {!store && <span className="text-destructive">*</span>}
                        </Label>
                        <Input
                            id="image"
                            type="file"
                            accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                            onChange={handleImageChange}
                            disabled={loading}
                        />
                        {imagePreview && (
                            <div className="relative aspect-video w-full overflow-hidden rounded-md bg-muted">
                                {imagePreview.startsWith("data:") || imagePreview.startsWith("http") ? (
                                    <Image
                                        src={imagePreview}
                                        alt="Preview"
                                        fill
                                        className="object-cover"
                                        sizes="600px"
                                    />
                                ) : (
                                    <div className="flex h-full items-center justify-center">
                                        <StoreIcon className="h-12 w-12 text-muted-foreground/50" />
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {error && <div className="text-sm text-destructive">{error}</div>}

                    <div className="flex justify-end gap-2">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading ? "Saving..." : store ? "Update" : "Create"}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    )
}
