import { scrapeProduct } from "@/server/scaper/scraper"
import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
    const { url } = await request.json()

    if (!url) {
        return NextResponse.json({ error: "URL is required" }, { status: 400 })
    }
    try {
        const product = await scrapeProduct(url)
        return NextResponse.json({ success: true, product })
    } catch (error) {
        return NextResponse.json(
            { success: false, error: (error as Error)?.message || "An unknown error occurred" },
            { status: 500 }
        )
    }
}
