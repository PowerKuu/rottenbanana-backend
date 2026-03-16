import { getSession } from "@/server/auth/session"
import { prisma } from "@/server/database/prisma"
import { getFile, readFileBuffer } from "@/server/uploads/read"
import { NextRequest, NextResponse } from "next/server"

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ postId: string }> }
) {
    const { postId } = await params

    const session = await getSession(request)

    if (!session?.user) {
        return new NextResponse("Unauthorized", { status: 401 })
    }

    try {
        await prisma.postLike.create({
            data: {
                postId,
                userId: session.user.id
            }
        })

        return new NextResponse("Post liked", { status: 200 })
    } catch (error) {
        return new NextResponse(error instanceof Error ? error.message : "Error liking post", { status: 404 })
    }
}
