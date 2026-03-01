import { ProductSlot } from "@/prisma/enums"
import z from "zod"
import { prisma } from "../database/prisma"
import { generateText, Output } from 'ai'
import { ScrapedProduct } from "../scaper/types"

const analyzeProductPrompt = (scrapedProduct: ScrapedProduct) => `
Analyze this product:
Name: ${scrapedProduct.name}
Gender: ${scrapedProduct.gender}
${scrapedProduct.description ? `Description: ${scrapedProduct.description}` : ''}
${scrapedProduct.brand ? `Brand: ${scrapedProduct.brand}` : ''}

I will provide ${scrapedProduct.imageUrls.length} images below. Please provide the tags, slot, description, color, and identify which image index (0-${scrapedProduct.imageUrls.length - 1}) shows only the product without a model.
`

export async function analyzeProduct(scrapedProduct: ScrapedProduct) {
    const tags = await prisma.preferenceTag.findMany()
    const avalilableTags = tags.map(({tag}) => tag)
    const avalilableSlots = Object.values(ProductSlot)

    const AnalyzeProductSchema = z.object({
        tags: z.array(z.enum(avalilableTags as [string, ...string[]])).describe(`Select the most relevant tags for this product from the following list: ${avalilableTags.join(", ")}`),
        slot: z.enum(avalilableSlots).describe("Which slot does this product belong to?"),
        description: z.string().describe("A brief description of the product"),
        primaryColorHex: z.string().regex(/^#([0-9A-F]{3}){1,2}$/i).describe("The color of the product in HEX format. Example: #FF5733"),
        productOnlyImageIndex: z.number().optional().describe("The index of the primary image showing only the product without a model"),
    })

    const system = `You are a fashion product analyzer. Analyze the provided product images and information to extract relevant metadata.`

    const imageContent = scrapedProduct.imageUrls.flatMap((url, index) => [
        {
            type: "text" as const,
            text: `Image ${index}:`,
        },
        {
            type: "image" as const,
            image: url,
        }
    ])

    const response = await generateText({
        model: "openai/gpt-4o-mini",
        output: Output.object({
            schema: AnalyzeProductSchema,
        }),
        messages: [
            {
                role: "system",
                content: system
            },

            {
                role: "user",
                content: [
                    {
                        type: "text",
                        text: analyzeProductPrompt(scrapedProduct)
                    },
                    ...imageContent,
                ]
            }
        ]
    })

    return response.output
}