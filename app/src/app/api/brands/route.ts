import { getSession } from "@/server/auth/session"
import { prisma } from "@/server/database/prisma"
import { Gender } from "@/prisma/client"
import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
    const session = await getSession(request)

    if (!session?.user) {
        return new NextResponse("Unauthorized", { status: 401 })
    }

    const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { regionId: true, gender: true }
    })

    if (!user?.regionId) {
        return NextResponse.json([])
    }

    const { searchParams } = new URL(request.url)
    const gendersParam = searchParams.get("genders")
    const genders = gendersParam
        ? gendersParam.split(",") as Gender[]
        : user.gender
            ? [user.gender, Gender.UNISEX]
            : undefined

    const products = await prisma.product.findMany({
        where: {
            brand: { not: null },
            store: {
                regions: {
                    some: { id: user.regionId }
                }
            },
            ...(genders && { gender: { in: genders } }),
        },
        select: { brand: true },
        distinct: ["brand"],
        orderBy: { brand: "asc" }
    })

    return NextResponse.json(products.map((p) => p.brand))
}
