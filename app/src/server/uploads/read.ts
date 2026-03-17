import { File } from "@/prisma/client"
import { prisma } from "../database/prisma"
import { readFile } from "fs/promises"
import { join } from "path"
import { UPLOAD_DIR } from "./upload"

export async function getFile(id: string): Promise<File> {
    const file = await prisma.file.findUnique({ where: { id } })

    if (!file) {
        throw new Error("File not found")
    }

    return file
}

export async function readFileBuffer(file: File): Promise<Buffer> {
    const buffer = await readFile(join(UPLOAD_DIR, file.name))
    return buffer
}
