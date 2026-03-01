import { NextRequest, NextResponse } from "next/server"
import { writeFile } from "fs/promises"
import { join } from "path"

const MAX_FILE_SIZE = 5 * 1024 * 1024
const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"]

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData()
        const file = formData.get("file") as File

        if (!file) {
            return NextResponse.json(
                { error: "No file provided" },
                { status: 400 }
            )
        }

        if (!ALLOWED_TYPES.includes(file.type)) {
            return NextResponse.json(
                { error: "Only image files (jpg, png, webp, gif) are allowed" },
                { status: 400 }
            )
        }

        if (file.size > MAX_FILE_SIZE) {
            return NextResponse.json(
                { error: "Image file must be under 5MB" },
                { status: 400 }
            )
        }

        const bytes = await file.arrayBuffer()
        const buffer = Buffer.from(bytes)

        const timestamp = Date.now()
        const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_")
        const filename = `${timestamp}-${sanitizedName}`

        const uploadDir = join(process.cwd(), "uploads")
        const filepath = join(uploadDir, filename)

        await writeFile(filepath, buffer)

        return NextResponse.json({
            success: true,
            url: `/api/uploads/${filename}`
        })
    } catch (error) {
        return NextResponse.json(
            { error: "Failed to upload image" },
            { status: 500 }
        )
    }
}
