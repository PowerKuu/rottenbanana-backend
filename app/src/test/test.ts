import "dotenv/config"
import { pipeline, env } from "@huggingface/transformers"
import { scrapers } from "@/server/scraper/scrapers"

env.allowRemoteModels = true
env.allowLocalModels = true
env.cacheDir = "../models/transformers"

async function testBGRM() {
    const MODEL1 = "onnx-community/BEN2-ONNX"
    const MODEL2 = "briaai/RMBG-1.4"
    const segmenter = await pipeline("background-removal", MODEL2, {
        dtype: "fp16"
    })
    const url =
        "https://img01.ztat.net/article/spp-media-p1/7aef855650734b28a87eeba414abb460/c62ef7b6786e485d9f03b3de6141d6b2.jpg?imwidth=1000"
    const output = await segmenter(url)
    output[0].save("mask.png")
}

async function testScraper() {
    const URL =
        "https://www.zalando.no/copenhagen-muse-cmmaryann-shirt-skjortebluse-bright-white-w-goji-berry-c3a21e029-a11.html"
    console.log("Testing scraper for URL:", URL)
    const scraped = await scrapers.find((s) => s.scraperIdentifier === "zalando")?.scrape(URL)

    console.log(scraped)
}

testScraper()

//testBGRM().catch(console.error);
