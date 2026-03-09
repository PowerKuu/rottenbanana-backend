import { startProductCronJob } from "@/server/cronjobs/products"

export async function main() {
    startProductCronJob()
}
