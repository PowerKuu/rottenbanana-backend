"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Trash2, Heart, Package, Image as ImageIcon } from "lucide-react"
import Image from "next/image"
import { format } from "date-fns"
import { getFile, getFileUrl } from "@/server/uploads/read"

interface PostCardProps {
    id: string
    caption: string | null
    firstImageId: string | null
    likeCount: number
    productCount: number
    createdAt: Date
    onClick: () => void
    onDelete?: () => void
}

export function PostCard({ caption, firstImageId, likeCount, productCount, createdAt, onClick, onDelete }: PostCardProps) {
    const [imageUrl, setImageUrl] = useState<string | null>(null)

    useEffect(() => {
        const loadImage = async () => {
            if (!firstImageId) return
            try {
                const file = await getFile(firstImageId)
                const url = getFileUrl(file)
                setImageUrl(url)
            } catch (error) {
                console.error("Failed to load post image:", error)
            }
        }
        loadImage()
    }, [firstImageId])
    return (
        <Card
            className="group cursor-pointer overflow-hidden transition-all hover:scale-[1.02] hover:shadow-lg"
            onClick={onClick}
        >
            <CardContent className="relative aspect-square p-0">
                {imageUrl ? (
                    <Image src={imageUrl} alt={caption || "Post image"} fill className="object-cover object-top" />
                ) : (
                    <div className="flex h-full items-center justify-center bg-muted">
                        <ImageIcon className="h-12 w-12 text-muted-foreground" />
                    </div>
                )}
                {onDelete && (
                    <div className="absolute right-2 top-2 transition-opacity">
                        <Button
                            size="icon-sm"
                            variant="secondary"
                            onClick={(e) => {
                                e.stopPropagation()
                                onDelete()
                            }}
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                )}
            </CardContent>
            <CardFooter className="flex flex-col items-start gap-2 p-3">
                {caption && <p className="line-clamp-2 text-sm font-semibold">{caption}</p>}
                <div className="flex flex-wrap gap-1">
                    <Badge variant="outline" className="text-xs">
                        {format(new Date(createdAt), "MMM d, yyyy")}
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                        <Heart className="mr-1 h-3 w-3" />
                        {likeCount}
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                        <Package className="mr-1 h-3 w-3" />
                        {productCount}
                    </Badge>
                </div>
            </CardFooter>
        </Card>
    )
}
