import { Gender, ProductSlot } from "@/prisma/enums"
import { prisma } from "../database/prisma"
import { Music, PreferenceTag, Prisma, Product, Region } from "@/prisma/client"
import z from "zod"
import { generateText, Output } from "ai"
import { generateImageGoogle } from "./generateImage"
import { uploadFile } from "../uploads/upload"
import { getFile, readFileBuffer } from "../uploads/read"
import { randomInt, randomShuffle } from "@/lib/utils"
import { recommendProducts } from "./algorithm/recommendProducts"
import { recommendMusic } from "./algorithm/recommendMusic"
import { generatePostImagePrompt, generatePostProductsPrompt } from "./prompts"

async function getProductPreferenceTags(product: Product) {
    const tags = await prisma.productPreferenceTag.findMany({
        where: { productId: product.id },
        include: {
            preferenceTag: true
        }
    })

    return tags.map((tag) => tag.preferenceTag)
}

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

export async function getProductDescription(product: Product) {
    const tags = await getProductPreferenceTags(product)
    const tagFormatted = tags.length > 0 ? `(${tags.map((tag) => tag.tag).join(", ")})` : null

    const metaDescription = (product.metadata as any)?.["description"]

    return [product.name, product.gender, product.primaryColorHex, metaDescription, tagFormatted]
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

export async function getPostProductSelection(gender: Gender, region: Region, seedProduct: Product, take: number) {
    const requiredSlots: ProductSlot[] = [ProductSlot.UPPERBODY_LAYER_1, ProductSlot.LOWERBODY_LAYER_1]

    const additionalsSlotOptions: [ProductSlot, number?][] = [
        [ProductSlot.FOOTWEAR_LAYER_1],
        [ProductSlot.FOOTWEAR_LAYER_2],
        [ProductSlot.UPPERBODY_LAYER_2],
        [ProductSlot.UPPERBODY_LAYER_3, 0.5],
        [ProductSlot.WATCH],
        [ProductSlot.HAT, 0.3],
        [ProductSlot.BELT],
        [ProductSlot.SCARF],
        [ProductSlot.BRACELETS, 0.3],
        [ProductSlot.TIE, 0.3],
        [ProductSlot.GLOVES, 0.3],
        [ProductSlot.BAG, 0.3],
        [ProductSlot.GLASSES, 0.7],
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
            required?: boolean
            seed?: boolean
            products: {
                id: string
                description: string
            }[]
        }
    } = {}

    const seedTags = await getProductPreferenceTags(seedProduct)

    for (const { slot, required } of slots) {
        if (seedProduct.slot === slot) {
            productSelection[slot] = {
                required: true,
                seed: true,
                products: [
                    {
                        id: seedProduct.id,
                        description: await getProductDescription(seedProduct)
                    }
                ]
            }

            continue
        }

        const products = await recommendProducts(take, {
            slot,
            region,
            genders: [gender],
            seedTags
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

export async function getPostMusicSelection(region: Region, seedProduct: Product, take: number) {
    const seedTags = await getProductPreferenceTags(seedProduct)

    const music = await recommendMusic(take, {
        region,
        seedTags
    })

    const musicWithDescriptions = await Promise.all(
        music.map(async (music) => ({
            id: music.id,
            description: await getMusicDescription(music)
        }))
    )

    return randomShuffle(musicWithDescriptions)
}

async function generatePostData(minProducts: number, maxProducts: number, overrideGender?: Gender) {
    const MAX_PRODUCT_SELECTION_PER_SLOT = 6
    const MAX_MUSIC_SELECTION = 4
    const MAX_TAGS = 3
    const MIN_SHOWCASE_PROMPTS = 2
    const MAX_SHOWCASE_PROMPTS = 3

    const gender = overrideGender || (await getGender())
    const region = await getRegion()
    const [seedProduct] = await recommendProducts(1, {
        region,
                    genders: [gender],

    })

    const productSelection = await getPostProductSelection(gender, region, seedProduct, MAX_PRODUCT_SELECTION_PER_SLOT)
    const musicSelection = await getPostMusicSelection(region, seedProduct, MAX_MUSIC_SELECTION)

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

    const prompt = await generatePostProductsPrompt(
        seedProduct,
        productSelection,
        musicSelection,
        minProducts,
        maxProducts,
        MIN_SHOWCASE_PROMPTS,
        MAX_SHOWCASE_PROMPTS
    )

    const response = await generateText({
        model: "anthropic/claude-sonnet-4.6",
        output: Output.object({
            schema: GeneratePostProductsSchema
        }),
        prompt
    })

    const { products: productIds, caption, musicId, showcasePrompts } = response.output

    const products = await prisma.product.findMany({
        include: {
            preferenceTags: true
        },
        where: {
            id: {
                in: productIds
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
        if (required && !products.some((product) => productIds.includes(product.id))) {
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
        seedProduct
    }
}

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
    const MIN_PRODUCTS = 3
    const MAX_PRODUCTS = randomInt(4, 6)

    const { products, caption, music, showcasePrompts, region, tags, gender, seedProduct } = await generatePostData(
        MIN_PRODUCTS,
        MAX_PRODUCTS,
        overrideGender
    )

    console.log("[Temp]", await getProductDescription(seedProduct), showcasePrompts)

    const productImageBuffers = await Promise.all(
        products.map(async ({ productOnlyImageId }) => {
            const file = await getFile(productOnlyImageId)
            const buffer = await readFileBuffer(file)
            return Buffer.from(buffer)
        })
    )

    const uploadedImageIds = await Promise.all(
        showcasePrompts.map(async (prompt, index) => {
            const image = await generatePostImage(prompt, gender, products, productImageBuffers)
            const imageFile = new File([new Uint8Array(image)], `post-image-${index}.jpeg`, { type: "image/jpeg" })
            const uploadedImage = await uploadFile(imageFile, {
                compress: true
            })
            return uploadedImage.id
        })
    )

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
