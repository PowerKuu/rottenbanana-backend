"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Pencil, Trash2 } from "lucide-react"
import Image from "next/image"

export function RegionCard({
    name,
    flagImageId,
    postCount,
    storeCount,
    userCount,
    onEdit,
    onDelete
}: {
    name: string
    flagImageId?: string | null
    postCount: number
    storeCount: number
    userCount: number
    onEdit?: () => void
    onDelete?: () => void
}) {
    return (
        <Card className="transition-all gap-0 hover:shadow-lg hover:scale-[1.02]">
            <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                        {flagImageId && (
                            <Image
                                src={`/api/uploads/${flagImageId}`}
                                alt={`${name} flag`}
                                width={24}
                                height={16}
                                className="object-cover rounded-sm shrink-0"
                            />
                        )}
                        <CardTitle className="text-lg truncate">{name}</CardTitle>
                    </div>
                    <div className="flex gap-1 shrink-0">
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
                <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary" className="text-xs">
                        {postCount} {postCount === 1 ? "post" : "posts"}
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                        {storeCount} {storeCount === 1 ? "store" : "stores"}
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                        {userCount} {userCount === 1 ? "user" : "users"}
                    </Badge>
                </div>
            </CardContent>
        </Card>
    )
}
