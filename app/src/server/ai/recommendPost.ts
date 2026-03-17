import { User } from "@/prisma/client"
import { prisma } from "../database/prisma"

export async function recommendPost(user: User, take: number) {
    const recommendedPosts = await prisma.post.findMany({
        where: {
            views: {
                none: {
                    userId: user.id
                }
            },
            gender: user.gender || undefined
        },
        orderBy: {
            createdAt: "desc"
        },
        take
    })

    return recommendedPosts
}

export async function getFullPost(id: string) {
    return prisma.post.findUnique({
        where: { id },
        include: {
            _count: {
                select: {
                    views: true,
                    likes: true
                }
            },
            products: {
                include: {
                    product: {
                        include: {
                            store: true
                        }
                    }
                }
            },
            preferenceTags: true,
            music: true
        },
    })
}