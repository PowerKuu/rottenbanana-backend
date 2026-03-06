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

export async function createPendingProduct({ url }: { url: string }) {
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
            status: "PENDING"
        }
    })
}

export async function createBulkPendingProducts({ urls }: { urls: string[] }) {
    const results = {
        created: [] as string[],
        duplicates: [] as string[],
        errors: [] as { url: string; error: string }[]
    }

    for (const url of urls) {
        try {
            const normalizedUrl = new URL(url).toString()

            const existing = await prisma.pendingProduct.findUnique({
                where: { url: normalizedUrl }
            })

            if (existing) {
                results.duplicates.push(url)
                continue
            }

            await prisma.pendingProduct.create({
                data: {
                    url: normalizedUrl,
                    status: "PENDING"
                }
            })

            results.created.push(url)
        } catch (error) {
            results.errors.push({
                url,
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

export async function importApprovedProducts({ ids }: { ids: string[] }) {
    const results = {
        success: [] as string[],
        errors: [] as { id: string; url: string; error: string }[]
    }

    const pendingProducts = await prisma.pendingProduct.findMany({
        where: {
            id: { in: ids },
            status: "APPROVED"
        }
    })

    for (const pending of pendingProducts) {
        try {
            // Update status to PROCESSING
            await prisma.pendingProduct.update({
                where: { id: pending.id },
                data: { status: "PROCCESSING" }
            })

            // Scrape and create product
            await scrapeProduct(pending.url)

            // Delete pending product after successful import
            await prisma.pendingProduct.delete({
                where: { id: pending.id }
            })

            results.success.push(pending.id)
        } catch (error) {
            // Revert status back to APPROVED on error
            await prisma.pendingProduct.update({
                where: { id: pending.id },
                data: { status: "APPROVED" }
            })

            results.errors.push({
                id: pending.id,
                url: pending.url,
                error: error instanceof Error ? error.message : "Unknown error"
            })
        }
    }

    return results
}

export async function deletePendingProduct(id: string) {
    return await prisma.pendingProduct.delete({
        where: { id }
    })
}
