import { randomShuffle } from "@/lib/utils"
import { Music, PreferenceTag, Prisma, Region, User } from "@/prisma/client"
import { prisma } from "@/server/database/prisma"
import { drawSeedTags } from "./drawSeedTags"

export async function recommendMusic(
    take: number,
    options: {
        user?: User
        region?: Region
        usePreferenceTags?: boolean
        seedTags?: PreferenceTag[]
        recursiveMusics?: Music[]
    } = {}
): Promise<Music[]> {
    const seedTags =
        options.recursiveMusics || !options.usePreferenceTags
            ? []
            : options.seedTags || (await drawSeedTags(3, options.user))

    const whereConditions: Prisma.Sql[] = []

    if (options.region) {
        whereConditions.push(Prisma.sql`"Music".id IN (
            SELECT "A" FROM "_MusicRegions" WHERE "B" = ${options.region.id}
        )`)
    }

    if (seedTags.length > 0) {
        const tagIds = seedTags.map((tag) => tag.id)
        whereConditions.push(Prisma.sql`"Music".id IN (
            SELECT "musicId" FROM "MusicPreferenceTag"
            WHERE "preferenceTagId" IN (${Prisma.join(tagIds, ",")})
        )`)
    }

    if (options.recursiveMusics && options.recursiveMusics.length > 0) {
        const excludeIds = options.recursiveMusics.map((m) => m.id)
        whereConditions.push(Prisma.sql`"Music".id NOT IN (${Prisma.join(excludeIds, ",")})`)
    }

    const whereClause =
        whereConditions.length > 0 ? Prisma.sql`WHERE ${Prisma.join(whereConditions, " AND ")}` : Prisma.empty

    const recommendedMusics: Music[] = await prisma.$queryRaw`
        SELECT *
        FROM "Music"
        ${whereClause}
        ORDER BY RANDOM()
        LIMIT ${take}
    `

    const remainingTake = take - recommendedMusics.length

    if (remainingTake <= 0 || options.recursiveMusics !== undefined) {
        return recommendedMusics
    }

    const additionalMusics = await recommendMusic(remainingTake, {
        ...options,
        recursiveMusics: recommendedMusics
    })

    return randomShuffle([...recommendedMusics, ...additionalMusics])
}
