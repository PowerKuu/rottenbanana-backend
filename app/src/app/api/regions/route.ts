import { prisma } from "@/server/database/prisma"
import { NextResponse } from "next/server"

export async function GET() {
    const regions = await prisma.region.findMany({
        select: {
            id: true,
            name: true,
            countryCode: true,
            flagImageId: true
        },
        orderBy: { name: "asc" }
    })
    return NextResponse.json(regions)
}
