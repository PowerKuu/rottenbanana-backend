import z from "zod"
import { prisma } from "../database/prisma"
import { generateText, Output } from "ai"
import { PreferenceTag } from "@/prisma/client"

const analyzeMusicPrompt = (tags: PreferenceTag[]) => `
Listen to this music and describe what it feels like. What emotions and atmosphere does it create? What feminine/masculine energy, if any, does it give?
Focus on feelings, not whether they are positive or negative.

Choose tags that match the feeling and vibe of this music.

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
            .describe("Tags that capture the feelings and aesthetic vibe this music evokes"),
        description: z
            .string()
            .describe(
                "Brief description of the mood, atmosphere, and emotional qualities of this music (2-3 sentences), in English."
            )
    })

    const system = `You are a music analyst. Analyze music tracks and identify the feelings, moods, and atmospheric qualities they evoke.`

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
