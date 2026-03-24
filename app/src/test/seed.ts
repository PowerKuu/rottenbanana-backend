import { prisma } from "@/server/database/prisma"

const tags = [
    {
        tag: "Streetwear",
        description: "Must have bold graphics, oversized proportions, or recognizable urban brand aesthetics like Supreme/Off-White. Requires either: loud logos, skatewear elements, hip-hop inspired silhouettes, or deliberate baggy street styling. Plain basics don't qualify."
    },
    {
        tag: "Old Money",
        description: "Only timeless, expensive-looking pieces in neutral tones with zero visible branding. Must look like inherited wealth - cashmere sweaters, perfectly tailored coats, classic loafers, or polo shirts. Nothing trendy, flashy, or affordable-looking qualifies."
    },
    {
        tag: "Scandinavian",
        description: "Exclusively clean-lined, functional Nordic design in muted earth tones (beige, grey, cream, black). Must have that specific minimalist Scandinavian aesthetic - architectural cuts, quality basics, cozy knits. Bright colors or ornate details disqualify."
    },
    {
        tag: "Formal",
        description: "Only clothing appropriate for business meetings, weddings, or formal events. Must be: suits, blazers, dress shirts, dress pants, pencil skirts, ties, or formal dresses. Casual fabrics like jersey or denim automatically disqualify."
    },
    {
        tag: "Romantic",
        description: "Must have overtly feminine, delicate details: lace, ruffles, bows, or soft flowing fabrics. Requires pastel colors or floral prints with dreamy, ethereal aesthetic. Simple or structured pieces don't qualify - needs visible romantic elements."
    },
    {
        tag: "Detailed",
        description: "Only clothing with significant embellishment visible on the garment: embroidery, beading, intricate patterns, or ornate decorations. Must have elaborate craftsmanship you can see. Plain clothing with simple construction doesn't qualify regardless of quality."
    },
    {
        tag: "Casual",
        description: "Basic everyday wear with zero styling or fashion intent. Must be completely unremarkable: plain t-shirts, basic jeans, simple hoodies without any distinctive features. If it has any aesthetic, trend, or style element, it's NOT casual."
    },
    {
        tag: "Preppy",
        description: "Must embody Ivy League collegiate style: polo shirts, cable knit sweaters, khakis, blazers with buttons, loafers, or preppy patterns (stripes, argyle). Requires that specific clean-cut American East Coast aesthetic. Casual basics don't qualify."
    },
    {
        tag: "Bohemian",
        description: "Only free-spirited, artistic pieces with boho elements: maxi length, fringe, peasant styling, earth tones with floral, or layered natural fabrics. Must have that specific carefree hippie aesthetic. Structured or minimal pieces don't qualify."
    },
    {
        tag: "Sporty",
        description: "Must be actual athletic-inspired fashion: track pants with stripes, sports jerseys, windbreakers, athletic shorts, or performance-looking pieces. Requires visible sporty elements. Regular activewear or plain basics don't qualify - needs that sports fashion look."
    },
    {
        tag: "Vintage",
        description: "Must authentically look like clothing from past decades (60s-90s) with period-specific cuts, worn-in appearance, or retro patterns. Needs that specific thrifted, nostalgic, old-school aesthetic. Modern reproductions without authentic vintage feel don't qualify."
    },
    {
        tag: "Y2K",
        description: "Must have specific early 2000s elements: low-rise cuts, baby tee sizing, velour material, mini lengths, butterfly motifs, metallic fabrics, or tiny accessories. Needs obvious 2000s nostalgia aesthetic. General modern clothing doesn't qualify."
    },
    {
        tag: "Gothic",
        description: "Must be predominantly black with dark romantic or dramatic gothic elements: leather, lace, corsets, chains, Victorian details, or moody aesthetic. Requires that specific dark subculture look. Simply wearing black doesn't qualify - needs gothic styling."
    },
    {
        tag: "Punk",
        description: "Must have visible rebellious punk elements: leather jackets with hardware, intentional rips/distressing, band patches, safety pins, studs, plaid pants, or DIY modifications. Needs anti-establishment aesthetic. Edgy basics without punk details don't qualify."
    },
    {
        tag: "Korean",
        description: "Must have that specific K-fashion Seoul aesthetic: oversized layered proportions, unique Asian-influenced silhouettes, matching sets, platform shoes, or cute Korean styling details. Needs recognizable Korean street fashion look. Western basics don't qualify."
    },
    {
        tag: "French",
        description: "Must embody Parisian chic: horizontal stripes, berets, perfectly tailored blazers, European-cut jeans, loafers, or trench coats. Requires that specific effortless French sophistication. American or basic pieces without European styling don't qualify."
    },
    {
        tag: "Coastal",
        description: "Must evoke beach/seaside aesthetic: linen material, crisp white and blue palette, nautical stripes, breezy vacation cuts, or maritime details. Needs that specific coastal grandmother or beachy aesthetic. Regular summer clothes without coastal vibe don't qualify."
    },
    {
        tag: "Dark Academia",
        description: "Must have scholarly library aesthetic: tweed material, turtlenecks, plaid skirts, oxford shoes, or vintage intellectual styling in browns and dark greens. Needs that specific old-university literature vibe. Preppy without academic moodiness doesn't qualify."
    },
    {
        tag: "Clean Girl",
        description: "Must be polished minimalist in neutral tones with intentional simplicity: matching sets, neutral colors only, sophisticated basics, or refined gold jewelry aesthetic. Everything must look fresh and put-together. Casual basics or anything with patterns/colors don't qualify."
    },
    {
        tag: "Athleisure",
        description: "Must be performance athletic wear styled fashionably outside the gym: leggings worn as pants, sports bras as outerwear, sneakers styled with non-athletic pieces. Requires mixing athletic and casual. Pure gym clothes or regular casual wear don't qualify."
    },
    {
        tag: "Edgy",
        description: "Must have bold unconventional design: visible cut-outs, asymmetrical construction, avant-garde silhouettes, harness details, chains as fashion, or risk-taking design choices. Needs daring statement-making elements. Safe or classic pieces don't qualify."
    },
    {
        tag: "Western",
        description: "Must have explicit cowboy/ranch elements: cowboy boots, western fringe, large belt buckles, snap-button shirts, bandana prints, or rodeo aesthetic. Requires obvious Western Americana styling. Regular denim or boots without western details don't qualify."
    },
    {
        tag: "Workwear",
        description: "Must have utilitarian labor-inspired design: cargo pants with multiple pockets, utility jackets, denim overalls, work boots, or heavy-duty functional construction. Needs that specific durable workman aesthetic. Regular casual wear doesn't qualify."
    },
    {
        tag: "Luxury",
        description: "Must have obvious high-end markers: prominent designer logos, recognizable luxury branding, premium materials like silk/cashmere, or expensive designer aesthetic. Needs flashy wealth display. Quality pieces without visible luxury signaling don't qualify."
    },
    {
        tag: "Cottagecore",
        description: "Must have rural countryside aesthetic: floral prairie patterns, linen material, puff sleeves, gingham checks, apron styling, or nostalgic farm-inspired details. Needs that specific romantic pastoral vibe. Regular floral or casual pieces don't qualify."
    }
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
