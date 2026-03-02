import { pipeline, RawImage, env } from "@huggingface/transformers"
import sharp from "sharp"

env.allowRemoteModels = true
env.allowLocalModels = true
env.cacheDir = "./.cache/transformers"

export async function removeBackground(image: Buffer): Promise<Buffer> {
    const segmenter = await pipeline("background-removal", "briaai/RMBG-1.4", {
        dtype: "fp32"
    })
    
    const rawImage = await RawImage.fromBlob(new Blob([new Uint8Array(image)]))

    const result = await segmenter(rawImage)
    const outputImage = result[0]

    const { data, width, height, channels } = outputImage

    return await sharp(Buffer.from(data), {
        raw: {
            width,
            height,
            channels
        }
    }).png().toBuffer()
}
