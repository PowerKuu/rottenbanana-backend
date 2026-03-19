import { unlink } from "fs"
import { join } from "path"
import { prisma } from "../database/prisma"
import { UPLOAD_DIR } from "./upload"
import { rm } from "fs/promises"

export async function deleteFiles(fileIds: string[]) {
    return Promise.all(
        fileIds.map(async (id) => {
            const file = await prisma.file.findUnique({ where: { id } })
            if (!file) return

            const filePath = join(UPLOAD_DIR, file.name)
            await rm(filePath)

            await prisma.file.delete({ where: { id } })
        })
    )
}
