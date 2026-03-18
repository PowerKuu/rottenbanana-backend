import { getFullPost, recommendPost } from "@/server/system/algorithm/recommendPost"
import { getFullProduct } from "@/server/system/algorithm/recommendProducts"
import { getSession } from "@/server/auth/session"
import { prisma } from "@/server/database/prisma"
import { getFile, readFileBuffer } from "@/server/uploads/read"
import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest, { params }: { params: Promise<{ productId: string }> }) {
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

        const product = await getFullProduct(productId)

        return NextResponse.json({ product })
    } catch (error) {
        return new NextResponse(error instanceof Error ? error.message : "Error fetching product", { status: 404 })
    }
}
