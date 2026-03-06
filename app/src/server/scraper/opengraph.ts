"use server"

import axios from "axios"
import { JSDOM } from "jsdom"
import { FAKE_HEADERS } from "./utils"

export interface OpenGraphData {
    title: string | null
    description: string | null
    image: string | null
    url: string
}

export async function fetchOpenGraph(url: string): Promise<OpenGraphData | null> {
    const response = await axios.get(url, {
        headers: FAKE_HEADERS,
        timeout: 10000
    })
    
    const html = await response.data
    const dom = new JSDOM(html)
    const document = dom.window.document

    const getMetaContent = (property: string): string | null => {
        const element = document.querySelector(
            `meta[property="${property}"], meta[name="${property}"]`
        )
        return element?.getAttribute("content") || null
    }

    return {
        title: getMetaContent("og:title") ||
                document.querySelector("title")?.textContent ||
                null,
        description: getMetaContent("og:description") ||
                    getMetaContent("description") ||
                    null,
        image: getMetaContent("og:image") || null,
        url
    }
}
