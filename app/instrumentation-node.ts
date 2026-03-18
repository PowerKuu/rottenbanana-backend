import { startPendingProductsCronJob } from "@/server/cronjobs/pendingProducts"
import { startScrapeProductsCronJob } from "@/server/cronjobs/scrapeProducts"

export async function main() {
    startPendingProductsCronJob()
    startScrapeProductsCronJob()
}
