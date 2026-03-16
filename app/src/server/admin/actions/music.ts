"use server"

import { prisma } from "@/server/database/prisma"
import { removeUndefinedValues } from "@/lib/utils"
import { getFile, readFileBuffer } from "@/server/uploads/read"
import { analyzeMusic } from "@/server/ai/analyzeMusic"

export async function getAllMusic() {
    const music = await prisma.music.findMany({
        include: {
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

export async function createMusic({ name, musicId }: { name: string; musicId: string }) {
    const file = await getFile(musicId)
    const buffer = await readFileBuffer(file)

    const { tags, description } = await analyzeMusic(buffer)

    const music = await prisma.music.create({
        data: {
            name: name.trim(),
            description,
            musicId
        }
    })

    await prisma.musicPreferenceTag.createMany({
        data: await Promise.all(tags.map(async (tag: string) => {
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
        }))
    })

    return music
}

export async function updateMusic({ id, name }: { id: string; name?: string }) {
    const music = await prisma.music.update({
        where: { id },
        data: removeUndefinedValues({
            name: name?.trim()
        })
    })

    return music
}

export async function deleteMusic(musicId: string) {
    const deletedMusic = await prisma.music.delete({
        where: { id: musicId }
    })

    return deletedMusic
}
