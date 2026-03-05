import { writeFile, mkdir } from "fs/promises"
import { join, basename, extname } from "path"
import { UploadOptions, UploadResult } from "./types"
import axios from "axios"
import sharp from "sharp"
import { removeBackground } from "../ai/removeBackground"

const MAX_FILE_SIZE = 5 * 1024 * 1024
const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"]

export async function upload(
    buffer: Buffer,
    filename: string,
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

    const subdir = options.subdir || "products"
    const uploadDir = join(process.cwd(), "uploads", subdir)
    const filepath = join(uploadDir, uniqueFilename)

    await mkdir(uploadDir, { recursive: true })

    await writeFile(filepath, processedBuffer)

    return {
        success: true,
        url: `/api/uploads/${subdir}/${uniqueFilename}`,
        path: filepath,
        filename
    }
}

export async function uploadUserPhoto(
    buffer: Buffer,
    filename: string,
    contentType: string,
    userId: string
): Promise<UploadResult> {
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"]
    if (!allowedTypes.includes(contentType)) {
        throw new Error(`File type ${contentType} is not allowed`)
    }

    if (buffer.length > 10 * 1024 * 1024) {
        throw new Error("File size exceeds maximum of 10MB")
    }

    const targetWidth = 720
    const targetHeight = 1280
    const targetRatio = 9 / 16

    const metadata = await sharp(buffer).metadata()
    const imgWidth = metadata.width!
    const imgHeight = metadata.height!
    const imgRatio = imgWidth / imgHeight

    let cropWidth: number
    let cropHeight: number
    if (imgRatio > targetRatio) {
        cropHeight = imgHeight
        cropWidth = Math.round(imgHeight * targetRatio)
    } else {
        cropWidth = imgWidth
        cropHeight = Math.round(imgWidth / targetRatio)
    }

    const left = Math.round((imgWidth - cropWidth) / 2)
    const top = Math.round((imgHeight - cropHeight) / 2)

    const processedBuffer = await sharp(buffer)
        .extract({ left, top, width: cropWidth, height: cropHeight })
        .resize(targetWidth, targetHeight)
        .jpeg({ quality: 85 })
        .toBuffer()

    const timestamp = Date.now()
    const sanitizedName = filename.replace(/[^a-zA-Z0-9.-]/g, "_").replace(/\.[^.]+$/, "")
    const uniqueFilename = `${timestamp}-${sanitizedName}.jpg`

    const uploadDir = join(process.cwd(), "uploads", "users", userId)
    const filepath = join(uploadDir, uniqueFilename)

    await mkdir(uploadDir, { recursive: true })
    await writeFile(filepath, processedBuffer)

    return {
        success: true,
        url: `/api/uploads/users/${userId}/${uniqueFilename}`,
        path: filepath,
        filename: uniqueFilename
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
    const filename = urlPath.split("/").pop()

    if (!filename) {
        throw new Error("Could not determine original filename from URL")
    }

    return upload(buffer, filename, contentType, options)
}
