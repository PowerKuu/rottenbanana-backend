import { Gender, ProductSlot } from "@/prisma/enums"
import { prisma } from "../database/prisma"
import { Music, PreferenceTag, Prisma, Product, Region } from "@/prisma/client"
import z from "zod"
import { generateText, Output } from "ai"
import { generateImageGoogle } from "./generateImage"
import { uploadFile } from "../uploads/upload"
import { getFile, readFileBuffer } from "../uploads/read"
import { randomShuffle } from "@/lib/utils"
import { productSlotDescriptions } from "./analyzeProduct"
import { drawSeedTags } from "./algorithm/drawSeedTags"
import { recommendProducts } from "./algorithm/recommendProducts"
import { recommendMusic } from "./algorithm/recommendMusic"
import { randomInt, randomUUID } from "crypto"

async function getRegion() {
    const regions = await prisma.region.findMany({
        where: {
            stores: {
                some: {}
            }
        }
    })

    if (regions.length <= 0) {
        throw new Error("No regions found in database")
    }

    const randomIndex = Math.floor(Math.random() * regions.length)
    return regions[randomIndex]
}

async function getGender() {
    const GENDERS = [Gender.MALE, Gender.FEMALE]
    const gender = GENDERS[Math.floor(Math.random() * GENDERS.length)]
    return gender
}

async function getProductDescription(product: Product) {
    const tags = await prisma.productPreferenceTag.findMany({
        where: { productId: product.id },
        include: {
            preferenceTag: true
        }
    })

    const tagDescriptions = tags.map((tag) => tag.preferenceTag.tag).join(", ")
    const tagDescriptionsFormatted = tagDescriptions ? `(${tagDescriptions})` : null

    const metaDescription = (product.metadata as any)?.["description"]

    return [product.name, product.gender, product.primaryColorHex, metaDescription, tagDescriptionsFormatted]
        .filter(Boolean)
        .join(" - ")
}

async function getMusicDescription(music: Music) {
    const tags = await prisma.musicPreferenceTag.findMany({
        where: { musicId: music.id },
        include: {
            preferenceTag: true
        }
    })
    const tagDescriptions = tags.map((tag) => tag.preferenceTag.tag).join(", ")
    const tagDescriptionsFormatted = tagDescriptions ? `(${tagDescriptions})` : null

    return [music.name, music.description, tagDescriptionsFormatted].filter(Boolean).join(" - ")
}

async function getPostProductSelection(
    gender: Gender,
    region: Region,
    seedPreferenceTag: PreferenceTag | null = null,
    take: number
) {
    const requiredSlots: ProductSlot[] = [ProductSlot.UPPERBODY_LAYER_1, ProductSlot.LOWERBODY_LAYER_1]

    const additionalsSlotOptions: [ProductSlot, number?][] = [
        [ProductSlot.FOOTWEAR_LAYER_1],
        [ProductSlot.FOOTWEAR_LAYER_2],
        [ProductSlot.UPPERBODY_LAYER_2],
        [ProductSlot.UPPERBODY_LAYER_3],
        [ProductSlot.WATCH],
        [ProductSlot.HAT],
        [ProductSlot.BELT],
        [ProductSlot.SCARF],
        [ProductSlot.BRACELETS],
        [ProductSlot.TIE],
        [ProductSlot.GLOVES, 0.3],
        [ProductSlot.BAG, 0.3],
        [ProductSlot.GLASSES, 0.4],
        [ProductSlot.RING, 0.2],
        [ProductSlot.EARRINGS, gender === Gender.FEMALE ? 0.2 : 0]
    ]

    const additionalSlots = additionalsSlotOptions
        .filter(([slot, weight]) => {
            const picked = Math.random() <= (weight ?? 1)
            return picked
        })
        .map(([slot, _]) => slot)

    const slots = [
        ...requiredSlots.map((slot) => ({ slot, required: true })),
        ...additionalSlots.map((slot) => ({ slot, required: false }))
    ]

    const productSelection: {
        [slot in ProductSlot]?: {
            required: boolean
            products: {
                id: string
                description: string
            }[]
        }
    } = {}

    for (const { slot, required } of slots) {
        const products = await recommendProducts(take, {
            slot,
            region,
            gender,
            usePrefrenceTags: !!seedPreferenceTag,
            seedTags: seedPreferenceTag ? [seedPreferenceTag] : undefined
        })

        if (products.length <= 0 && required) throw new Error(`Required slot ${slot} has no products`)

        const productsWithDescriptions = await Promise.all(
            products.map(async (product) => ({
                id: product.id,
                description: await getProductDescription(product)
            }))
        )

        productSelection[slot] = {
            required,
            products: randomShuffle(productsWithDescriptions)
        }
    }

    return productSelection
}

