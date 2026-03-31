import { Product, ProductCategory, User, Prisma, Region, ProductSlot, Gender, PreferenceTag } from "@/prisma/client"
import { prisma } from "../../database/prisma"
import { drawSeedTags } from "./drawSeedTags"
import { randomShuffle } from "@/lib/utils"

export type SortOption = "random" | "price_asc" | "price_desc" | "newest"

export async function recommendProducts(
    take: number,
    options: {
        user?: User
        colorCIELAB?: [number, number, number]
        usePreferenceTags?: boolean
        seedTags?: PreferenceTag[]
        maxColorDistance?: number
        genders?: Gender[]
        region?: Region
        slot?: ProductSlot
        categories?: ProductCategory[]
        storeIds?: string[]
        brands?: string[]
        search?: string
        onSale?: boolean
        minPrice?: number
        maxPrice?: number
        sortBy?: SortOption
        excludeIds?: string[]
        seed?: number
        offset?: number
        recursiveProducts?: Product[]
        useRecursive?: boolean
    } = {}
): Promise<Product[]> {
    const seedTags =
        !options.usePreferenceTags
            ? []
            : options.seedTags || (await drawSeedTags(options.seedTags || 3, options.user))

    const whereConditions: Prisma.Sql[] = []

    if (options.genders && options.genders.length > 0) {
        whereConditions.push(Prisma.sql`gender::text IN (${Prisma.join(options.genders)})`)
    } else if (options.user?.gender) {
        const gender =  options.user.gender
        whereConditions.push(Prisma.sql`gender IN (${gender}, ${Gender.UNISEX})`)
    }
    if (options.categories && options.categories.length > 0) {
        if (options.categories.length === 1) {
            whereConditions.push(Prisma.sql`category = ${options.categories[0]}`)
        } else {
            whereConditions.push(Prisma.sql`category::text IN (${Prisma.join(options.categories)})`)
        }
    }
    if (options.region || options.user?.regionId) {
        const region = options.region?.id || options.user?.regionId
        whereConditions.push(Prisma.sql`"Product"."storeId" IN (
            SELECT "B" FROM "_RegionToStore" WHERE "A" = ${region}
        )`)
    }
    if (options.storeIds && options.storeIds.length > 0) {
        whereConditions.push(Prisma.sql`"Product"."storeId" IN (${Prisma.join(options.storeIds)})`)
    }
    if (options.slot) {
        whereConditions.push(Prisma.sql`slot = ${options.slot}`)
    }
    if (options.search) {
        const searchPattern = `%${options.search}%`
        whereConditions.push(Prisma.sql`(name ILIKE ${searchPattern} OR description ILIKE ${searchPattern})`)
    }
    if (options.brands && options.brands.length > 0) {
        whereConditions.push(Prisma.sql`brand::text IN (${Prisma.join(options.brands)})`)
    }
    if (options.onSale) {
        whereConditions.push(Prisma.sql`"originalPriceGross" IS NOT NULL AND "originalPriceGross" > "priceGross"`)
    }
    if (options.minPrice !== undefined) {
        whereConditions.push(Prisma.sql`"priceGross" >= ${options.minPrice}`)
    }
    if (options.maxPrice !== undefined) {
        whereConditions.push(Prisma.sql`"priceGross" <= ${options.maxPrice}`)
    }

    if (seedTags.length > 0) {
        const tagIds = seedTags.map((tag) => tag.id)
        whereConditions.push(Prisma.sql`"Product".id IN (
            SELECT "productId" FROM "ProductPreferenceTag"
            WHERE "preferenceTagId" IN (${Prisma.join(tagIds, ",")})
        )`)
    }

    if (options.excludeIds && options.excludeIds.length > 0) {
        whereConditions.push(Prisma.sql`"Product".id NOT IN (${Prisma.join(options.excludeIds, ",")})`)
    }

    if (options.recursiveProducts && options.recursiveProducts.length > 0) {
        const excludeIds = options.recursiveProducts.map((p) => p.id)
        whereConditions.push(Prisma.sql`"Product".id NOT IN (${Prisma.join(excludeIds, ",")})`)
    }

    const whereClause =
        whereConditions.length > 0 ? Prisma.sql`WHERE ${Prisma.join(whereConditions, " AND ")}` : Prisma.empty

    let recommendedProducts: Product[]
    const CHROMA_HUE_WEIGHT = 3
    const offset = options.offset || 0

    if (options.colorCIELAB) {
        const [L, A, B] = options.colorCIELAB
        const distanceFilter =
            options.maxColorDistance !== undefined
                ? Prisma.sql`WHERE distance <= ${options.maxColorDistance}`
                : Prisma.empty

        const orderClause =
            options.seed !== undefined
                ? Prisma.sql`ORDER BY distance, hashtext(id || ${options.seed.toString()})`
                : Prisma.sql`ORDER BY distance`

        recommendedProducts = await prisma.$queryRaw`
            SELECT * FROM (
                SELECT *,
                    sqrt(
                    power("primaryColorCIELAB"[1] - ${L}, 2) +
                    power("primaryColorCIELAB"[2] - ${A}, 2) * ${CHROMA_HUE_WEIGHT} +
                    power("primaryColorCIELAB"[3] - ${B}, 2) * ${CHROMA_HUE_WEIGHT}
                    ) AS distance
                FROM "Product"
                ${whereClause}
            ) AS subq
            ${distanceFilter}
            ${orderClause}
            LIMIT ${take}
            OFFSET ${offset}
        `
    } else {
        let orderClause: Prisma.Sql
        if (options.sortBy === "price_asc") {
            orderClause = Prisma.sql`ORDER BY "priceGross" ASC`
        } else if (options.sortBy === "price_desc") {
            orderClause = Prisma.sql`ORDER BY "priceGross" DESC`
        } else if (options.sortBy === "newest") {
            orderClause = Prisma.sql`ORDER BY "createdAt" DESC`
        } else if (options.seed !== undefined) {
            orderClause = Prisma.sql`ORDER BY hashtext(id || ${options.seed.toString()})`
        } else {
            orderClause = Prisma.sql`ORDER BY RANDOM()`
        }

        recommendedProducts = await prisma.$queryRaw`
            SELECT *
            FROM "Product"
            ${whereClause}
            ${orderClause}
            LIMIT ${take}
            OFFSET ${offset}
        `
    }

    const remainingTake = take - recommendedProducts.length

    if (remainingTake <= 0 || options.useRecursive === false || options.recursiveProducts !== undefined) {
        return recommendedProducts
    }

    const additionalProducts = await recommendProducts(remainingTake, {
        ...options,
        recursiveProducts: recommendedProducts,
        usePreferenceTags: false
    })

    if (options.sortBy && options.sortBy !== "random") {
        return [...recommendedProducts, ...additionalProducts]
    }
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
