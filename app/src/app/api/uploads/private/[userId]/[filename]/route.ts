import { getSession } from "@/server/auth/session"
import { NextRequest, NextResponse } from "next/server"
import { getContentType, readUploadedFile } from "@/server/uploads/read"

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ userId: string; filename: string }> }
) {
    const session = await getSession(request)
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { userId, filename } = await params

    if (session.user.id !== userId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    try {
        const file = await readUploadedFile(["private", userId, filename], true)
        const contentType = getContentType(filename)

        return new NextResponse(file, {
            headers: {
                "Content-Type": contentType,
                "Cache-Control": "private, max-age=31536000, immutable"
            }
        })
    } catch (error) {
        return new NextResponse(error instanceof Error ? error.message : "Error reading file", { status: 404 })
    }
}
