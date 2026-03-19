import { join } from "path"
import ffmpegBin from "ffmpeg-static"
import sharp from "sharp"
import { execFile } from "node:child_process"
import { promisify } from "node:util"
import { mkdir, rmdir } from "node:fs/promises"

const execFileAsync = promisify(execFile)

const TEMP_DIR = join(__dirname, "frames")

async function createVideoFromFrames(
    fps: number,
    outputPath: string,
    totalFrames: number,
    motionBlurFrames: number = 0,
    motionBlurIntensity: number = 1
) {
    if (!ffmpegBin) {
        throw new Error("ffmpeg-static binary not found")
    }

    const framePattern = join(TEMP_DIR, "frame_%04d.png")

    const args = ["-framerate", fps.toString(), "-i", framePattern]

    if (motionBlurFrames > 0) {
        const weights = Array(motionBlurFrames).fill(motionBlurIntensity).join(" ")
        const extraFrames = motionBlurFrames - 1
        // Apply motion blur, then trim off the prepended frames
        args.push("-vf", `tmix=frames=${motionBlurFrames}:weights='${weights}',trim=start_frame=${extraFrames}:end_frame=${extraFrames + totalFrames}`)
    }

    args.push(
        "-c:v",
        "libx264",
        "-preset",
        "slow",
        "-crf",
        "18",
        "-pix_fmt",
        "yuv420p",
        "-movflags",
        "+faststart",
        "-y",
        outputPath
    )

    await execFileAsync(ffmpegBin, args)
}

interface Keyframe {
    frame: number
    zoom: number
    panX: number
    panY: number
}

// Smooth easing function
function easeInOutCubic(t: number, strength: number = 1): number {
    if (strength === 0) return t // No easing, linear

    const eased = t < 0.5
        ? 4 * t * t * t
        : 1 - Math.pow(-2 * t + 2, 3) / 2

    return t + (eased - t) * strength
}

// Cubic Bezier interpolation
function cubicBezier(p0: number, p1: number, p2: number, p3: number, t: number, easingStrength: number = 0): number {
    const easedT = easeInOutCubic(t, easingStrength)

    const u = 1 - easedT
    const tt = easedT * easedT
    const uu = u * u
    const uuu = uu * u
    const ttt = tt * easedT

    const cp1 = p1 + (p2 - p0) / 6
    const cp2 = p2 - (p3 - p1) / 6

    return uuu * p1 + 3 * uu * easedT * cp1 + 3 * u * tt * cp2 + ttt * p2
}

function interpolateKeyframes(
    keyframes: Keyframe[],
    currentFrame: number,
): { zoom: number; panX: number; panY: number } {
    const EASING_STRENGTH = 0.5 // Adjust for more or less easing in the motion
    
    const nextIdx = keyframes.findIndex((kf) => kf.frame > currentFrame)
    const nextIndex = nextIdx === -1 ? keyframes.length - 1 : nextIdx
    const prevIndex = nextIdx <= 0 ? nextIndex : nextIndex - 1

    const frameRange = keyframes[nextIndex].frame - keyframes[prevIndex].frame
    const t = frameRange === 0 ? 0 : (currentFrame - keyframes[prevIndex].frame) / frameRange

    const beforeIndex = Math.max(0, prevIndex - 1)
    const afterIndex = Math.min(keyframes.length - 1, nextIndex + 1)

    const kf0 = keyframes[beforeIndex]
    const kf1 = keyframes[prevIndex]
    const kf2 = keyframes[nextIndex]
    const kf3 = keyframes[afterIndex]

    const zoom = cubicBezier(kf0.zoom, kf1.zoom, kf2.zoom, kf3.zoom, t, EASING_STRENGTH)
    const panX = cubicBezier(kf0.panX, kf1.panX, kf2.panX, kf3.panX, t, EASING_STRENGTH)
    const panY = cubicBezier(kf0.panY, kf1.panY, kf2.panY, kf3.panY, t, EASING_STRENGTH)

    return { zoom, panX, panY }
}
async function zoompanImage(
    inputPath: string,
    outputPath: string,
    keyframes: Keyframe[],
    duration: number,
    fps: number,
    motionBlurFrames: number = 3,
    motionBlurIntensity: number = 0.1
) {
    await mkdir(TEMP_DIR, { recursive: true })

    const totalFrames = duration * fps
    const inputImage = sharp(inputPath)
    const metadata = await inputImage.metadata()

    if (!metadata.width || !metadata.height) {
        throw new Error("Could not get image dimensions")
    }

    // Ensure dimensions are even (required for libx264)
    const width = metadata.width % 2 === 0 ? metadata.width : metadata.width - 1
    const height = metadata.height % 2 === 0 ? metadata.height : metadata.height - 1

    const SUPERSAMPLE_FACTOR = 4
    const outputWidth = width % 2 === 0 ? width : width - 1
    const outputHeight = height % 2 === 0 ? height : height - 1

    const upscaledImage = await sharp(inputPath)
        .resize(width * SUPERSAMPLE_FACTOR, height * SUPERSAMPLE_FACTOR, {
            kernel: "lanczos3",
            fit: "fill"
        })
        .toBuffer()

    const upscaledWidth = width * SUPERSAMPLE_FACTOR
    const upscaledHeight = height * SUPERSAMPLE_FACTOR

    // Generate frames with prepended frames from end for looping motion blur
    const extraFrames = motionBlurFrames > 0 ? motionBlurFrames - 1 : 0
    const framesToGenerate = totalFrames + extraFrames

    for (let i = 0; i < framesToGenerate; i++) {
        // For the first few frames, use frames from the end of the loop
        const frameIndex = (i - extraFrames + totalFrames) % totalFrames
        const { zoom, panX, panY } = interpolateKeyframes(keyframes, frameIndex)
        const framePath = join(TEMP_DIR, `frame_${String(i).padStart(4, "0")}.png`)

        const extractWidth = upscaledWidth / zoom
        const extractHeight = upscaledHeight / zoom

        const centerX = upscaledWidth / 2 + panX * SUPERSAMPLE_FACTOR
        const centerY = upscaledHeight / 2 + panY * SUPERSAMPLE_FACTOR

        let left = centerX - extractWidth / 2
        let top = centerY - extractHeight / 2

        left = Math.max(0, Math.min(upscaledWidth - extractWidth, left))
        top = Math.max(0, Math.min(upscaledHeight - extractHeight, top))

        let extractLeft = Math.round(left)
        let extractTop = Math.round(top)
        let extractW = Math.round(extractWidth)
        let extractH = Math.round(extractHeight)

        if (extractLeft + extractW > upscaledWidth) {
            extractW = upscaledWidth - extractLeft
        }
        if (extractTop + extractH > upscaledHeight) {
            extractH = upscaledHeight - extractTop
        }

        extractW = Math.max(1, extractW)
        extractH = Math.max(1, extractH)

        await sharp(upscaledImage)
            .extract({
                left: extractLeft,
                top: extractTop,
                width: extractW,
                height: extractH
            })
            .resize(outputWidth, outputHeight, {
                fit: "fill",
                kernel: "lanczos3"
            })
            .toFile(framePath)

        console.log(`Generated frame ${i + 1}/${framesToGenerate}`)
    }

    await createVideoFromFrames(fps, outputPath, totalFrames, motionBlurFrames, motionBlurIntensity)
   await rmdir(TEMP_DIR, { recursive: true })
}

