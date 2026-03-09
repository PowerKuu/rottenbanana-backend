import { Button } from "@/components/ui/button"
import { Plus, Loader2 } from "lucide-react"

interface PostsHeaderProps {
    onCreateClick: () => void
    isLoading: boolean
}

export function PostsHeader({ onCreateClick, isLoading }: PostsHeaderProps) {
    return (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
                <h2 className="text-2xl font-bold tracking-tight">Posts</h2>
                <p className="text-sm text-muted-foreground">Create, view and manage posts</p>
            </div>
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
    )
}
