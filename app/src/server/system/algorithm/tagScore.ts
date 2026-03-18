import { PreferenceTag, User } from "@/prisma/client"
import { prisma } from "@/server/database/prisma"

export async function updateUserTagsScore(tags: PreferenceTag[], user: User, amount: number) {
    const updatedTags = await Promise.all(
        tags.map((tag) =>
            prisma.userPreferenceTag.upsert({
                where: {
                    userId_preferenceTagId: {
                        userId: user.id,
                        preferenceTagId: tag.id
                    }
                },
                update: {
                    score: {
                        increment: amount
                    }
                },
                create: {
                    userId: user.id,
                    preferenceTagId: tag.id,
                    score: amount
                }
            })
        )
    )

    return updatedTags
}
