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

I will provide ${scrapedProduct.imageUrls.length} images below. Please provide the tags, slot, description, color, and identify which image index (0-${scrapedProduct.imageUrls.length - 1}) shows only the product without a model.

Slots with descriptions:
"""
${ProductSlot.UNDERSHIRT}: Base layer tops worn underneath other clothing. Examples: tank tops, undershirts, compression shirts, thermal underwear tops, singlets, athletic base layers, camisoles, wife beaters, muscle shirts, seamless underlayers.
${ProductSlot.SHIRT}: Main upper body garments worn as primary tops. Examples: t-shirts, polo shirts, dress shirts, button-ups, henleys, long sleeve tees, graphic tees, oxford shirts, flannel shirts, chambray shirts, linen shirts, camp collar shirts.
${ProductSlot.OVERSHIRT}: Mid-layer shirts worn over other tops, typically unbuttoned or as a layering piece. Examples: half-zip pullovers, quarter-zip sweaters, fleece pullovers, shackets (shirt-jackets), flannel overshirts, denim shirts worn open, cardigans, knit sweaters, crewneck sweatshirts, hoodies, track jackets, bomber-style shirts.
${ProductSlot.JACKET}: Outer layer garments for warmth or protection. Examples: denim jackets, leather jackets, bomber jackets, puffer jackets, down jackets, parkas, windbreakers, rain jackets, trench coats, blazers, suit jackets, varsity jackets, field jackets, coach jackets, harrington jackets, peacoats.
${ProductSlot.UNDERPANTS}: Underwear and base layer bottoms. Examples: boxers, briefs, boxer briefs, trunks, compression shorts, thermal underwear bottoms, long johns, athletic underwear, performance underwear.
${ProductSlot.PANTS}: Main lower body garments. Examples: jeans, chinos, dress pants, trousers, cargo pants, joggers, sweatpants, khakis, corduroy pants, linen pants, track pants, wide-leg pants, tapered pants, straight-leg pants, slim-fit pants, relaxed-fit pants, painter pants.
${ProductSlot.SOCKS}: Foot coverings worn inside shoes. Examples: crew socks, ankle socks, no-show socks, athletic socks, dress socks, compression socks, wool socks, thermal socks, tube socks, quarter socks, knee-high socks.
${ProductSlot.SHOES}: Footwear for the feet. Examples: sneakers, running shoes, basketball shoes, dress shoes, oxfords, loafers, boots, chelsea boots, work boots, hiking boots, sandals, slides, flip-flops, boat shoes, espadrilles, slip-ons, high-tops, low-tops, trainers, athletic shoes.
${ProductSlot.GLASSES}: Eyewear for vision or sun protection. Examples: sunglasses, prescription glasses, reading glasses, aviators, wayfarers, round frames, square frames, sports sunglasses, polarized sunglasses, blue light glasses, safety glasses.
${ProductSlot.BELT}: Waist accessories to hold up pants or for style. Examples: leather belts, canvas belts, woven belts, dress belts, casual belts, reversible belts, braided belts, studded belts, chain belts, web belts, tactical belts.
${ProductSlot.HAT}: Accessories worn on the head. Examples: baseball caps, snapbacks, dad hats, beanies, bucket hats, fedoras, trucker hats, fitted caps, winter hats, sun hats, visors, berets, newsboy caps, flat caps.
${ProductSlot.OTHER}: Items that don't fit other categories. Examples: bags, backpacks, watches, jewelry, scarves, gloves, ties, bow ties, pocket squares, wallets, phone cases, keychains, bracelets, necklaces, rings, sunglasses cases.

IMPORTANT: When determining the slot, prioritize the visual appearance and actual product type from the images over the product title/name. Product titles can be misleading (e.g., "Sweatjakke" might be labeled as a jacket but is actually a hoodie = OVERSHIRT). Always base your slot selection on what you see in the images, not what the title says.
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
        tags: z.array(z.enum(avalilableTags as [string, ...string[]])).describe(`Select the most relevant tags for this product from the following list: ${avalilableTags.join(", ")}`),
        slot: z.enum(avalilableSlots).describe("Which slot does this product belong to?"),
        description: z.string().describe("A brief description of the product"),
        primaryColorHex: z.string().regex(/^#([0-9A-F]{3}){1,2}$/i).describe("The color of the product in HEX format. Example: #FF5733"),
        productOnlyImageIndex: z.number().nullable().describe("The index of the primary image showing only the product without a model, or null if none exists"),
        personFrontImageIndex: z.number().nullable().describe("The index of the image showing the front of the person wearing the product, or null if none exists"),
        personBackImageIndex: z.number().nullable().describe("The index of the image showing the back of the person wearing the product, or null if none exists"),
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