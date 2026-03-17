import { getSession } from "@/server/auth/session"
import { prisma } from "@/server/database/prisma"
import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest, { params }: { params: Promise<{ postId: string }> }) {
    const { postId } = await params

    const session = await getSession(request)

    if (!session?.user) {
        return new NextResponse("Unauthorized", { status: 401 })
    }

    await prisma.postView.createMany({
        data: [{ postId, userId: session.user.id }],
        skipDuplicates: true
    })

    return new NextResponse(null, { status: 200 })
}
