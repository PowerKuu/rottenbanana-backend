"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, Loader2, Search } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface PostsHeaderProps {
    onCreateClick: () => void
    isLoading: boolean
    gender: string
    onGenderChange: (value: string) => void
    search: string
    onSearchChange: (value: string) => void
    genderFilter: string
    onGenderFilterChange: (value: string) => void
}

export function PostsHeader({
    onCreateClick,
    isLoading,
    gender,
    onGenderChange,
    search,
    onSearchChange,
    genderFilter,
    onGenderFilterChange
}: PostsHeaderProps) {
    const [localSearch, setLocalSearch] = useState(search || "")
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

    useEffect(() => {
        return () => {
            if (debounceTimer) {
                clearTimeout(debounceTimer)
            }
        }
    }, [debounceTimer])

    return (
        <div className="space-y-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Posts</h2>
                    <p className="text-sm text-muted-foreground">Create, view and manage posts</p>
                </div>
                <div className="flex gap-2">
                    <Select value={gender} onValueChange={onGenderChange}>
                        <SelectTrigger className="w-35">
                            <SelectValue placeholder="Gender" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="random">Random</SelectItem>
                            <SelectItem value="MALE">Male</SelectItem>
                            <SelectItem value="FEMALE">Female</SelectItem>
                        </SelectContent>
                    </Select>
                    <Button onClick={onCreateClick} disabled={isLoading}>
                        {isLoading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Generating...
                            </>
                        ) : (
                            <>
                                <Plus className="mr-2 h-4 w-4" />
                                Create Post
                            </>
                        )}
                    </Button>
                </div>
            </div>

            <div className="flex gap-2">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        placeholder="Search posts by caption or ID..."
                        value={localSearch}
                        onChange={(e) => handleSearchChange(e.target.value)}
                        className="pl-9"
                    />
                </div>
                <Select value={genderFilter} onValueChange={onGenderFilterChange}>
                    <SelectTrigger className="w-35">
                        <SelectValue placeholder="Filter by gender" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="MALE">Male</SelectItem>
                        <SelectItem value="FEMALE">Female</SelectItem>
                    </SelectContent>
                </Select>
            </div>
        </div>
    )
}
