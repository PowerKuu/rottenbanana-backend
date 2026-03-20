"use server"

import { prisma } from "@/server/database/prisma"
import { slugify, removeUndefinedValues } from "@/lib/utils"
import { deleteFiles } from "@/server/uploads/delete"
import { adminGuard } from "@/server/auth/guard"

export async function getAllStores() {
    if (!await adminGuard()) {
        throw new Error("Unauthorized: Admin access required")
    }

    const stores = await prisma.store.findMany({
        include: {
            regions: true,
            _count: {
                select: {
                    products: true
                }
            }
        },
        orderBy: {
            name: "asc"
        }
    })

    return stores
}

export async function getStoreById(storeId: string) {
    if (!await adminGuard()) {
        throw new Error("Unauthorized: Admin access required")
    }

    const store = await prisma.store.findUnique({
        where: { id: storeId },
        include: {
            regions: true
        }
    })

    return store
}

export async function createStore({
    name,
    displayName,
    displayColorHex,
    scraperIdentifier,
    websiteUrl,
    websiteHostnames,
    imageId,
    regionIds
}: {
    name: string
    displayName?: string | null
    displayColorHex?: string | null
    scraperIdentifier?: string
    websiteUrl: string
    websiteHostnames?: string[]
    imageId: string
    regionIds?: string[]
}) {
    if (!await adminGuard()) {
        throw new Error("Unauthorized: Admin access required")
    }

    if (!regionIds || regionIds.length === 0) {
        throw new Error("At least one region is required")
    }

    const store = await prisma.store.create({
        data: {
            name,
            displayName,
            displayColorHex,
            scraperIdentifier: scraperIdentifier || slugify(name),
            websiteUrl,
            websiteHostnames: websiteHostnames || [],
            imageId,
            regions: {
                connect: regionIds.map((id) => ({ id }))
            }
        }
    })

    return store
}

export async function updateStore({
    id,
    name,
    displayName,
    displayColorHex,
    scraperIdentifier,
    websiteUrl,
    websiteHostnames,
    imageId,
    regionIds
}: {
    id: string
    name?: string
    displayName?: string | null
    displayColorHex?: string | null
    scraperIdentifier?: string
    websiteUrl?: string
    websiteHostnames?: string[]
    imageId?: string
    regionIds?: string[]
}) {
    if (!await adminGuard()) {
        throw new Error("Unauthorized: Admin access required")
    }

    if (regionIds !== undefined && regionIds.length === 0) {
        throw new Error("At least one region is required")
    }

    const oldStore =
        imageId !== undefined
            ? await prisma.store.findUnique({
                  where: { id },
                  select: { imageId: true }
              })
            : null

    const store = await prisma.store.update({
        where: { id },
        data: removeUndefinedValues({
            name,
            displayName,
            displayColorHex,
            scraperIdentifier,
            websiteUrl,
            websiteHostnames,
            imageId,
            regions: regionIds !== undefined ? { set: regionIds.map((id) => ({ id })) } : undefined
        })
    })

    if (oldStore && imageId && oldStore.imageId !== imageId) {
        await deleteFiles([oldStore.imageId])
    }

    return store
}

export async function deleteStore(storeId: string) {
    if (!await adminGuard()) {
        throw new Error("Unauthorized: Admin access required")
    }

    const store = await prisma.store.findUnique({
        where: { id: storeId },
        include: {
            _count: {
                select: {
                    products: true
                }
            }
        }
    })

    if (!store) {
        throw new Error("Store not found")
    }

    if (store._count.products > 0) {
        throw new Error("Cannot delete store with existing products. Please remove all products first.")
    }

    const deletedStore = await prisma.store.delete({
        where: { id: storeId }
    })

    await deleteFiles([store.imageId])

    return deletedStore
}