async function getPostMusicSelection(region: Region, seedPreferenceTag: PreferenceTag | null = null, take: number) {
    const music = await recommendMusic(region, seedPreferenceTag, take)

    const musicWithDescriptions = await Promise.all(
        music.map(async (music) => ({
            id: music.id,
            description: await getMusicDescription(music)
        }))
    )

    return randomShuffle(musicWithDescriptions)
}

const generatePostProductsPrompt = (
    selection: Awaited<ReturnType<typeof getPostProductSelection>>,
    musicSelection: Awaited<ReturnType<typeof getPostMusicSelection>>,
    minProducts: number,
    maxProducts: number,
    minShowcasePrompts: number,
    maxShowcasePrompts: number
) => `
Random seed: "${randomUUID()}"

You are a creative fashion stylist selecting products for an outfit post.
Decide a random theme before choosing

SLOT SELECTION RULES:
- The total number of products must be between ${minProducts} and ${maxProducts}
- REQUIRED slots: You MUST pick exactly 1 product from each required slot!
- OPTIONAL slots: You MAY pick 0 or 1 product from each optional slot!
- ONLY one product can be selected per slot, but multiple layers of the same type (e.g. upperbody layer 1 and 2) can work well together
- Sometimes it's better to leave slots empty to create a cleaner look - use your creativity and fashion sense to decide!
- Create natural variety: some outfits should be minimal and clean, others can have more layers or accessories depending on the style
- Create a look with a clear point of view. Cohesion comes from a shared MOOD, not from matching style tags!
- Contrasting pieces with a unified attitude are more interesting than items that simply share the same labels.
- You can combine tags, styles, and categories in unexpected ways to create a unique vibe, as long as the overall feeling is cohesive.

SLOT DESCRIPTIONS:
"""
${Object.entries(productSlotDescriptions)
    .filter(([slot]) => Object.keys(selection).includes(slot))
    .map(([slot, description]) => `${slot}: ${description}`)
    .join("\n")}
"""

AVAILABLE PRODUCTS BY SLOT:
"""
${Object.entries(selection)
    .map(
        ([slot, { products, required }]) =>
            products.length > 0 &&
            `
${slot} (${required ? "REQUIRED" : "OPTIONAL"}):
${products.map((product, index) => `  ${index + 1}. ID: ${product.id} - ${product.description}`).join("\n")}`
    )

    .filter(Boolean)
    .join("\n")}
"""

AVAILABLE MUSIC:
"""
Select 1 music track that matches the vibe and style of the outfit.
${musicSelection.map((music, index) => `  ${index + 1}. ID: ${music.id}- ${music.description}`).join("\n")}
"""

SHOWCASE PROMPTS REQUIREMENTS:
"""
Generate exactly ${minShowcasePrompts}-${maxShowcasePrompts} creative prompts for showcasing the outfit.

COMPOSITION RULES - WHAT TO INCLUDE:
✓ Camera angles (top-down, low-angle, medium shot, close-up, etc.)
✓ Setting/location (studio, urban park, stairwell, rooftop, etc.)
✓ Lighting (harsh sunlight, soft morning light, golden hour, studio lighting)
✓ Model positioning and pose (standing, walking, sitting, looking away)
✓ Framing and composition (centered, geometric, minimalist)
✓ Background elements (neutral backdrop, concrete walls, wooden surface)

FORBIDDEN - ZERO TOLERANCE:
✗ Mentioning textures or materials (fabric, cotton, leather, etc.)
✗ Describing clothing features (collars, zips, cuts, fits, silhouettes)
✗ Referencing colors or patterns of clothing
✗ Talking about fabric movement or draping
✗ Describing specific garment details
✗ Any reference to how the clothes look or feel

ONLY describe composition, camera work, setting, and lighting - NEVER the clothing itself!

Example showcase prompts:
- Model standing in a bright, sun-drenched studio against a neutral backdrop, looking away with a soft, natural expression.
- Outfit items arranged neatly on a light-colored wooden surface, captured from a top-down perspective with soft side-lighting.
- Medium shot of the model walking through a minimalist urban park, natural motion capture.
- A top-down flat lay on a stone floor, showcasing the ensemble arranged in a clean, geometric composition under even morning light.
- Low-angle shot of a model in an industrial setting, with harsh sunlight creating sharp shadows.
"""
`

