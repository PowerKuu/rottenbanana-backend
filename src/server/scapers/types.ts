type ScrapedProduct = {
    name: string
    price: number
    imageUrls: string[]
    description?: string
    brand?: string
}

type Scraper = (productUrl: string) => Promise<ScrapedProduct>