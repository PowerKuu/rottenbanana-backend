import { User } from "@/prisma/client"
import { prisma } from "../database/prisma"

export async function recommendProducts(user: User, take: number) {
    const recommendedProducts = await prisma.product.findMany({
        where: {
            gender: user.gender || undefined
        },
        orderBy: {
            createdAt: "desc"
        },
        include: {
            store: true,
            preferenceTags: true
        },
        take
    })

    return recommendedProducts
}
