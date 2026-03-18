import { recommendProducts } from "@/server/system/algorithm/recommendProducts"
import { getSession } from "@/server/auth/session"
import { prisma } from "@/server/database/prisma"
import { getFile, readFileBuffer } from "@/server/uploads/read"
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

        const recommendedProducts = await recommendProducts(user, RECOMMEND_AMOUNT)

        return NextResponse.json({ productsIds: recommendedProducts.map(product => product.id) })
    } catch (error) {
        return new NextResponse(error instanceof Error ? error.message : "Error recommending products", { status: 404 })
    }
}
