import { NextRequest, NextResponse } from "next/server"

const ALLOWED_ORIGINS = [
    "http://localhost:8081",
    "fithappens://",
    "exp://"
]

export function middleware(request: NextRequest) {
    const origin = request.headers.get("origin") ?? ""
    const isAllowed = ALLOWED_ORIGINS.some(o => origin === o || origin.startsWith(o))

    if (request.method === "OPTIONS") {
        const response = new NextResponse(null, { status: 204 })
        if (isAllowed) {
            response.headers.set("Access-Control-Allow-Origin", origin)
            response.headers.set("Access-Control-Allow-Credentials", "true")
            response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
            response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization")
        }
        return response
    }

    const response = NextResponse.next()
    if (isAllowed) {
        response.headers.set("Access-Control-Allow-Origin", origin)
        response.headers.set("Access-Control-Allow-Credentials", "true")
    }
    return response
}

export const config = {
    matcher: "/api/:path*"
}
