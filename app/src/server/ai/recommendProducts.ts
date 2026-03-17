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
        take
    })

    return recommendedProducts
}

export async function getFullProduct(id: string) {
    return prisma.product.findUnique({
        where: { id },
        include: {
            store: true,
            preferenceTags: true
        },
    })
}
