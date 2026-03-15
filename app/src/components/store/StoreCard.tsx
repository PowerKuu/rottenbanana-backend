"use client"

import { useRouter } from "next/navigation"
import Image from "next/image"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Store, Pencil, Trash2, Clock } from "lucide-react"
import { getFile, getFileUrl } from "@/server/uploads/read"
import { useEffect, useState } from "react"

export function StoreCard({
    id,
    name,
    imageId,
    productCount,
    onEdit,
    onDelete
}: {
    id: string
    name: string
    imageId: string
    productCount: number
    onEdit?: () => void
    onDelete?: () => void
}) {
    const router = useRouter()

    const [imageUrl, setImageUrl] = useState<string | null>(null)

    useEffect(() => {
        const loadImage = async () => {
            if (!imageId) return
            try {   
                const file = await getFile(imageId)
                const url = getFileUrl(file)
                setImageUrl(url)
            } catch (error) {
                console.error("Failed to load store image:", error)
            }
        }
        loadImage()
    }, [imageId])

    return (
        <Card
            className="cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02]"
            onClick={() => router.push(`/dashboard/stores/${id}`)}
        >
            <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                        <CardTitle className="text-lg truncate">{name}</CardTitle>
                        <Badge variant="secondary" className="shrink-0">
                            {productCount} {productCount === 1 ? "product" : "products"}
                        </Badge>
                    </div>
                    <div className="flex gap-1 shrink-0">
                        <Button
                            size="icon-sm"
                            variant="ghost"
                            onClick={(e) => {
                                e.stopPropagation()
                                router.push(`/dashboard/stores/${id}/pending`)
                            }}
                            title="View pending products"
                        >
                            <Clock className="h-4 w-4" />
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
            <CardContent>
                <div className="relative aspect-video w-full overflow-hidden rounded-md bg-muted">
                    {imageUrl ? (
                        <Image
                            src={imageUrl}
                            alt={name}
                            fill
                            className="object-cover"
                            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        />
                    ) : (
                        <div className="flex h-full items-center justify-center">
                            <Store className="h-12 w-12 text-muted-foreground/50" />
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}
