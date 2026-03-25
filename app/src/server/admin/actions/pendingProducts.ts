"use server"

import { prisma } from "@/server/database/prisma"
import { PendingProductStatus } from "@/prisma/client"
import { adminGuard } from "@/server/auth/guard"

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
    if (!(await adminGuard())) {
        throw new Error("Unauthorized: Admin access required")
    }

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

export async function getAllPendingProducts({
    status = null,
    storeId = null
}: {
    status?: PendingProductStatus | null
    storeId?: string | null
}) {
    if (!(await adminGuard())) {
        throw new Error("Unauthorized: Admin access required")
    }

    const where = {
        ...(status && { status }),
        ...(storeId && { storeId })
    }

    return prisma.pendingProduct.findMany({ where, orderBy: { createdAt: "desc" } })
}

export async function createPendingProduct({ url, imageUrl }: { url: string; imageUrl: string }) {
    if (!(await adminGuard())) {
        throw new Error("Unauthorized: Admin access required")
    }

    const normalizedUrl = new URL(url).toString()

    const existing = await prisma.pendingProduct.findUnique({
        where: { url: normalizedUrl }
    })

    if (existing) {
        throw new Error("This product URL is already in the pending list")
    }

    const stores = await prisma.store.findMany({
        select: { id: true, websiteIdentifiers: true }
    })

    const store = stores.find((s) => s.websiteIdentifiers.some((identifier) => normalizedUrl.includes(identifier)))

    if (!store) {
        throw new Error(`No store found matching URL: ${normalizedUrl}`)
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

export async function createBulkPendingProducts({ products }: { products: PendingProductInput[] }) {
    if (!(await adminGuard())) {
        throw new Error("Unauthorized: Admin access required")
    }

    const results = {
        created: [] as string[],
        duplicates: [] as string[],
        errors: [] as { url: string; error: string }[]
    }

    const stores = await prisma.store.findMany({
        select: { id: true, websiteIdentifiers: true }
    })

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

            const store = stores.find((s) =>
                s.websiteIdentifiers.some((identifier) => normalizedUrl.includes(identifier))
            )

            if (!store) {
                results.errors.push({
                    url: product.url,
                    error: `No store found matching URL: ${normalizedUrl}`
                })
                continue
            }

            processedProducts.push({
                url: normalizedUrl,
                imageUrl: product.imageUrl,
                storeId: store.id
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

    const existingUrlsSet = new Set(existingProducts.map((p) => p.url))
    const productsToCreate = processedProducts.filter((product) => {
        if (existingUrlsSet.has(product.url)) {
            results.duplicates.push(product.url)
            return false
        }
        return true
    })

    if (productsToCreate.length > 0) {
        await prisma.pendingProduct.createMany({
            data: productsToCreate.map((p) => ({
                url: p.url,
                imageUrl: p.imageUrl,
                storeId: p.storeId,
                status: PendingProductStatus.PENDING
            }))
        })

        results.created.push(...productsToCreate.map((p) => p.url))
    }

    return results
}

export async function updatePendingProductStatus({ id, status }: { id: string; status: PendingProductStatus }) {
    if (!(await adminGuard())) {
        throw new Error("Unauthorized: Admin access required")
    }

    return await prisma.pendingProduct.update({
        where: { id },
        data: { status }
    })
}

export async function deletePendingProduct(id: string) {
    if (!(await adminGuard())) {
        throw new Error("Unauthorized: Admin access required")
    }

    return await prisma.pendingProduct.delete({
        where: { id }
    })
}
