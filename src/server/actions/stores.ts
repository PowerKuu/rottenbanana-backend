"use server"

import { prisma } from "@/server/database/prisma"

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
    websiteUrl,
    imageUrl
}: {
    name: string
    websiteUrl: string
    imageUrl: string
}) {
    const store = await prisma.store.create({
        data: {
            name,
            websiteUrl,
            imageUrl
        }
    })

    return store
}

export async function updateStore({
    id,
    name,
    websiteUrl,
    imageUrl
}: {
    id: string
    name?: string
    websiteUrl?: string
    imageUrl?: string
}) {
    const store = await prisma.store.update({
        where: { id },
        data: {
            name,
            websiteUrl,
            imageUrl
        }
    })

    return store
}

export async function deleteStore(storeId: string) {
    const store = await prisma.store.delete({
        where: { id: storeId }
    })

    return store
}
