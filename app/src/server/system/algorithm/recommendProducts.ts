import { Product, ProductCategory, User, Prisma, Region, ProductSlot, Gender, PreferenceTag } from "@/prisma/client"
import { prisma } from "../../database/prisma"
import { drawSeedTags } from "./drawSeedTags"
import { randomShuffle } from "@/lib/utils"

export async function recommendProducts(
    take: number,
    options: {
        user?: User
        colorCIELAB?: [number, number, number]
        usePrefrenceTags?: boolean
        seedTags?: PreferenceTag[]
        maxColorDistance?: number
        gender?: Gender
        region?: Region
        slot?: ProductSlot
        category?: ProductCategory
        search?: string
        recursiveProducts?: Product[]
    } = {}
): Promise<Product[]> {
    const seedTags =
        options.recursiveProducts || !options.usePrefrenceTags
            ? []
            : options.seedTags || (await drawSeedTags(options.seedTags || 3, options.user))

    const whereConditions: Prisma.Sql[] = []

    if (options.gender || options.user?.gender) {
        const gender = options.gender || options.user?.gender
        whereConditions.push(Prisma.sql`gender IN (${gender}, ${Gender.UNISEX})`)
    }
    if (options.category) {
        whereConditions.push(Prisma.sql`category = ${options.category}`)
    }
    if (options.region || options.user?.regionId) {
        const region = options.region || options.user?.regionId
        whereConditions.push(Prisma.sql`region = ${region}`)
    }
    if (options.slot) {
        whereConditions.push(Prisma.sql`slot = ${options.slot}`)
    }
    if (options.search) {
        const searchPattern = `%${options.search}%`
        whereConditions.push(Prisma.sql`(name ILIKE ${searchPattern} OR description ILIKE ${searchPattern})`)
    }

    if (seedTags.length > 0) {
        const tagIds = seedTags.map((tag) => tag.id)
        whereConditions.push(Prisma.sql`"Product".id IN (
            SELECT "productId" FROM "ProductPreferenceTag"
            WHERE "preferenceTagId" IN (${Prisma.join(tagIds, ",")})
        )`)
    }

    if (options.recursiveProducts && options.recursiveProducts.length > 0) {
        const excludeIds = options.recursiveProducts.map((p) => p.id)
        whereConditions.push(Prisma.sql`"Product".id NOT IN (${Prisma.join(excludeIds, ",")})`)
    }

    const whereClause =
        whereConditions.length > 0 ? Prisma.sql`WHERE ${Prisma.join(whereConditions, " AND ")}` : Prisma.empty

    let recommendedProducts: Product[]
    const CHROMA_HUE_WEIGHT = 3

    if (options.colorCIELAB) {
        const [L, A, B] = options.colorCIELAB
        const havingClause =
            options.maxColorDistance !== undefined
                ? Prisma.sql`HAVING sqrt(
                power("primaryColorCIELAB"[1] - ${L}, 2) +
                power("primaryColorCIELAB"[2] - ${A}, 2) * ${CHROMA_HUE_WEIGHT} +
                power("primaryColorCIELAB"[3] - ${B}, 2) * ${CHROMA_HUE_WEIGHT}
            ) <= ${options.maxColorDistance}`
                : Prisma.empty

        recommendedProducts = await prisma.$queryRaw`
            SELECT *,
                sqrt(
                power("primaryColorCIELAB"[1] - ${L}, 2) +
                power("primaryColorCIELAB"[2] - ${A}, 2) * ${CHROMA_HUE_WEIGHT} +
                power("primaryColorCIELAB"[3] - ${B}, 2) * ${CHROMA_HUE_WEIGHT}
                ) AS distance
            FROM "Product"
            ${whereClause}
            ${havingClause}
            ORDER BY distance
            LIMIT ${take}
        `
    } else {
        recommendedProducts = await prisma.$queryRaw`
            SELECT *
            FROM "Product"
            ${whereClause}
            ORDER BY RANDOM()
            LIMIT ${take}
        `
    }

    const remainingTake = take - recommendedProducts.length

    if (remainingTake <= 0 || options.recursiveProducts) {
        return recommendedProducts
    }

    const additionalProducts = await recommendProducts(remainingTake, {
        ...options,
        recursiveProducts: recommendedProducts
    })

    return randomShuffle([...recommendedProducts, ...additionalProducts])
}

export async function getFullProduct(id: string) {
    return prisma.product.findUnique({
        where: { id },
        include: {
            store: true,
            preferenceTags: {
                include: {
                    preferenceTag: true
                }
            }
        }
    })
}
