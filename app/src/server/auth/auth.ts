import { betterAuth, APIError } from "better-auth"
import { createAuthMiddleware } from "better-auth/api"
import { prismaAdapter } from "better-auth/adapters/prisma"
import { bearer } from "better-auth/plugins/bearer"
import { prisma } from "@/server/database/prisma"
import { resend } from "../mail/resend"
import { emailTemplates } from "../mail/templates"
import { ALLOWED_ORIGINS } from "@/proxy"

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
        },
        password: {
            verify: async ({ password }: { password: string }) => {
                if (password.length < 8) return false
                if (!/\d/.test(password)) return false
                if (!/[^a-zA-Z0-9]/.test(password)) return false
                return true
            }
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
    plugins: [bearer()]
})
