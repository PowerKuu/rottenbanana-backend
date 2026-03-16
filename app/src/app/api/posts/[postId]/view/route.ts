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
        await prisma.postView.create({
            data: {
                postId,
                userId: session.user.id
            }
        })

        return new NextResponse("Post viewed", { status: 200 })
    } catch (error) {
        return new NextResponse(error instanceof Error ? error.message : "Error viewing post", { status: 404 })
    }
}
