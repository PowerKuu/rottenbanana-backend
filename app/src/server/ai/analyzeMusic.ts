import z from "zod"
import { prisma } from "../database/prisma"
import { generateText, Output } from "ai"
import { PreferenceTag } from "@/prisma/client"

const analyzeMusicPrompt = (tags: PreferenceTag[]) => `
ANALYZE THIS MUSIC TRACK:

I will provide an audio file below. Analyze and provide: tags that describe the music's style, mood, genre, and characteristics, along with a description.

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
            .describe("Select tags that best describe the music's genre, mood, style, tempo, and key characteristics"),
        description: z
            .string()
            .describe(
                "A concise description highlighting the music's genre, mood, instrumentation, and style (2-3 sentences)"
            )
    })

    const system = `You are a music analyzer. Analyze the provided audio track to extract relevant metadata including genre, mood, instrumentation, and style.`

    const response = await generateText({
        model: "google/gemini-3-flash",
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
