import { Gender } from "@/prisma/enums"
import { JSDOM } from "jsdom"
import { chromium, Browser, BrowserContext } from "playwright"
import { Scraper, ScraperIdentifier, Transformer } from "./types"
import { randomDraw, randomInt } from "@/lib/utils"
import { generateFakeHeaders } from "./utils"
import axios from "axios"

async function getHtmlBrowser(productUrl: string, waitForSelectors: string[]): Promise<string> {
    const TIMEOUT = 30000
    const resolutions = [
        { width: 1920, height: 1080 },
        { width: 1920, height: 1200 },
        { width: 2560, height: 1440 },
        { width: 1680, height: 1050 },
        { width: 1600, height: 900 },
        { width: 1440, height: 900 },
        { width: 1366, height: 768 },
        { width: 1536, height: 864 }
    ]
    const screenRes = randomDraw(resolutions)

    const viewportWidth = screenRes.width
    const viewportHeight = screenRes.height - randomInt(70, 120)

    const chromeVersion = randomInt(120, 132)
    const chromePatch = randomInt(0, 9999)

    const platforms = [
        { platform: "Win32", os: "Windows NT 10.0" },
        { platform: "Win32", os: "Windows NT 11.0" },
        { platform: "MacIntel", os: "Macintosh; Intel Mac OS X 10_15_7" }
    ]
    const platformData = randomDraw(platforms)

    const userAgent =
        platformData.platform === "Win32"
            ? `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVersion}.0.${chromePatch}.0 Safari/537.36`
            : `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVersion}.0.${chromePatch}.0 Safari/537.36`

    const locales = ["nb-NO", "en-US", "en-GB"]
    const locale = randomDraw(locales)
    const acceptLanguage =
        locale === "nb-NO"
            ? "nb-NO,nb;q=0.9,no;q=0.8,en-US;q=0.7,en;q=0.6"
            : locale === "en-US"
              ? "en-US,en;q=0.9"
              : "en-GB,en;q=0.9,en-US;q=0.8"

    const browser = await chromium.launch({
        headless: true,
        args: [
            // Disable automation flags
            "--disable-blink-features=AutomationControlled",
            "--disable-features=IsolateOrigins,site-per-process",

            // Sandbox & security
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-dev-shm-usage",

            // Disable automation indicators
            "--disable-infobars",
            "--disable-browser-side-navigation",
            "--disable-gpu",
            "--disable-features=VizDisplayCompositor",

            // Additional stealth
            "--disable-web-security",
            "--disable-features=IsolateOrigins",
            "--disable-site-isolation-trials",
            "--disable-features=BlockInsecurePrivateNetworkRequests",

            // Window size (randomized)
            `--window-size=${screenRes.width},${screenRes.height}`,
            "--start-maximized"
        ]
    })

    try {
        const context = await browser.newContext({
            userAgent,
            locale,
            viewport: { width: viewportWidth, height: viewportHeight },
            screen: { width: screenRes.width, height: screenRes.height },
            deviceScaleFactor: 1,
            isMobile: false,
            hasTouch: false,
            javaScriptEnabled: true,

            // Extra HTTP headers
            extraHTTPHeaders: {
                "Accept-Language": acceptLanguage,
                Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
                "Accept-Encoding": "gzip, deflate, br",
                "Cache-Control": "max-age=0",
                "Sec-Ch-Ua": `"Not_A Brand";v="8", "Chromium";v="${chromeVersion}", "Google Chrome";v="${chromeVersion}"`,
                "Sec-Ch-Ua-Mobile": "?0",
                "Sec-Ch-Ua-Platform": `"${platformData.platform === "Win32" ? "Windows" : "macOS"}"`,
                "Sec-Fetch-Dest": "document",
                "Sec-Fetch-Mode": "navigate",
                "Sec-Fetch-Site": "none",
                "Sec-Fetch-User": "?1",
                "Upgrade-Insecure-Requests": "1"
            },

            // Permissions
            permissions: ["geolocation", "notifications"]
        })

        const page = await context.newPage()
        await page.goto(productUrl, { waitUntil: "load" })

        await page.addScriptTag({
            content: `
                (async () => {
                    let lastHeight = 0;
                    while (lastHeight !== document.body.scrollHeight) {
                        lastHeight = document.body.scrollHeight;
                        window.scrollTo(0, document.body.scrollHeight);
                        await new Promise(resolve => setTimeout(resolve, 500));
                    }
                })();
            `
        })

        await Promise.all(waitForSelectors.map((selector) => page.waitForSelector(selector, { timeout: TIMEOUT })))
        const html = await page.content()

        return html
    } finally {
        await browser.close()
    }
}

async function getHtml(productUrl: string): Promise<string> {
    const response = await axios.get(productUrl, {
        headers: generateFakeHeaders()
    })

    return response.data
}

function createGenericScraper({
    useBrowser = false,
    querySelectors,
    transformers
}: {
    useBrowser?: boolean
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
        const html = useBrowser
            ? await getHtmlBrowser(productUrl, [querySelectors.name, querySelectors.priceGross, querySelectors.images])
            : await getHtml(productUrl)

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
            transformers.brand && brandElement && brandText ? transformers.brand(brandElement, brandText) : brandText

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
            console.error({ name, priceGross, imageUrls }, "Missing required product data", {
                nameElement: nameElement?.outerHTML,
                priceElement: priceElement?.outerHTML,
                imageElements: imageElements.length
            })
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
            useBrowser: true,
            querySelectors: {
                name: "h1.MuiTypography-h3",
                priceGross: ".MuiTypography-price2",
                originalPriceGross: ".MuiTypography-price2:nth-of-type(3)",
                images: ".swiper-slide img, .css-97yw9n-StyledSingleImageWrapper img",
                gender: "body",
                currency: "body",
                brand: "body"
            },
            transformers: {
                gender: () => Gender.MALE,
                currency: () => "kr",
                brand: () => "Dressmann",
                images: (_, url) => {
                    const highResUrl = new URL(url)
                    highResUrl.searchParams.set("w", "1800")
                    highResUrl.searchParams.set("q", "80")
                    return highResUrl.toString()
                }
            }
        })
    }
]
