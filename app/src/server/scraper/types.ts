import { Gender } from "@/prisma/client"

export type ScrapedProduct = {
    name: string
    priceGross: number
    currency: string
    imageUrls: string[]
    gender: Gender
    description?: string
    brand?: string
}

export type Scraper = (productUrl: string) => Promise<ScrapedProduct>

export type Transformer<T = string> = (element: Element, text: string) => T