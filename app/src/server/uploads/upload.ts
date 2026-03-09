import { writeFile, mkdir } from "fs/promises"
import { join, basename, extname } from "path"
import { UploadOptions, UploadResult } from "./types"
import axios from "axios"
import { removeBackground } from "../ai/removeBackground"

const MAX_FILE_SIZE = 15 * 1024 * 1024 // 15MB
const ALLOWED_TYPES = ["jpeg", "jpg", "png", "webp", "gif"]

export async function upload(
    buffer: Buffer,
    filename: string,
    path: string[],
    options: UploadOptions = {}
): Promise<UploadResult> {
    const maxFileSize = options.maxFileSize || MAX_FILE_SIZE
    const allowedTypes = options.allowedTypes || ALLOWED_TYPES

    const fileExtension = extname(filename).slice(1).toLowerCase()

    if (!allowedTypes.includes(fileExtension)) {
        throw new Error(`File type ${fileExtension} is not allowed`)
    }

    if (buffer.length > maxFileSize) {
        throw new Error(`File size ${buffer.length} exceeds maximum of ${maxFileSize}`)
    }

    let processedBuffer = buffer
    let processedFilename = filename
    if (options.removeBackground) {
        processedBuffer = await removeBackground(buffer)

        const nameWithoutExt = basename(filename, extname(filename))
        processedFilename = `${nameWithoutExt}.png`
    }

    const timestamp = Date.now()
    const sanitizedName = processedFilename.replace(/[^a-zA-Z0-9.-]/g, "_")
    const uniqueFilename = `${timestamp}-${sanitizedName}`

    const uploadDir = join(process.cwd(), "uploads", ...path)
    const filepath = join(uploadDir, uniqueFilename)

    await mkdir(uploadDir, { recursive: true })

    await writeFile(filepath, processedBuffer)

    return {
        success: true,
        url: `/api/uploads/${path.join("/")}/${uniqueFilename}`,
        path: filepath,
        filename
    }
}

export async function uploadFromExternalUrl(
    externalUrl: string,
    path: string[],
    options: UploadOptions = {}
): Promise<UploadResult> {
    const response = await axios.get(externalUrl, {
        responseType: "arraybuffer"
    })

    const buffer = Buffer.from(response.data)

    const urlPath = new URL(externalUrl).pathname
    const filename = urlPath.split("/").pop()

    if (!filename) {
        throw new Error("Could not determine original filename from URL")
    }

    return upload(buffer, filename, path, options)
}
