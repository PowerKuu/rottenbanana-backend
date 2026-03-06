import { NextRequest, NextResponse } from "next/server"
import { PUBLIC_NAMESPACES, getContentType, readUploadedFile } from "@/server/uploads/read"

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ namespace: string; filename: string }> }
) {
    const { namespace, filename } = await params

    try {
        const file = await readUploadedFile([namespace, filename])
        const contentType = getContentType(filename)

        return new NextResponse(file, {
            headers: {
                "Content-Type": contentType,
                "Cache-Control": "public, max-age=31536000, immutable"
            }
        })
    } catch (error) {
        return new NextResponse(error instanceof Error ? error.message : "Error reading file", { status: 404 })
    }
}
