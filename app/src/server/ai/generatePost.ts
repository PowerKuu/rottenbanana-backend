import { Gender, ProductSlot } from "@/prisma/enums"
import { prisma } from "../database/prisma"
import { PreferenceTag, Prisma, Product, Region } from "@/prisma/client"
import z from "zod"
import { generateText, Output } from "ai"
import { generateImageGoogle } from "./generateImage"
import { uploadFile } from "../uploads/upload"
import { getFile, readFileBuffer } from "../uploads/read"
import { randomShuffle } from "@/lib/utils"
import { productSlotDescriptions } from "./analyzeProduct"

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

async function getPostMusicSelection(tag: PreferenceTag | null, take: number) {
    const whereWithTag: Prisma.MusicWhereInput = {
        ...(tag && {
            preferenceTags: {
                some: {
                    preferenceTagId: tag.id
                }
            }
        })
    }

    const countWithTag = await prisma.music.count({ where: whereWithTag })
    const randomOffset = countWithTag > take ? Math.floor(Math.random() * (countWithTag - take)) : 0

    const musicWithTag = await prisma.music.findMany({
        where: whereWithTag,
        skip: randomOffset,
        take
    })

    const remainingTake = take - musicWithTag.length

    if (remainingTake <= 0) {
        return musicWithTag
    }

    const whereAdditional: Prisma.MusicWhereInput = {
        id: {
            notIn: musicWithTag.map((music) => music.id)
        }
    }

    const countAdditional = await prisma.music.count({ where: whereAdditional })
    const randomOffsetAdditional =
        countAdditional > remainingTake ? Math.floor(Math.random() * (countAdditional - remainingTake)) : 0

    const additionalMusic = await prisma.music.findMany({
        where: whereAdditional,
        skip: randomOffsetAdditional,
        take: remainingTake
    })

    return [...musicWithTag, ...additionalMusic]
}

async function getSeedPreferenceTag() {
    const MIN_TAG_PROBABILITY = 0.05
    const MAX_TAG_PROBABILITY = 0.1

    const userTags = await prisma.userPreferenceTag.groupBy({
        by: "preferenceTagId",
        _sum: {
            score: true
        },
        _count: {
            userId: true
        },
        orderBy: {
            _sum: {
                score: "desc"
            }
        }
    })

    const tags = await prisma.preferenceTag.findMany({
        where: {
            productPreferenceTags: {
                some: {}
            }
        }
    })

    if (tags.length <= 0) {
        return null
    }

    const tagScores = randomShuffle(tags)
        .map((tag) => {
            const score = userTags.find((userTag) => userTag.preferenceTagId === tag.id)?._sum.score || 0

            return {
                tag,
                score
            }
        })
        .sort((a, b) => b.score - a.score)

    const tagProbabilities = tagScores.map((tag, index) => {
        const range = MAX_TAG_PROBABILITY - MIN_TAG_PROBABILITY
        const probability = MAX_TAG_PROBABILITY - (index * range) / Math.max(tagScores.length - 1, 1)
        return {
            ...tag,
            probability
        }
    })

    console.log("Calculated tag probabilities for seed preference tag selection:", tagProbabilities)

    const totalProbability = tagProbabilities.reduce((sum, tag) => sum + tag.probability, 0)
    const random = Math.random() * totalProbability

    let cumulativeProbability = 0
    for (const tag of tagProbabilities) {
        cumulativeProbability += tag.probability
        if (random <= cumulativeProbability) {
            return tag.tag
        }
    }

    const [firstTag] = tagProbabilities

    return firstTag.tag
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

    return [product.name, product.gender, metaDescription, tagDescriptionsFormatted].filter(Boolean).join(" - ")
}

