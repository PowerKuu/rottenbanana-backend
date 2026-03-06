import { prisma } from "@/server/database/prisma"
import { NextResponse } from "next/server"

export async function GET() {
    const tags = await prisma.preferenceTag.findMany({
        select: {
            id: true,
            tag: true,
            description: true
        },
        orderBy: { tag: "asc" }
    })
    return NextResponse.json(tags)
}
