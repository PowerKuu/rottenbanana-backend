"use client"

import { useRouter } from "next/navigation"
import Image from "next/image"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Store } from "lucide-react"

export function StoreCard({
    id,
    name,
    imageUrl,
    productCount
}: {
    id: string
    name: string
    imageUrl: string
    productCount: number
}) {
    const router = useRouter()

    return (
        <Card
            className="cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02]"
            onClick={() => router.push(`/dashboard/products/${id}`)}
        >
            <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                    <CardTitle className="text-lg">{name}</CardTitle>
                    <Badge variant="secondary" className="ml-2 shrink-0">
                        {productCount} {productCount === 1 ? "product" : "products"}
                    </Badge>
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
