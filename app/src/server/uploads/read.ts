import { readFile } from "fs/promises"
import { join } from "path"

export const PUBLIC_NAMESPACES = ["products", "stores", "posts"]

export const CONTENT_TYPES: Record<string, string> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
    gif: "image/gif"
}

export function getExternalUrl(path: string): string {
    return new URL(path, process.env.BASE_URL).toString()
}

export function getContentType(filename: string): string {
    const ext = filename.split(".").pop()?.toLowerCase() || ""
    return CONTENT_TYPES[ext] || "image/jpeg"
}

export async function readUploadedFile(path: string[], allowPrivate = false) {
    if (path.length <= 1) {
        throw new Error("Invalid path")
    }

    const [namespace] = path

    if (!PUBLIC_NAMESPACES.includes(namespace) && !allowPrivate) {
        throw new Error("Invalid namespace")
    }
    for (const segment of path) {
        const sanitized = segment.replace(/[^a-zA-Z0-9._-]/g, "")
        if (sanitized !== segment || segment.includes("..")) {
            throw new Error("Invalid path segment")
        }
    }

    const filepath = join(process.cwd(), "uploads", ...path)
    return await readFile(filepath)
}
