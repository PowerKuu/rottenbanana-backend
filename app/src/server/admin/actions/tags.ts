"use server"

import { prisma } from "@/server/database/prisma"
import { removeUndefinedValues } from "@/lib/utils"

export async function getAllPreferenceTags() {
    const tags = await prisma.preferenceTag.findMany({
        include: {
            _count: {
                select: {
                    userPreferenceTags: true,
                    postPreferenceTags: true,
                    productPreferenceTags: true
                }
            }
        },
        orderBy: {
            tag: "asc"
        }
    })

    return tags
}

export async function getPreferenceTagById(tagId: string) {
    const tag = await prisma.preferenceTag.findUnique({
        where: { id: tagId }
    })

    return tag
}

export async function createPreferenceTag({ tag, description }: { tag: string; description: string }) {
    const preferenceTag = await prisma.preferenceTag.create({
        data: {
            tag: tag.trim(),
            description: description.trim()
        }
    })

    return preferenceTag
}

export async function updatePreferenceTag({
    id,
    tag,
    description
}: {
    id: string
    tag?: string
    description?: string
}) {
    const preferenceTag = await prisma.preferenceTag.update({
        where: { id },
        data: removeUndefinedValues({
            tag: tag?.trim(),
            description: description?.trim()
        })
    })

    return preferenceTag
}

export async function deletePreferenceTag(tagId: string) {
    const deletedTag = await prisma.preferenceTag.delete({
        where: { id: tagId }
    })

    return deletedTag
}
