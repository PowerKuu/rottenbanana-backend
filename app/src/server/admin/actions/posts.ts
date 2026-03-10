"use server"

import { prisma } from "@/server/database/prisma"
import { generatePost } from "@/server/ai/generatePost"

const PAGE_SIZE = 24

export async function getPosts({ page = 1 }: { page?: number }) {
    const skip = (page - 1) * PAGE_SIZE

    const [posts, totalCount] = await Promise.all([
        prisma.post.findMany({
            skip,
            take: PAGE_SIZE,
            orderBy: { createdAt: "desc" },
            include: {
                _count: {
                    select: {
                        likes: true,
                        products: true
                    }
                }
            }
        }),
        prisma.post.count()
    ])

    const totalPages = Math.ceil(totalCount / PAGE_SIZE)

    return {
        posts,
        pagination: {
            currentPage: page,
            totalPages,
            hasNextPage: page < totalPages,
            hasPreviousPage: page > 1
        }
    }
}

export async function getPostById(postId: string) {
    const post = await prisma.post.findUnique({
        where: { id: postId },
        include: {
            likes: {
                select: { userId: true }
            },
            products: {
                include: {
                    product: {
                        select: {
                            id: true,
                            name: true,
                            priceGross: true,
                            currency: true,
                            productOnlyImageUrl: true,
                            url: true,
                            store: {
                                select: { name: true }
                            }
                        }
                    }
                }
            },
            preferenceTags: {
                include: {
                    preferenceTag: true
                }
            }
        }
    })

    return post
}

export async function deletePost(postId: string) {
    const post = await prisma.post.delete({
        where: { id: postId }
    })

    return post
}

export async function createPost() {
    const post = await generatePost()
    return post
}
