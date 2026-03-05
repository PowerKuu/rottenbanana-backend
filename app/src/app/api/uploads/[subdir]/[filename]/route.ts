import { NextRequest, NextResponse } from "next/server"
import { readFile } from "fs/promises"
import { join } from "path"

const PUBLIC_SUBDIRS = ["products", "stores"]

const CONTENT_TYPES: Record<string, string> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
    gif: "image/gif"
}

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ subdir: string; filename: string }> }
) {
    const { subdir, filename } = await params

    if (!PUBLIC_SUBDIRS.includes(subdir)) {
        return new NextResponse("Not found", { status: 404 })
    }

    try {
        const filepath = join(process.cwd(), "uploads", subdir, filename)
        const file = await readFile(filepath)
        const ext = filename.split(".").pop()?.toLowerCase() || ""
        const contentType = CONTENT_TYPES[ext] || "image/jpeg"

        return new NextResponse(file, {
            headers: {
                "Content-Type": contentType,
                "Cache-Control": "public, max-age=31536000, immutable"
            }
        })
    } catch {
        return new NextResponse("File not found", { status: 404 })
    }
}
