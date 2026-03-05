import { auth } from "./auth"
import { NextRequest } from "next/server"

export async function getSession(request: NextRequest) {
    return auth.api.getSession({
        headers: request.headers
    })
}
