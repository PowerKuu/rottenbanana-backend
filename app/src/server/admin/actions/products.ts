"use server"

import { prisma } from "@/server/database/prisma"
import { Gender, ProductSlot } from "@/prisma/client"

const PAGE_SIZE = 24

export async function getProductById(productId: string) {
    const product = await prisma.product.findUnique({
        where: { id: productId },
        include: {
            store: true
        }
    })

    return product
}

export async function getProductsByStore({
    storeId,
    page = 1,
    search = "",
    slot = null
}: {
    storeId: string
    page?: number
    search?: string
    slot?: ProductSlot | null
}) {
    const skip = (page - 1) * PAGE_SIZE

    const where = {
        storeId,
        ...(search && {
            name: {
                contains: search,
                mode: "insensitive" as const
            }
        }),
        ...(slot && { slot })
    }

    const [products, totalCount] = await Promise.all([
        prisma.product.findMany({
            where,
            skip,
            take: PAGE_SIZE,
            orderBy: {
                name: "asc"
            }
        }),
        prisma.product.count({ where })
    ])

    const totalPages = Math.ceil(totalCount / PAGE_SIZE)

    return {
        products,
        pagination: {
            currentPage: page,
            totalPages,
            hasNextPage: page < totalPages,
            hasPreviousPage: page > 1
        }
    }
}

export async function getProductSlots(storeId: string) {
    const products = await prisma.product.findMany({
        where: { storeId },
        select: { slot: true },
        distinct: ["slot"]
    })

    return products.map((p) => p.slot)
}


export async function updateProduct({
    id,
    name,
    priceGross,
    productOnlyImageUrl,
    imageUrls,
    description,
    metadata,
    gender,
    url,
    slot
}: {
    id: string
    name?: string
    priceGross?: number
    productOnlyImageUrl?: string
    imageUrls?: string[]
    gender?: Gender
    description?: string
    metadata?: Record<string, any>
    url?: string
    slot?: ProductSlot
}) {
    const product = await prisma.product.update({
        where: { id },
        data: {
            name,
            priceGross,
            productOnlyImageUrl,
            imageUrls,
            description,
            gender,
            metadata,
            url,
            slot
        },
        include: {
            store: true
        }
    })

    return product
}

export async function deleteProduct(productId: string) {
    const product = await prisma.product.delete({
        where: { id: productId }
    })

    return product
}
