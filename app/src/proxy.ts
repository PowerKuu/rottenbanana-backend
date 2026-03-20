import { NextRequest, NextResponse } from "next/server"
import { adminGuard } from "./server/auth/guard"

export const ALLOWED_ORIGINS = ["http://localhost:8081", "fithappens://", "exp://"]

export default async function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl

    if (pathname.startsWith("/admin") || pathname.startsWith("/auth")) {
        const isAdminAuthorized = await adminGuard()

        console.log("Admin authorization check:", { isAdminAuthorized })

        if (pathname.startsWith("/auth") && isAdminAuthorized) {
            return NextResponse.redirect(new URL("/admin", request.url))
        }

        if (pathname.startsWith("/admin") && !isAdminAuthorized) {
            const loginUrl = new URL("/auth/login", request.url)
            loginUrl.searchParams.set("redirect", "unauthorized")
            return NextResponse.redirect(loginUrl)
        }
    }

    const origin = request.headers.get("origin") ?? ""
    const isAllowed = ALLOWED_ORIGINS.some(
        (allowedOrigin) => origin === allowedOrigin || origin.startsWith(allowedOrigin)
    )

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
    matcher: ["/api/:path*", "/admin/:path*", "/auth/:path*"]
}
