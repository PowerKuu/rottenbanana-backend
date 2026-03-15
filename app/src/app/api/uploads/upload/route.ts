import { NextRequest, NextResponse } from "next/server"
import { uploadFile } from "@/server/uploads/upload"

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData()
        const file = formData.get("file") as File
        const removeBackground = formData.get("removeBackground") === "true"

        if (!file) {
            return NextResponse.json({ error: "No file provided" }, { status: 400 })
        }        

        const result = await uploadFile(file, {
            removeBackground
        })

        return NextResponse.json(result)
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to upload image"
        return NextResponse.json({ error: message }, { status: 400 })
    }
}
