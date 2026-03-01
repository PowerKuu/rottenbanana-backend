import { pipeline, RawImage } from "@xenova/transformers"
import sharp from "sharp"

export async function removeBackground(image: Buffer): Promise<Buffer> {
    const segmenter = await pipeline("image-segmentation", "briaai/RMBG-2.0")
    const rawImage = await RawImage.fromBlob(new Blob([new Uint8Array(image)]));

    const result = await segmenter(rawImage);
    const mask = result[0].mask;

    const maskBuffer = Buffer.from(mask.data);
    const { width, height } = rawImage;

    const maskImage = await sharp(maskBuffer, {
        raw: { width, height, channels: 1 }
    })
        .toBuffer();

    return sharp(image)
        .ensureAlpha()
        .composite([{
            input: maskImage,
            blend: 'dest-in'
        }])
        .png()
        .toBuffer();
}
