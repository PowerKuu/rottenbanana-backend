import axios from "axios"

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY
const BFL_API_KEY = process.env.BFL_API_KEY

function imageEditGoogle(prompt: string, imagesBase64: string[],  output: Partial<{
    width: number
    height: number
    format: "png" | "jpeg"
}>) {
    const MODEL = "gemeni-3-pro-image-preview" as const

    return axios.post("/api/google/imageEdit", {
        prompt,
        images,
        model
    })
}


function imageEditBFL(prompt: string, imagesBase64: string[], output: Partial<{
    width: number
    height: number
    format: "png" | "jpeg"
}>) {
    const MODEL = "flux-2-klein-9b" as const

    return axios.post("/api/bfl/imageEdit", {
        prompt,
        images,
        model
    })
}
