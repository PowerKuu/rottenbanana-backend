import { recommendProducts, type SortOption } from "@/server/system/algorithm/recommendProducts"
import { getSession } from "@/server/auth/session"
import { prisma } from "@/server/database/prisma"
import { NextRequest, NextResponse } from "next/server"
import { Gender, ProductCategory } from "@/prisma/client"
import { hexToCIELAB } from "@/lib/utils"

const VALID_SORT_OPTIONS: SortOption[] = ["random", "price_asc", "price_desc", "newest"]

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

        const gendersParam = searchParams.get("genders")
        const genders = gendersParam ? gendersParam.split(",") as Gender[] : undefined
        if (genders) {
            const invalid = genders.find(g => !Object.values(Gender).includes(g))
            if (invalid) {
                return new NextResponse(`Invalid gender: ${invalid}`, { status: 400 })
            }
        }

        const brandsParam = searchParams.get("brands")
        const brands = brandsParam ? brandsParam.split(",") : undefined

        const onSale = searchParams.get("onSale") === "true"

        const minPriceParam = searchParams.get("minPrice")
        const minPrice = minPriceParam ? Number(minPriceParam) : undefined
        const maxPriceParam = searchParams.get("maxPrice")
        const maxPrice = maxPriceParam ? Number(maxPriceParam) : undefined

        const sortByParam = searchParams.get("sortBy") as SortOption | null
        if (sortByParam && !VALID_SORT_OPTIONS.includes(sortByParam)) {
            return new NextResponse(`Invalid sortBy: ${sortByParam}`, { status: 400 })
        }
        const sortBy = sortByParam || undefined

        const usePreferenceTags = searchParams.get("usePreferenceTags") !== "false"
        const excludeIdsParam = searchParams.get("excludeIds")
        const excludeIds = excludeIdsParam ? excludeIdsParam.split(",") : undefined
        const seed = searchParams.get("seed") ? Number(searchParams.get("seed")) : undefined
        const offset = searchParams.get("offset") ? Number(searchParams.get("offset")) : undefined
        const useRecursive = searchParams.get("useRecursive") !== "false"

        const recommendedProducts = await recommendProducts(RECOMMEND_AMOUNT, {
            user,
            search,
            categories,
            storeIds,
            genders,
            brands,
            onSale: onSale || undefined,
            minPrice,
            maxPrice,
            sortBy,
            maxColorDistance,
            colorCIELAB,
            usePreferenceTags,
            excludeIds,
            seed,
            offset,
            useRecursive
        })

        return NextResponse.json({ productsIds: recommendedProducts.map((product) => product.id) })
    } catch (error) {
        return new NextResponse(error instanceof Error ? error.message : "Error recommending products", { status: 404 })
    }
}
