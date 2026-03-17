import { Button } from "@/components/ui/button"
import { Plus, Loader2 } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface PostsHeaderProps {
    onCreateClick: () => void
    isLoading: boolean
    gender: string
    onGenderChange: (value: string) => void
}

export function PostsHeader({ onCreateClick, isLoading, gender, onGenderChange }: PostsHeaderProps) {
    return (
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
    )
}
