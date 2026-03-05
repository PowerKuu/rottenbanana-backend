import { betterAuth, APIError } from "better-auth"
import { createAuthMiddleware } from "better-auth/api"
import { prismaAdapter } from "better-auth/adapters/prisma"
import { bearer } from "better-auth/plugins/bearer"
import { prisma } from "@/server/database/prisma"
import { resend } from "../mail/resend"
import { emailTemplates } from "../mail/templates"

function validatePasswordStrength(password: string): string | null {
    if (!/\d/.test(password)) return "Password must contain at least one number"
    if (!/[^a-zA-Z0-9]/.test(password)) return "Password must contain at least one special character"
    return null
}

export const auth = betterAuth({
    database: prismaAdapter(prisma, {
        provider: "postgresql"
    }),
    trustedOrigins: [
        "fithappens://",
        "exp://",
        "http://localhost:8081"
    ],
    advanced: {
        disableCSRFCheck: true
    },
    emailAndPassword: {
        enabled: true,
        minPasswordLength: 8,
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
        callbackURL: "/email-verified",
        async sendVerificationEmail(data, _request) {
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
    hooks: {
        before: createAuthMiddleware(async (ctx) => {
            if (ctx.path === "/sign-up/email") {
                const body = ctx.body as { password?: string } | undefined
                const error = validatePasswordStrength(body?.password ?? "")
                if (error) throw new APIError("BAD_REQUEST", { message: error })
            }
        })
    },
    plugins: [bearer()]
})
