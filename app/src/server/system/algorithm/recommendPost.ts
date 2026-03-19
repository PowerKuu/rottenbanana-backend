import { User } from "@/prisma/client"
import { prisma } from "../../database/prisma"
import { drawSeedTags } from "./drawSeedTags"

export async function recommendPost(user: User, take: number) {
    const seedTags = await drawSeedTags(3, user)

    const recommendedPosts = await prisma.post.findMany({
        where: {
            views: {
                none: {
                    userId: user.id
                }
            },
            preferenceTags: {
                some: {
                    preferenceTagId: {
                        in: seedTags.map((tag) => tag.id)
                    }
                }
            },
            gender: user.gender || undefined
        },
        orderBy: {
            createdAt: "desc"
        },
        take
    })

    const remainingTake = take - recommendedPosts.length

    if (remainingTake <= 0) {
        return recommendedPosts
    }

    const additionalPosts = await prisma.post.findMany({
        where: {
            id: {
                notIn: recommendedPosts.map((post) => post.id)
            },
            gender: user.gender || undefined
        },
        orderBy: {
            createdAt: "desc"
        },
        take: remainingTake
    })

    return [...recommendedPosts, ...additionalPosts]
}

export async function getFullPost(id: string, user?: User) {
    return prisma.post.findUnique({
        where: { id },
        include: {
            _count: {
                select: {
                    views: true,
                    likes: true
                }
            },
            likes: {
                where: {
                    userId: user?.id
                },
                select: {
                    userId: true
                },
                take: 1
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
            preferenceTags: {
                include: {
                    preferenceTag: true
                }
            },
            music: true
        }
    })
}
