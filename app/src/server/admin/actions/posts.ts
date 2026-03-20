"use server"

import { prisma } from "@/server/database/prisma"
import { generatePost } from "@/server/system/generatePost"
import { Gender } from "@/prisma/enums"
import { deleteFiles } from "@/server/uploads/delete"
import { adminGuard } from "@/server/auth/guard"

const PAGE_SIZE = 24

export async function getPosts({
    page = 1,
    search = "",
    gender
}: {
    page?: number
    search?: string
    gender?: "MALE" | "FEMALE"
}) {
    if (!(await adminGuard())) {
        throw new Error("Unauthorized: Admin access required")
    }

    const skip = (page - 1) * PAGE_SIZE

    const searchCondition = search
        ? {
              OR: [
                  {
                      caption: {
                          contains: search,
                          mode: "insensitive" as const
                      }
                  },
                  {
                      id: {
                          contains: search,
                          mode: "insensitive" as const
                      }
                  }
              ]
          }
        : {}

    const genderCondition = gender ? { gender } : {}

    const where = {
        ...searchCondition,
        ...genderCondition
    }

    const [posts, totalCount] = await Promise.all([
        prisma.post.findMany({
            where,
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
        prisma.post.count({ where })
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
    if (!(await adminGuard())) {
        throw new Error("Unauthorized: Admin access required")
    }

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
    if (!(await adminGuard())) {
        throw new Error("Unauthorized: Admin access required")
    }

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
    if (!(await adminGuard())) {
        throw new Error("Unauthorized: Admin access required")
    }

    const post = await generatePost(overrideGender)
    return post
}
