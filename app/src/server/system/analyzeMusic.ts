import z from "zod"
import { prisma } from "../database/prisma"
import { generateText, Output } from "ai"
import { PreferenceTag } from "@/prisma/client"

const analyzeMusicPrompt = (tags: PreferenceTag[]) => `
Analyze this music and identify what fashion styles and clothing it matches.

Select tags representing clothing items, fashion styles, and aesthetics this music would complement.

TAG DESCRIPTIONS:
"""
${tags.map((tag) => `${tag.tag}: ${tag.description}`).join("\n")}
"""
`

export async function analyzeMusic(music: Buffer) {
    const tags = await prisma.preferenceTag.findMany()
    const availableTags = tags.map(({ tag }) => tag)

    const AnalyzeMusicSchema = z.object({
        tags: z
            .array(z.enum(availableTags))
            .describe("Tags for fashion items and styles this music matches"),
        description: z
            .string()
            .describe(
                "Brief description of the fashion vibe this music complements (2-3 sentences)"
            )
    })

    const system = `You are a fashion-music stylist. Analyze music tracks and identify what fashion styles, clothing items, and aesthetics they complement.`

    const response = await generateText({
        model: "google/gemini-2.5-flash",
        output: Output.object({
            schema: AnalyzeMusicSchema
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
                        text: analyzeMusicPrompt(tags)
                    },
                    {
                        type: "file",
                        data: music,
                        mediaType: "audio/mpeg"
                    }
                ]
            }
        ]
    })

    return response.output
}
