import { getFile, readFileBuffer } from "@/server/uploads/read"
import { NextRequest, NextResponse } from "next/server"

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const {id } = await params

    try {
        const file = await getFile(id)
        const buffer = await readFileBuffer(file)

        return new NextResponse(new Uint8Array(buffer), {
            headers: {
                "Content-Type": file.type
            }
        })
    } catch (error) {
        return new NextResponse(error instanceof Error ? error.message : "Error reading file", { status: 404 })
    }
}
