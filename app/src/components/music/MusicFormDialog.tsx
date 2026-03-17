"use client"

import { useEffect, useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { MultiSelect } from "@/components/ui/multi-select"
import { createMusic, updateMusic } from "@/server/admin/actions/music"
import { getAllRegions } from "@/server/admin/actions/regions"
import { Music } from "@/prisma/client"

export function MusicFormDialog({
    open,
    onOpenChange,
    music,
    onSuccess
}: {
    open: boolean
    onOpenChange: (open: boolean) => void
    music?: Music | null
    onSuccess?: () => void
}) {
    const [name, setName] = useState("")
    const [audioFile, setAudioFile] = useState<File | null>(null)
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
                // Select all regions by default for create mode
                if (!music) {
                    setSelectedRegionIds(regions.map((r) => r.id))
                }
            } catch (err) {
                console.error("Failed to load regions:", err)
            }
        }
        if (open) {
            loadRegions()
        }
    }, [open, music])

    useEffect(() => {
        if (music) {
            setName(music.name)
            // @ts-expect-error - Music type doesn't include regions yet
            setSelectedRegionIds(music.regions?.map((r: { id: string }) => r.id) || [])
        } else {
            setName("")
            setAudioFile(null)
            // Region selection is handled in loadRegions
        }
        setError("")
    }, [music, open])

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        if (file.size > 30 * 1024 * 1024) {
            setError("Audio file must be under 30MB")
            return
        }

        const allowedTypes = ["audio/mpeg", "audio/mp3", "audio/wav", "audio/x-m4a", "audio/ogg", "audio/flac"]
        const allowedExtensions = [".mp3", ".wav", ".m4a", ".ogg", ".flac"]
        const fileExtension = file.name.toLowerCase().slice(file.name.lastIndexOf("."))

        if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(fileExtension)) {
            setError("Only audio files (mp3, wav, m4a, ogg, flac) are allowed")
            return
        }

        setAudioFile(file)
        setError("")

        // Auto-fill name if empty
        if (!name.trim()) {
            const fileNameWithoutExt = file.name.slice(0, file.name.lastIndexOf("."))
            setName(fileNameWithoutExt)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError("")

        if (selectedRegionIds.length === 0) {
            setError("At least one region is required")
            return
        }

        if (!name.trim()) {
            setError("Music name is required")
            return
        }

        if (name.trim().length < 2) {
            setError("Music name must be at least 2 characters")
            return
        }

        if (name.trim().length > 100) {
            setError("Music name must be less than 100 characters")
            return
        }

        if (!music && !audioFile) {
            setError("Please select an audio file")
            return
        }

        setLoading(true)

        try {
            let musicId = music?.musicId || ""

            if (audioFile) {
                const formData = new FormData()
                formData.append("file", audioFile)

                const uploadResponse = await fetch("/api/uploads/upload", {
                    method: "POST",
                    body: formData
                })

                const uploadData = await uploadResponse.json()

                if (uploadData.error) {
                    throw new Error(uploadData.error || "Failed to upload audio file")
                }

                musicId = uploadData.id
            }

            if (music) {
                await updateMusic({
                    id: music.id,
                    name,
                    regionIds: selectedRegionIds
                })
            } else {
                await createMusic({
                    name,
                    musicId,
                    regionIds: selectedRegionIds
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
                    <DialogTitle>{music ? "Edit Music" : "Create Music"}</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Music Name</Label>
                        <Input
                            id="name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g., Summer Vibes, Chill Beats"
                            disabled={loading}
                            autoFocus
                        />
                        <p className="text-xs text-muted-foreground">A descriptive name for this music track</p>
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
                        <p className="text-xs text-muted-foreground">Select which regions this music is available in</p>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="audioFile">
                            Audio File {!music && <span className="text-destructive">*</span>}
                        </Label>
                        <Input
                            id="audioFile"
                            type="file"
                            accept=".mp3,.wav,.m4a,.ogg,.flac,audio/mpeg,audio/mp3,audio/wav,audio/x-m4a,audio/ogg,audio/flac"
                            onChange={handleFileChange}
                            disabled={loading}
                        />
                        <p className="text-xs text-muted-foreground">
                            {music
                                ? "Upload a new file to replace the current one (optional)"
                                : "Supported formats: mp3, wav, m4a, ogg, flac"}
                        </p>
                        {audioFile && <p className="text-xs text-green-600">Selected: {audioFile.name}</p>}
                    </div>

                    {error && <div className="text-sm text-destructive">{error}</div>}

                    <div className="flex justify-end gap-2">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading ? "Saving..." : music ? "Update" : "Create"}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    )
}
