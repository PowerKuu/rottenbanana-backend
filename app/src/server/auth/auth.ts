import { betterAuth, APIError } from "better-auth"
import { decodeProtectedHeader, jwtVerify, importJWK } from "jose"
import { betterFetch } from "@better-fetch/fetch"
import { createAuthMiddleware } from "better-auth/api"
import { prismaAdapter } from "better-auth/adapters/prisma"
import { bearer } from "better-auth/plugins/bearer"
import { expo } from "@better-auth/expo"
import { prisma } from "@/server/database/prisma"
import { resend } from "../mail/resend"
import { emailTemplates } from "../mail/templates"



async function verifyGoogleIdToken(token: string, nonce?: string): Promise<boolean> {
    const MAX_TOKEN_AGE = "1h"
    const CLOCK_TOLERANCE = "5m"

    try {
        const { kid, alg } = decodeProtectedHeader(token)

        if (!kid || !alg) return false

        const { data } = await betterFetch<{
            keys: {
                kid: string
                alg: string
            }[]
        }>("https://www.googleapis.com/oauth2/v3/certs")

        if (!data || !data.keys) return false

        const jwk = data.keys.find((key) => key.kid === kid)

        if (!jwk) return false

        const key = await importJWK(jwk, jwk.alg)

        const { payload } = await jwtVerify(token, key, {
            algorithms: [alg],
            issuer: ["https://accounts.google.com", "accounts.google.com"],
            audience: process.env.GOOGLE_AUTH_CLIENT_ID!,
            maxTokenAge: MAX_TOKEN_AGE,
            clockTolerance: CLOCK_TOLERANCE,
        })

        if (nonce && payload.nonce !== nonce) return false
        return true
    } catch {
        return false
    }
} 

export const ALLOWED_ORIGINS = ["http://localhost:8081", "fithappens://", "exp://", "plagg://", "https://appleid.apple.com"]

export const auth = betterAuth({
    database: prismaAdapter(prisma, {
        provider: "postgresql"
    }),
    trustedOrigins: ALLOWED_ORIGINS,
    advanced: {
        disableCSRFCheck: true
    },
    emailAndPassword: {
        enabled: true,
        async sendResetPassword(data, _request) {
            const template = emailTemplates.resetPassword(data.url)
            await resend.emails.send({
                from: process.env.EMAIL_FROM!,
                to: data.user.email,
                ...template
            })
        }
    },
    emailVerification: {
        sendOnSignUp: true,
        callbackURL: "/auth/email-verified",
        async sendVerificationEmail(data) {
            const template = emailTemplates.verifyEmail(data.url)
            await resend.emails.send({
                from: process.env.EMAIL_FROM!,
                to: data.user.email,
                ...template
            })
        }
    },
    user: {
        additionalFields: {
            role: {
                type: "string",
                required: true,
                defaultValue: "USER",
                input: false
            }
        }
    },
    socialProviders: {
        apple: {
            clientId: process.env.APPLE_CLIENT_ID!,
            clientSecret: process.env.APPLE_CLIENT_SECRET!,
            appBundleIdentifier: process.env.APPLE_APP_BUNDLE_IDENTIFIER!,
        },
        google: {
            clientId: process.env.GOOGLE_AUTH_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_AUTH_CLIENT_SECRET!,
            verifyIdToken: verifyGoogleIdToken,
        },
    },
    plugins: [bearer(), expo()],
    hooks: {
        before: createAuthMiddleware(async (ctx) => {
            if (ctx.path === "/sign-up/email") {
                const password = ctx.body?.password as string | undefined
                if (!password || password.length < 8 || !/\d/.test(password) || !/[^a-zA-Z0-9]/.test(password)) {
                    throw new APIError("BAD_REQUEST", {
                        message: "Password must be at least 8 characters and include a number and a special character"
                    })
                }
            }

            if (ctx.path === "/sign-in/email") {
                // Revoke any existing session before processing sign-in so that
                // Better Auth cannot return an active session without validating
                const authHeader = ctx.headers?.get("authorization") ?? ""
                const bearerToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null

                const cookieHeader = ctx.headers?.get("cookie") ?? ""
                const cookieMatch = cookieHeader.match(/better-auth\.session_token=([^;]+)/)
                const cookieToken = cookieMatch ? decodeURIComponent(cookieMatch[1]) : null

                const sessionToken = bearerToken || cookieToken
                if (sessionToken) {
                    await prisma.session.deleteMany({ where: { token: sessionToken } }).catch(() => { })
                }
            }
        })
    }
})
