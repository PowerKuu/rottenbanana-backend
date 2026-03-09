import { NextRequest, NextResponse } from "next/server"
import { upload } from "@/server/uploads/upload"
import { PUBLIC_NAMESPACES } from "@/server/uploads/read"

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData()
        const file = formData.get("file") as File
        const removeBackground = formData.get("removeBackground") === "true"
        const namespace = formData.get("namespace") as string

        if (!namespace || !PUBLIC_NAMESPACES.includes(namespace)) {
            return NextResponse.json({ error: "Invalid namespace" }, { status: 400 })
        }

        if (!file) {
            return NextResponse.json({ error: "No file provided" }, { status: 400 })
        }

        const bytes = await file.arrayBuffer()
        const buffer = Buffer.from(bytes)

        const result = await upload(buffer, file.name, [namespace], {
            removeBackground
        })

        return NextResponse.json({
            success: result.success,
            url: result.url
        })
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to upload image"
        return NextResponse.json({ error: message }, { status: 400 })
    }
}
