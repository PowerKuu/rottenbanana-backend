import { Gender } from "@/prisma/client"
import { SCRAPER_IDENTIFIERS } from "./constants"

export type ScrapedProduct = {
    name: string
    priceGross: number
    currency: string
    imageUrls: string[]
    gender: Gender
    description?: string
    brand?: string
    originalPriceGross?: number

    metadata?: {
        [key: string]: string
    }
}

export type Scraper = (productUrl: string) => Promise<ScrapedProduct>

export type Transformer<T = string> = (data: {
    element: Element
    text: string
    elements: Element[]
    texts: string[]
    url: string
}) => T

export type ScraperIdentifier = (typeof SCRAPER_IDENTIFIERS)[number]
