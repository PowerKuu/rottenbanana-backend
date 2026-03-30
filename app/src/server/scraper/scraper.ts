import { analyzeProduct } from "../system/analyzeProduct"
import { prisma } from "../database/prisma"
import { scrapers } from "./scrapers"
import { uploadFromExternalUrl } from "../uploads/upload"
import { hexToCIELAB } from "@/lib/utils"

export async function scrapeProduct(url: string) {
    const normalizedUrl = new URL(url).toString()

    const stores = await prisma.store.findMany()

    const store = stores.find((store) => {
        return store.websiteIdentifiers.some((identifier) => {
            return normalizedUrl.includes(identifier)
        })
    })

    if (!store) {
        throw new Error("No store found for the given URL")
    }

    const scraper = scrapers.find((scraper) => scraper.scraperIdentifier === store.scraperIdentifier)

    if (!scraper) {
        throw new Error("No scraper found for the given store")
    }

    const scrapedProduct = await scraper.scrape(url)

    return {
        store,
        scrapedProduct
    }
}

export async function scrapeAndAnalyzeProduct(url: string) {
    const { store, scrapedProduct } = await scrapeProduct(url)

    const analyzedProduct = await analyzeProduct(scrapedProduct)

    if (analyzedProduct.productOnlyImageIndex === null || analyzedProduct.isInappropriate) {
        return null
    }

    const MAX_IMAGES = 3

    const productOnlyImage = scrapedProduct.imageUrls[analyzedProduct.productOnlyImageIndex]
    const personFrontImage =
        analyzedProduct.personFrontImageIndex !== null
            ? scrapedProduct.imageUrls[analyzedProduct.personFrontImageIndex]
            : null
    const personBackImage =
        analyzedProduct.personBackImageIndex !== null
            ? scrapedProduct.imageUrls[analyzedProduct.personBackImageIndex]
            : null

    const specialImages = [productOnlyImage, personFrontImage, personBackImage].filter(Boolean) as string[]
    const additionalImages = scrapedProduct.imageUrls
        .filter((url) => !specialImages.includes(url))
        .sort((a, b) => {
            const aIndex = scrapedProduct.imageUrls.indexOf(a)
            const bIndex = scrapedProduct.imageUrls.indexOf(b)
            const aKeepBg = analyzedProduct.keepBackgroundImageIndexes.includes(aIndex)
            const bKeepBg = analyzedProduct.keepBackgroundImageIndexes.includes(bIndex)

            if (aKeepBg && !bKeepBg) return 1
            if (!aKeepBg && bKeepBg) return -1
            return 0
        })

    const additionalImagesSliced = additionalImages.slice(0, Math.max(0, MAX_IMAGES - specialImages.length))

    const imagesToUpload: string[] = [...specialImages, ...additionalImagesSliced]

    const uploadedImagesIds = await Promise.all(
        imagesToUpload.map(async (externalUrl) => {
            try {
                const keepBackground = analyzedProduct.keepBackgroundImageIndexes.includes(
                    scrapedProduct.imageUrls.indexOf(externalUrl)
                )

                const result = await uploadFromExternalUrl(externalUrl, {
                    removeBackground: !keepBackground,
                    compress: false
                })

                return result.id
            } catch (error) {
                console.error(`Failed to upload image ${externalUrl}:`, error)
                throw new Error(`Failed to upload image: ${error instanceof Error ? error.message : "Unknown error"}`)
            }
        })
    )

    const [productOnlyImageId] = uploadedImagesIds

    const product = await prisma.product.create({
        data: {
            name: scrapedProduct.name,
            priceGross: scrapedProduct.priceGross,
            originalPriceGross: scrapedProduct.originalPriceGross,
            currency: scrapedProduct.currency,
            category: analyzedProduct.category,
            primaryColorHex: analyzedProduct.primaryColorHex,
            primaryColorCIELAB: hexToCIELAB(analyzedProduct.primaryColorHex),
            productOnlyImageId: productOnlyImageId,
            imageIds: uploadedImagesIds,
            description: scrapedProduct.description,
            brand: scrapedProduct.brand,
            gender: scrapedProduct.gender,
            metadata: {
                description: analyzedProduct.description,
                ...scrapedProduct.metadata
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