async function getSlotRandomProducts(slot: ProductSlot, region: Region, gender: Gender, tag: PreferenceTag | null, take: number) {
    const MAX_PER_STORE = Math.ceil(take / 2)

    const whereWithTag: Prisma.ProductWhereInput = {
        slot,
        gender: {
            in: [gender, Gender.UNISEX]
        },
        store: {
            regions: {
                some: {
                    id: region.id
                }
            }
        },
        ...(tag && {
            preferenceTags: {
                some: {
                    preferenceTagId: tag.id
                }
            }
        })
    }

    const countWithTag = await prisma.product.count({ where: whereWithTag })
    const randomOffset = countWithTag > take ? Math.floor(Math.random() * (countWithTag - take)) : 0

    const productsWithTag = await prisma.product.findMany({
        where: whereWithTag,
        skip: randomOffset,
        take
    })

    const remainingTake = take - productsWithTag.length

    if (remainingTake <= 0) {
        return productsWithTag
    }

    const whereAdditional: Prisma.ProductWhereInput = {
        slot,
        id: {
            notIn: productsWithTag.map((product) => product.id)
        },
                store: {
            regions: {
                some: {
                    id: region.id
                }
            }
        },
        gender: {
            in: [gender, Gender.UNISEX]
        }
    }
    const countAdditional = await prisma.product.count({ where: whereAdditional })
    const randomOffsetAdditional =
        countAdditional > remainingTake ? Math.floor(Math.random() * (countAdditional - remainingTake)) : 0

    const additionalProducts = await prisma.product.findMany({
        where: whereAdditional,
        skip: randomOffsetAdditional,
        take: remainingTake
    })

    return [...productsWithTag, ...additionalProducts]
}

