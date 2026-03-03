import { Gender } from "@/prisma/enums"
import axios from "axios"
import { JSDOM } from "jsdom"
import { Scraper, Transformer } from "./types"
import { FAKE_HEADERS } from "./utils"

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

        metadata?: {
            [key: string]: string
        }
    }
    transformers: {
        gender: Transformer<Gender>
        name?: Transformer
        priceGross?: Transformer
        images?: Transformer
        currency?: Transformer
        description?: Transformer
        brand?: Transformer
    }
}): Scraper {
    return async (productUrl: string) => {
        const response = await axios.get(productUrl, {
            headers: FAKE_HEADERS
        })

        const dom = new JSDOM(response.data)

        const getElement = (selector: string) => {
            return dom.window.document.querySelector(selector)
        }

        const getText = (selector: string) => {
            const element = getElement(selector)
            return element ? element.textContent?.trim() : undefined
        }

        const extractPrice = (text: string) => {
            return text.replace(/[^0-9.,]/g, "").replace(",", ".")
        }

        const extractCurrency = (text: string) => {
            return text
                .replace(/[^a-zA-Z]/g, "")
                .toLowerCase()
                .trim()
        }

        const nameElement = getElement(querySelectors.name)
        const nameText = getText(querySelectors.name)
        const name = transformers.name ? transformers.name(nameElement!, nameText!) : nameText

        const priceElement = getElement(querySelectors.priceGross)
        const priceText = getText(querySelectors.priceGross)
        const priceGross = transformers.priceGross
            ? parseFloat(extractPrice(transformers.priceGross(priceElement!, priceText!)))
            : priceText
              ? parseFloat(extractPrice(priceText))
              : undefined

        const descriptionElement = querySelectors.description ? getElement(querySelectors.description) : undefined
        const descriptionText = querySelectors.description ? getText(querySelectors.description) : undefined
        const description =
            transformers.description && descriptionElement && descriptionText
                ? transformers.description(descriptionElement, descriptionText)
                : descriptionText

        const brandElement = querySelectors.brand ? getElement(querySelectors.brand) : undefined
        const brandText = querySelectors.brand ? getText(querySelectors.brand) : undefined
        const brand =
            transformers.brand && brandElement && brandText ? transformers.brand(brandElement, brandText) : brandText

        const genderElement = getElement(querySelectors.gender)
        const genderText = getText(querySelectors.gender)
        const gender = transformers.gender(genderElement!, genderText!)

        const currencyElement = getElement(querySelectors.currency)
        const currencyText = getText(querySelectors.currency)
        const currency = transformers.currency
            ? extractCurrency(transformers.currency(currencyElement!, currencyText!))
            : currencyText
              ? extractCurrency(currencyText)
              : ""

        const images: {
            url: string
            element: Element
        }[] = []
        const imageElements = dom.window.document.querySelectorAll(querySelectors.images)

        for (const img of imageElements) {
            const src = img.getAttribute("src") || ""

            const exsistingImage = images.find((image) => {
                const exstingUrl = new URL(image.url).origin + new URL(image.url).pathname
                const newUrl = new URL(src).origin + new URL(src).pathname
                return exstingUrl.toLowerCase() === newUrl.toLowerCase()
            })

            if (exsistingImage) continue

            images.push({ url: src, element: img })
        }

        const imageUrls = images.map((image) =>
            transformers.images ? transformers.images(image.element, image.url) : image.url
        )

        if (!name || !priceGross || imageUrls.length === 0) {
            console.error({ name, priceGross, imageUrls })
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
                name: `[data-testid="product_title-product-name"]`,
                priceGross: `[data-testid="pdp-price-container"] span`,
                images: `img[data-testid^="product"]`,
                gender: `[data-testid="genderLink"] [aria-current="true"]`,
                brand: `[data-testid="product_title-brand-name"]`,
                currency: `[data-testid="pdp-price-container"] span`,
            },
            transformers: {
                gender: (_, text) => (text === "Dame" ? Gender.FEMALE : text === "Herre" ? Gender.MALE : Gender.UNISEX),
                images: (_, url) => {
                    const highResUrl = new URL(url)
                    highResUrl.search = ""
                    highResUrl.searchParams.set("imwidth", "1800")
                    return highResUrl.toString()
                }
            }
        })
    }
]
