"use client"

import Image from "next/image"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Package, Trash2 } from "lucide-react"
import { formatPrice } from "@/lib/utils"

export function ProductCard({
    id,
    name,
    priceGross,
    originalPriceGross,
    currency,
    imageUrl,
    slot,
    category,
    gender,
    brand,
    preferenceTags = [],
    onClick,
    onDelete
}: {
    id: string
    name: string
    priceGross: number
    originalPriceGross?: number | null
    currency: string
    imageUrl: string
    slot: string
    category: string
    gender: string
    brand?: string | null
    preferenceTags?: { preferenceTag: { tag: string } }[]
    onClick: () => void
    onDelete?: () => void
}) {
    return (
        <Card className="cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02] group" onClick={onClick}>
            <CardContent className="p-0">
                <div className="relative aspect-square w-full overflow-hidden rounded-t-md bg-muted">
                    {imageUrl ? (
                        <Image
                            src={imageUrl}
                            alt={name}
                            fill
                            className="object-cover"
                            sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
                        />
                    ) : (
                        <div className="flex h-full items-center justify-center">
                            <Package className="h-12 w-12 text-muted-foreground/50" />
                        </div>
                    )}
                    {onDelete && (
                        <div className="absolute top-2 right-2 transition-opacity">
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
                </div>
            </CardContent>
            <CardFooter className="flex flex-col items-start gap-2 p-4">
                <h3 className="line-clamp-2 text-sm font-semibold">{name}</h3>
                {brand && <p className="text-xs text-muted-foreground">{brand}</p>}
                <div className="flex w-full flex-wrap items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                        {slot}
                    </Badge>
                                        <Badge variant="outline" className="text-xs">
                        {category}
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                        {gender}
                    </Badge>
                </div>
                {preferenceTags.length > 0 && (
                    <div className="flex w-full flex-wrap items-center gap-1">
                        {preferenceTags.map((pt) => (
                            <Badge key={pt.preferenceTag.tag} variant="default" className="text-xs">
                                {pt.preferenceTag.tag}
                            </Badge>
                        ))}
                    </div>
                )}
                <div className="flex w-full flex-wrap items-center gap-2">
                    <p className="text-lg font-bold">{formatPrice(priceGross, currency)}</p>
                    {originalPriceGross && originalPriceGross > priceGross && (
                        <>
                            <p className="text-xs line-through text-muted-foreground">
                                {formatPrice(originalPriceGross, currency)}
                            </p>
                            <Badge variant="destructive" className="text-xs">
                                -{Math.round((1 - priceGross / originalPriceGross) * 100)}%
                            </Badge>
                        </>
                    )}
                </div>
            </CardFooter>
        </Card>
    )
}
