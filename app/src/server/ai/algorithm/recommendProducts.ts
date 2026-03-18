import { User } from "@/prisma/client"
import { prisma } from "../../database/prisma"
import { drawSeedTags } from "./drawSeedTags"

export async function recommendProducts(user: User, take: number) {
    const seedTags = await drawSeedTags(3, user)
        
    const recommendedProducts = await prisma.product.findMany({
        where: {
            gender: user.gender || undefined,
            preferenceTags: {
                some: {
                    preferenceTagId: {
                        in: seedTags.map((tag) => tag.id)
                    }
                }
            }
        },
        orderBy: {
            createdAt: "desc"
        },
        take
    })

    const remainingTake = take - recommendedProducts.length

    if (remainingTake <= 0) {
        return recommendedProducts
    }

    const additionalProducts = await prisma.product.findMany({
        where: {
            gender: user.gender || undefined
        },
        orderBy: {
            createdAt: "desc"
        },
        take: remainingTake
    })

    return [...recommendedProducts, ...additionalProducts]
}

export async function getFullProduct(id: string) {
    return prisma.product.findUnique({
        where: { id },
        include: {
            store: true,
            preferenceTags: true
        }
    })
}
