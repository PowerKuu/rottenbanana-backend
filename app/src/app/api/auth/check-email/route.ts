import { prisma } from "@/server/database/prisma"
import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
    const email = request.nextUrl.searchParams.get("email")
    if (!email) {
        return NextResponse.json({ exists: false })
    }

    const user = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
        select: { id: true },
    })

    return NextResponse.json({ exists: !!user })
}
