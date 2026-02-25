"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Search } from "lucide-react"
import { ProductSlot } from "@/prisma/client"

export function ProductsHeader({
    storeName,
    availableSlots,
    search,
    slot,
    onSearchChange,
    onSlotChange
}: {
    storeName: string
    availableSlots: ProductSlot[]
    search: string
    slot: ProductSlot | null
    onSearchChange: (value: string) => void
    onSlotChange: (value: ProductSlot | null) => void
}) {
    const router = useRouter()
    const [localSearch, setLocalSearch] = useState(search)
    const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(null)

    const handleSearchChange = (value: string) => {
        const SEARCH_DEBOUNCE = 500

        setLocalSearch(value)

        if (debounceTimer) {
            clearTimeout(debounceTimer)
        }

        const timer = setTimeout(() => {
            onSearchChange(value)
        }, SEARCH_DEBOUNCE)

        setDebounceTimer(timer)
    }

    const handleSlotChange = (value: ProductSlot | "all") => {
        onSlotChange(value === "all" ? null : value)
    }

    useEffect(() => {
        return () => {
            if (debounceTimer) {
                clearTimeout(debounceTimer)
            }
        }
    }, [debounceTimer])

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => router.push("/dashboard/products")}>
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">{storeName}</h2>
                    <p className="text-sm text-muted-foreground">Browse and manage products</p>
                </div>
            </div>

            <div className="flex flex-col gap-4 sm:flex-row">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        placeholder="Search products..."
                        value={localSearch}
                        onChange={(e) => handleSearchChange(e.target.value)}
                        className="pl-9"
                    />
                </div>
                <Select value={slot || "all"} onValueChange={handleSlotChange}>
                    <SelectTrigger className="w-full sm:w-50">
                        <SelectValue placeholder="Filter by category" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        {availableSlots.map((slot) => (
                            <SelectItem key={slot} value={slot}>
                                {slot}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
        </div>
    )
}
