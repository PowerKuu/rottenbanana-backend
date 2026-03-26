import { User, Post, Prisma } from "@/prisma/client"
import { prisma } from "../../database/prisma"
import { drawSeedTags } from "./drawSeedTags"
import { randomShuffle } from "@/lib/utils"

export async function recommendPost(
    take: number,
    options: {
        user?: User
        recursivePosts?: Post[]
    } = {}
): Promise<Post[]> {
    const seedTags = options.recursivePosts || !options.user ? [] : await drawSeedTags(3, options.user)

    const whereConditions: Prisma.Sql[] = []

    if (seedTags.length > 0) {
        const tagIds = seedTags.map((tag) => tag.id)
        whereConditions.push(Prisma.sql`"Post".id IN (
            SELECT "postId" FROM "PostPreferenceTag"
            WHERE "preferenceTagId" IN (${Prisma.join(tagIds, ",")})
        )`)
    }

    if (options.user?.gender) {
        whereConditions.push(Prisma.sql`gender = ${options.user.gender}`)
    }

    if (options.user?.regionId) {
        whereConditions.push(Prisma.sql`"regionId" = ${options.user.regionId}`)
    }

    if (options.recursivePosts && options.recursivePosts.length > 0) {
        const excludeIds = options.recursivePosts.map((p) => p.id)
        whereConditions.push(Prisma.sql`"Post".id NOT IN (${Prisma.join(excludeIds, ",")})`)
    }

    const whereClause =
        whereConditions.length > 0 ? Prisma.sql`WHERE ${Prisma.join(whereConditions, " AND ")}` : Prisma.empty

    let recommendedPosts: Post[]

    if (options.user) {
        recommendedPosts = await prisma.$queryRaw`
            SELECT "Post".* FROM "Post"
            LEFT JOIN "PostView" ON "Post".id = "PostView"."postId" AND "PostView"."userId" = ${options.user.id}
            ${whereClause}
            ORDER BY ("PostView"."userId" IS NULL) DESC, RANDOM()
            LIMIT ${take}
        `
    } else {
        recommendedPosts = await prisma.$queryRaw`
            SELECT * FROM "Post"
            ${whereClause}
            ORDER BY RANDOM()
            LIMIT ${take}
        `
    }

    const remainingTake = take - recommendedPosts.length

    if (remainingTake <= 0 || options.recursivePosts !== undefined) {
        return recommendedPosts
    }

    const additionalPosts = await recommendPost(remainingTake, {
        ...options,
        recursivePosts: recommendedPosts
    })

    return randomShuffle([...recommendedPosts, ...additionalPosts])
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
