import { ProductCategory, ProductSlot } from "@/prisma/enums"
import z from "zod"
import { prisma } from "../database/prisma"
import { generateText, Output } from "ai"
import { ScrapedProduct } from "../scraper/types"
import { analyzeProductPrompt } from "./prompts"


export async function analyzeProduct(scrapedProduct: ScrapedProduct) {
    const tags = await prisma.preferenceTag.findMany()
    const avalilableTags = tags.map(({ tag }) => tag)
    const avalilableSlots = Object.values(ProductSlot)
    const avalilableCategories = Object.values(ProductCategory)

    const AnalyzeProductSchema = z.object({
        tags: z
            .array(z.enum(avalilableTags))
            .describe("Select tags that best describe the product's style, material, occasion, and key features"),
        slot: z
            .enum(avalilableSlots)
            .describe("Product slot based on visual analysis of images (prioritize what you see over the title)"),
        category: z
            .enum(avalilableCategories)
            .describe("Product category based on visual analysis of images (prioritize what you see over the title)"),
        description: z.string().describe("A concise description of the product (2-3 sentences), in English."),
        primaryColorHex: z
            .string()
            .regex(/^#([0-9A-F]{3}){1,2}$/i)
            .describe("The dominant/most visible color of the product in HEX format (e.g., #FF5733)"),
        keepBackgroundImageIndexes: z
            .array(z.number())
            .describe(
                "RARELY USED: Only include indexes where the ENTIRE image IS the product itself with no separation from background (e.g., a product texture filling the entire frame). DO NOT include images with white, solid color, or studio backgrounds - these should have backgrounds removed. This is an uncommon edge case"
            ),
        productOnlyImageIndex: z
            .number()
            .int()
            .min(0)
            .max(scrapedProduct.imageUrls.length - 1)
            .nullable()
            .describe(
                "Index of standalone product image (flat-lay/mannequin/product-only). Must be 100% certain: ONLY the product itself, NO person wearing it. Null only if EVERY image has a person wearing the product."
            ),
        personFrontImageIndex: z
            .number()
            .int()
            .min(0)
            .max(scrapedProduct.imageUrls.length - 1)
            .nullable()
            .describe(
                "Index of the clearest front-facing image of a person wearing the product, or null if none exists"
            ),
        personBackImageIndex: z
            .number()
            .int()
            .min(0)
            .max(scrapedProduct.imageUrls.length - 1)
            .nullable()
            .describe("Index of the clearest back-facing image of a person wearing the product, or null if none exists"),
        isInappropriate: z.boolean().describe("Flag products that are underwear (including plain undergarments), lingerie, swimwear, sheer/transparent clothing")
    })

    const imageContent = scrapedProduct.imageUrls.flatMap((url, index) => [
        {
            type: "text" as const,
            text: `Image ${index}:`
        },
        {
            type: "image" as const,
            image: url
        }
    ])

    const response = await generateText({
        model: "google/gemini-2.5-flash",
        output: Output.object({
            schema: AnalyzeProductSchema
        }),
        messages: [
            {
                role: "user",
                content: [
                    {
                        type: "text",
                        text: analyzeProductPrompt(scrapedProduct, tags)
                    },
                    ...imageContent
                ]
            }
        ]
    })

    return response.output
}
