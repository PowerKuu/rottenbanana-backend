import { recommendPost } from "@/server/system/algorithm/recommendPost"
import { getSession } from "@/server/auth/session"
import { prisma } from "@/server/database/prisma"
import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
    const RECOMMEND_AMOUNT = 10
    const session = await getSession(request)

    if (!session?.user) {
        return new NextResponse("Unauthorized", { status: 401 })
    }

    try {
        const user = await prisma.user.findUnique({
            where: { id: session.user.id }
        })

        if (!user) {
            return new NextResponse("User not found", { status: 404 })
        }

        const recommendedPosts = await recommendPost(RECOMMEND_AMOUNT, { user })

        return NextResponse.json({ postsIds: recommendedPosts.map((post) => post.id) })
    } catch (error) {
        return new NextResponse(error instanceof Error ? error.message : "Error recommending posts", { status: 404 })
    }
}
