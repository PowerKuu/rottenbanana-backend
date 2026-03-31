import { Product, PreferenceTag } from "@/prisma/client"
import { Gender, ProductCategory, ProductSlot } from "@/prisma/enums"
import { ScrapedProduct } from "../scraper/types"
import { getPostMusicSelection, getPostProductSelection, getProductDescription } from "./generatePost"

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

export const generatePostProductsPrompt = async (
    seedProduct: Product,
    selection: Awaited<ReturnType<typeof getPostProductSelection>>,
    musicSelection: Awaited<ReturnType<typeof getPostMusicSelection>>,
    minProducts: number,
    maxProducts: number,
    minShowcasePrompts: number,
    maxShowcasePrompts: number
) => `
You are a stylist selecting products for an outfit post.

SEED PRODUCT (STARTING POINT):
This outfit is built around: ${await getProductDescription(seedProduct)}
Use the seed as inspiration to create a cohesive and stylish outfit.

SELECTION GUIDELINES:
Think to yourself: "Would someone actually wear this combination together? Does it create a cohesive style or vibe? For example, pairing a formal blazer with casual sneakers does not create a good look."
If unsure leave out products! Must distinguish "editorial weird" vs "just bad"!

SLOT SELECTION RULES:
- The total number of products must be between ${minProducts} and ${maxProducts}
- SEED slot: You MUST include the seed product in the outfit, it's the foundation of the look!
- REQUIRED slots: You MUST pick exactly 1 product from each required slot!
- OPTIONAL slots: You MAY pick 0 or 1 product from each optional slot!
- ONLY one product can be selected per slot, but multiple layers of the same type (e.g. upperbody layer 1 and 2) can work well together
- Sometimes it's better to leave slots empty to create a cleaner look - use your creativity and fashion sense to decide!
- Create natural variety: some outfits should be minimal and clean, others can have more layers or accessories depending on the style

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
        ([slot, { products, required, seed }]) =>
            products.length > 0 &&
            `
${slot} (${required ? "REQUIRED" : "OPTIONAL"}) ${seed ? "(SEED)" : ""}:
${products.map((product, index) => `  ${index + 1}. ID: ${product.id} - ${product.description}`).join("\n")}`
    )

    .filter(Boolean)
    .join("\n")}
"""

AVAILABLE MUSIC:
"""
Select 1 music track that matches the vibe and style of the outfit.
${musicSelection.map((music, index) => `  ${index + 1}. ID: ${music.id} - ${music.description}`).join("\n")}
"""

SHOWCASE PROMPTS REQUIREMENTS:
"""
Generate exactly ${minShowcasePrompts}-${maxShowcasePrompts} creative prompts for showcasing the outfit.
Combine flat-lays, styled shoots, and lifestyle images to create an engaging post that highlights the outfit's style and vibe.
Create natural looking prompts that does not always feel generic and perfect.

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
"""
`

export const generatePostImagePrompt = (prompt: string, gender: Gender, products: Product[]) => `
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

export const analyzeMusicPrompt = (tags: PreferenceTag[]) => `
Listen to this music and describe it objectively. Focus on the actual characteristics and atmosphere without hyping it up or using marketing language.

DESCRIPTION REQUIREMENTS:
Describe the music based on objective observations:
✓ Tempo and rhythm (fast, slow, steady, syncopated)
✓ Instrumentation (electronic, acoustic, vocals, specific instruments)
✓ Atmosphere and mood (energetic, calm, melancholic, upbeat, etc.)
✓ Genre characteristics and sonic qualities
✓ Feminine/masculine energy if present

✗ DO NOT: Hype up the music, use superlatives, or include promotional language
✗ DO NOT: Add subjective opinions about quality or commercial appeal

ONLY: Objective facts about what the music sounds like and the atmosphere it creates

TAG DESCRIPTIONS:
"""
${tags.map((tag) => `${tag.tag}: ${tag.description}`).join("\n")}
"""
`

export const analyzeProductPrompt = (scrapedProduct: ScrapedProduct, tags: PreferenceTag[]) => `
ANALYZE THIS PRODUCT:
Name: ${scrapedProduct.name}
Gender: ${scrapedProduct.gender}
${scrapedProduct.description ? `Description: ${scrapedProduct.description}` : ""}
${scrapedProduct.brand ? `Brand: ${scrapedProduct.brand}` : ""}

I will provide ${scrapedProduct.imageUrls.length} images below. Analyze and provide: tags, slot, description, color, which image shows the product without a model, and which images are close-ups/detail shots that should keep their background (only flag images showing zoomed details like labels or textures, not full product views).
CRITICAL: You MUST identify the standalone product image (flat-lay, mannequin, or product-only shot) with 100% certainty. This must show ONLY the product itself with NO person wearing it. Only return null if you are absolutely certain EVERY image shows a person wearing the product.

DESCRIPTION REQUIREMENTS:
The description must ONLY describe the visual appearance of the product - what it looks like objectively:
✓ Patterns (stripes, polka dots, floral, geometric, etc.)
✓ Colors and color combinations
✓ Visual design elements (graphics, logos, prints, embroidery)
✓ Feeling/vibe of the product (e.g., summer, formal, casual, edgy, romantic)
✓ Observable details (pockets, buttons, zippers, seams, cuts)

✗ DO NOT: Mention: comfort, wearability, how it feels, fit quality, brand hype, marketing language
✗ DO NOT: Include: emotional descriptions, subjective opinions, or product name repetition

ONLY: Objective visual facts about how the product looks

CATEGORY DESCRIPTIONS:
"""
${Object.entries(productCategoryDescriptions)
    .map(([category, description]) => `${category}: ${description}`)
    .join("\n")}

IMPORTANT: When determining the category, prioritize the visual appearance and actual product type from the images over the product title/name. Product titles can be misleading (e.g., "Sweatjakke" might be labeled as a jacket but is actually a hoodie). Always base your category selection on what you see in the images, not what the title says.
"""

SLOT DESCRIPTIONS:
"""
${Object.entries(productSlotDescriptions)
    .map(([slot, description]) => `${slot}: ${description}`)
    .join("\n")}

IMPORTANT: When determining the slot, prioritize the visual appearance and actual product type from the images over the product title/name. Product titles can be misleading (e.g., "Sweatjakke" might be labeled as a jacket but is actually a hoodie = UPPERBODY_LAYER_2). Always base your slot selection on what you see in the images, not what the title says.
"""

TAG DESCRIPTIONS:
"""
${tags.map((tag) => `${tag.tag}: ${tag.description}`).join("\n")}
"""
`
