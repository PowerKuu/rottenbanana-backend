import { NextRequest, NextResponse } from "next/server"
import { readFile } from "fs/promises"
import { join } from "path"

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ filename: string }> }
) {
    try {
        const { filename } = await params
        const filepath = join(process.cwd(), "uploads", filename)

        const file = await readFile(filepath)

        const ext = filename.split(".").pop()?.toLowerCase()
        const contentTypeMap: Record<string, string> = {
            jpg: "image/jpeg",
            jpeg: "image/jpeg",
            png: "image/png",
            webp: "image/webp",
            gif: "image/gif"
        }

        const contentType = contentTypeMap[ext || ""] || "image/jpeg"

        return new NextResponse(file, {
            headers: {
                "Content-Type": contentType,
                "Cache-Control": "public, max-age=31536000, immutable"
            }
        })
    } catch (error) {
        return new NextResponse("File not found", { status: 404 })
    }
}
