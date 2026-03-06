import { prisma } from "@/server/database/prisma"

const tags = [
    { tag: "Athleisure", description: "Athletic-inspired clothing worn as everyday wear" },
    { tag: "Beach & Resort", description: "Relaxed holiday and coastal-inspired styles" },
    { tag: "Bohemian", description: "Free-spirited, earthy and eclectic fashion" },
    { tag: "Cottagecore", description: "Romantic rural aesthetics with florals and natural textures" },
    { tag: "Dark Academia", description: "Moody, scholarly aesthetics with earthy and dark tones" },
    { tag: "Formal", description: "Business and office-ready attire" },
    { tag: "Grunge", description: "Edgy, layered looks with distressed fabrics and dark palettes" },
    { tag: "Luxury", description: "High-end designer and premium fashion" },
    { tag: "Minimalist", description: "Clean lines, neutral tones and understated looks" },
    { tag: "Old Money", description: "Understated elegance and timeless classic pieces" },
    { tag: "Preppy", description: "Classic collegiate looks with a polished finish" },
    { tag: "Scandinavian", description: "Nordic minimalism with functional, clean aesthetics" },
    { tag: "Smart Casual", description: "Polished but relaxed — think chinos and a blazer" },
    { tag: "Streetwear", description: "Urban-inspired styles with hoodies, sneakers and graphic tees" },
    { tag: "Sustainable", description: "Eco-friendly and ethically produced clothing" },
    { tag: "Techwear", description: "Functional, futuristic clothing with technical fabrics" },
    { tag: "Vintage", description: "Retro and second-hand inspired styles" },
    { tag: "Workwear", description: "Durable, practical clothes inspired by labour and utility" },
    { tag: "Y2K", description: "Early 2000s nostalgia with bold colours and low-rise styles" },
]

async function main() {
    for (const tag of tags) {
        await prisma.preferenceTag.upsert({
            where: { tag: tag.tag },
            update: { description: tag.description },
            create: tag,
        })
    }

    console.log(`Seeded ${tags.length} preference tags`)
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect())
