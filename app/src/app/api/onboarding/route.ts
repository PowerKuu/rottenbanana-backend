import { getSession } from "@/server/auth/session"
import { prisma } from "@/server/database/prisma"
import { uploadUserPhoto } from "@/server/uploads/upload"
import { NextRequest, NextResponse } from "next/server"

const VALID_GENDERS = ["MALE", "FEMALE", "UNISEX"] as const
const VALID_DEFAULT_MODELS = ["male-model.jpg", "female-model.jpg"]

export async function POST(request: NextRequest) {
    const session = await getSession(request)
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const formData = await request.formData()
    const gender = formData.get("gender") as string
    const tagIds = formData.getAll("tagIds") as string[]
    const photo = formData.get("photo") as File | null
    const defaultModel = formData.get("defaultModel") as string | null

    if (!gender || !VALID_GENDERS.includes(gender as typeof VALID_GENDERS[number])) {
        return NextResponse.json({ error: "Invalid gender" }, { status: 400 })
    }

    if (!photo && !defaultModel) {
        return NextResponse.json({ error: "A photo or default model is required" }, { status: 400 })
    }

    let photoUrl: string | null = null

    if (photo) {
        const bytes = await photo.arrayBuffer()
        const buffer = Buffer.from(bytes)
        const result = await uploadUserPhoto(buffer, photo.name, photo.type, session.user.id)
        photoUrl = result.url
    } else if (defaultModel) {
        if (!VALID_DEFAULT_MODELS.includes(defaultModel)) {
            return NextResponse.json({ error: "Invalid default model" }, { status: 400 })
        }
        photoUrl = `/defaults/${defaultModel}`
    }

    await prisma.$transaction(async (tx) => {
        await tx.userPreferenceTag.deleteMany({
            where: { userId: session.user.id }
        })

        if (tagIds.length > 0) {
            await tx.userPreferenceTag.createMany({
                data: tagIds.map(tagId => ({
                    userId: session.user.id,
                    preferenceTagId: tagId,
                    score: 0
                }))
            })
        }

        await tx.user.update({
            where: { id: session.user.id },
            data: {
                gender: gender as "MALE" | "FEMALE" | "UNISEX",
                referenceImageUrl: photoUrl,
                onboardingCompleted: true
            }
        })
    })

    return NextResponse.json({ success: true })
}
