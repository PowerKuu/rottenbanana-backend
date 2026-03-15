import { writeFile } from "fs/promises"
import { basename, extname, join } from "path"
import { prisma } from "../database/prisma"
import { removeBackground } from "../ai/removeBackground"

const ALLOWED_FILE_TYPES = ["jpg", "jpeg", "png", "webp"]
export const UPLOAD_DIR = join(process.cwd(), "uploads")
const MAX_FILE_SIZE = 15 * 1024 * 1024

export async function uploadFile(file: File, options: { removeBackground?: boolean } = {}) {
    const extension = extname(file.name).slice(1).toLowerCase()

    if (!ALLOWED_FILE_TYPES.includes(extension)) {
        throw new Error("Unsupported file type")
    }
    const buffer = Buffer.from(await file.arrayBuffer())

    if (buffer.length > MAX_FILE_SIZE) {
        throw new Error(`File size ${buffer.length} exceeds maximum of ${MAX_FILE_SIZE}`)
    }

    let processedBuffer: Buffer = buffer
    let processedFilename = file.name
    
    if (options.removeBackground) {
        processedBuffer = await removeBackground(buffer)

        const nameWithoutExt = basename(file.name, extname(file.name))
        processedFilename = `${nameWithoutExt}.png`
    }

    const timestamp = Date.now()

    const sanitizedName = processedFilename
        .replace(/[^a-zA-Z0-9.-]/g, "_")
        .replace(/_+/g, "_")
        .replace(/^_|_$/g, "")

    const ext = extname(sanitizedName)
    const baseName = basename(sanitizedName, ext).slice(0, 50)
    const truncatedName = `${baseName}${ext}`

    const uniqueFilename = `${timestamp}-${truncatedName}`
    
    await writeFile(join(UPLOAD_DIR, uniqueFilename), processedBuffer)

    return await prisma.file.create({
        data: {
            name: uniqueFilename,
            type: file.type
        }
    })
}

export async function uploadFromExternalUrl(url: string, options: { removeBackground?: boolean } = {}) {
    const response = await fetch(url)

    if (!response.ok) {
        throw new Error(`Failed to fetch image from URL: ${response.statusText}`)
    }

    const contentType = response.headers.get("Content-Type")
    const extension = new URL(url).pathname.split(".").pop()

    if (!contentType || !extension) {
        throw new Error("Could not determine file type from URL")
    }

    const blob = await response.blob()
    const file = new File([blob], `external.${extension}`, { type: contentType })

    return await uploadFile(file, options)
}