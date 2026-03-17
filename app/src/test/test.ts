import "dotenv/config"
import { pipeline, env } from "@huggingface/transformers"
import { scrapers } from "@/server/scraper/scrapers"
import { spawnSync } from "child_process";
import ffmpegBin from "ffmpeg-static";
import sharp from "sharp";

import { rm, rmSync, writeFileSync } from "fs";
import { join } from "path";
import { cwd } from "process";

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

async function testVideoGen() {
    const inputPath = join(__dirname, "test.jpg");
    const outputPath = join(__dirname, "output.mp4");
    rmSync(outputPath, { force: true }) // Remove existing output if it exists
    const duration = 15; // Duration in seconds (configurable)
    const fps = 30; // Higher FPS for smoother motion

    console.log("Generating smooth zoompan video from image...")
    console.log(`Input: ${inputPath}`)
    console.log(`Output: ${outputPath}`)
    console.log(`Duration: ${duration}s, FPS: ${fps}`)

    if (!ffmpegBin) throw new Error("ffmpeg-static binary not found");

    // Use Sharp to get image dimensions
    const metadata = await sharp(inputPath).metadata();
    const originalWidth = metadata.width
    const originalHeight = metadata.height

    // Ensure dimensions are even (required for H.264 encoding)
    const width = originalWidth % 2 === 0 ? originalWidth : originalWidth - 1;
    const height = originalHeight % 2 === 0 ? originalHeight : originalHeight - 1;

    console.log(`Input dimensions: ${originalWidth}x${originalHeight}`);
    console.log(`Output dimensions: ${width}x${height} (adjusted to even)`);

    const totalFrames = duration * fps;

    // CINEMATIC SMOOTH PANNING & ZOOMING - ORBITAL MOTION
    // ====================================================
    // Key fix: Use d=1 and proper time-based expressions for continuous smooth motion

    const upscaleFactor = 6; // Upscale for room to pan (reduced for smoother operation)

    // Cinematic zoom: smooth zoom in or out over the entire duration
    const startZoom = 1.0;   // Starting zoom level
    const endZoom = 1.2;     // Ending zoom level (1.2 = 20% zoom in)

    // Random starting angle for variety
    const startAngle = Math.random() * Math.PI * 2; // Random start position on circle
    const direction = Math.random() > 0.5 ? 1 : -1; // Clockwise or counter-clockwise

    // Orbital motion parameters
    const orbitRadiusX = 0.15; // How far to orbit horizontally (15% of width)
    const orbitRadiusY = 0.15; // How far to orbit vertically (15% of height)
    const rotations = 0.3; // Number of full circles (0.3 = gentle arc motion)

    // Build the filter expression carefully to avoid parsing errors
    // Using 'on' (frame number starting from 1) is more reliable than 't' in zoompan
    const prog = `on/${totalFrames}`;

    // Smoothstep easing inline to avoid nesting issues
    const smoothstep = `${prog}*${prog}*(3-2*${prog})`;

    // Angle progresses smoothly through the orbit with easing
    const angle = `${startAngle.toFixed(4)}+${direction}*2*PI*${rotations}*${smoothstep}`;

    // Zoom with smooth easing
    const zoom = `${startZoom}+(${endZoom}-${startZoom})*${smoothstep}`;

    // CINEMATIC CONTINUOUS MOTION: Smooth orbital path with easing
    const zoomPanFilter = [
        `scale=${upscaleFactor}*iw:${upscaleFactor}*ih,`, // Upscale for room to pan
        `zoompan=`,
        `z='${zoom}'`, // Smooth zoom with easing
        `:d=1`, // Process every frame individually (KEY FIX for smooth motion!)
        `:x='iw/2-iw/zoom/2+(iw*${orbitRadiusX})*cos(${angle})'`, // Circular X motion
        `:y='ih/2-ih/zoom/2+(ih*${orbitRadiusY})*sin(${angle})'`, // Circular Y motion
        `:s=${width}x${height}`,
        `:fps=${fps}`,
        `,format=yuv420p` // Ensure compatibility
    ].join('');

    const result = spawnSync(ffmpegBin, [
        "-loop", "1",
        "-framerate", String(fps),
        "-i", inputPath,
        "-t", String(duration),
        "-vf", zoomPanFilter,
        "-c:v", "libx264",
        "-preset", "slow", // Better quality encoding
        "-crf", "18", // High quality (lower = better, 18 is visually lossless)
        "-pix_fmt", "yuv420p",
        "-y",
        outputPath,
    ], { stdio: "inherit" });

    if (result.status !== 0) throw new Error(`ffmpeg exited with code ${result.status}`);
    console.log("✅ Video generated successfully!");
}

testVideoGen()

//testBGRM().catch(console.error);
