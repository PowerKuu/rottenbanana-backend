import { randomShuffle } from "@/lib/utils"
import { Music, PreferenceTag, Prisma, Region } from "@/prisma/client"
import { prisma } from "@/server/database/prisma"
    
export async function recommendMusic(region: Region, tag: PreferenceTag | null, take: number): Promise<Music[]> {
    const whereWithTag: Prisma.MusicWhereInput = {
        ...(tag && {
            preferenceTags: {
                some: {
                    preferenceTagId: tag.id
                }
            }
        }),
        regions: {
            some: {
                id: region.id
            }
        }
    }

    const countWithTag = await prisma.music.count({ where: whereWithTag })
    const randomOffset = countWithTag > take ? Math.floor(Math.random() * (countWithTag - take)) : 0

    const musicWithTag = await prisma.music.findMany({
        where: whereWithTag,
        skip: randomOffset,
        take
    })

    const remainingTake = take - musicWithTag.length

    if (remainingTake <= 0) {
        return musicWithTag
    }

    const whereAdditional: Prisma.MusicWhereInput = {
        id: {
            notIn: musicWithTag.map((music) => music.id)
        },
        regions: {
            some: {
                id: region.id
            }
        }
    }

    const countAdditional = await prisma.music.count({ where: whereAdditional })
    const randomOffsetAdditional =
        countAdditional > remainingTake ? Math.floor(Math.random() * (countAdditional - remainingTake)) : 0

    const additionalMusic = await prisma.music.findMany({
        where: whereAdditional,
        skip: randomOffsetAdditional,
        take: remainingTake
    })

    return randomShuffle([...musicWithTag, ...additionalMusic])
}