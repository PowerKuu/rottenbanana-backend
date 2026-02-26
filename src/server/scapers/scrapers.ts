import axios from "axios"
import { JSDOM } from "jsdom"

function createGenericScraper({
    querySelectors
}: {
    querySelectors: {
        name: string,
        price: string,
        images: string,
        description?: string
        brand?: string
    }
}): Scraper {
    return async (productUrl: string) => {
        const response = await axios.get(productUrl)

        const dom = new JSDOM(response.data)

        const getText = (selector: string) => {
            const element = dom.window.document.querySelector(selector)
            return element ? element.textContent?.trim() : undefined
        }

        const name = getText(querySelectors.name)
        const priceText = getText(querySelectors.price)
        const price = priceText ? parseFloat(priceText.replace(/[^0-9.,]/g, "").replace(",", ".")) : undefined
        const description = querySelectors.description ? getText(querySelectors.description) : undefined
        const brand = querySelectors.brand ? getText(querySelectors.brand) : undefined

        const imageUrls: string[] = []
        const imageElements = dom.window.document.querySelectorAll(querySelectors.images)

        for (const img of imageElements) {
            const src = img.getAttribute("src") || ""
            imageUrls.push(src)
        }

        if (!name || !price || imageUrls.length === 0) {
            throw new Error("Failed to scrape product data for url: " + productUrl)
        }

        return {
            name,
            price,
            imageUrls,
            description,
            brand
        }
    }
}


export const scrapers: { 
    storeIdentifier: string
    scraper: Scraper
}[] = [
    {
        storeIdentifier: "zalando",
        scraper: createGenericScraper({
            querySelectors: {
                name: "h1.z-nvg-c-title",
                price: "span.z-nvg-c-price",
                images: "picture.z-nvg-c-picture img",
                description: "div.z-nvg-c-product-description",
                brand: "a.z-nvg-c-brand"
            }
        })
    }
]