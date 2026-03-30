import { recommendProducts } from "@/server/system/algorithm/recommendProducts"
import { getSession } from "@/server/auth/session"
import { prisma } from "@/server/database/prisma"
import { NextRequest, NextResponse } from "next/server"
import { ProductCategory } from "@/prisma/client"
import { hexToCIELAB } from "@/lib/utils"

export async function GET(request: NextRequest) {
    const RECOMMEND_AMOUNT = 50
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
        const colorHex = searchParams.get("color")
        const maxColorDistance = searchParams.get("maxColorDistance")
            ? Number(searchParams.get("maxColorDistance"))
            : undefined
        const colorCIELAB = colorHex ? hexToCIELAB(colorHex) : undefined

        if (colorHex && !colorCIELAB) {
            return new NextResponse("Invalid color format", { status: 400 })
        }


        const categoriesParam = searchParams.get("categories")
        const categoryParam = searchParams.get("category") as ProductCategory | null
        const categories = categoriesParam
            ? categoriesParam.split(",") as ProductCategory[]
            : categoryParam
                ? [categoryParam]
                : undefined

        if (categories) {
            const invalid = categories.find(c => !Object.values(ProductCategory).includes(c))
            if (invalid) {
                return new NextResponse(`Invalid category: ${invalid}`, { status: 400 })
            }
        }

        const storeIdsParam = searchParams.get("storeIds")
        const storeIds = storeIdsParam ? storeIdsParam.split(",") : undefined

        const usePreferenceTags = searchParams.get("usePreferenceTags") !== "false"
        const excludeIdsParam = searchParams.get("excludeIds")
        const excludeIds = excludeIdsParam ? excludeIdsParam.split(",") : undefined
        const seed = searchParams.get("seed") ? Number(searchParams.get("seed")) : undefined
        const offset = searchParams.get("offset") ? Number(searchParams.get("offset")) : undefined

        const recommendedProducts = await recommendProducts(RECOMMEND_AMOUNT, {
            user,
            search,
            categories,
            storeIds,
            maxColorDistance,
            colorCIELAB,
            usePreferenceTags,
            excludeIds,
            seed,
            offset
        })

        return NextResponse.json({ productsIds: recommendedProducts.map((product) => product.id) })
    } catch (error) {
        return new NextResponse(error instanceof Error ? error.message : "Error recommending products", { status: 404 })
    }
}
