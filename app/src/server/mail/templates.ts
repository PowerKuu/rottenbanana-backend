function escapeHtml(str: string) {
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
}

export const emailTemplates = {
    resetPassword: (resetUrl: string) => ({
        subject: "Plagg - Reset your password",
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2>Reset Your Password</h2>
                <p>Hello,</p>
                <p>We received a request to reset your password. Click the button below to create a new password:</p>
                <div style="margin: 30px 0;">
                    <a href="${resetUrl}"
                       style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
                        Reset Password
                    </a>
                </div>
                <p>Or copy and paste this link into your browser:</p>
                <p style="color: #666; word-break: break-all;">${escapeHtml(resetUrl)}</p>
                <p style="margin-top: 30px; color: #666; font-size: 14px;">
                    If you didn't request a password reset, you can safely ignore this email.
                </p>
            </div>
        `
    }),

    verifyEmail: (verificationUrl: string) => ({
        subject: "Plagg - Verify your email",
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2>Verify Your Email Address</h2>
                <p>Hello,</p>
                <p>Thank you for signing up! Please verify your email address by clicking the button below:</p>
                <div style="margin: 30px 0;">
                    <a href="${verificationUrl}"
                       style="background-color: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
                        Verify Email
                    </a>
                </div>
                <p>Or copy and paste this link into your browser:</p>
                <p style="color: #666; word-break: break-all;">${escapeHtml(verificationUrl)}</p>
                <p style="margin-top: 30px; color: #666; font-size: 14px;">
                    If you didn't create an account, you can safely ignore this email.
                </p>
            </div>
        `
    })
}
