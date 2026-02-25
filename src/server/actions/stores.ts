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
