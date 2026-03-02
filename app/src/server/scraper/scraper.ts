import { analyzeProduct } from "../ai/analyzeProduct"
import { prisma } from "../database/prisma"
import { scrapers } from "./scrapers"
import { uploadFromExternalUrl } from "../uploads/upload"

export async function scrapeProduct(url: string) {
    const hostname = new URL(url).hostname

    const store = await prisma.store.findFirst({
        where: {
            websiteHostnames: {
                has: hostname
            }
        }
    })

    if (!store) {
        throw new Error("No store found for the given URL")
    }

    const scraper = scrapers.find((scraper) => scraper.storeIdentifier === store.identifier)

    if (!scraper) {
        throw new Error("No scraper found for the given store")
    }

    const scrapedProduct = await scraper.scrape(url)
    const analyzedProduct = await analyzeProduct(scrapedProduct)

    if (analyzedProduct.productOnlyImageIndex === null)
        throw new Error("AI analysis did not return a product only image index")

    const uploadedImages = await Promise.all(
        scrapedProduct.imageUrls.map(async (externalUrl) => {
            try {
                const result = await uploadFromExternalUrl(externalUrl, { removeBackground: true })
                return result.url
            } catch (error) {
                console.error(`Failed to upload image ${externalUrl}:`, error)
                throw new Error(`Failed to upload image: ${error instanceof Error ? error.message : "Unknown error"}`)
            }
        })
    )

    const productOnlyImageUrl = uploadedImages[analyzedProduct.productOnlyImageIndex]

    const product = await prisma.product.create({
        data: {
            name: scrapedProduct.name,
            priceGross: scrapedProduct.priceGross,
            currency: scrapedProduct.currency,

            productOnlyImageUrl: productOnlyImageUrl,
            imageUrls: uploadedImages,
            description: scrapedProduct.description,
            brand: scrapedProduct.brand,
            gender: scrapedProduct.gender,
            metadata: {
                primaryColorHex: analyzedProduct.primaryColorHex,
                description: analyzedProduct.description
            },
            slot: analyzedProduct.slot,
            url: url,
            storeId: store.id
        }
    })

    await prisma.productPreferenceTag.createMany({
        data: await Promise.all(
            analyzedProduct.tags.map(async (tag) => {
                const preferenceTag = await prisma.preferenceTag.findUnique({
                    where: { tag }
                })

                if (!preferenceTag) {
                    throw new Error("Preference tag not found: " + tag)
                }

                return {
                    productId: product.id,
                    preferenceTagId: preferenceTag.id
                }
            })
        )
    })

    return product
}
