"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { MultiSelect } from "@/components/ui/multi-select"
import { Loader2, Upload, X } from "lucide-react"
import { bulkCreateMusic } from "@/server/admin/actions/music"
import { getAllRegions } from "@/server/admin/actions/regions"
import { toast } from "sonner"
import { Progress } from "@/components/ui/progress"

export function BulkMusicImportDialog({
    open,
    onOpenChange,
    onSuccess
}: {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSuccess?: () => void
}) {
    const [audioFiles, setAudioFiles] = useState<File[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")
    const [selectedRegionIds, setSelectedRegionIds] = useState<string[]>([])
    const [availableRegions, setAvailableRegions] = useState<{ id: string; name: string }[]>([])
    const [progress, setProgress] = useState(0)
    const [currentFile, setCurrentFile] = useState("")

    // Fetch regions on mount
    useEffect(() => {
        const loadRegions = async () => {
            try {
                const regions = await getAllRegions()
                setAvailableRegions(regions.map((r) => ({ id: r.id, name: r.name })))
                setSelectedRegionIds(regions.map((r) => r.id))
            } catch (err) {
                console.error("Failed to load regions:", err)
            }
        }
        if (open) {
            loadRegions()
        }
    }, [open])

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || [])
        if (files.length === 0) return

        const allowedTypes = ["audio/mpeg", "audio/mp3", "audio/wav", "audio/x-m4a", "audio/ogg", "audio/flac"]
        const allowedExtensions = [".mp3", ".wav", ".m4a", ".ogg", ".flac"]

        const validFiles: File[] = []
        const invalidFiles: string[] = []

        files.forEach((file) => {
            // Check size
            if (file.size > 30 * 1024 * 1024) {
                invalidFiles.push(`${file.name} (over 30MB)`)
                return
            }

            // Check type
            const fileExtension = file.name.toLowerCase().slice(file.name.lastIndexOf("."))
            if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(fileExtension)) {
                invalidFiles.push(`${file.name} (invalid format)`)
                return
            }

            validFiles.push(file)
        })

        if (invalidFiles.length > 0) {
            setError(`Invalid files: ${invalidFiles.join(", ")}`)
        } else {
            setError("")
        }

        setAudioFiles((prev) => [...prev, ...validFiles])
    }

    const removeFile = (index: number) => {
        setAudioFiles((prev) => prev.filter((_, i) => i !== index))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError("")

        if (selectedRegionIds.length === 0) {
            setError("At least one region is required")
            return
        }

        if (audioFiles.length === 0) {
            setError("Please select at least one audio file")
            return
        }

        setLoading(true)
        setProgress(0)

        const results = {
            created: [] as string[],
            duplicates: [] as string[],
            errors: [] as { name: string; error: string }[]
        }

        try {
            const totalFiles = audioFiles.length

            for (let i = 0; i < audioFiles.length; i++) {
                const file = audioFiles[i]
                const fileNameWithoutExt = file.name.slice(0, file.name.lastIndexOf("."))

                // Update progress: uploading
                setCurrentFile(`Uploading ${file.name}...`)
                setProgress((i / totalFiles) * 100)

                // Upload file
                const formData = new FormData()
                formData.append("file", file)

                const uploadResponse = await fetch("/api/uploads/upload", {
                    method: "POST",
                    body: formData
                })

                const uploadData = await uploadResponse.json()

                if (uploadData.error) {
                    results.errors.push({
                        name: fileNameWithoutExt,
                        error: `Upload failed: ${uploadData.error}`
                    })
                    continue
                }

                // Update progress: analyzing
                setCurrentFile(`Analyzing ${file.name}...`)
                setProgress(((i + 0.5) / totalFiles) * 100)

                // Process this single track (this is where analyzeMusic happens and takes time)
                try {
                    const result = await bulkCreateMusic({
                        music: [{
                            name: fileNameWithoutExt,
                            musicId: uploadData.id,
                            regionIds: selectedRegionIds
                        }]
                    })

                    // Aggregate results
                    results.created.push(...result.created)
                    results.duplicates.push(...result.duplicates)
                    results.errors.push(...result.errors)
                } catch (err) {
                    results.errors.push({
                        name: fileNameWithoutExt,
                        error: err instanceof Error ? err.message : "Analysis failed"
                    })
                }

                // Update progress: completed this file
                setProgress(((i + 1) / totalFiles) * 100)
            }

            setProgress(100)
            setCurrentFile("Complete!")

            let message = `Created ${results.created.length} music track(s)`
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

            setAudioFiles([])
            setCurrentFile("")
            setProgress(0)
            onOpenChange(false)
            onSuccess?.()
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to import music")
        } finally {
            setLoading(false)
            setCurrentFile("")
            setProgress(0)
        }
    }

    const handleClose = () => {
        setAudioFiles([])
        setError("")
        setProgress(0)
        setCurrentFile("")
        onOpenChange(false)
    }

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Bulk Import Music</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
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
                        <p className="text-xs text-muted-foreground">
                            These regions will be applied to all imported music
                        </p>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="audioFiles">
                            Audio Files <span className="text-destructive">*</span>
                        </Label>
                        <div className="flex items-center gap-2">
                            <input
                                id="audioFiles"
                                type="file"
                                accept=".mp3,.wav,.m4a,.ogg,.flac,audio/mpeg,audio/mp3,audio/wav,audio/x-m4a,audio/ogg,audio/flac"
                                onChange={handleFileChange}
                                className="hidden"
                                disabled={loading}
                                multiple
                            />
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => document.getElementById("audioFiles")?.click()}
                                disabled={loading}
                            >
                                <Upload className="h-4 w-4 mr-2" />
                                Select Files
                            </Button>
                            <span className="text-sm text-muted-foreground">
                                {audioFiles.length} file(s) selected
                            </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Supported formats: mp3, wav, m4a, ogg, flac (max 30MB each). Names will be auto-filled
                            from filenames.
                        </p>
                    </div>

                    {audioFiles.length > 0 && (
                        <div className="space-y-2">
                            <Label>Selected Files</Label>
                            <div className="max-h-48 overflow-y-auto space-y-1 rounded-md border p-2">
                                {audioFiles.map((file, index) => (
                                    <div
                                        key={index}
                                        className="flex items-center justify-between gap-2 rounded p-2 hover:bg-muted/50"
                                    >
                                        <span className="text-sm truncate flex-1">{file.name}</span>
                                        <span className="text-xs text-muted-foreground">
                                            {(file.size / 1024 / 1024).toFixed(2)} MB
                                        </span>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => removeFile(index)}
                                            disabled={loading}
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {loading && (
                        <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">{currentFile}</span>
                                <span className="text-muted-foreground">{Math.round(progress)}%</span>
                            </div>
                            <Progress value={progress} />
                        </div>
                    )}

                    {error && <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}

                    <div className="flex justify-end gap-2">
                        <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading || audioFiles.length === 0}>
                            {loading ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Importing...
                                </>
                            ) : (
                                "Import Music"
                            )}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    )
}
