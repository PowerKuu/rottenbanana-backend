import { randomShuffle } from "@/lib/utils"
import { User } from "@/prisma/client"
import { prisma } from "@/server/database/prisma"

export async function drawSeedTags(n: number = 1, user?: User, prefrenceBias = 0.05) {
    const userTags = await prisma.userPreferenceTag.groupBy({
        by: "preferenceTagId",
        where: {
            ...(user && { userId: user.id })
        },
        _sum: {
            score: true
        },
        orderBy: {
            _sum: {
                score: "desc"
            }
        }
    })

    const tags = await prisma.preferenceTag.findMany({
        where: {
            productPreferenceTags: {
                some: {}
            }
        }
    })

    if (tags.length <= 0) {
        return []
    }

    const tagScores = randomShuffle(tags)
        .map((tag) => {
            const score = userTags.find((userTag) => userTag.preferenceTagId === tag.id)?._sum.score || 0

            return {
                tag,
                score
            }
        })
        .sort((a, b) => b.score - a.score)

    const tagProbabilities = tagScores.map((tag, index) => {
        const probability = Math.exp(-prefrenceBias * index)
        return {
            ...tag,
            probability
        }
    })

    const selectedTags = []
    const availableTags = [...tagProbabilities]

    for (let i = 0; i < Math.min(n, availableTags.length); i++) {
        const totalProbability = availableTags.reduce((sum, tag) => sum + tag.probability, 0)
        const random = Math.random() * totalProbability

        let cumulativeProbability = 0
        for (let j = 0; j < availableTags.length; j++) {
            cumulativeProbability += availableTags[j].probability
            if (random <= cumulativeProbability) {
                selectedTags.push(availableTags[j].tag)
                availableTags.splice(j, 1)
                break
            }
        }
    }

    return selectedTags
}
