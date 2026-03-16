"use server"

import { prisma } from "@/server/database/prisma"
import { slugify, removeUndefinedValues } from "@/lib/utils"

export async function getAllStores() {
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
    identifier,
    websiteUrl,
    websiteHostnames,
    imageId,
    regionIds
}: {
    name: string
    identifier?: string
    websiteUrl: string
    websiteHostnames?: string[]
    imageId: string
    regionIds?: string[]
}) {
    if (!regionIds || regionIds.length === 0) {
        throw new Error("At least one region is required")
    }

    const store = await prisma.store.create({
        data: {
            name,
            identifier: identifier || slugify(name),
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
    identifier,
    websiteUrl,
    websiteHostnames,
    imageId,
    regionIds
}: {
    id: string
    name?: string
    identifier?: string
    websiteUrl?: string
    websiteHostnames?: string[]
    imageId?: string
    regionIds?: string[]
}) {
    if (regionIds !== undefined && regionIds.length === 0) {
        throw new Error("At least one region is required")
    }

    const store = await prisma.store.update({
        where: { id },
        data: removeUndefinedValues({
            name,
            identifier,
            websiteUrl,
            websiteHostnames,
            imageId,
            regions: regionIds !== undefined ? { set: regionIds.map((id) => ({ id })) } : undefined
        })
    })

    return store
}

export async function deleteStore(storeId: string) {
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

    return deletedStore
}
