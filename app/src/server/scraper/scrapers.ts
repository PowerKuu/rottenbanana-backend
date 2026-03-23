import { Gender } from "@/prisma/enums"
import puppeteer from "puppeteer"
import { JSDOM } from "jsdom"
import { Scraper, ScraperIdentifier, Transformer } from "./types"

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
        originalPriceGross?: string

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
        originalPriceGross?: Transformer
    }
}): Scraper {
    return async (productUrl: string) => {
        const TIMEOUT = 30000

        const browser = await puppeteer.launch({
            headless: true,
            args: ["--no-sandbox", "--disable-setuid-sandbox"]
        })

        try {
            const page = await browser.newPage()

            await page.goto(productUrl, {
                waitUntil: "networkidle2",
                timeout: TIMEOUT
            })

            const html = await page.content()
            const dom = new JSDOM(html)

            const getElement = (selector: string) => {
                return dom.window.document.querySelector(selector)
            }

            const getText = (selector: string) => {
                const element = getElement(selector)
                return element ? element.textContent?.trim() : undefined
            }

            const extractPrice = (text: string) => {
                const cleaned = text.replace(/[^0-9.,]/g, "").replace(",", ".")
                const parsed = parseFloat(cleaned)
                return isNaN(parsed) ? undefined : parsed
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
                ? extractPrice(transformers.priceGross(priceElement!, priceText!))
                : priceText
                  ? extractPrice(priceText)
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
                transformers.brand && brandElement && brandText
                    ? transformers.brand(brandElement, brandText)
                    : brandText

            const originalPriceElement = querySelectors.originalPriceGross
                ? getElement(querySelectors.originalPriceGross)
                : undefined
            const originalPriceText = querySelectors.originalPriceGross
                ? getText(querySelectors.originalPriceGross)
                : undefined
            const originalPriceGross =
                transformers.originalPriceGross && originalPriceElement && originalPriceText
                    ? extractPrice(transformers.originalPriceGross(originalPriceElement, originalPriceText))
                    : originalPriceText
                      ? extractPrice(originalPriceText)
                      : undefined

            const metadata: { [key: string]: string } = {}
            if (querySelectors.metadata) {
                for (const [key, selector] of Object.entries(querySelectors.metadata)) {
                    const text = getText(selector)
                    if (text) {
                        metadata[key] = text
                    }
                }
            }

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
                brand,
                originalPriceGross,
                metadata
            }
        } finally {
            await browser.close()
        }
    }
}

export const scrapers: {
    scraperIdentifier: ScraperIdentifier
    scrape: Scraper
}[] = [
    {
        scraperIdentifier: "zalando",
        scrape: createGenericScraper({
            querySelectors: {
                name: `[data-testid="product_title-product-name"]`,
                priceGross: `[data-testid="pdp-price-container"] span:nth-last-of-type(2)`,
                originalPriceGross: `[data-testid="pdp-price-container"] p:nth-of-type(2) span:nth-of-type(2)`,
                images: `img[data-testid^="product"]`,
                gender: `[data-testid="genderLink"] [aria-current="true"]`,
                brand: `[data-testid="product_title-brand-name"]`,
                currency: `[data-testid="pdp-price-container"] span:nth-last-of-type(2)`
            },
            transformers: {
                gender: (_, text) =>
                    ["Dame"].includes(text) ? Gender.FEMALE : ["Herre"].includes(text) ? Gender.MALE : Gender.UNISEX,
                images: (_, url) => {
                    const highResUrl = new URL(url)
                    highResUrl.search = ""
                    highResUrl.searchParams.set("imwidth", "1800")
                    return highResUrl.toString()
                },
                currency: (_, text) => text.toLowerCase()
            }
        })
    },
    {
        scraperIdentifier: "dressmann",
        scrape: createGenericScraper({
            querySelectors: {
                name: "h1.MuiTypography-h3",
                priceGross: ".MuiTypography-price2[aria-hidden='true']:first-of-type",
                originalPriceGross: ".MuiTypography-price2[aria-hidden='true']:nth-of-type(2)",
                images: ".swiper-slide img",
                gender: "body",
                currency: "body",
                description: ".MuiTabPanel-root[role='tabpanel'] .css-t8tx7j-StyledRichText p",
                brand: ".site-header__logo img"
            },
            transformers: {
                gender: () => Gender.MALE,
                currency: () => "kr",
                brand: () => "Dressmann",
                images: (_, url) => {
                    // Get high-res version by modifying the imgix URL parameters
                    const highResUrl = new URL(url)
                    highResUrl.searchParams.set("w", "1800")
                    highResUrl.searchParams.set("q", "80")
                    return highResUrl.toString()
                }
            }
        })
    }
]
