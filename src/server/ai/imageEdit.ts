import { removeUndefinedValues } from "@/lib/utils"
import axios from "axios"

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY
const BFL_API_KEY = process.env.BFL_API_KEY

if (!GOOGLE_API_KEY || !BFL_API_KEY) {
    throw new Error("Missing API keys for Google or BFL")
}

export async function imageEditGoogle(prompt: string, imagesBase64: string[], output: Partial<{
    aspectRatio: "1:1" | "3:2" | "2:3" | "3:4" | "4:3" | "4:5" | "5:4" | "9:16" | "16:9" | "21:9"
    imageSize: "1K" | "2K" | "4K"
    format: "png" | "jpeg"
}> = {}) {
    const MODEL = "gemini-3-pro-image-preview" as const

    if (imagesBase64.length === 0 || imagesBase64.length > 14) {
        throw new Error("Must provide between 1 and 14 images")
    }

    const parts = [
        { text: prompt },
        ...imagesBase64.map(imageData => ({
            inline_data: {
                mime_type: output.format === "png" ? "image/png" : "image/jpeg",
                data: imageData
            }
        }))
    ]

    const body = {
        contents: [{ parts }],
        generationConfig: {
            responseModalities: ["IMAGE"],
            imageConfig: removeUndefinedValues({
                aspect_ratio: output.aspectRatio,
                image_size: output.imageSize || "2K"
            })
        }
    }

    return axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
        body,
        {
            headers: {
                "x-goog-api-key": GOOGLE_API_KEY,
                "Content-Type": "application/json"
            }
        }
    )
}

export async function imageEditBFL(prompt: string, imagesBase64: string[], output: Partial<{
    width: number
    height: number
    format: "png" | "jpeg"
}> = {}) {
    const MODEL = "flux-2-klein-9b" as const

    if (imagesBase64.length === 0 || imagesBase64.length > 8) {
        throw new Error("Must provide between 1 and 8 images")
    }

    const [ refrenceImage, ...additionalImages ] = imagesBase64

    const body: Record<string, string | number> = removeUndefinedValues({
        prompt,
        input_image: refrenceImage,
        width: output.width,
        height: output.height,
        format: output.format
    })

    for (const [i, image] of additionalImages.entries()) {
        body[`input_image_${i + 2}`] = image
    }

    return axios.post(`https://api.bfl.ai/v1/${MODEL}`, body, {
        headers: {
            "x-key": BFL_API_KEY,
            "Content-Type": "application/json"
        }
    })
}
