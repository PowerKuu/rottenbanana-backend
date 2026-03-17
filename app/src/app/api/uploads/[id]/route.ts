import { getSession } from "@/server/auth/session"
import { getFile, readFileBuffer } from "@/server/uploads/read"
import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params

    const session = await getSession(request)

    try {
        const file = await getFile(id)

        if (file.privateUserId && file.privateUserId !== session?.user?.id) {
            return new NextResponse("Unauthorized", { status: 401 })
        }

        const buffer = await readFileBuffer(file)
        const total = buffer.length
        const rangeHeader = request.headers.get("range")

        if (rangeHeader) {
            const [startStr, endStr] = rangeHeader.replace("bytes=", "").split("-")
            const start = parseInt(startStr, 10)
            const end = endStr ? parseInt(endStr, 10) : total - 1
            return new NextResponse(new Uint8Array(buffer).subarray(start, end + 1), {
                status: 206,
                headers: {
                    "Content-Type": file.type,
                    "Content-Range": `bytes ${start}-${end}/${total}`,
                    "Accept-Ranges": "bytes",
                    "Content-Length": String(end - start + 1),
                },
            })
        }

        return new NextResponse(new Uint8Array(buffer), {
            headers: {
                "Content-Type": file.type,
                "Accept-Ranges": "bytes",
                "Content-Length": String(total),
            }
        })
    } catch (error) {
        return new NextResponse(error instanceof Error ? error.message : "Error reading file", { status: 404 })
    }
}
