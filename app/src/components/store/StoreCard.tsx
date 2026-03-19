"use client"

import { useRouter } from "next/navigation"
import Image from "next/image"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Store, Pencil, Trash2, Clock } from "lucide-react"
import { getFileUrl } from "@/lib/utils"

export function StoreCard({
    id,
    name,
    displayName,
    displayColorHex,
    imageId,
    productCount,
    regions,
    onEdit,
    onDelete
}: {
    id: string
    name: string
    displayName?: string | null
    displayColorHex?: string | null
    imageId: string
    productCount: number
    regions?: { id: string; name: string }[]
    onEdit?: () => void
    onDelete?: () => void
}) {
    const router = useRouter()

    return (
        <Card
            className="cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02]"
            onClick={() => router.push(`/admin/stores/${id}`)}
        >
            <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div className="flex flex-col gap-2 min-w-0">
                        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                            <CardTitle className="text-lg truncate">{name}</CardTitle>
                            <Badge variant="secondary" className="shrink-0">
                                {productCount} {productCount === 1 ? "product" : "products"}
                            </Badge>
                        </div>
                        {displayName && (
                            <div className="flex items-center gap-1.5">
                                {displayColorHex && (
                                    <div
                                        className="h-3 w-3 rounded-full shrink-0"
                                        style={{ backgroundColor: displayColorHex }}
                                    />
                                )}
                                <span className="text-sm text-muted-foreground truncate">{displayName}</span>
                            </div>
                        )}
                        {regions && regions.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                                {regions.slice(0, 3).map((region) => (
                                    <Badge key={region.id} variant="outline" className="text-xs">
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
                    </div>
                    <div className="flex gap-1 shrink-0">
                        <Button
                            size="icon-sm"
                            variant="ghost"
                            onClick={(e) => {
                                e.stopPropagation()
                                router.push(`/admin/stores/${id}/pending`)
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
                    {imageId ? (
                        <Image
                            src={getFileUrl(imageId)}
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
