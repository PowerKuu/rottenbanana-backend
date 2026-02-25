"use client"

import Image from "next/image"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Package } from "lucide-react"
import { formatPrice } from "@/lib/utils"
export function ProductCard({
    id,
    name,
    price,
    primaryImageUrl,
    slot,
    onClick
}: {
    id: string
    name: string
    price: number
    primaryImageUrl: string
    slot: string
    onClick: () => void
}) {
    return (
        <Card className="cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02]" onClick={onClick}>
            <CardContent className="p-0">
                <div className="relative aspect-square w-full overflow-hidden rounded-t-md bg-muted">
                    {primaryImageUrl ? (
                        <Image
                            src={primaryImageUrl}
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
                </div>
            </CardContent>
            <CardFooter className="flex flex-col items-start gap-2 p-4">
                <div className="flex w-full items-start justify-between gap-2">
                    <h3 className="line-clamp-2 flex-1 text-sm font-semibold">{name}</h3>
                    <Badge variant="outline" className="shrink-0 text-xs">
                        {slot}
                    </Badge>
                </div>
                <p className="text-lg font-bold">{formatPrice(price)}</p>
            </CardFooter>
        </Card>
    )
}
