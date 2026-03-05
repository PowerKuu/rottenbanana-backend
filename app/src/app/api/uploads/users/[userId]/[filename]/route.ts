import { getSession } from "@/server/auth/session"
import { NextRequest, NextResponse } from "next/server"
import { readFile } from "fs/promises"
import { join } from "path"

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

    const sanitized = filename.replace(/[^a-zA-Z0-9._-]/g, "")
    if (sanitized !== filename || filename.includes("..")) {
        return NextResponse.json({ error: "Invalid filename" }, { status: 400 })
    }

    try {
        const filepath = join(process.cwd(), "uploads", "users", userId, filename)
        const file = await readFile(filepath)

        return new NextResponse(file, {
            headers: {
                "Content-Type": "image/jpeg",
                "Cache-Control": "private, max-age=31536000, immutable"
            }
        })
    } catch {
        return new NextResponse("File not found", { status: 404 })
    }
}