function generateRandomKeyframes(totalFrames: number, keyframeCount: number = 6): Keyframe[] {
    const MIN_RADIUS_OFFSET = 3
    const MAX_RADIUS_OFFSET = 6
    const MIN_INITIAL_RADIUS = 30
    const MAX_INITIAL_RADIUS = 50
    const MAX_OFFSET = 5
    const MIN_ZOOM = 1.125
    const MAX_INITIAL_ZOOM = 1.2
    const MIN_INITIAL_ZOOM = MIN_ZOOM
    const MAX_ZOOM_OFFSET = 0.15
    const MIN_ZOOM_OFFSET = 0.005

    const keyframes: Keyframe[] = []

    let firstKeyframe: Keyframe | null = null
    const startAngle = Math.random() * Math.PI * 2

    let currentRadius = Math.random() * (MAX_INITIAL_RADIUS - MIN_INITIAL_RADIUS) + MIN_INITIAL_RADIUS
    let currentZoom = MIN_INITIAL_ZOOM + Math.random() * (MAX_INITIAL_ZOOM - MIN_INITIAL_ZOOM)

    for (let i = 0; i < keyframeCount - 1; i++) {
        const angle = startAngle + ((i - 1) / (keyframeCount - 1)) * Math.PI * 2

        currentRadius += (MIN_RADIUS_OFFSET + Math.random() * (MAX_RADIUS_OFFSET - MIN_RADIUS_OFFSET)) * (Math.random() < 0.5 ? -1 : 1)

        const offsetX = (Math.random() - 0.5) * MAX_OFFSET * 2
        const offsetY = (Math.random() - 0.5) * MAX_OFFSET * 2

        const panX = Math.cos(angle) * currentRadius + offsetX
        const panY = Math.sin(angle) * currentRadius + offsetY

        currentZoom += (MIN_ZOOM_OFFSET + Math.random() * (MAX_ZOOM_OFFSET - MIN_ZOOM_OFFSET)) * (Math.random() < 0.5 ? -1 : 1)
        currentZoom = Math.max(MIN_ZOOM, currentZoom)

        const keyframe: Keyframe = {
            frame: Math.floor((i / (keyframeCount - 1)) * totalFrames),
            zoom: currentZoom,
            panX,
            panY
        }

        if (!firstKeyframe) firstKeyframe = keyframe
        keyframes.push(keyframe)
    }

    if (firstKeyframe)
        keyframes.push({
            ...firstKeyframe,
            frame: totalFrames - 1
        })

    return keyframes
}
async function visualizePath() {
    const duration = 15
    const fps = 30
    const totalFrames = duration * fps

    const keyframes: Keyframe[] = generateRandomKeyframes(totalFrames)

    const Y_PAN_RANGE = 30*2.5
    const X_PAN_RANGE = 20*2.5
    const SCALE = 10 
    const MARGIN = 50

    const canvasWidth = X_PAN_RANGE * 2 * SCALE + MARGIN * 2
    const canvasHeight = Y_PAN_RANGE * 2 * SCALE + MARGIN * 2

    // Create SVG
    let svg = `<svg width="${canvasWidth}" height="${canvasHeight}" xmlns="http://www.w3.org/2000/svg">\n`

    // Background
    svg += `  <rect width="${canvasWidth}" height="${canvasHeight}" fill="#1a1a1a"/>\n`

    // Draw bounds
    svg += `  <rect x="${MARGIN}" y="${MARGIN}" width="${X_PAN_RANGE * 2 * SCALE}" height="${Y_PAN_RANGE * 2 * SCALE}" fill="none" stroke="#444" stroke-width="2" stroke-dasharray="5,5"/>\n`

    // Center crosshair
    const centerX = MARGIN + X_PAN_RANGE * SCALE
    const centerY = MARGIN + Y_PAN_RANGE * SCALE
    svg += `  <line x1="${centerX - 10}" y1="${centerY}" x2="${centerX + 10}" y2="${centerY}" stroke="#666" stroke-width="1"/>\n`
    svg += `  <line x1="${centerX}" y1="${centerY - 10}" x2="${centerX}" y2="${centerY + 10}" stroke="#666" stroke-width="1"/>\n`

    // Convert pan coordinates to canvas coordinates
    const toCanvasX = (panX: number) => MARGIN + (panX + X_PAN_RANGE) * SCALE
    const toCanvasY = (panY: number) => MARGIN + (panY + Y_PAN_RANGE) * SCALE

    // Draw path lines
    for (let i = 0; i < keyframes.length - 1; i++) {
        const kf1 = keyframes[i]
        const kf2 = keyframes[i + 1]
        const x1 = toCanvasX(kf1.panX)
        const y1 = toCanvasY(kf1.panY)
        const x2 = toCanvasX(kf2.panX)
        const y2 = toCanvasY(kf2.panY)

        const opacity = 0.3 + (i / keyframes.length) * 0.5
        svg += `  <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#4a9eff" stroke-width="2" opacity="${opacity}"/>\n`

        // Draw arrow
        const angle = Math.atan2(y2 - y1, x2 - x1)
        const arrowSize = 8
        const midX = (x1 + x2) / 2
        const midY = (y1 + y2) / 2
        const arr1X = midX - arrowSize * Math.cos(angle - Math.PI / 6)
        const arr1Y = midY - arrowSize * Math.sin(angle - Math.PI / 6)
        const arr2X = midX - arrowSize * Math.cos(angle + Math.PI / 6)
        const arr2Y = midY - arrowSize * Math.sin(angle + Math.PI / 6)

        svg += `  <polygon points="${midX},${midY} ${arr1X},${arr1Y} ${arr2X},${arr2Y}" fill="#4a9eff" opacity="${opacity}"/>\n`
    }

    // Draw keyframe points
    keyframes.forEach((kf, i) => {
        const x = toCanvasX(kf.panX)
        const y = toCanvasY(kf.panY)

        if (i === 0 || i === keyframes.length - 1) {
            // Start and end points - larger and green
            svg += `  <circle cx="${x}" cy="${y}" r="8" fill="#4ade80" stroke="#fff" stroke-width="2"/>\n`
            svg += `  <text x="${x}" y="${y - 15}" fill="#4ade80" font-size="12" text-anchor="middle" font-family="monospace">${i === 0 ? "START" : "END"}</text>\n`
        } else {
            // Regular keyframes
            svg += `  <circle cx="${x}" cy="${y}" r="5" fill="#ff6b6b" stroke="#fff" stroke-width="2"/>\n`
            svg += `  <text x="${x}" y="${y - 10}" fill="#fff" font-size="10" text-anchor="middle" font-family="monospace">${i}</text>\n`
        }
    })

    svg += `</svg>`

    // Save SVG
    const outputPath = join(__dirname, "path_visualization.svg")
    const fs = await import("fs/promises")
    await fs.writeFile(outputPath, svg)

    console.log(`Path visualization saved to: ${outputPath}`)
    console.log("\nKeyframes:")
    keyframes.forEach((kf, i) => {
        console.log(
            `  ${i}: frame=${kf.frame}, panX=${kf.panX.toFixed(2)}, panY=${kf.panY.toFixed(2)}, zoom=${kf.zoom.toFixed(3)}`
        )
    })
}

export async function test() {
    const inputPath = join(__dirname, "test.jpg")
    const outputPath = join(__dirname, "output.mp4")

    const duration = 10 // In seconds
    const fps = 30
    const totalFrames = duration * fps

    const keyframes: Keyframe[] = generateRandomKeyframes(totalFrames)
    await visualizePath()
    await zoompanImage(inputPath, outputPath, keyframes, duration, fps)
}
