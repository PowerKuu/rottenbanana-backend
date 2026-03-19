import { updateUserTagsScore } from "@/server/system/algorithm/tagScore"
import { getSession } from "@/server/auth/session"
import { prisma } from "@/server/database/prisma"
import { getFile, readFileBuffer } from "@/server/uploads/read"
import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest, { params }: { params: Promise<{ postId: string }> }) {
    const { postId } = await params

    const session = await getSession(request)

    if (!session?.user) {
        return new NextResponse("Unauthorized", { status: 401 })
    }

    const LIKE_PREFERENCE_SCORE = 0.1

    try {
        const post = await prisma.post.findUnique({
            where: { id: postId },
            include: {
                preferenceTags: {
                    include: {
                        preferenceTag: true
                    }
                }
            }
        })

        const user = await prisma.user.findUnique({
            where: { id: session.user.id }
        })

        if (!user) {
            return new NextResponse("User not found", { status: 404 })
        }

        if (!post) {
            return new NextResponse("Post not found", { status: 404 })
        }

        const preferenceTags = post.preferenceTags.map((pt) => pt.preferenceTag)

        const existingLike = await prisma.postLike.findUnique({
            where: {
                userId_postId: {
                    userId: session.user.id,
                    postId
                }
            }
        })

        if (existingLike) {
            await prisma.postLike.delete({
                where: {
                    userId_postId: {
                        userId: session.user.id,
                        postId
                    }
                }
            })

            await updateUserTagsScore(preferenceTags, user, -LIKE_PREFERENCE_SCORE)

            return new NextResponse("OK", { status: 200 })
        } else {
            await prisma.postLike.create({
                data: {
                    postId,
                    userId: session.user.id
                }
            })

            await updateUserTagsScore(preferenceTags, user, LIKE_PREFERENCE_SCORE)

            return new NextResponse("OK", { status: 200 })
        }
    } catch (error) {
        return new NextResponse(error instanceof Error ? error.message : "Error toggling like", { status: 404 })
    }
}
