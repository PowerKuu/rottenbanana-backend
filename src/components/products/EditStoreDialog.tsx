"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { createStore, updateStore } from "@/server/admin/actions/stores"
import { slugify, validateUrl, parseTextfieldList } from "@/lib/utils"
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
    const [identifier, setIdentifier] = useState("")
    const [websiteUrl, setWebsiteUrl] = useState("")
    const [websiteHostnames, setWebsiteHostnames] = useState("")
    const [image, setImage] = useState<File | null>(null)
    const [imagePreview, setImagePreview] = useState<string | null>(null)
    const [identifierManuallyEdited, setIdentifierManuallyEdited] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")

    useEffect(() => {
        if (store) {
            setName(store.name)
            setIdentifier(store.identifier)
            setWebsiteUrl(store.websiteUrl)
            setWebsiteHostnames(store.websiteHostnames.join("\n"))
            setImagePreview(store.imageUrl)
            setIdentifierManuallyEdited(true)
        } else {
            setName("")
            setIdentifier("")
            setWebsiteUrl("")
            setWebsiteHostnames("")
            setImage(null)
            setImagePreview(null)
            setIdentifierManuallyEdited(false)
        }
        setError("")
    }, [store, open])

    const handleNameChange = (value: string) => {
        setName(value)
        if (!identifierManuallyEdited) {
            setIdentifier(slugify(value))
        }
    }

    const handleIdentifierChange = (value: string) => {
        setIdentifier(value)
        setIdentifierManuallyEdited(true)
    }

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

        if (!name.trim()) {
            setError("Store name is required")
            return
        }

        if (!identifier.trim()) {
            setError("Identifier is required")
            return
        }

        if (!/^[a-z0-9-]+$/.test(identifier)) {
            setError("Identifier must contain only lowercase letters, numbers, and hyphens")
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

        let imageUrl = store?.imageUrl || ""

        if (image) {
            const formData = new FormData()
            formData.append("file", image)

            const uploadRes = await fetch("/api/uploads/upload", {
                method: "POST",
                body: formData
            })

            const uploadData = await uploadRes.json()

            if (!uploadData.success) {
                throw new Error(uploadData.error || "Failed to upload image")
            }

            imageUrl = uploadData.url
        }

        const hostnames = parseTextfieldList(websiteHostnames)

        if (store) {
            await updateStore({
                id: store.id,
                name,
                identifier,
                websiteUrl,
                websiteHostnames: hostnames,
                imageUrl
            })
        } else {
            await createStore({
                name,
                identifier,
                websiteUrl,
                websiteHostnames: hostnames,
                imageUrl
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
                            onChange={(e) => handleNameChange(e.target.value)}
                            placeholder="Nike Store"
                            disabled={loading}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="identifier">Identifier</Label>
                        <Input
                            id="identifier"
                            value={identifier}
                            onChange={(e) => handleIdentifierChange(e.target.value)}
                            placeholder="nike-store"
                            disabled={loading}
                        />
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
