import chalk from "chalk"
import { prisma } from "../database/prisma"
import { scrapeProduct } from "../scraper/scraper"

const INTERVAL = 1000 * 60 * 1 // 1 minutes
const MAX_STORE_CONCURRENCY = 125

const logPrefix = chalk.magenta("[ScrapeProductsCronJob]")

async function tickScrapeProducts() {
    const stores = await prisma.product.groupBy({
        by: ["storeId"],
        _min: {
            scrapedAt: true
        },
        orderBy: {
            _min: {
                scrapedAt: "asc"
            }
        },
        take: MAX_STORE_CONCURRENCY
    })

    const productsToScrape = await Promise.all(
        stores.map(({ storeId }) =>
            prisma.product.findFirst({
                where: { storeId },
                orderBy: { scrapedAt: "asc" }
            })
        )
    )

    const results = await Promise.allSettled(
        productsToScrape
            .filter((product): product is NonNullable<typeof product> => product !== null)
            .map(async (product) => {
                const { scrapedProduct } = await scrapeProduct(product.url).catch((error) => {
                    console.error(`${logPrefix} Failed to scrape product`, product)
                    throw error
                })
                
                const { name, description, priceGross, originalPriceGross, currency } = scrapedProduct

                return await prisma.product.update({
                    where: { id: product.id },
                    data: {
                        name,
                        description,
                        priceGross,
                        originalPriceGross,
                        currency,
                        scrapedAt: new Date()
                    },
                    include: {
                        store: true
                    }
                })
            })
    )

    for (const result of results) {
        if (result.status === "rejected") {
            console.error(`${logPrefix} Failed to scrape product:`, result.reason)
        } else {
            console.log(`${logPrefix} Successfully updated ${result.value.store.name} product: "${result.value.name}"`)
        }
    }
}

export function startScrapeProductsCronJob() {
    const tickJob = () => {
        setTimeout(() => tickScrapeProducts().finally(tickJob), INTERVAL)
    }

    tickJob()
}
