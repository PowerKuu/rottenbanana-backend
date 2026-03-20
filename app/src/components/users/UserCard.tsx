"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { User, Pencil, Trash2, Mail, Calendar, MapPin } from "lucide-react"
import { format } from "date-fns"

export function UserCard({
    id,
    name,
    email,
    role,
    gender,
    regionName,
    emailVerified,
    onboardingCompleted,
    createdAt,
    onEdit,
    onDelete
}: {
    id: string
    name: string
    email: string
    role: "USER" | "ADMIN"
    gender?: "MALE" | "FEMALE" | "UNISEX" | null
    regionName?: string | null
    emailVerified: boolean
    onboardingCompleted: boolean
    createdAt: Date
    onEdit?: () => void
    onDelete?: () => void
}) {
    return (
        <Card className="transition-all gap-0 hover:shadow-lg hover:scale-[1.02]">
            <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
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
                <div className="space-y-3">
                    {/* User icon placeholder */}
                    <div className="flex items-start gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-md bg-muted shrink-0">
                            <User className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0 space-y-1">
                            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                                <Mail className="h-3.5 w-3.5 shrink-0" />
                                <span className="truncate">{email}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                <Calendar className="h-3 w-3 shrink-0" />
                                <span>{format(new Date(createdAt), "MMM d, yyyy")}</span>
                            </div>
                            {regionName && (
                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                    <MapPin className="h-3 w-3 shrink-0" />
                                    <span>{regionName}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Badges */}
                    <div className="flex flex-wrap gap-2">
                        <Badge variant={role === "ADMIN" ? "default" : "secondary"} className="text-xs">
                            {role}
                        </Badge>
                        {gender && (
                            <Badge variant="outline" className="text-xs">
                                {gender}
                            </Badge>
                        )}
                        {emailVerified && (
                            <Badge variant="secondary" className="text-xs">
                                Verified
                            </Badge>
                        )}
                        {onboardingCompleted && (
                            <Badge variant="secondary" className="text-xs">
                                Onboarded
                            </Badge>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
