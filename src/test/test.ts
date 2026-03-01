import { scrapers } from "@/server/scaper/scrapers"

async function test() {
    const URL = "https://www.zalando.no/copenhagen-muse-cmmaryann-shirt-skjortebluse-bright-white-w-goji-berry-c3a21e029-a11.html"
    console.log("Testing scraper for URL:", URL)
    const scraped = await scrapers.find((s) => s.storeIdentifier === "zalando")?.scrape(URL)

    console.log(scraped)
}

test()