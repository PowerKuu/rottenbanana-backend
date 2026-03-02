import { pipeline, RawImage, env } from "@huggingface/transformers"
import sharp from "sharp"

env.allowRemoteModels = true
env.allowLocalModels = true
env.cacheDir = "../models/transformers"

export async function removeBackground(image: Buffer | string): Promise<Buffer> {
    const segmenter = await pipeline("background-removal", "briaai/RMBG-1.4", {
        dtype: "fp16"
    })
    
    const rawImage = typeof image === "string" ? image : await RawImage.fromBlob(new Blob([new Uint8Array(image)]))

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