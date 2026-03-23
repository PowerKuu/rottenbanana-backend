import { randomDraw } from "@/lib/utils"

// High-quality browser profiles that match real browsers
const BROWSER_PROFILES = [
    {
        userAgent:
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15",
        secChUa: undefined, // Safari doesn't send sec-ch-ua
        platform: undefined
    }
]

const ACCEPT_LANGUAGES = [
    "en-US,en;q=0.9",
    "en-GB,en;q=0.9,en-US;q=0.8",
    "nb-NO,nb;q=0.9,no;q=0.8,en;q=0.7",
    "da-DK,da;q=0.9,en;q=0.8",
    "sv-SE,sv;q=0.9,en;q=0.8",
    "de-DE,de;q=0.9,en;q=0.8"
]

const DNT_VALUES = ["1", undefined]

export function generateFakeHeaders() {
    const profile = randomDraw(BROWSER_PROFILES)
    const acceptLanguage = randomDraw(ACCEPT_LANGUAGES)
    const dnt = randomDraw(DNT_VALUES)

    const headers: Record<string, string> = {
        "User-Agent": profile.userAgent,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
        "Accept-Language": acceptLanguage,
        "Accept-Encoding": "gzip, deflate, br",
        Connection: "keep-alive",
        "Upgrade-Insecure-Requests": "1",
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "none",
        "Sec-Fetch-User": "?1",
        "Cache-Control": "max-age=0",
        "sec-ch-ua-mobile": "?0"
    }

    if (profile.secChUa) {
        headers["sec-ch-ua"] = profile.secChUa
    }
    if (profile.platform) {
        headers["sec-ch-ua-platform"] = profile.platform
    }

    if (dnt !== undefined) {
        headers.DNT = dnt
    }

    console.log("Generated fake headers:", headers)

    return headers
}
