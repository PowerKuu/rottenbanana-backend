import { ProductCategory, ProductSlot } from "@/prisma/enums"
import z from "zod"
import { prisma } from "../database/prisma"
import { generateText, Output } from "ai"
import { ScrapedProduct } from "../scraper/types"
import { analyzeProductPrompt } from "./prompts"

export const productSlotDescriptions: Record<ProductSlot, string> = {
    [ProductSlot.UPPERBODY_LAYER_1]:
        "Base layer worn directly on skin. Examples: t-shirts, tank tops, polo shirts, dress shirts, button-ups, training shirts, wool shirts, long sleeve tees, graphic tees, henleys.",
    [ProductSlot.UPPERBODY_LAYER_2]:
        "Mid-layer worn over layer 1. Examples: sweaters, half-zips, quarter-zips, hoodies, crewneck sweatshirts, cardigans, fleece pullovers, knit sweaters.",
    [ProductSlot.UPPERBODY_LAYER_3]:
        "Outer layer for protection and warmth. Examples: jackets, parkas, puffer jackets, overalls, trench coats, windbreakers, rain jackets, blazers, coats.",
    [ProductSlot.LOWERBODY_LAYER_1]:
        "Lower body garments. Examples: pants, jeans, shorts, chinos, trousers, joggers, sweatpants, cargo pants, leggings.",
    [ProductSlot.FOOTWEAR_LAYER_1]:
        "Foot base layer. Examples: socks, crew socks, ankle socks, no-show socks, athletic socks, dress socks, wool socks.",
    [ProductSlot.FOOTWEAR_LAYER_2]:
        "Shoes and footwear. Examples: sneakers, boots, sandals, dress shoes, loafers, running shoes, slides, flip-flops, oxford shoes.",
    [ProductSlot.GLASSES]: "Eyewear. Examples: sunglasses, prescription glasses, aviators, wayfarers.",
    [ProductSlot.BAG]: "Bags and carriers. Examples: backpacks, tote bags, messenger bags, duffel bags.",
    [ProductSlot.MASK]: "Face coverings.",
    [ProductSlot.BELT]: "Waist belts. Examples: leather belts, canvas belts, dress belts.",
    [ProductSlot.HAT]: "Headwear. Examples: caps, beanies, bucket hats, fedoras.",
    [ProductSlot.GLOVES]: "Hand coverings.",
    [ProductSlot.SCARF]: "Neck accessories primarily scarves.",
    [ProductSlot.WATCH]: "Watches only.",
    [ProductSlot.BRACELETS]: "Bracelets and wristbands.",
    [ProductSlot.EARRINGS]: "Ear jewelry.",
    [ProductSlot.TIE]: "Neckties and bow ties.",
    [ProductSlot.RING]: "Finger jewelry.",
    [ProductSlot.OTHER]: "Items that don't fit other categories."
}

export const productCategoryDescriptions: Record<ProductCategory, string> = {
    [ProductCategory.TSHIRTS_TOPS]: "Casual t-shirts, basic tops, graphic tees, and casual upper body wear",
    [ProductCategory.POLOS]: "Polo shirts with collars and button plackets",
    [ProductCategory.SHIRTS]: "Dress shirts, button-up shirts, Oxford shirts, and formal tops",
    [ProductCategory.BLOUSES]: "Women's blouses and dressy tops",
    [ProductCategory.TANK_TOPS]: "Sleeveless tops and tank tops",
    [ProductCategory.CROP_TOPS]: "Cropped tops that expose the midriff",
    [ProductCategory.SWEATSHIRTS]: "Crewneck sweatshirts, pullover sweaters without hoods",
    [ProductCategory.HOODIES]: "Hooded sweatshirts and hooded pullovers",
    [ProductCategory.JACKETS]: "General jackets including denim, bomber, windbreaker, and casual jackets",
    [ProductCategory.BLAZERS]: "Structured blazers and sport coats",
    [ProductCategory.COATS]: "Long coats, trench coats, and overcoats",
    [ProductCategory.PARKAS]: "Insulated parkas and puffer jackets",
    [ProductCategory.VESTS]: "Sleeveless vests and gilets",
    [ProductCategory.TROUSERS]: "Dress pants, chinos, slacks, and formal trousers",
    [ProductCategory.JEANS]: "Denim jeans of all styles",
    [ProductCategory.SHORTS]: "Shorts of all types",
    [ProductCategory.SKIRTS]: "Skirts of all lengths and styles",
    [ProductCategory.LEGGINGS]: "Leggings, tights, and form-fitting pants",
    [ProductCategory.DRESSES]: "Dresses of all styles and lengths",
    [ProductCategory.JUMPSUITS_ROMPERS]: "One-piece jumpsuits and rompers",
    [ProductCategory.SPORTSWEAR]: "Athletic wear, gym clothes, yoga pants, sports bras",
    [ProductCategory.SOCKS]: "Socks of all types",
    [ProductCategory.SNEAKERS]: "Casual sneakers and trainers",
    [ProductCategory.BOOTS]: "Boots of all types including ankle boots, combat boots, and winter boots",
    [ProductCategory.SANDALS_FLIPFLOPS]: "Sandals, flip-flops, and open-toe footwear",
    [ProductCategory.DRESS_SHOES]: "Formal shoes, loafers, oxfords, and dress footwear",
    [ProductCategory.ATHLETIC_SHOES]: "Running shoes, sports-specific footwear, and performance athletic shoes",
    [ProductCategory.SLIPPERS]: "House slippers and indoor footwear",
    [ProductCategory.BAGS]: "Bags, backpacks, handbags, totes, and purses",
    [ProductCategory.BELTS]: "Belts of all types",
    [ProductCategory.HATS_CAPS]: "Hats, caps, beanies, and headwear",
    [ProductCategory.SCARVES_WRAPS]: "Scarves, wraps, and neck accessories",
    [ProductCategory.GLOVES_MITTENS]: "Gloves and mittens",
    [ProductCategory.JEWELRY]: "Jewelry including necklaces, bracelets, earrings, and rings",
    [ProductCategory.WATCHES]: "Watches and timepieces",
    [ProductCategory.SUNGLASSES]: "Sunglasses and tinted eyewear",
    [ProductCategory.EYEGLASSES]: "Prescription glasses and optical eyewear",
    [ProductCategory.TIES_BOWTIES]: "Neckties and bow ties",
    [ProductCategory.PERFUMES_COLOGNES]: "Perfumes, colognes, and fragrances",
    [ProductCategory.OTHER]: "Products that don't fit into other categories"
}

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
        description: z
            .string()
            .describe(
                "A concise description of the product (2-3 sentences), in English."
            ),
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
            .describe("Index of the clearest back-facing image of a person wearing the product, or null if none exists")
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
