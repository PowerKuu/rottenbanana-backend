import { prisma } from "@/server/database/prisma"
import { scrapeAndAnalyzeProduct, scrapeProduct } from "@/server/scraper/scraper"
import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
    const { url } = await request.json()

    if (!url) {
        return NextResponse.json({ error: "URL is required" }, { status: 400 })
    }

    let normalizedUrl: string
    try {
        normalizedUrl = new URL(url).toString()
    } catch (error) {
        return NextResponse.json({ error: "Invalid URL format" }, { status: 400 })
    }

    try {
        const existingProduct = await prisma.product.findUnique({
            where: { url: normalizedUrl }
        })

        if (existingProduct) {
            return NextResponse.json({ success: true, product: existingProduct })
        }

        const product = await scrapeAndAnalyzeProduct(normalizedUrl)
        
        if (!product) {
            return NextResponse.json({ error: "Product is not eligible" }, { status: 400 })
        }

        return NextResponse.json({ success: true, product })
    } catch (error) {
        console.error(error)
        return NextResponse.json({ error: (error as Error)?.message || "An unknown error occurred" }, { status: 500 })
    }
}
