"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tag, Pencil, Trash2 } from "lucide-react"

export function PreferenceTagCard({
    id,
    tag,
    description,
    userCount,
    productCount,
    postCount,
    onEdit,
    onDelete
}: {
    id: string
    tag: string
    description: string
    userCount: number
    productCount: number
    postCount: number
    onEdit?: () => void
    onDelete?: () => void
}) {
    return (
        <Card className="transition-all gap-0 hover:shadow-lg hover:scale-[1.02]">
            <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                        <CardTitle className="text-lg truncate">{tag}</CardTitle>
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
                <div className="space-y-3">
                    <div className="flex items-start gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-md bg-muted shrink-0">
                            <Tag className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2 flex-1">{description}</p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <Badge variant="secondary" className="text-xs">
                            {userCount} {userCount === 1 ? "user" : "users"}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                            {productCount} {productCount === 1 ? "product" : "products"}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                            {postCount} {postCount === 1 ? "post" : "posts"}
                        </Badge>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
