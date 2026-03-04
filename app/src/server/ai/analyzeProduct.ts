import { ProductSlot } from "@/prisma/enums"
import z from "zod"
import { prisma } from "../database/prisma"
import { generateText, Output } from 'ai'
import { ScrapedProduct } from "../scraper/types"
import { PreferenceTag } from "@/prisma/client"

const analyzeProductPrompt = (scrapedProduct: ScrapedProduct, tags: PreferenceTag[]) => `
Analyze this product:
Name: ${scrapedProduct.name}
Gender: ${scrapedProduct.gender}
${scrapedProduct.description ? `Description: ${scrapedProduct.description}` : ''}
${scrapedProduct.brand ? `Brand: ${scrapedProduct.brand}` : ''}

I will provide ${scrapedProduct.imageUrls.length} images below. Analyze and provide: tags, slot, description, color, which image shows the product without a model, and which images are close-ups/detail shots that should keep their background (only flag images showing zoomed details like labels or textures, not full product views).

Slots with descriptions:
"""
${ProductSlot.UPPERBODY_LAYER_1}: Base layer worn directly on skin. Examples: t-shirts, tank tops, polo shirts, dress shirts, button-ups, training shirts, wool shirts, long sleeve tees, graphic tees, henleys.
${ProductSlot.UPPERBODY_LAYER_2}: Mid-layer worn over layer 1. Examples: sweaters, half-zips, quarter-zips, hoodies, crewneck sweatshirts, cardigans, fleece pullovers, knit sweaters.
${ProductSlot.UPPERBODY_LAYER_3}: Outer layer for protection and warmth. Examples: jackets, parkas, puffer jackets, overalls, trench coats, windbreakers, rain jackets, blazers, coats.
${ProductSlot.LOWERBODY_LAYER_1}: Lower body garments. Examples: pants, jeans, shorts, chinos, trousers, joggers, sweatpants, cargo pants, leggings.
${ProductSlot.FOOTWEAR_LAYER_1}: Foot base layer. Examples: socks, crew socks, ankle socks, no-show socks, athletic socks, dress socks, wool socks.
${ProductSlot.FOOTWEAR_LAYER_2}: Shoes and footwear. Examples: sneakers, boots, sandals, dress shoes, loafers, running shoes, slides, flip-flops, oxford shoes.
${ProductSlot.GLASSES}: Eyewear. Examples: sunglasses, prescription glasses, aviators, wayfarers.
${ProductSlot.BAG}: Bags and carriers. Examples: backpacks, tote bags, messenger bags, duffel bags.
${ProductSlot.MASK}: Face coverings.
${ProductSlot.BELT}: Waist belts. Examples: leather belts, canvas belts, dress belts.
${ProductSlot.HAT}: Headwear. Examples: caps, beanies, bucket hats, fedoras.
${ProductSlot.GLOVES}: Hand coverings.
${ProductSlot.SCARF}: Neck accessories primarily scarves.
${ProductSlot.WATCH}: Watches only.
${ProductSlot.BRACELETS}: Bracelets and wristbands.
${ProductSlot.EARRINGS}: Ear jewelry.
${ProductSlot.RING}: Finger jewelry.
${ProductSlot.OTHER}: Items that don't fit other categories.

IMPORTANT: When determining the slot, prioritize the visual appearance and actual product type from the images over the product title/name. Product titles can be misleading (e.g., "Sweatjakke" might be labeled as a jacket but is actually a hoodie = UPPERBODY_LAYER_2). Always base your slot selection on what you see in the images, not what the title says.
"""

Tags with descriptions:
"""
${tags.map(tag => `${tag.tag}: ${tag.description}`).join("\n")}
"""
`

export async function analyzeProduct(scrapedProduct: ScrapedProduct) {
    const tags = await prisma.preferenceTag.findMany()
    const avalilableTags = tags.map(({tag}) => tag)
    const avalilableSlots = Object.values(ProductSlot)

    const AnalyzeProductSchema = z.object({
        tags: z.array(z.enum(avalilableTags as [string, ...string[]])).describe("Select tags that best describe the product's style, material, occasion, and key features"),
        slot: z.enum(avalilableSlots).describe("Product slot based on visual analysis of images (prioritize what you see over the title)"),
        description: z.string().describe("A concise description highlighting the product's key features, material, and style (2-3 sentences)"),
        type: z.string().describe("Specific product type (e.g., 't-shirt', 'sneakers', 'jeans'). Use common, searchable terminology"),
        primaryColorHex: z.string().regex(/^#([0-9A-F]{3}){1,2}$/i).describe("The dominant/most visible color of the product in HEX format (e.g., #FF5733)"),
        keepBackgroundImageIndexes: z.array(z.number()).describe("RARELY USED: Only include indexes where the ENTIRE image IS the product itself with no separation from background (e.g., a product texture filling the entire frame). DO NOT include images with white, solid color, or studio backgrounds - these should have backgrounds removed. This is an uncommon edge case"),
        productOnlyImageIndex: z.number().nullable().describe("Index of the flat-lay or product-only image without a model wearing it, or null if all images show a person"),
        personFrontImageIndex: z.number().nullable().describe("Index of the clearest front-facing image of a person wearing the product, or null if none exists"),
        personBackImageIndex: z.number().nullable().describe("Index of the clearest back-facing image of a person wearing the product, or null if none exists"),
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
                        text: analyzeProductPrompt(scrapedProduct, tags)
                    },
                    ...imageContent,
                ]
            }
        ]
    })

    return response.output
}