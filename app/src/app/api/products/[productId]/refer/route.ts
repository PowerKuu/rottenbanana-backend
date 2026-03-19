import { getFullPost, recommendPost } from "@/server/system/algorithm/recommendPost"
import { getFullProduct } from "@/server/system/algorithm/recommendProducts"
import { getSession } from "@/server/auth/session"
import { prisma } from "@/server/database/prisma"
import { getFile, readFileBuffer } from "@/server/uploads/read"
import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest, { params }: { params: Promise<{ productId: string }> }) {
    const { productId } = await params
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

        await prisma.productReferral.upsert({
            where: {
                userId_productId: {
                    userId: session.user.id,
                    productId: productId
                }
            },
            create: {
                productId: productId,
                userId: session.user.id
            },
            update: {}
        })

        return new NextResponse("OK", { status: 200 })
    } catch (error) {
        return new NextResponse(error instanceof Error ? error.message : "Error referring product", { status: 404 })
    }
}
