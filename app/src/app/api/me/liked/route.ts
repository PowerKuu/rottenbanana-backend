import { prisma } from "@/server/database/prisma"
import { getSession } from "@/server/auth/session"
import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
    const session = await getSession(request)
    
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
        where: { id: session.user.id }
    })

    if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const postLikes = await prisma.postLike.findMany({
        where: { userId: session.user.id },
        include: {
            post: true
        },
        orderBy: {
            createdAt: "desc"
        }
    })

    const likedPosts = postLikes.map((like) => like.post)

    return NextResponse.json(likedPosts)
        
}
