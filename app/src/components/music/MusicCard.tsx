"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Music, Pencil, Trash2, Download } from "lucide-react"
import { getFileUrl } from "@/lib/utils"

export function MusicCard({
    id,
    name,
    musicId,
    description,
    tags,
    regions,
    postCount,
    tagCount,
    onEdit,
    onDelete
}: {
    id: string
    name: string
    musicId: string
    description?: string
    tags?: string[]
    regions?: { id: string; name: string }[]
    postCount: number
    tagCount: number
    onEdit?: () => void
    onDelete?: () => void
}) {
    return (
        <Card className="transition-all gap-0 hover:shadow-lg hover:scale-[1.02] h-full flex flex-col">
            <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                        <CardTitle className="text-lg truncate">{name}</CardTitle>
                    </div>
                    <div className="flex gap-1 shrink-0">
                        <Button size="icon-sm" variant="ghost" asChild>
                            <a href={getFileUrl(musicId)} download>
                                <Download className="h-4 w-4" />
                            </a>
                        </Button>
                        <Button
                            size="icon-sm"
                            variant="ghost"
                            onClick={(e) => {
                                e.stopPropagation()
                                onEdit?.()
                            }}
                        >
                            <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                            size="icon-sm"
                            variant="ghost"
                            onClick={(e) => {
                                e.stopPropagation()
                                onDelete?.()
                            }}
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-0 flex-1 flex flex-col">
                <div className="space-y-3">
                    <div className="flex items-center justify-center bg-muted w-full aspect-square max-h-48">
                        <Music className="h-24 w-24 text-muted-foreground" />
                    </div>

                    <div className="px-4 pb-4 space-y-3">
                        <audio controls className="w-full" preload="metadata">
                            <source src={getFileUrl(musicId)} type="audio/mpeg" />
                            Your browser does not support the audio element.
                        </audio>

                        {description && <p className="text-sm text-muted-foreground line-clamp-2">{description}</p>}

                        {regions && regions.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                                {regions.slice(0, 3).map((region) => (
                                    <Badge key={region.id} className="text-xs">
                                        {region.name}
                                    </Badge>
                                ))}
                                {regions.length > 3 && (
                                    <Badge variant="outline" className="text-xs">
                                        +{regions.length - 3} more
                                    </Badge>
                                )}
                            </div>
                        )}

                        {tags && tags.length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                                {tags.map((tag) => (
                                    <Badge key={tag} variant="outline" className="text-xs">
                                        {tag}
                                    </Badge>
                                ))}
                            </div>
                        )}

                        <div className="flex flex-wrap gap-2 pt-1">
                            <Badge variant="secondary" className="text-xs">
                                {postCount} {postCount === 1 ? "post" : "posts"}
                            </Badge>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
