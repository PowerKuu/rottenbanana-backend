import { prisma } from "@/server/database/prisma"
import { getSession } from "@/server/auth/session"
import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
    const session = await getSession(request)
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: {
            id: true,
            name: true,
            email: true,
            emailVerified: true,
            gender: true,
            referenceImageId: true,
            onboardingCompleted: true,
            preferenceTags: {
                select: {
                    preferenceTag: {
                        select: { id: true, tag: true, description: true }
                    }
                }
            }
        }
    })

    if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const { preferenceTags, ...rest } = user

    return NextResponse.json({
        preferenceTags: preferenceTags.map(({ preferenceTag }) => preferenceTag),
        ...rest
    })
}
