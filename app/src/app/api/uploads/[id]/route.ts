import { getSession } from "@/server/auth/session"
import { getFile, readFileBuffer } from "@/server/uploads/read"
import { NextRequest, NextResponse } from "next/server"

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const {id } = await params

    const session = await getSession(request)

    try {
        const file = await getFile(id)

        if (file.privateUserId && file.privateUserId !== session?.user?.id) {
            return new NextResponse("Unauthorized", { status: 401 })
        }

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
