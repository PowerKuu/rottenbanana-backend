import { betterAuth, APIError } from "better-auth"
import { createAuthMiddleware } from "better-auth/api"
import { prismaAdapter } from "better-auth/adapters/prisma"
import { bearer } from "better-auth/plugins/bearer"
import { prisma } from "@/server/database/prisma"
import { resend } from "../mail/resend"
import { emailTemplates } from "../mail/templates"
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
    },
    plugins: [bearer()],
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
                    await prisma.session.deleteMany({ where: { token: sessionToken } }).catch(() => {})
                }
            }
        })
    }
})
