import { removeUndefinedValues } from "@/lib/utils"
import axios from "axios"

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY

if (!GOOGLE_API_KEY) {
    throw new Error("Missing API key for Google")
}

export async function generateImageGoogle(
    prompt: string,
    model: "gemini-3.1-flash-image-preview" | "gemini-3-pro-image-preview" = "gemini-3.1-flash-image-preview",
    images: Buffer[] = [],
    output: Partial<{
        aspectRatio: "1:1" | "3:2" | "2:3" | "3:4" | "4:3" | "4:5" | "5:4" | "9:16" | "16:9" | "21:9"
        imageSize: "1K" | "2K" | "4K"
        format: "png" | "jpeg"
    }> = {}
): Promise<Buffer> {
    if (images.length > 14) {
        throw new Error("Must provide at most 14 images")
    }

    const parts = [
        { text: prompt },
        ...images.map((imageBuffer) => ({
            inline_data: {
                mime_type: output.format === "png" ? "image/png" : "image/jpeg",
                data: imageBuffer.toString("base64")
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

    const response = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        body,
        {
            headers: {
                "x-goog-api-key": GOOGLE_API_KEY,
                "Content-Type": "application/json"
            }
        }
    )

    console.log("Google API response structure:", {
        candidates: response.data?.candidates?.length,
        finishReason: response.data?.candidates?.[0]?.finishReason,
        hasContent: !!response.data?.candidates?.[0]?.content
    })

    const responseParts = response.data?.candidates?.[0]?.content?.parts || []
    console.log("Number of parts:", responseParts.length)
    console.log("Part keys:", responseParts.map((part: any) => Object.keys(part)))

    const imagePart = responseParts.find((part: any) => !!part.inlineData)
    console.log("Image part found:", !!imagePart)
    if (imagePart) {
        console.log("Image part structure:", {
            keys: Object.keys(imagePart),
            hasInlineData: !!imagePart.inlineData,
            inlineDataKeys: imagePart.inlineData ? Object.keys(imagePart.inlineData) : "none",
            hasData: !!imagePart.inlineData?.data,
            dataLength: imagePart.inlineData?.data?.length || 0
        })
    }

    if (!imagePart?.inlineData?.data) {
        throw new Error("No image data returned from Google API")
    }

    return Buffer.from(imagePart.inlineData.data as string, "base64")
}
