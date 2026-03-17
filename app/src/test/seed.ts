import { prisma } from "@/server/database/prisma"

const tags = [
    { tag: "Minimalist", description: "Clean lines, neutral palettes and understated elegance" },
    { tag: "Maximalist", description: "Bold patterns, clashing prints and more-is-more layering" },
    { tag: "Dark Academia", description: "Scholarly moody aesthetics with vintage academia vibes" },
    { tag: "Old Money", description: "Timeless elegance and understated luxury" },
    { tag: "Grunge", description: "90s rebel spirit with distressed fabrics and layered looks" },
    { tag: "Bohemian", description: "Free-spirited eclectic with earthy tones and flowing silhouettes" },
    { tag: "Cottagecore", description: "Countryside living with florals, gingham and pastoral charm" },
    { tag: "Techwear", description: "Futuristic functionality with technical fabrics and modular design" },
    { tag: "Y2K", description: "Early 2000s nostalgia with low-rise, metallics and baby tees" },
    { tag: "Preppy", description: "Classic collegiate polish with blazers, loafers and crisp lines" },
    { tag: "Gorpcore", description: "Outdoor performance gear styled for urban life" },
    { tag: "Quiet Luxury", description: "Expensive minimalism with impeccable tailoring and subtle details" },
    { tag: "Opulent Maximalism", description: "Luxe glamour with furs, velvet, gold and dramatic volume" },
    { tag: "Indie Sleaze", description: "Messy cool-kid energy with skinny jeans and vintage band tees" },
    { tag: "Punk", description: "Rebellious DIY attitude with leather, studs and anti-establishment edge" },
    { tag: "Romantic", description: "Soft dreamy aesthetics with lace, ruffles and delicate fabrics" },
    { tag: "Western", description: "Frontier spirit with cowboy boots, denim and ranch-inspired pieces" },
    { tag: "Skater", description: "Laid-back skate culture with baggy pants and graphic tees" },
    { tag: "Artsy Vintage", description: "Creative expression through thrifted vintage and artistic flair" },
    { tag: "Normcore", description: "Intentionally ordinary basics without trying too hard" },
    { tag: "Scandinavian", description: "Nordic simplicity with functional design and muted elegance" },
    { tag: "Cyberpunk", description: "Dystopian futurism with neon, leather and tech-noir edge" },
    { tag: "Rockstar", description: "Performative glamour with leather pants, mesh and stage presence" },
    { tag: "Americana", description: "Classic American heritage with denim, varsity and vintage workwear" },
    { tag: "Monochrome", description: "Single-color or tonal dressing for bold cohesive impact" }
]

async function main() {
    await prisma.preferenceTag.deleteMany()
    for (const tag of tags) {
        await prisma.preferenceTag.upsert({
            where: { tag: tag.tag },
            update: { description: tag.description },
            create: tag
        })
    }

    console.log(`Seeded ${tags.length} preference tags`)
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect())
