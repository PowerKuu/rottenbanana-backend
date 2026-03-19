import { randomDraw } from "@/lib/utils"

// High-quality browser profiles that match real browsers
const BROWSER_PROFILES = [
    {
        userAgent:
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        secChUa: '"Google Chrome";v="131", "Chromium";v="131", "Not=A?Brand";v="24"',
        platform: '"macOS"',
    },
    {
        userAgent:
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
        secChUa: '"Chromium";v="130", "Google Chrome";v="130", "Not?A_Brand";v="99"',
        platform: '"Windows"',
    },
    {
        userAgent:
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36",
        secChUa: '"Google Chrome";v="129", "Not=A?Brand";v="8", "Chromium";v="129"',
        platform: '"macOS"',
    },
    {
        userAgent:
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0",
        secChUa: '"Microsoft Edge";v="131", "Chromium";v="131", "Not?A_Brand";v="24"',
        platform: '"Windows"',
    },
    {
        userAgent:
            "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
        secChUa: '"Chromium";v="130", "Google Chrome";v="130", "Not?A_Brand";v="99"',
        platform: '"Linux"',
    },
    {
        userAgent:
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15",
        secChUa: undefined, // Safari doesn't send sec-ch-ua
        platform: undefined,
    },
    {
        userAgent:
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:133.0) Gecko/20100101 Firefox/133.0",
        secChUa: undefined, // Firefox doesn't send sec-ch-ua
        platform: undefined,
    },
]

const ACCEPT_LANGUAGES = [
    "en-US,en;q=0.9",
    "en-GB,en;q=0.9,en-US;q=0.8",
    "nb-NO,nb;q=0.9,no;q=0.8,en;q=0.7",
    "da-DK,da;q=0.9,en;q=0.8",
    "sv-SE,sv;q=0.9,en;q=0.8",
    "de-DE,de;q=0.9,en;q=0.8",
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
        "sec-ch-ua-mobile": "?0",
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

    return headers
}
