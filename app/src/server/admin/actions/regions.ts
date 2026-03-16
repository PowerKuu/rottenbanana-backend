"use server"

import { prisma } from "@/server/database/prisma"
import { removeUndefinedValues } from "@/lib/utils"

export async function getAllRegions() {
    const regions = await prisma.region.findMany({
        include: {
            _count: {
                select: {
                    posts: true,
                    stores: true,
                    users: true
                }
            }
        },
        orderBy: {
            name: "asc"
        }
    })

    return regions
}

export async function getRegionById(regionId: string) {
    const region = await prisma.region.findUnique({
        where: { id: regionId }
    })

    return region
}

export async function createRegion({ name }: { name: string }) {
    const region = await prisma.region.create({
        data: {
            name: name.trim()
        }
    })

    return region
}

export async function updateRegion({
    id,
    name
}: {
    id: string
    name?: string
}) {
    const region = await prisma.region.update({
        where: { id },
        data: removeUndefinedValues({
            name: name?.trim()
        })
    })

    return region
}

export async function deleteRegion(regionId: string) {
    const deletedRegion = await prisma.region.delete({
        where: { id: regionId }
    })

    return deletedRegion
}
