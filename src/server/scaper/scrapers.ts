import { Gender } from "@/prisma/enums"
import axios from "axios"
import { JSDOM } from "jsdom"
import { Scraper } from "./types"

function createGenericScraper({
    querySelectors,
    transformers
}: {
    querySelectors: {
        name: string
        priceGross: string

        images: string
        gender: string
        currency: string
        description?: string
        brand?: string
    }
    transformers: {
        gender: (element: Element) => Gender
        currency: (element: Element) => string,
    }
}): Scraper {
    return async (productUrl: string) => {
        const response = await axios.get(productUrl)

        const dom = new JSDOM(response.data)

        const getElement = (selector: string) => {
            return dom.window.document.querySelector(selector)
        }

        const getText = (selector: string) => {
            const element = getElement(selector)
            return element ? element.textContent?.trim() : undefined
        }

        const name = getText(querySelectors.name)
        const priceText = getText(querySelectors.priceGross)
        const priceGross = priceText ? parseFloat(priceText.replace(/[^0-9.,]/g, "").replace(",", ".")) : undefined
        const description = querySelectors.description ? getText(querySelectors.description) : undefined
        const brand = querySelectors.brand ? getText(querySelectors.brand) : undefined
        const genderElement = getElement(querySelectors.gender)
        const gender = transformers.gender(genderElement!)
        const currencyElement = getElement(querySelectors.currency)
        const currency = transformers.currency(currencyElement!)

        const imageUrls: string[] = []
        const imageElements = dom.window.document.querySelectorAll(querySelectors.images)

        for (const img of imageElements) {
            const src = img.getAttribute("src") || ""
            imageUrls.push(src)
        }

        if (!name || !priceGross || imageUrls.length === 0) {
            throw new Error("Failed to scrape product data for url: " + productUrl)
        }

        return {
            name,
            priceGross,
            imageUrls,
            gender,
            description,
            currency,
            brand
        }
    }
}

export const scrapers: {
    storeIdentifier: string
    scrape: Scraper
}[] = [
    {
        storeIdentifier: "zalando",
        scrape: createGenericScraper({
            querySelectors: {
                name: "h1.z-nvg-c-title",
                priceGross: "span.z-nvg-c-price",
                images: "picture.z-nvg-c-picture img",
                gender: "html",
                description: "div.z-nvg-c-product-description",
                brand: "a.z-nvg-c-brand",
                currency: "span.z-nvg-c-price"
            },
            transformers: {
                gender: (element) => Gender.UNISEX,
                currency: (element) => "kr"
            }
        })
    }
]
