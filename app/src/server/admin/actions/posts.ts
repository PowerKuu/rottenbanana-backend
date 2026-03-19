"use server"

import { prisma } from "@/server/database/prisma"
import { generatePost } from "@/server/system/generatePost"
import { Gender } from "@/prisma/enums"
import { deleteFiles } from "@/server/uploads/delete"

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
                        views: true,
                        products: true
                    }
                },
                region: {
                    select: {
                        name: true
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
            views: {
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
                            productOnlyImageId: true,
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
            },
            music: true
        }
    })

    return post
}

export async function deletePost(postId: string) {
    const post = await prisma.post.findUnique({
        where: { id: postId },
        select: { mediaIds: true }
    })

    if (!post) {
        throw new Error("Post not found")
    }

    const deletedPost = await prisma.post.delete({
        where: { id: postId }
    })

    await deleteFiles(post.mediaIds)

    return deletedPost
}

export async function createPost(overrideGender?: Gender) {
    const post = await generatePost(overrideGender)
    return post
}