async function generatePostData(minProducts: number, maxProducts: number, overrideGender?: Gender) {
    const MAX_PRODUCT_SELECTION_PER_SLOT = 8
    const MAX_MUSIC_SELECTION = 6
    const MAX_TAGS = 3
    const MIN_SHOWCASE_PROMPTS = 2
    const MAX_SHOWCASE_PROMPTS = 3

    const gender = overrideGender || (await getGender())
    const region = await getRegion()

    const [seedPreferenceTag] = await drawSeedTags()
    const musicSelection = await getPostMusicSelection(region, null, MAX_MUSIC_SELECTION)
    const productSelection = await getPostProductSelection(gender, region, null, MAX_PRODUCT_SELECTION_PER_SLOT)

    const possibleProducts = Object.values(productSelection).filter(({ products }) => products.length > 0).length

    if (possibleProducts < minProducts) {
        throw new Error(`Not enough products available to meet the minimum requirement of ${minProducts}`)
    }

    const GeneratePostProductsSchema = z.object({
        products: z.array(z.string()).min(minProducts).max(maxProducts).describe("Array of selected product IDs"),
        caption: z
            .string()
            .describe(
                "A catchy caption for the post that highlights the outfit and its style. Don't include hashtags! (2-3 sentences), in English."
            ),
        musicId: z.string().describe("The selected music track ID that matches the outfit vibe, only ID!"),
        showcasePrompts: z
            .array(z.string())
            .min(MIN_SHOWCASE_PROMPTS)
            .max(MAX_SHOWCASE_PROMPTS)
            .describe("Creative prompts for showcasing the outfit in the post's images. In English.")
    })

    const prompt = generatePostProductsPrompt(
        productSelection,
        musicSelection,
        minProducts,
        maxProducts,
        MIN_SHOWCASE_PROMPTS,
        MAX_SHOWCASE_PROMPTS
    )

    console.log("Generated prompt for product selection:", prompt)

    const response = await generateText({
        model: "anthropic/claude-sonnet-4",
        output: Output.object({
            schema: GeneratePostProductsSchema
        }),
        prompt,
        temperature: 1.3
    })

    const { products: prodcutsIds, caption, musicId, showcasePrompts } = response.output

    const products = await prisma.product.findMany({
        include: {
            preferenceTags: true
        },
        where: {
            id: {
                in: prodcutsIds
            }
        }
    })

    const tagCounts: Record<string, number> = {}

    for (const { preferenceTags } of products) {
        for (const { preferenceTagId } of preferenceTags) {
            tagCounts[preferenceTagId] = (tagCounts[preferenceTagId] || 0) + 1
        }
    }

    const sortedTagCounts = Object.entries(tagCounts).sort((a, b) => b[1] - a[1])
    const tags = await prisma.preferenceTag.findMany({
        where: {
            id: {
                in: sortedTagCounts.slice(0, MAX_TAGS).map(([tagId]) => tagId)
            }
        }
    })

    const music = await prisma.music.findUnique({
        where: {
            id: musicId
        }
    })

    if (!music) {
        throw new Error(`Selected music with ID ${musicId} not found`)
    }

    for (const [slot, { products, required }] of Object.entries(productSelection)) {
        if (required && !products.some((product) => prodcutsIds.includes(product.id))) {
            throw new Error(`Required slot ${slot} does not have a selected product`)
        }
    }

    return {
        caption,
        products,
        music,
        showcasePrompts,
        region,
        tags,
        gender,
        seedPreferenceTag
    }
}

