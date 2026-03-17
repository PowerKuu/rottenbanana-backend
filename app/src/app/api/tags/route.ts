import { prisma } from "@/server/database/prisma"
import { NextResponse } from "next/server"

export async function GET() {
    const tags = await prisma.preferenceTag.findMany({
        select: {
            id: true,
            tag: true,
            description: true
        },
        orderBy: { tag: "asc" }
    })


    const tagsWithScore = await Promise.all(
        tags.map(async (tag) => {
            const count = await prisma.userPreferenceTag.aggregate({
                where: { preferenceTagId: tag.id },
                _sum: { score: true }
            }).then(result => result._sum.score || 0)

            return { ...tag, count }
        })
    )

    const sortedTags = tagsWithScore.sort((a, b) => b.count - a.count)

    return NextResponse.json(sortedTags)
}
