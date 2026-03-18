import { join } from "path"
import ffmpegBin from "ffmpeg-static";
import sharp from "sharp"
import { execFile } from "node:child_process"
import { promisify } from "node:util"
import { mkdir, rmdir } from "node:fs/promises";

const execFileAsync = promisify(execFile)

const TEMP_DIR = join(__dirname, "frames")


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


interface Keyframe {
    frame: number;
    zoom: number;
    panX: number;
    panY: number;
}

// Cardinal spline interpolation for smooth, predictive curves through keyframes
// tension controls curve tightness: 0.0 = loose/flowing curves, 1.0 = tight/direct paths
function cardinalSpline(p0: number, p1: number, p2: number, p3: number, t: number, tension: number = 0): number {
    const t2 = t * t;
    const t3 = t2 * t;
    const s = (1 - tension) / 2; // Convert tension to tangent scale factor

    return (
        (-s * p0 + (2 - s) * p1 + (s - 2) * p2 + s * p3) * t3 +
        (2 * s * p0 + (s - 3) * p1 + (3 - 2 * s) * p2 - s * p3) * t2 +
        (-s * p0 + s * p2) * t +
        p1
    );
}

function interpolateKeyframes(keyframes: Keyframe[], currentFrame: number): { zoom: number; panX: number; panY: number } {
    const TENSION = 0.3

    // Find surrounding keyframes
    const currentIndex = keyframes.findIndex(kf => kf.frame > currentFrame);
    const nextIndex = currentIndex === -1 ? keyframes.length - 1 : currentIndex;
    const prevIndex = Math.max(0, nextIndex - 1);

    const previousKeyframe = keyframes[prevIndex];
    const nextKeyframe = keyframes[nextIndex];

    const frameRange = nextKeyframe.frame - previousKeyframe.frame;
    const t = frameRange === 0 ? 0 : (currentFrame - previousKeyframe.frame) / frameRange;

    // Get surrounding keyframes for spline calculation (considers neighbors for smooth prediction)
    const beforeIndex = Math.max(0, prevIndex - 1);
    const afterIndex = Math.min(keyframes.length - 1, nextIndex + 1);

    const kf0 = keyframes[beforeIndex];
    const kf1 = keyframes[prevIndex];
    const kf2 = keyframes[nextIndex];
    const kf3 = keyframes[afterIndex];

    // Use Cardinal spline for smooth floating motion that predicts the path
    const zoom = cardinalSpline(kf0.zoom, kf1.zoom, kf2.zoom, kf3.zoom, t, TENSION);
    const panX = cardinalSpline(kf0.panX, kf1.panX, kf2.panX, kf3.panX, t, TENSION);
    const panY = cardinalSpline(kf0.panY, kf1.panY, kf2.panY, kf3.panY, t, TENSION);

    return { zoom, panX, panY };
}
async function zoompanImage(inputPath: string, outputPath: string, keyframes: Keyframe[], duration: number, fps: number, motionBlurFrames: number = 3, motionBlurIntensity: number = 1) {
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
        { frame: 0,                  zoom: 1.3,  panX: -80,  panY: 20  },
        { frame: totalFrames * 0.4,  zoom: 1.2, panX: 0,    panY: -10 },
        { frame: totalFrames,        zoom: 1.3, panX: 80,   panY: -40 },
    ];

    await zoompanImage(inputPath, outputPath, keyframes, duration, fps, 3, 1);
}
