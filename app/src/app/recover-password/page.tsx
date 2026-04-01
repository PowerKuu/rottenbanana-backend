"use client"

import { useState, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { authClient } from "@/lib/authClient"
import { Eye, EyeOff } from "lucide-react"
import AppLogo from "@/components/ui/AppLogo"

/**
 * Colors matching the mobile app's light theme.
 * See: rottenbanana-app/src/constants/colors.ts
 */
const C = {
    primary: "#58bcff",
    bg: "#ffffff",
    inputBg: "#ebebeb",
    text: "#454545",
    white: "#ffffff",
    error: "#ff4d4d",
    success: "#4caf50",
}

function validatePassword(password: string) {
    return {
        minLength: password.length >= 8,
        hasNumber: /\d/.test(password),
        hasSpecial: /[^a-zA-Z0-9]/.test(password),
    }
}

function CheckItem({ label, met }: { label: string; met: boolean }) {
    return (
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
            <span style={{ fontSize: 14, fontWeight: 600, width: 20, color: met ? C.success : C.text + "40" }}>
                {met ? "\u2713" : "\u2717"}
            </span>
            <span style={{ fontSize: 13, color: met ? C.text : C.text + "60" }}>{label}</span>
        </div>
    )
}

const input: React.CSSProperties = {
    width: "100%",
    height: 50,
    borderRadius: 12,
    border: "none",
    backgroundColor: C.inputBg,
    color: C.text,
    paddingLeft: 16,
    paddingRight: 48,
    fontSize: 16,
    fontFamily: "inherit",
    outline: "none",
    boxSizing: "border-box",
}

const eyeBtn: React.CSSProperties = {
    position: "absolute",
    right: 14,
    top: "50%",
    transform: "translateY(-50%)",
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: 0,
    display: "flex",
    alignItems: "center",
    color: C.text + "60",
}

function ResetPasswordForm() {
    const [password, setPassword] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")
    const [showPassword, setShowPassword] = useState(false)
    const [showConfirm, setShowConfirm] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [success, setSuccess] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const searchParams = useSearchParams()
    const token = searchParams.get("token")
    const tokenError = searchParams.get("error")

    const v = validatePassword(password)
    const allValid = v.minLength && v.hasNumber && v.hasSpecial
    const match = password === confirmPassword

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setError(null)

        if (!token) return setError("Invalid or missing reset token. Please request a new link from the app.")
        if (!allValid) return setError("Password does not meet the requirements.")
        if (!match) return setError("Passwords do not match.")

        setIsLoading(true)
        try {
            const { data, error } = await authClient.resetPassword({ newPassword: password, token })
            if (error) setError(error.message || "Failed to reset password. The link may have expired.")
            else if (data) setSuccess(true)
        } catch {
            setError("An unexpected error occurred. Please try again.")
        } finally {
            setIsLoading(false)
        }
    }

    if (tokenError || !token) {
        return (
            <div style={{ width: "100%", maxWidth: 400 }}>
                <AppLogo />
                <h1 style={{ fontSize: 28, fontWeight: 700, color: C.text, marginBottom: 6, marginTop: 20 }}>
                    Link expired
                </h1>
                <p style={{ fontSize: 15, color: C.text, opacity: 0.6, lineHeight: 1.5, margin: 0 }}>
                    This password reset link is invalid or has expired. Please go back to the app and request a new one.
                </p>
            </div>
        )
    }

    if (success) {
        return (
            <div style={{ width: "100%", maxWidth: 400 }}>
                <AppLogo />
                <h1 style={{ fontSize: 28, fontWeight: 700, color: C.text, marginBottom: 6, marginTop: 20 }}>
                    Password updated
                </h1>
                <p style={{ fontSize: 15, color: C.text, opacity: 0.6, lineHeight: 1.5, margin: 0 }}>
                    Your password has been reset successfully. You can now go back to the app and log in with your new password.
                </p>
            </div>
        )
    }

    return (
        <div style={{ width: "100%", maxWidth: 400 }}>
            <AppLogo />
            <h1 style={{ fontSize: 28, fontWeight: 700, color: C.text, marginBottom: 6, marginTop: 20 }}>
                Reset your password
            </h1>
            <p style={{ fontSize: 15, color: C.text, opacity: 0.6, margin: "0 0 24px" }}>
                Choose a new password for your account
            </p>

            <form onSubmit={handleSubmit} suppressHydrationWarning>
                {error && (
                    <div style={{ backgroundColor: C.error + "20", borderRadius: 8, padding: 12, marginBottom: 16 }}>
                        <span style={{ color: C.error, fontSize: 14, fontWeight: 500 }}>{error}</span>
                    </div>
                )}

                <div style={{ position: "relative", marginBottom: 12 }}>
                    <input
                        suppressHydrationWarning
                        type={showPassword ? "text" : "password"}
                        placeholder="New password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        disabled={isLoading}
                        style={input}
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} style={eyeBtn}>
                        {showPassword ? <Eye size={18} /> : <EyeOff size={18} />}
                    </button>
                </div>

                {password.length > 0 && (
                    <div style={{ marginBottom: 12, paddingLeft: 4 }}>
                        <CheckItem label="At least 8 characters" met={v.minLength} />
                        <CheckItem label="Contains a number" met={v.hasNumber} />
                        <CheckItem label="Contains a special character" met={v.hasSpecial} />
                    </div>
                )}

                <div style={{ position: "relative", marginBottom: 12 }}>
                    <input
                        suppressHydrationWarning
                        type={showConfirm ? "text" : "password"}
                        placeholder="Confirm password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        disabled={isLoading}
                        style={input}
                    />
                    <button type="button" onClick={() => setShowConfirm(!showConfirm)} style={eyeBtn}>
                        {showConfirm ? <Eye size={18} /> : <EyeOff size={18} />}
                    </button>
                </div>

                {confirmPassword.length > 0 && !match && (
                    <p style={{ color: C.error, fontSize: 13, marginBottom: 12, paddingLeft: 4, marginTop: 0 }}>
                        Passwords do not match
                    </p>
                )}

                <button
                    type="submit"
                    disabled={isLoading || !allValid || !match}
                    style={{
                        width: "100%",
                        height: 50,
                        borderRadius: 12,
                        border: "none",
                        backgroundColor: allValid && match ? C.primary : C.primary + "60",
                        color: C.white,
                        fontSize: 16,
                        fontWeight: 600,
                        fontFamily: "inherit",
                        cursor: isLoading || !allValid || !match ? "default" : "pointer",
                        marginTop: 8,
                        opacity: isLoading ? 0.7 : 1,
                    }}
                >
                    {isLoading ? "Resetting..." : "Reset password"}
                </button>
            </form>
        </div>
    )
}

export default function ResetPasswordPage() {
    return (
        <div style={{ display: "flex", minHeight: "100vh", alignItems: "center", justifyContent: "center", padding: 16, backgroundColor: C.bg }}>
            <Suspense>
                <ResetPasswordForm />
            </Suspense>
        </div>
    )
}
