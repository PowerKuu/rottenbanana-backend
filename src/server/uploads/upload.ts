import { writeFile, mkdir } from "fs/promises"
import { join } from "path"
import { UploadOptions, UploadResult } from "./types"
import axios from "axios"

const MAX_FILE_SIZE = 5 * 1024 * 1024
const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"]


export async function upload(
    buffer: Buffer,
    originalFilename: string,
    contentType: string,
    options: UploadOptions = {}
): Promise<UploadResult> {
    const maxFileSize = options.maxFileSize || MAX_FILE_SIZE
    const allowedTypes = options.allowedTypes || ALLOWED_TYPES

    if (!allowedTypes.includes(contentType)) {
        throw new Error(`File type ${contentType} is not allowed`)
    }

    if (buffer.length > maxFileSize) {
        throw new Error(`File size ${buffer.length} exceeds maximum of ${maxFileSize}`)
    }

    const timestamp = Date.now()
    const sanitizedName = originalFilename.replace(/[^a-zA-Z0-9.-]/g, "_")
    const filename = `${timestamp}-${sanitizedName}`

    const uploadDir = join(process.cwd(), "uploads")
    const filepath = join(uploadDir, filename)

    await mkdir(uploadDir, { recursive: true })

    await writeFile(filepath, buffer)

    return {
        success: true,
        url: `/api/uploads/${filename}`,
        path: filepath,
        filename
    }
}

export async function uploadFromExternalUrl(
    externalUrl: string,
    options: UploadOptions = {}
): Promise<UploadResult> {
    const response = await axios.get(externalUrl, {
        responseType: "arraybuffer"
    })

    const contentType = response.headers["content-type"]
    const buffer = Buffer.from(response.data)

    const urlPath = new URL(externalUrl).pathname
    const originalFilename = urlPath.split("/").pop()

    if (!originalFilename) {
        throw new Error("Could not determine original filename from URL")
    }

    return upload(buffer, originalFilename, contentType, options)
}
