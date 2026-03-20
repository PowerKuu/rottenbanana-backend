import { getFullPost, recommendPost } from "@/server/system/algorithm/recommendPost"
import { getFullProduct } from "@/server/system/algorithm/recommendProducts"
import { getSession } from "@/server/auth/session"
import { prisma } from "@/server/database/prisma"
import { getFile, readFileBuffer } from "@/server/uploads/read"
import { NextRequest, NextResponse } from "next/server"
import { updateUserTagsScore } from "@/server/system/algorithm/tagScore"

export async function POST(request: NextRequest, { params }: { params: Promise<{ productId: string }> }) {
    const { productId } = await params
    const session = await getSession(request)

    if (!session?.user) {
        return new NextResponse("Unauthorized", { status: 401 })
    }

    const REFER_PREFERENCE_SCORE = 0.15

    try {
        const user = await prisma.user.findUnique({
            where: { id: session.user.id }
        })

        if (!user) {
            return new NextResponse("User not found", { status: 404 })
        }

        const product = await prisma.product.findUnique({
            where: { id: productId },
            include: {
                preferenceTags: {
                    include: {
                        preferenceTag: true
                    }
                }
            }
        })

        if (!product) {
            return new NextResponse("Product not found", { status: 404 })
        }

        const existingReferral = await prisma.productReferral.findUnique({
            where: {
                userId_productId: {
                    userId: session.user.id,
                    productId: productId
                }
            }
        })

        if (existingReferral) {
            return new NextResponse("OK", { status: 200 })
        }

        await prisma.productReferral.create({
            data: {
                productId: productId,
                userId: session.user.id
            }
        })

        const tags = product.preferenceTags.map((pt) => pt.preferenceTag)

        await updateUserTagsScore(tags, user, REFER_PREFERENCE_SCORE)

        return new NextResponse("OK", { status: 200 })
    } catch (error) {
        return new NextResponse(error instanceof Error ? error.message : "Error referring product", { status: 404 })
    }
}
