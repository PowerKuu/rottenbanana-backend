"use server"

import { prisma } from "@/server/database/prisma"
import { PendingProductStatus } from "@/prisma/client"

const PAGE_SIZE = 24

export async function getPendingProducts({
    page = 1,
    status = null,
    storeId = null
}: {
    page?: number
    status: PendingProductStatus | null
    storeId?: string | null
}) {
    const skip = (page - 1) * PAGE_SIZE

    const where = {
        ...(status && { status }),
        ...(storeId && { storeId })
    }

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
    const hostname = new URL(url).hostname

    const existing = await prisma.pendingProduct.findUnique({
        where: { url: normalizedUrl }
    })

    if (existing) {
        throw new Error("This product URL is already in the pending list")
    }

    const store = await prisma.store.findFirst({
        where: {
            websiteHostnames: {
                has: hostname
            }
        },
        select: { id: true }
    })

    if (!store) {
        throw new Error(`No store found for hostname: ${hostname}`)
    }

    return await prisma.pendingProduct.create({
        data: {
            url: normalizedUrl,
            imageUrl,
            storeId: store.id,
            status: PendingProductStatus.PENDING
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

    const stores = await prisma.store.findMany({
        select: { id: true, websiteHostnames: true }
    })

    const hostnameToStoreId = new Map<string, string>()
    for (const store of stores) {
        for (const hostname of store.websiteHostnames) {
            hostnameToStoreId.set(hostname, store.id)
        }
    }

    const processedProducts: Array<{ url: string; imageUrl: string; storeId: string }> = []
    const urlsToCheck: string[] = []

    for (const product of products) {
        try {
            if (!product.url || !product.imageUrl) {
                results.errors.push({
                    url: product.url || "unknown",
                    error: "Both url and imageUrl are required"
                })
                continue
            }

            const normalizedUrl = new URL(product.url).toString()
            const hostname = new URL(product.url).hostname

            const storeId = hostnameToStoreId.get(hostname)
            if (!storeId) {
                results.errors.push({
                    url: product.url,
                    error: `No store found for hostname: ${hostname}`
                })
                continue
            }

            processedProducts.push({
                url: normalizedUrl,
                imageUrl: product.imageUrl,
                storeId
            })
            urlsToCheck.push(normalizedUrl)
        } catch (error) {
            results.errors.push({
                url: product.url,
                error: error instanceof Error ? error.message : "Invalid URL"
            })
        }
    }

    if (urlsToCheck.length === 0) {
        return results
    }

    const existingProducts = await prisma.pendingProduct.findMany({
        where: { url: { in: urlsToCheck } },
        select: { url: true }
    })

    const existingUrlsSet = new Set(existingProducts.map(p => p.url))
    const productsToCreate = processedProducts.filter(product => {
        if (existingUrlsSet.has(product.url)) {
            results.duplicates.push(product.url)
            return false
        }
        return true
    })

    if (productsToCreate.length > 0) {
        await prisma.pendingProduct.createMany({
            data: productsToCreate.map(p => ({
                url: p.url,
                imageUrl: p.imageUrl,
                storeId: p.storeId,
                status: PendingProductStatus.PENDING
            }))
        })

        results.created.push(...productsToCreate.map(p => p.url))
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
