"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { PreferenceTagCard } from "@/components/tags/PreferenceTagCard"
import { PreferenceTagFormDialog } from "@/components/tags/PreferenceTagFormDialog"
import { DeletePreferenceTagDialog } from "@/components/tags/DeletePreferenceTagDialog"
import { Plus } from "lucide-react"
import { getAllPreferenceTags } from "@/server/admin/actions/tags"
import { PreferenceTag } from "@/prisma/client"

type PreferenceTagWithCount = PreferenceTag & {
    _count: {
        userPreferenceTags: number
        postPreferenceTags: number
        productPreferenceTags: number
    }
}

export default function TagsPage() {
    const [tags, setTags] = useState<PreferenceTagWithCount[]>([])
    const [loading, setLoading] = useState(true)
    const [createDialogOpen, setCreateDialogOpen] = useState(false)
    const [editDialogOpen, setEditDialogOpen] = useState(false)
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
    const [selectedTag, setSelectedTag] = useState<PreferenceTagWithCount | null>(null)

    useEffect(() => {
        loadTags()
    }, [])

    const loadTags = async () => {
        setLoading(true)
        const data = await getAllPreferenceTags()
        setTags(data)
        setLoading(false)
    }

    const handleSuccess = () => {
        loadTags()
    }

    const handleEdit = (tag: PreferenceTagWithCount) => {
        setSelectedTag(tag)
        setEditDialogOpen(true)
    }

    const handleDelete = (tag: PreferenceTagWithCount) => {
        setSelectedTag(tag)
        setDeleteDialogOpen(true)
    }

    if (loading) {
        return <div>Loading...</div>
    }

    return (
        <>
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Preference Tags</h1>
                        <p className="text-sm text-muted-foreground">
                            Manage preference tags for users, products, and posts
                        </p>
                    </div>
                    <Button onClick={() => setCreateDialogOpen(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Create Tag
                    </Button>
                </div>

                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                    {tags.map((tag) => (
                        <PreferenceTagCard
                            key={tag.id}
                            id={tag.id}
                            tag={tag.tag}
                            description={tag.description}
                            userCount={tag._count.userPreferenceTags}
                            productCount={tag._count.productPreferenceTags}
                            postCount={tag._count.postPreferenceTags}
                            onEdit={() => handleEdit(tag)}
                            onDelete={() => handleDelete(tag)}
                        />
                    ))}
                </div>
            </div>

            <PreferenceTagFormDialog
                open={createDialogOpen}
                onOpenChange={setCreateDialogOpen}
                onSuccess={handleSuccess}
            />

            <PreferenceTagFormDialog
                open={editDialogOpen}
                onOpenChange={setEditDialogOpen}
                tag={selectedTag}
                onSuccess={handleSuccess}
            />

            <DeletePreferenceTagDialog
                open={deleteDialogOpen}
                onOpenChange={setDeleteDialogOpen}
                tag={
                    selectedTag
                        ? {
                              id: selectedTag.id,
                              tag: selectedTag.tag,
                              userCount: selectedTag._count.userPreferenceTags,
                              productCount: selectedTag._count.productPreferenceTags,
                              postCount: selectedTag._count.postPreferenceTags
                          }
                        : null
                }
                onSuccess={handleSuccess}
            />
        </>
    )
}
