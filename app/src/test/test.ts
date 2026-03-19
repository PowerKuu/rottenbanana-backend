import "dotenv/config"
import { pipeline, env } from "@huggingface/transformers"
import { scrapers } from "@/server/scraper/scrapers"
import { spawnSync } from "child_process"
import ffmpegBin from "ffmpeg-static"
import sharp from "sharp"

import { rm, rmSync, writeFileSync } from "fs"
import { join } from "path"
import { cwd } from "process"
import { mkdir } from "fs/promises"
import { test } from "./fpan"
import { drawSeedTags } from "@/server/system/algorithm/drawSeedTags"
import { hex } from "zod"
import { recommendProducts } from "@/server/system/algorithm/recommendProducts"
import { hexToCIELAB } from "@/lib/utils"

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

interface Keyframe {
    frame: number
    zoom: number
    panX: number
    panY: number
}

// Smoothest easing function (ease-in-out quintic for ultra-smooth motion)
function easeInOutQuintic(t: number): number {
    return t < 0.5 ? 16 * t * t * t * t * t : 1 - Math.pow(-2 * t + 2, 5) / 2
}

// Linear interpolation
function lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t
}

// Find the two keyframes surrounding a given frame and interpolate
function interpolateKeyframes(frame: number, keyframes: Keyframe[]): { zoom: number; panX: number; panY: number } {
    // Find the keyframes before and after the current frame
    let prevKeyframe = keyframes[0]
    let nextKeyframe = keyframes[keyframes.length - 1]

    for (let i = 0; i < keyframes.length - 1; i++) {
        if (frame >= keyframes[i].frame && frame <= keyframes[i + 1].frame) {
            prevKeyframe = keyframes[i]
            nextKeyframe = keyframes[i + 1]
            break
        }
    }

    // Calculate interpolation factor (0 to 1)
    const frameDiff = nextKeyframe.frame - prevKeyframe.frame
    const t = frameDiff === 0 ? 0 : (frame - prevKeyframe.frame) / frameDiff

    // Apply easing
    const easedT = easeInOutQuintic(t)

    // Interpolate all values
    return {
        zoom: lerp(prevKeyframe.zoom, nextKeyframe.zoom, easedT),
        panX: lerp(prevKeyframe.panX, nextKeyframe.panX, easedT),
        panY: lerp(prevKeyframe.panY, nextKeyframe.panY, easedT)
    }
}

async function testProducts() {
    const products = await recommendProducts(3, {
        colorCIELAB: hexToCIELAB("#EDE8D0"),
    })

    console.log("Recommended products:", products.map(p => ({ id: p.id, name: p.name, url: p.url })))
}

//test().catch(console.error)
testProducts().catch(console.error)
/* drawSeedTags(3).then((tags) => {
    console.log("Drawn seed tags:", tags)
}).catch(console.error); */

//testBGRM().catch(console.error);
