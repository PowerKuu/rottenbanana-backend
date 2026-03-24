"use server"

import { prisma } from "@/server/database/prisma"
import { removeUndefinedValues } from "@/lib/utils"
import { getFile, readFileBuffer } from "@/server/uploads/read"
import { analyzeMusic } from "@/server/system/analyzeMusic"
import { deleteFiles } from "@/server/uploads/delete"
import { adminGuard } from "@/server/auth/guard"

export async function getAllMusic() {
    if (!(await adminGuard())) {
        throw new Error("Unauthorized: Admin access required")
    }

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
    if (!(await adminGuard())) {
        throw new Error("Unauthorized: Admin access required")
    }

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
    if (!(await adminGuard())) {
        throw new Error("Unauthorized: Admin access required")
    }

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
    if (!(await adminGuard())) {
        throw new Error("Unauthorized: Admin access required")
    }

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
    if (!(await adminGuard())) {
        throw new Error("Unauthorized: Admin access required")
    }

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

interface BulkMusicInput {
    name: string
    musicId: string
    regionIds: string[]
}

export async function bulkCreateMusic({ music }: { music: BulkMusicInput[] }) {
    if (!(await adminGuard())) {
        throw new Error("Unauthorized: Admin access required")
    }

    const results = {
        created: [] as string[],
        duplicates: [] as string[],
        errors: [] as { name: string; error: string }[]
    }

    // Check for duplicates by musicId
    const musicIdsToCheck = music.map((m) => m.musicId)
    const existingMusic = await prisma.music.findMany({
        where: { musicId: { in: musicIdsToCheck } },
        select: { musicId: true, name: true }
    })

    const existingMusicIdSet = new Set(existingMusic.map((m) => m.musicId))

    // Process each music track sequentially to rate-limit AI analysis
    for (const musicItem of music) {
        try {
            // Check if already exists
            if (existingMusicIdSet.has(musicItem.musicId)) {
                const existingName =
                    existingMusic.find((m) => m.musicId === musicItem.musicId)?.name || musicItem.name
                results.duplicates.push(existingName)
                continue
            }

            // Validate regions
            if (!musicItem.regionIds || musicItem.regionIds.length === 0) {
                results.errors.push({
                    name: musicItem.name,
                    error: "At least one region is required"
                })
                continue
            }

            // Get file and analyze
            const file = await getFile(musicItem.musicId)
            const buffer = await readFileBuffer(file)

            // AI analysis (this is the rate-limited step)
            const { tags, description } = await analyzeMusic(buffer)

            // Create music record
            const createdMusic = await prisma.music.create({
                data: {
                    name: musicItem.name.trim(),
                    description,
                    musicId: musicItem.musicId,
                    regions: {
                        connect: musicItem.regionIds.map((id) => ({ id }))
                    }
                }
            })

            // Create preference tag associations
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
                            musicId: createdMusic.id,
                            preferenceTagId: preferenceTag.id
                        }
                    })
                )
            })

            results.created.push(musicItem.name)

            // Add a small delay between each analysis to avoid overwhelming the AI service
            // This provides rate limiting (approximately 2 tracks per second)
            await new Promise((resolve) => setTimeout(resolve, 500))
        } catch (error) {
            results.errors.push({
                name: musicItem.name,
                error: error instanceof Error ? error.message : "Unknown error occurred"
            })

            // Continue with next item even if this one failed
            continue
        }
    }

    return results
}
