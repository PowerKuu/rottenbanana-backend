import { User } from "@/prisma/client";
import { prisma } from "../database/prisma";

export async function recommendPost(user: User, take: number) {
    const recommendedPosts = await prisma.post.findMany({
        where: {
            views: {
                none: {
                    userId: user.id
                }
            }
        },
        orderBy: {
            createdAt: "desc"
        },
        take
    })

    return recommendedPosts
}