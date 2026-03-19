import { getSession } from "@/server/auth/session"
import { prisma } from "@/server/database/prisma"
import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest, { params }: { params: Promise<{ postId: string }> }) {
    const { postId } = await params

    const session = await getSession(request)

    if (!session?.user) {
        return new NextResponse("Unauthorized", { status: 401 })
    }

    await prisma.postView.upsert({
        where: { userId_postId: { userId: session.user.id, postId } },
        create: { postId, userId: session.user.id },
        update: {}
    })

    return new NextResponse("OK", { status: 200 })
}
