import { PendingProductStatus } from "@/prisma/enums"
import { prisma } from "../database/prisma"
import { scrapeAndAnalyzeProduct, scrapeProduct } from "../scraper/scraper"
import chalk from "chalk"

const INTERVAL = 5000 // 5 seconds
const MAX_CONCURRENCY = 1

const logPrefix = chalk.blue("[PendingProductsCronJob]")

async function tickPendingProducts() {
    const approvedJobs = await prisma.pendingProduct.findMany({
        where: {
            status: PendingProductStatus.APPROVED
        }
    })

    if (approvedJobs.length <= 0) {
        return
    }

    const processingJobs = await prisma.pendingProduct.findMany({
        where: {
            status: PendingProductStatus.PROCESSING
        }
    })

    const availableSlots = MAX_CONCURRENCY - processingJobs.length

    if (availableSlots <= 0) {
        return
    }

    const jobsToProcess = approvedJobs.slice(0, availableSlots)

    await prisma.pendingProduct.updateMany({
        where: {
            id: {
                in: jobsToProcess.map((job) => job.id)
            }
        },
        data: {
            status: PendingProductStatus.PROCESSING
        }
    })

    for (const job of jobsToProcess) {
        scrapeAndAnalyzeProduct(job.url)
            .then(async () => {
                console.log(`${logPrefix} Successfully processed product ${job.url}`)

                await prisma.pendingProduct.update({
                    where: { id: job.id },
                    data: {
                        status: PendingProductStatus.COMPLETED
                    }
                })
            })
            .catch(async (error) => {
                console.error(`${logPrefix} Failed to process product ${job.url}:`, error)

                await prisma.pendingProduct.update({
                    where: { id: job.id },
                    data: {
                        status: PendingProductStatus.FAILED
                    }
                })
            })
    }
}

export function startPendingProductsCronJob() {
    const tickJob = () => {
        setTimeout(() => tickPendingProducts().finally(tickJob), INTERVAL)
    }

    tickJob()
}
