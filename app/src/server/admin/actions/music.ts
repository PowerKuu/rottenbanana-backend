"use server"

import { prisma } from "@/server/database/prisma"
import { removeUndefinedValues } from "@/lib/utils"
import { getFile, readFileBuffer } from "@/server/uploads/read"
import { analyzeMusic } from "@/server/system/analyzeMusic"
import { deleteFiles } from "@/server/uploads/delete"

export async function getAllMusic() {
    const music = await prisma.music.findMany({
        include: {
            regions: true,
            _count: {
                select: {
                    posts: true,
                    preferenceTags: true
                }
            },
            preferenceTags: {
                include: {
                    preferenceTag: true
                }
            }
        },
        orderBy: {
            name: "asc"
        }
    })

    return music
}

export async function getMusicById(musicId: string) {
    const music = await prisma.music.findUnique({
        where: { id: musicId }
    })

    return music
}

export async function createMusic({
    name,
    musicId,
    regionIds
}: {
    name: string
    musicId: string
    regionIds?: string[]
}) {
    if (!regionIds || regionIds.length === 0) {
        throw new Error("At least one region is required")
    }

    const file = await getFile(musicId)
    const buffer = await readFileBuffer(file)

    const { tags, description } = await analyzeMusic(buffer)

    const music = await prisma.music.create({
        data: {
            name: name.trim(),
            description,
            musicId,
            regions: {
                connect: regionIds.map((id) => ({ id }))
            }
        }
    })

    await prisma.musicPreferenceTag.createMany({
        data: await Promise.all(
            tags.map(async (tag: string) => {
                const preferenceTag = await prisma.preferenceTag.findUnique({
                    where: { tag }
                })

                if (!preferenceTag) {
                    throw new Error("Preference tag not found: " + tag)
                }

                return {
                    musicId: music.id,
                    preferenceTagId: preferenceTag.id
                }
            })
        )
    })

    return music
}

export async function updateMusic({ id, name, regionIds }: { id: string; name?: string; regionIds?: string[] }) {
    if (regionIds !== undefined && regionIds.length === 0) {
        throw new Error("At least one region is required")
    }

    const music = await prisma.music.update({
        where: { id },
        data: removeUndefinedValues({
            name: name?.trim(),
            regions: regionIds !== undefined ? { set: regionIds.map((id) => ({ id })) } : undefined
        })
    })

    return music
}

export async function deleteMusic(musicId: string) {
    const music = await prisma.music.findUnique({
        where: { id: musicId },
        select: { musicId: true }
    })

    if (!music) {
        throw new Error("Music not found")
    }

    const deletedMusic = await prisma.music.delete({
        where: { id: musicId }
    })

    await deleteFiles([music.musicId])

    return deletedMusic
}
