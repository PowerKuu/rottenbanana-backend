import { recommendProducts } from "@/server/system/algorithm/recommendProducts"
import { getSession } from "@/server/auth/session"
import { prisma } from "@/server/database/prisma"
import { getFile, readFileBuffer } from "@/server/uploads/read"
import { NextRequest, NextResponse } from "next/server"
import { ProductCategory } from "@/prisma/client"
import { hexToCIELAB } from "@/lib/utils"

export async function GET(request: NextRequest) {
    const RECOMMEND_AMOUNT = 100
    const session = await getSession(request)

    if (!session?.user) {
        return new NextResponse("Unauthorized", { status: 401 })
    }

    try {
        const user = await prisma.user.findUnique({
            where: { id: session.user.id }
        })

        if (!user) {
            return new NextResponse("User not found", { status: 404 })
        }

        const { searchParams } = new URL(request.url)
        const search = searchParams.get("search") || undefined
        const category = searchParams.get("category") as ProductCategory || undefined
        const colorHex = searchParams.get("color")
        const colorCIELAB = colorHex ? hexToCIELAB(colorHex) : undefined

        if (colorHex && !colorCIELAB) {
            return new NextResponse("Invalid color format", { status: 400 })
        }

        if (category && !Object.values(ProductCategory).includes(category)) {
            return new NextResponse("Invalid category", { status: 400 })
        }

        const recommendedProducts = await recommendProducts(RECOMMEND_AMOUNT, {
            user,
            search,
            category,
            colorCIELAB,
            usePrefrenceTags: true
        })

        return NextResponse.json({ productsIds: recommendedProducts.map((product) => product.id) })
    } catch (error) {
        return new NextResponse(error instanceof Error ? error.message : "Error recommending products", { status: 404 })
    }
}