async function getPostProductSelection(region: Region, seedPreferenceTag: PreferenceTag | null = null, take: number) {
    const GENDERS = [Gender.MALE, Gender.FEMALE]
    const gender = GENDERS[Math.floor(Math.random() * GENDERS.length)]

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
        const products = await getSlotRandomProducts(
            slot,
            region,
            gender,
            seedPreferenceTag,
            take
        )

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

const generatePostProductsPrompt = (
    selection: Awaited<ReturnType<typeof getPostProductSelection>>,
    musicSelection: Awaited<ReturnType<typeof getPostMusicSelection>>,
    showcasePrompts: string[],
    modelShowcasePrompts: string[],
    minProducts: number,
    maxProducts: number,
    maxPrompts: number
) => `
You are a creative fashion stylist selecting products for an inspiring outfit post. Your goal is to create a complete, stylish look with ${minProducts}-${maxProducts} products and matching music.

SLOT SELECTION RULES:
- REQUIRED slots: You MUST pick exactly 1 product from each required slot
- OPTIONAL slots: You MAY pick 0 or 1 product from each optional slot
- ONLY one product can be selected per slot, multiple layers of the same slot (e.g. upperbody layer 1 and 2) can be used together and often looks good, but not required
- The total number of products selected must be at least ${minProducts} and no more than ${maxProducts}
- Prioritize required slots first, then add optional products if space allows
- Select products that would create a cohesive outfit based on their descriptions

SLOT DESCRIPTIONS:
"""
${Object.entries(productSlotDescriptions)
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
${musicSelection.map((music, index) => `  ${index + 1}. ID: ${music.id} - ${music.name} - ${music.description}`).join("\n")}
"""

SHOWCASE PROMPTS:
"""
Select ${maxPrompts} showcase prompts for the outfit images. Prefer a combination of model and showcase prompts for variety.

Flat lay:
${showcasePrompts.map((prompt, index) => `  ${index + 1}. ${prompt}`).join("\n")}

Model wearing outfit:
${modelShowcasePrompts.map((prompt, index) => `  ${index + 1}. ${prompt}`).join("\n")}
"""
`

async function generatePostData(prompts: number, minProducts: number, maxProducts: number) {
    const MAX_PRODUCT_SELECTION_PER_SLOT = 5
    const MAX_MUSIC_SELECTION = 5

    const region = await getRegion()
    const seedPreferenceTag = await getSeedPreferenceTag()
    const musicSelection = await getPostMusicSelection(seedPreferenceTag, MAX_MUSIC_SELECTION)
    const productSelection = await getPostProductSelection(region, seedPreferenceTag, MAX_PRODUCT_SELECTION_PER_SLOT)
    const possibleProducts = Object.values(productSelection).filter(({ products }) => products.length > 0).length

    if (possibleProducts < minProducts) {
        throw new Error(`Not enough products available to meet the minimum requirement of ${minProducts}`)
    }

    const IMAGE_PROMPTS: string[] = [
        "Products arranged flat on concrete surface, overhead shot, clean composition, natural lighting",
        "Products laid out on wooden floor, minimal background, even lighting",
        "Products on white marble surface, clean background, professional studio lighting",
        "Products displayed on neutral fabric surface, simple flat lay, soft lighting",
        "Products arranged on light wood table, minimal styling, natural window light",
        "Products on solid gray background, centered composition, even lighting"
    ]

    const MODEL_IMAGE_PROMPTS: string[] = [
        "Model standing against plain wall, natural pose, good lighting, clean background",
        "Model sitting on concrete steps, casual pose, urban setting, natural light",
        "Model standing in neutral indoor space, relaxed pose, soft even lighting",
        "Model leaning against brick wall, confident stance, simple background",
        "Model standing outdoors, natural environment, soft daylight, clean composition",
        "Model sitting cross-legged, simple background, studio lighting",
        "Model walking naturally, urban street background, good natural lighting",
        "Model standing in doorway, casual pose, architectural framing, natural light"
    ]

    const GeneratePostProductsSchema = z.object({
        products: z.array(z.string()).min(minProducts).max(maxProducts).describe("Array of selected product IDs"),
        caption: z.string().describe("A catchy caption for the post that highlights the outfit and its style"),
        musicId: z.string().describe("The selected music track ID that matches the outfit vibe"),
        showcasePrompts: z
            .array(z.string())
            .min(prompts)
            .max(prompts)
            .describe("Selected showcase prompts from the available options")
    })

    const prompt = generatePostProductsPrompt(
        productSelection,
        musicSelection,
        IMAGE_PROMPTS,
        MODEL_IMAGE_PROMPTS,
        minProducts,
        maxProducts,
        prompts
    )

    console.log("Generated prompt for product selection:", prompt)

    const response = await generateText({
        model: "openai/gpt-4o-mini",
        output: Output.object({
            schema: GeneratePostProductsSchema
        }),
        prompt,
    })

    const { products: prodcutsIds, caption, musicId, showcasePrompts } = response.output

    const products = await prisma.product.findMany({
        where: {
            id: {
                in: prodcutsIds
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
        region
    }
}

const generatePostImagePrompt = (prompt: string, products: Product[]) => `
Create a professional fashion photography image for social media. Based on the prompt.

PROMPT:
${prompt}

PRODUCTS TO INCLUDE:
The first ${products.length} image(s) show the products to include in this outfit:
${products.map((product, index) => `- Image ${index + 1}: ${product.category}`).join("\n")}

CRITICAL REQUIREMENTS:
- Use the EXACT colors, patterns, and details shown in the product images above
- Do NOT make assumptions about colors based on product type - use the actual images
- All products must be clearly visible and recognizable
- Professional photography quality with good lighting
- Natural and realistic product presentation matching the source images
`

async function generatePostImage(prompt: string, products: Product[], images: Buffer[]) {
    const image = await generateImageGoogle(
        generatePostImagePrompt(prompt, products),
        "gemini-3.1-flash-image-preview",
        images,
        "image/png",
        {
            aspectRatio: "9:16",
            imageSize: "2K",
            format: "jpeg"
        }
    )

    return image
}

export async function generatePost() {
    const MIN_IMAGES = 2
    const MAX_IMAGES = 2

    const MIN_PRODUCTS = 3
    const MAX_PRODUCTS = 6

    const images = Math.floor(Math.random() * (MAX_IMAGES - MIN_IMAGES + 1)) + MIN_IMAGES

    const { products, caption, music, showcasePrompts, region } = await generatePostData(images, MIN_PRODUCTS, MAX_PRODUCTS)

    console.log(products.map((product) => product.url), caption, music, showcasePrompts, region)

    const prodcutImageBuffers = await Promise.all(
        products.map(async ({ productOnlyImageId }) => {
            const file = await getFile(productOnlyImageId)
            const buffer = await readFileBuffer(file)
            return Buffer.from(buffer)
        })
    )

    const uploadedImageIds = await Promise.all(
        showcasePrompts.map(async (prompt, index) => {
            const image = await generatePostImage(prompt, products, prodcutImageBuffers)
            const imageFile = new File([new Uint8Array(image)], `post-image-${index}.jpeg`, { type: "image/jpeg" })
            const uploadedImage = await uploadFile(imageFile)
            return uploadedImage.id
        })
    )

    if (!region || !music) {
        throw new Error("No region or music found in database")
    }

    const post = await prisma.post.create({
        data: {
            caption,
            imageIds: uploadedImageIds,
            regionId: region.id,
            musicId: music.id,
            isOfficial: true
        }
    })

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
