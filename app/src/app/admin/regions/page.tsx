"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { RegionCard } from "@/components/regions/RegionCard"
import { RegionFormDialog } from "@/components/regions/RegionFormDialog"
import { DeleteRegionDialog } from "@/components/regions/DeleteRegionDialog"
import { Plus } from "lucide-react"
import { getAllRegions } from "@/server/admin/actions/regions"
import { Region } from "@prisma/client"

type RegionWithCount = Region & {
    _count: {
        posts: number
        stores: number
        users: number
    }
}

export default function RegionsPage() {
    const [regions, setRegions] = useState<RegionWithCount[]>([])
    const [loading, setLoading] = useState(true)
    const [createDialogOpen, setCreateDialogOpen] = useState(false)
    const [editDialogOpen, setEditDialogOpen] = useState(false)
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
    const [selectedRegion, setSelectedRegion] = useState<RegionWithCount | null>(null)

    useEffect(() => {
        loadRegions()
    }, [])

    const loadRegions = async () => {
        setLoading(true)
        const data = await getAllRegions()
        setRegions(data)
        setLoading(false)
    }

    const handleSuccess = () => {
        loadRegions()
    }

    const handleEdit = (region: RegionWithCount) => {
        setSelectedRegion(region)
        setEditDialogOpen(true)
    }

    const handleDelete = (region: RegionWithCount) => {
        setSelectedRegion(region)
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
                        <h1 className="text-2xl font-bold tracking-tight">Regions</h1>
                        <p className="text-sm text-muted-foreground">
                            Manage geographical regions for posts, stores, and users
                        </p>
                    </div>
                    <Button onClick={() => setCreateDialogOpen(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Create Region
                    </Button>
                </div>

                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                    {regions.map((region) => (
                        <RegionCard
                            key={region.id}
                            id={region.id}
                            name={region.name}
                            flagImageId={region.flagImageId}
                            postCount={region._count.posts}
                            storeCount={region._count.stores}
                            userCount={region._count.users}
                            onEdit={() => handleEdit(region)}
                            onDelete={() => handleDelete(region)}
                        />
                    ))}
                </div>
            </div>

            <RegionFormDialog open={createDialogOpen} onOpenChange={setCreateDialogOpen} onSuccess={handleSuccess} />

            <RegionFormDialog
                open={editDialogOpen}
                onOpenChange={setEditDialogOpen}
                region={selectedRegion}
                onSuccess={handleSuccess}
            />

            <DeleteRegionDialog
                open={deleteDialogOpen}
                onOpenChange={setDeleteDialogOpen}
                region={
                    selectedRegion
                        ? {
                              id: selectedRegion.id,
                              name: selectedRegion.name,
                              postCount: selectedRegion._count.posts,
                              storeCount: selectedRegion._count.stores,
                              userCount: selectedRegion._count.users
                          }
                        : null
                }
                onSuccess={handleSuccess}
            />
        </>
    )
}
