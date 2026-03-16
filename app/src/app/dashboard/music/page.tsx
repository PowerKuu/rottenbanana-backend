"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { MusicCard } from "@/components/music/MusicCard"
import { MusicFormDialog } from "@/components/music/MusicFormDialog"
import { DeleteMusicDialog } from "@/components/music/DeleteMusicDialog"
import { Plus } from "lucide-react"
import { getAllMusic } from "@/server/admin/actions/music"
import { Music } from "@/prisma/client"

type MusicWithCount = Music & {
    _count: {
        posts: number
        preferenceTags: number
    }
}

export default function MusicPage() {
    const [music, setMusic] = useState<MusicWithCount[]>([])
    const [loading, setLoading] = useState(true)
    const [createDialogOpen, setCreateDialogOpen] = useState(false)
    const [editDialogOpen, setEditDialogOpen] = useState(false)
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
    const [selectedMusic, setSelectedMusic] = useState<MusicWithCount | null>(null)

    useEffect(() => {
        loadMusic()
    }, [])

    const loadMusic = async () => {
        setLoading(true)
        const data = await getAllMusic()
        setMusic(data)
        setLoading(false)
    }

    const handleSuccess = () => {
        loadMusic()
    }

    const handleEdit = (music: MusicWithCount) => {
        setSelectedMusic(music)
        setEditDialogOpen(true)
    }

    const handleDelete = (music: MusicWithCount) => {
        setSelectedMusic(music)
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
                        <h1 className="text-2xl font-bold tracking-tight">Music</h1>
                        <p className="text-sm text-muted-foreground">
                            Manage music tracks for posts and preferences
                        </p>
                    </div>
                    <Button onClick={() => setCreateDialogOpen(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Create Music
                    </Button>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {music.map((item) => (
                        <MusicCard
                            key={item.id}
                            id={item.id}
                            name={item.name}
                            postCount={item._count.posts}
                            tagCount={item._count.preferenceTags}
                            onEdit={() => handleEdit(item)}
                            onDelete={() => handleDelete(item)}
                        />
                    ))}
                </div>
            </div>

            <MusicFormDialog
                open={createDialogOpen}
                onOpenChange={setCreateDialogOpen}
                onSuccess={handleSuccess}
            />

            <MusicFormDialog
                open={editDialogOpen}
                onOpenChange={setEditDialogOpen}
                music={selectedMusic}
                onSuccess={handleSuccess}
            />

            <DeleteMusicDialog
                open={deleteDialogOpen}
                onOpenChange={setDeleteDialogOpen}
                music={
                    selectedMusic
                        ? {
                              id: selectedMusic.id,
                              name: selectedMusic.name,
                              postCount: selectedMusic._count.posts,
                              tagCount: selectedMusic._count.preferenceTags
                          }
                        : null
                }
                onSuccess={handleSuccess}
            />
        </>
    )
}
