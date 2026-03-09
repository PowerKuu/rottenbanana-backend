import { PendingProductStatus } from "@/prisma/enums"
import { prisma } from "../database/prisma"
import { scrapeProduct } from "../scraper/scraper"

const INTERVAL = 1000
const CONCURRENCY = 3

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

    const availableSlots = CONCURRENCY - processingJobs.length

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
        scrapeProduct(job.url).then(async () => {
            await prisma.pendingProduct.update({
                where: { id: job.id },
                data: {
                    status: PendingProductStatus.COMPLETED
                }
            })
        })
    }
}

export function startProductCronJob() {
    const tickJob = () => {
        setTimeout(() => tickPendingProducts().finally(tickJob), INTERVAL)
    }

    tickJob()
}
