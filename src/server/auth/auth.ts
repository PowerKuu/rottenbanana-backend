import { betterAuth } from "better-auth"
import { prismaAdapter } from "better-auth/adapters/prisma"
import { prisma } from "@/server/database/prisma"
import { resend } from "../mail/resend"
import { emailTemplates } from "../mail/templates"

export const auth = betterAuth({
    database: prismaAdapter(prisma, {
        provider: "postgresql"
    }),
    emailAndPassword: {
        enabled: true,
        async sendResetPassword(data, request) {
            const template = emailTemplates.resetPassword(data.url)
            await resend.emails.send({
                from: "noreply@rottenbana.com",
                to: data.user.email,
                ...template
            })
        }
    },
    emailVerification: {
        async sendVerificationEmail(data, request) {
            const template = emailTemplates.verifyEmail(data.url)
            await resend.emails.send({
                from: "noreply@rottenbana.com",
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
    plugins: []
})
