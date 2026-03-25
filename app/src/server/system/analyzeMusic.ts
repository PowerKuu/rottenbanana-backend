import z from "zod"
import { prisma } from "../database/prisma"
import { generateText, Output } from "ai"
import { analyzeMusicPrompt } from "./prompts"

export async function analyzeMusic(music: Buffer) {
    const tags = await prisma.preferenceTag.findMany()
    const availableTags = tags.map(({ tag }) => tag)

    const AnalyzeMusicSchema = z.object({
        tags: z
            .array(z.enum(availableTags))
            .describe("Tags that capture the feelings and aesthetic vibe this music evokes"),
        description: z.string().describe("Brief description of the music (2-3 sentences), in English.")
    })

    const response = await generateText({
        model: "google/gemini-2.5-flash",
        output: Output.object({
            schema: AnalyzeMusicSchema
        }),
        messages: [
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