const generatePostImagePrompt = (prompt: string, gender: Gender, products: Product[]) => `
Professional fashion photography. Gender: ${gender}

PROMPT: ${prompt}

${products.length} REFERENCE PRODUCTS:
${products.map((product, index) => `- Image ${index + 1}: ${product.category}`).join("\n")}

CORE RULES - REFERENCE FIDELITY:
✓ Reproduce each reference product EXACTLY as shown in its image
✓ Use EXACT colors, designs, patterns, and structures from references
✓ Only show angles visible in reference images
✓ Each product reference is independent - use only what appears in that specific reference
✓ Professional lighting and composition following the prompt

CLOTHING LAYER PHYSICS - NATURAL OCCLUSION:
✓ Upper layers completely cover what's beneath them
✓ When clothing overlaps, only the TOP layer is visible in the overlap area
✓ Outer garments (jackets, coats) naturally obscure inner garments (shirts, undershirts)
✓ Each layer exists independently - details from lower layers do NOT appear on upper layers
✓ Respect natural fabric opacity - solid fabrics are opaque, covered areas stay hidden
✓ Only the outermost visible surface shows in the final image

DESIGN INTEGRITY:
✓ Keep structural features unchanged (collar styles, zipper types, button placements remain as referenced)
✓ Maintain original proportions and fit from references
✓ Preserve exact design elements as they appear in each product's reference image

Make no mistakes and follow the instructions precisely!!!
`

async function generatePostImage(prompt: string, gender: Gender, products: Product[], images: Buffer[]) {
    const image = await generateImageGoogle(
        generatePostImagePrompt(prompt, gender, products),
        "gemini-3.1-flash-image-preview",
        images,
        "image/png",
        {
            aspectRatio: "9:16",
            imageSize: "1K",
            format: "jpeg"
        }
    )

    return image
}

export async function generatePost(overrideGender?: Gender) {
    const MIN_PRODUCTS = 2
    const MAX_PRODUCTS = randomInt(4, 6)

    const { products, caption, music, showcasePrompts, region, tags, gender, seedPreferenceTag } =
        await generatePostData(MIN_PRODUCTS, MAX_PRODUCTS, overrideGender)

    console.log(
        products.map((product) => product.url),
        caption,
        music,
        showcasePrompts,
        region,
        seedPreferenceTag
    )

    const prodcutImageBuffers = await Promise.all(
        products.map(async ({ productOnlyImageId }) => {
            const file = await getFile(productOnlyImageId)
            const buffer = await readFileBuffer(file)
            return Buffer.from(buffer)
        })
    )

    const uploadedImageIds = await Promise.all(
        showcasePrompts.map(async (prompt, index) => {
            const image = await generatePostImage(prompt, gender, products, prodcutImageBuffers)
            const imageFile = new File([new Uint8Array(image)], `post-image-${index}.jpeg`, { type: "image/jpeg" })
            const uploadedImage = await uploadFile(imageFile, {
                compress: true
            })
            return uploadedImage.id
        })
    )

    if (!region || !music) {
        throw new Error("No region or music found in database")
    }

    const post = await prisma.post.create({
        data: {
            caption,
            gender,
            mediaIds: uploadedImageIds,
            regionId: region.id,
            musicId: music.id,
            isOfficial: true
        }
    })

    await Promise.all(
        tags.map((tag) =>
            prisma.postPreferenceTag.create({
                data: {
                    postId: post.id,
                    preferenceTagId: tag.id
                }
            })
        )
    )

    await Promise.all(
        products.map((product) =>
            prisma.postProduct.create({
                data: {
                    postId: post.id,
                    productId: product.id
                }
            })
        )
    )

    return post
}
