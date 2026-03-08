import { Gender, ProductSlot } from "@/prisma/enums"
import { prisma } from "../database/prisma"
import { PreferenceTag, Prisma, Product } from "@/prisma/client"
import z from "zod"
import { generateText, Output } from "ai"
import { generateImageGoogle } from "./generateImage"
import { upload } from "../uploads/upload"

async function getSeedPreferenceTag() {
    const MIN_TAG_PROBABILITY = 0.05
    const MAX_TAG_PROBABILITY = 0.5

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

    const tags = await prisma.preferenceTag.findMany()

    if (tags.length <= 0) return null

    const tagScores = tags.map((tag) => {
        const score = userTags.find((userTag) => userTag.preferenceTagId === tag.id)?._sum.score || 0

        return {
            tag,
            score
        }
    })

    const tagProbabilities = tagScores.map((tag, index) => {
        const range = MAX_TAG_PROBABILITY - MIN_TAG_PROBABILITY
        const probability = MAX_TAG_PROBABILITY - (index * range) / Math.max(tagScores.length - 1, 1)
        return {
            ...tag,
            probability
        }
    })

    const totalProbability = tagProbabilities.reduce((sum, tag) => sum + tag.probability, 0)
    const random = Math.random() * totalProbability

    let cumulativeProbability = 0
    for (const tag of tagProbabilities) {
        cumulativeProbability += tag.probability
        if (random <= cumulativeProbability) {
            return tag
        }
    }

    const [firstTag] = tagProbabilities

    return firstTag
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

async function getSlotRandomProducts(slot: ProductSlot, gender: Gender, tag: PreferenceTag | null, take: number) {
    const MAX_PER_STORE = Math.ceil(take / 2)

    const whereWithTag: Prisma.ProductWhereInput = {
        slot,
        gender: {
            in: [gender, Gender.UNISEX]
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

    const whereAdditional = {
        slot,
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

async function getPostProductSelection() {
    const MAX_SLOTS = 8
    const MAX_PRODUCTS_PER_SLOT = 3
    const GENDERS = [Gender.MALE, Gender.FEMALE]
    const gender = GENDERS[Math.floor(Math.random() * GENDERS.length)]

    const requiredSlotCombinations: [ProductSlot, number?][][] = [
        [[ProductSlot.UPPERBODY_LAYER_1], [ProductSlot.UPPERBODY_LAYER_2, 0.5], [ProductSlot.UPPERBODY_LAYER_3, 0.3]],
        [[ProductSlot.LOWERBODY_LAYER_1]],
        [
            [ProductSlot.FOOTWEAR_LAYER_1, 0.2],
            [ProductSlot.FOOTWEAR_LAYER_2, 0.5]
        ]
    ]

    const requiredSlots: ProductSlot[] = requiredSlotCombinations
        .map((combination) => {
            return combination
                .filter(([slot, weight]) => {
                    const picked = Math.random() <= (weight ?? 1)
                    return picked
                })
                .map(([slot, _]) => slot)
        })
        .flat()

    const additionalsSlotOptions: [ProductSlot, number?][] = [
        [ProductSlot.WATCH],
        [ProductSlot.HAT],
        [ProductSlot.BELT],
        [ProductSlot.SCARF],
        [ProductSlot.BRACELETS],
        [ProductSlot.TIE],
        [ProductSlot.GLOVES],
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
        .slice(0, MAX_SLOTS - requiredSlots.length)
        .map(([slot, _]) => slot)

    const slots = [
        ...requiredSlots.map((slot) => ({ slot, required: true })),
        ...additionalSlots.map((slot) => ({ slot, required: false }))
    ].slice(0, MAX_SLOTS)

    const seedPreferenceTag = await getSeedPreferenceTag()

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
            gender,
            seedPreferenceTag?.tag || null,
            MAX_PRODUCTS_PER_SLOT
        )

        if (products.length <= 0) throw new Error(`Required slot ${slot} has no products`)

        productSelection[slot] = {
            required,
            products: await Promise.all(
                products.map(async (product) => ({
                    id: product.id,
                    description: await getProductDescription(product)
                }))
            )
        }
    }

    return productSelection
}

const generatePostProductsPrompt = (
    selection: Awaited<ReturnType<typeof getPostProductSelection>>,
    maxProducts: number
) => `
You are selecting products for a fashion outfit post. You must select up to ${maxProducts} products total from the available product slots below.

SELECTION RULES:
- REQUIRED slots: You MUST pick exactly 1 product from each required slot
- OPTIONAL slots: You MAY pick 0 or 1 product from each optional slot
- ONLY one product can be selected per slot
- Total products selected must not exceed ${maxProducts}
- Prioritize required slots first, then add optional products if space allows
- Select products that would create a cohesive outfit based on their descriptions. F.ex dont add a formal shoe to a casual outfit.
- If unsure about optional products, dont pick any! Keep the outfit high quality by only picking products you are confident fit well with the rest of the outfit

AVAILABLE PRODUCTS BY SLOT:
${Object.entries(selection)
    .map(
        ([slot, slotData]) => `
${slot} (${slotData.required ? "REQUIRED" : "OPTIONAL"}):
${slotData.products.map((product, idx) => `  ${idx + 1}. ID: ${product.id} - ${product.description}`).join("\n")}
`
    )
    .join("\n\n")}
`

async function generatePostProducts() {
    const MAX_PRODUCTS = 6

    const productSelection = await getPostProductSelection()

    const GeneratePostProductsSchema = z.object({
        products: z.array(z.string()).max(MAX_PRODUCTS).describe("Array of selected product IDs"),
        caption: z.string().describe("A catchy caption for the post that highlights the outfit and its style")
    })

    const response = await generateText({
        model: "openai/gpt-4o-mini",
        output: Output.object({
            schema: GeneratePostProductsSchema,
        }),
        prompt: generatePostProductsPrompt(productSelection, MAX_PRODUCTS)
    })

    const {products: prodcutsIds, caption} = response.output

    const products = await prisma.product.findMany({
        where: {
            id: {
                in: prodcutsIds
            }
        }
    })

    for (const [slot, {products, required}] of Object.entries(productSelection)) {
        if (required && !products.some((product) => prodcutsIds.includes(product.id))) {
            throw new Error(`Required slot ${slot} does not have a selected product`)
        }
    }

    return {
        caption,
        products
    }
}

const generatePostImagePrompt = (prompt: string, products: Product[]) => `
Create a professional fashion photography image for social media.

SCENE:
${prompt}

PRODUCTS (preserve exactly as described):
${products.map((product) => `- ${product.name} (${product.category})`).join("\n")}

REQUIREMENTS:
- All products must be clearly visible and recognizable
- Accurate colors, textures, and shapes
- Professional photography quality with good lighting
- Natural and realistic product presentation
- Complementary background that doesn't overwhelm products
`

async function generatePostImage(prompt: string, products: Product[], images: Buffer[]) {
    const image = await generateImageGoogle(generatePostImagePrompt(prompt, products), "gemini-3.1-flash-image-preview", images, {
        aspectRatio: "9:16",
        imageSize: "2K",
        format: "jpeg"
    })

    return image
}

export async function generatePost() {
    const { products, caption } = await generatePostProducts()
    
    const MIN_IMAGES = 2
    const MAX_IMAGES = 4

    const IMAGE_PROMPTS: string[] = [
        "Products laid out flat on concrete ground, overhead shot, urban setting, natural shadows",
        "Products arranged on wooden floor boards, minimalist aesthetic, warm indoor lighting",
        "Products styled on marble surface, luxury presentation, clean background, professional lighting",
        "Products placed on grass field, nature aesthetic, soft outdoor lighting, organic composition",
        "Products displayed on vintage rug, cozy interior vibe, warm tones, lifestyle setting",
        "Products arranged on white bed sheets, relaxed home aesthetic, soft natural light from window",
        "Products laid out on sand beach, summer vacation vibe, ocean backdrop, golden hour",
        "Products styled on dark leather surface, sophisticated look, dramatic lighting, modern aesthetic",
        "Products arranged on colorful tiles, vibrant urban setting, street photography style",
        "Products displayed on industrial metal surface, edgy aesthetic, harsh shadows, contemporary style"
    ]

    const MODEL_IMAGE_PROMPTS: string[] = [
        "Model laying on the ground outdoors, relaxed casual pose, natural lighting, overhead shot",
        "Model sitting on concrete steps in urban environment, leaning back casually, street style aesthetic",
        "Model laying on wooden floor indoors, sprawled out naturally, warm indoor lighting, minimalist background",
        "Model standing against brick wall, arms crossed, confident pose, city street backdrop",
        "Model sitting on rooftop edge, legs dangling, golden hour lighting, skyline in background",
        "Model laying in grass field, arms spread out, peaceful expression, nature setting, soft sunlight",
        "Model leaning against vintage car, one leg crossed, cool relaxed vibe, urban parking lot",
        "Model sitting on beach sand, knees up, contemplative look, ocean waves in background, sunset lighting",
        "Model walking down empty street, mid-stride, dynamic movement, blurred background, fashion editorial style",
        "Model laying on modern couch, casual lounge pose, contemporary interior, soft studio lighting"
    ]

    const images = Math.random() * (MAX_IMAGES - MIN_IMAGES) + MIN_IMAGES
    const imagePrompts: string[] = []

    for (let i = 0; i < images; i++) {
        const allPrompts = [...IMAGE_PROMPTS, ...MODEL_IMAGE_PROMPTS]
        const prompt = allPrompts[Math.floor(Math.random() * allPrompts.length)]
        imagePrompts.push(prompt)
    }

    const uploadedImageUrls = []
    const productImages = products.map((product) => product.productOnlyImageUrl)
    const prodcutImageBuffers = await Promise.all(
        productImages.map(async (url) => {
            const response = await fetch(url)
            const arrayBuffer = await response.arrayBuffer()
            return Buffer.from(arrayBuffer)
        })
    )

    for (const prompt of imagePrompts) {
        const image = await generatePostImage(prompt, products, prodcutImageBuffers)
        const uploadedImage = await upload(image, `post-${caption}.jpeg`, ["posts"])
        uploadedImageUrls.push(uploadedImage.url)
    }

    const post = await prisma.post.create({
        data: {
            caption,
            products: {
                create: products.map((product) => ({
                    product: {
                        connect: { id: product.id }
                    }
                }))
            },
            imageUrls: uploadedImageUrls,
            isOfficial: true,
        }
    })

    return post
}