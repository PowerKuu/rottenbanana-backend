"use server"

import { prisma } from "@/server/database/prisma"
import { slugify, removeUndefinedValues } from "@/lib/utils"

export async function getAllStores() {
    const stores = await prisma.store.findMany({
        include: {
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
        where: { id: storeId }
    })

    return store
}

export async function createStore({
    name,
    identifier,
    websiteUrl,
    websiteOrigins,
    imageUrl
}: {
    name: string
    identifier?: string
    websiteUrl: string
    websiteOrigins?: string[]
    imageUrl: string
}) {
    const store = await prisma.store.create({
        data: {
            name,
            identifier: identifier || slugify(name),
            websiteUrl,
            websiteOrigins: websiteOrigins || [],
            imageUrl
        }
    })

    return store
}

export async function updateStore({
    id,
    name,
    identifier,
    websiteUrl,
    websiteOrigins,
    imageUrl
}: {
    id: string
    name?: string
    identifier?: string
    websiteUrl?: string
    websiteOrigins?: string[]
    imageUrl?: string
}) {
    const store = await prisma.store.update({
        where: { id },
        data: removeUndefinedValues({
            name,
            identifier,
            websiteUrl,
            websiteOrigins,
            imageUrl
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

export async function getStoreByIdentifier(identifier: string) {
    const store = await prisma.store.findUnique({
        where: { identifier }
    })

    return store
}
