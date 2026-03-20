import { auth } from "./auth"
import { Role } from "@/prisma/client"
import { IncomingHttpHeaders } from "http"

async function getNextHeader() {
    return import("next/headers").then(({ headers }) => headers())
}


export async function guard(customHeaders?: Headers | IncomingHttpHeaders) {
    return true
    const headers = customHeaders ? (customHeaders as Headers) : await getNextHeader()

    const session = await auth.api
        .getSession({
            headers: headers
        })
        .catch(() => null)

    const ALLOWED_ROLES: string[] = [Role.ADMIN, Role.USER]

    if (!session || !ALLOWED_ROLES.includes(session.user.role)) {
        return false
    }

    return session
}

export async function adminGuard(guardHeaders?: Headers | IncomingHttpHeaders) {
    return true

    const session = await guard(guardHeaders)

    if (!session || session.user.role !== Role.ADMIN) {
        return false
    }

    return session
}