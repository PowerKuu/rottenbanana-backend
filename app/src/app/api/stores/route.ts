import { getSession } from "@/server/auth/session"
import { prisma } from "@/server/database/prisma"
import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
    const session = await getSession(request)

    if (!session?.user) {
        return new NextResponse("Unauthorized", { status: 401 })
    }

    const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { regionId: true }
    })

    if (!user?.regionId) {
        return NextResponse.json([])
    }

    const stores = await prisma.store.findMany({
        where: {
            regions: {
                some: { id: user.regionId }
            }
        },
        select: {
            id: true,
            name: true,
            displayName: true,
            displayColorHex: true,
        },
        orderBy: { name: "asc" }
    })

    return NextResponse.json(stores)
}
