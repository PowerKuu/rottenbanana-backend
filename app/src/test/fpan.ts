import { join } from "path"
import ffmpegBin from "ffmpeg-static";
import sharp from "sharp"
import { execFile } from "node:child_process"
import { promisify } from "node:util"
import { mkdir, rmdir } from "node:fs/promises";

const execFileAsync = promisify(execFile)

const TEMP_DIR = join(__dirname, "frames")

interface Keyframe {
    frame: number;
    zoom: number;
    panX: number;
    panY: number;
}

function lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
}

function interpolateKeyframes(keyframes: Keyframe[], currentFrame: number): { zoom: number; panX: number; panY: number } {
    const previousKeyframe = keyframes.reduce((prev, curr) => (curr.frame <= currentFrame ? curr : prev), keyframes[0]);
    const nextKeyframe = keyframes.find(kf => kf.frame > currentFrame) || keyframes[keyframes.length - 1];

    const frameRange = nextKeyframe.frame - previousKeyframe.frame;
    const t = frameRange === 0 ? 0 : (currentFrame - previousKeyframe.frame) / frameRange;

    // Use linear interpolation for smooth, constant-speed motion
    const zoom = lerp(previousKeyframe.zoom, nextKeyframe.zoom, t);
    const panX = lerp(previousKeyframe.panX, nextKeyframe.panX, t);
    const panY = lerp(previousKeyframe.panY, nextKeyframe.panY, t);

    return { zoom, panX, panY };
}

async function createVideoFromFrames(fps: number, outputPath: string, motionBlurFrames: number = 0, motionBlurIntensity: number = 1) {
    if (!ffmpegBin) {
        throw new Error("ffmpeg-static binary not found");
    }

    const framePattern = join(TEMP_DIR, "frame_%04d.png");

    const args = [
        "-framerate", fps.toString(),
        "-i", framePattern,
    ];

    // Add motion blur filter if enabled
    if (motionBlurFrames > 0) {
        const weights = Array(motionBlurFrames).fill(motionBlurIntensity).join(' ');
        args.push("-vf", `tmix=frames=${motionBlurFrames}:weights='${weights}'`);
    }

    args.push(
        "-c:v", "libx264",
        "-preset", "slow",           // Better quality encoding
        "-crf", "18",                 // High quality (lower = better, 18 is visually lossless)
        "-pix_fmt", "yuv420p",
        "-movflags", "+faststart",    // Better streaming
        "-y",
        outputPath
    );

    await execFileAsync(ffmpegBin, args);
}

async function zoompanImage(inputPath: string, outputPath: string, keyframes: Keyframe[], duration: number, fps: number, motionBlurFrames: number = 3, motionBlurIntensity: number = 1) {
    await mkdir(TEMP_DIR, { recursive: true })

    const totalFrames = duration * fps

    // Get image dimensions
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

    for (let i = 0; i < totalFrames; i++) {
        const { zoom, panX, panY } = interpolateKeyframes(keyframes, i)
        const framePath = join(TEMP_DIR, `frame_${String(i).padStart(4, "0")}.png`)

        const extractWidth = (upscaledWidth / zoom)
        const extractHeight = (upscaledHeight / zoom)

        const centerX = upscaledWidth / 2 + (panX * SUPERSAMPLE_FACTOR)
        const centerY = upscaledHeight / 2 + (panY * SUPERSAMPLE_FACTOR)

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

        console.log(`Generated frame ${i + 1}/${totalFrames}`)
    }

    await createVideoFromFrames(fps, outputPath, motionBlurFrames, motionBlurIntensity)
    await rmdir(TEMP_DIR, { recursive: true })
}

export async function test() {
    const inputPath = join(__dirname, "test.jpg");
    const outputPath = join(__dirname, "output.mp4");

    const duration = 15; // In seconds
    const fps = 30;
    const totalFrames = duration * fps;

    const keyframes: Keyframe[] = [
        { frame: 0,                  zoom: 1.1,  panX: -80,  panY: 20  },
        { frame: totalFrames * 0.4,  zoom: 1.2, panX: 0,    panY: -10 },
        { frame: totalFrames,        zoom: 1.1, panX: 80,   panY: -40 },
    ];

    await zoompanImage(inputPath, outputPath, keyframes, duration, fps, 3, 1);
}
