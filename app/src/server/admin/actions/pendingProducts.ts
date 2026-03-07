"use server"

import { prisma } from "@/server/database/prisma"
import { PendingProductStatus } from "@/prisma/client"
import { scrapeProduct } from "@/server/scraper/scraper"

const PAGE_SIZE = 24


export async function getPendingProducts({
    page = 1,
    status = null
}: {
    page?: number
    status: PendingProductStatus | null
}) {
    const skip = (page - 1) * PAGE_SIZE

    const where = status ? { status } : {}

    const [pendingProducts, totalCount] = await Promise.all([
        prisma.pendingProduct.findMany({
            where,
            skip,
            take: PAGE_SIZE,
            orderBy: {
                createdAt: "desc"
            }
        }),
        prisma.pendingProduct.count({ where })
    ])

    const totalPages = Math.ceil(totalCount / PAGE_SIZE)

    return {
        pendingProducts,
        pagination: {
            currentPage: page,
            totalPages,
            hasNextPage: page < totalPages,
            hasPreviousPage: page > 1
        }
    }
}

export async function createPendingProduct({
    url,
    imageUrl
}: {
    url: string
    imageUrl: string
}) {
    const normalizedUrl = new URL(url).toString()

    const existing = await prisma.pendingProduct.findUnique({
        where: { url: normalizedUrl }
    })

    if (existing) {
        throw new Error("This product URL is already in the pending list")
    }

    return await prisma.pendingProduct.create({
        data: {
            url: normalizedUrl,
            imageUrl,
            status: "PENDING"
        }
    })
}

interface PendingProductInput {
    url: string
    imageUrl: string
}

export async function createBulkPendingProducts({
    products
}: {
    products: PendingProductInput[]
}) {
    const results = {
        created: [] as string[],
        duplicates: [] as string[],
        errors: [] as { url: string; error: string }[]
    }

    for (const product of products) {
        try {
            // Validate both fields are provided
            if (!product.url || !product.imageUrl) {
                results.errors.push({
                    url: product.url || "unknown",
                    error: "Both url and imageUrl are required"
                })
                continue
            }

            const normalizedUrl = new URL(product.url).toString()

            const existing = await prisma.pendingProduct.findUnique({
                where: { url: normalizedUrl }
            })

            if (existing) {
                results.duplicates.push(product.url)
                continue
            }

            await prisma.pendingProduct.create({
                data: {
                    url: normalizedUrl,
                    imageUrl: product.imageUrl,
                    status: "PENDING"
                }
            })

            results.created.push(product.url)
        } catch (error) {
            results.errors.push({
                url: product.url,
                error: error instanceof Error ? error.message : "Invalid URL"
            })
        }
    }

    return results
}

export async function updatePendingProductStatus({
    id,
    status
}: {
    id: string
    status: PendingProductStatus
}) {
    return await prisma.pendingProduct.update({
        where: { id },
        data: { status }
    })
}

export async function deletePendingProduct(id: string) {
    return await prisma.pendingProduct.delete({
        where: { id }
    })
}
