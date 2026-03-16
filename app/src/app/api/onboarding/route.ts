import { Gender } from "@/prisma/enums"
import { getSession } from "@/server/auth/session"
import { prisma } from "@/server/database/prisma"
import { uploadFile } from "@/server/uploads/upload"
import { NextRequest, NextResponse } from "next/server"
import { join } from "path"
import sharp from "sharp"

const INITIAL_TAG_SCORE = 1

export async function POST(request: NextRequest) {
    const session = await getSession(request)
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const formData = await request.formData()
    const gender = formData.get("gender") as Gender
    const tagIds = formData.getAll("tagIds") as string[]
    const photo = formData.get("photo") as File | null

    if (!gender || !Object.values(Gender).includes(gender)) {
        return NextResponse.json({ error: "Invalid gender" }, { status: 400 })
    }


    let referenceImageId: string | null = null

    if (photo) {
        const file = await uploadFile(photo, {
            privateUserId: session.user.id
        })
        referenceImageId = file.id
    }

    await prisma.$transaction(async (tx) => {
        await tx.userPreferenceTag.deleteMany({
            where: { userId: session.user.id }
        })

        if (tagIds.length > 0) {
            await tx.userPreferenceTag.createMany({
                data: tagIds.map((tagId) => ({
                    userId: session.user.id,
                    preferenceTagId: tagId,
                    score: INITIAL_TAG_SCORE
                }))
            })
        }

        await tx.user.update({
            where: { id: session.user.id },
            data: {
                gender,
                referenceImageId,
                onboardingCompleted: true
            }
        })
    })

    return NextResponse.json({ success: true })
}

async function processeReferenceImage(image: Buffer) {
    const targetWidth = 720
    const targetHeight = 1280
    const targetRatio = 9 / 16

    const metadata = await sharp(image).metadata()
    const imgWidth = metadata.width!
    const imgHeight = metadata.height!
    const imgRatio = imgWidth / imgHeight

    let cropWidth: number
    let cropHeight: number
    if (imgRatio > targetRatio) {
        cropHeight = imgHeight
        cropWidth = Math.round(imgHeight * targetRatio)
    } else {
        cropWidth = imgWidth
        cropHeight = Math.round(imgWidth / targetRatio)
    }

    const left = Math.round((imgWidth - cropWidth) / 2)
    const top = Math.round((imgHeight - cropHeight) / 2)

    const processedBuffer = await sharp(image)
        .extract({ left, top, width: cropWidth, height: cropHeight })
        .resize(targetWidth, targetHeight)
        .jpeg({ quality: 85 })
        .toBuffer()

    return processedBuffer
}
