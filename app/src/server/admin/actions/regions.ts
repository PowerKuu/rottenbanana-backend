"use server"

import { prisma } from "@/server/database/prisma"
import { removeUndefinedValues } from "@/lib/utils"
import { deleteFiles } from "@/server/uploads/delete"

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

export async function createRegion({
    name,
    countryCode,
    flagImageId
}: {
    name: string
    countryCode?: string
    flagImageId?: string
}) {
    const region = await prisma.region.create({
        data: {
            name: name.trim(),
            countryCode: countryCode?.trim().toUpperCase() || null,
            flagImageId: flagImageId || null
        }
    })

    return region
}

export async function updateRegion({
    id,
    name,
    countryCode,
    flagImageId
}: {
    id: string
    name?: string
    countryCode?: string | null
    flagImageId?: string | null
}) {
    const oldRegion = flagImageId !== undefined ? await prisma.region.findUnique({
        where: { id },
        select: { flagImageId: true }
    }) : null

    const region = await prisma.region.update({
        where: { id },
        data: removeUndefinedValues({
            name: name?.trim(),
            countryCode: countryCode === null ? null : countryCode?.trim().toUpperCase(),
            flagImageId: flagImageId === null ? null : flagImageId
        })
    })

    if (oldRegion && oldRegion.flagImageId && oldRegion.flagImageId !== flagImageId) {
        await deleteFiles([oldRegion.flagImageId])
    }

    return region
}

export async function deleteRegion(regionId: string) {
    const region = await prisma.region.findUnique({
        where: { id: regionId },
        select: { flagImageId: true }
    })

    if (!region) {
        throw new Error("Region not found")
    }

    const deletedRegion = await prisma.region.delete({
        where: { id: regionId }
    })

    if (region.flagImageId) {
        await deleteFiles([region.flagImageId])
    }

    return deletedRegion
}
