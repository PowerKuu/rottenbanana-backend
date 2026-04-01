"use client"

import { useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { authClient } from "@/lib/authClient"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { Eye, EyeOff, Check, X } from "lucide-react"

function validatePassword(password: string) {
    return {
        minLength: password.length >= 8,
        hasNumber: /\d/.test(password),
        hasSpecial: /[^a-zA-Z0-9]/.test(password),
    }
}

function CheckItem({ label, met }: { label: string; met: boolean }) {
    return (
        <div className="flex items-center gap-2">
            {met ? (
                <Check className="h-3.5 w-3.5 text-green-500" />
            ) : (
                <X className="h-3.5 w-3.5 text-muted-foreground/40" />
            )}
            <span className={`text-xs ${met ? "text-foreground" : "text-muted-foreground/60"}`}>
                {label}
            </span>
        </div>
    )
}

function ResetPasswordForm() {
    const [password, setPassword] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")
    const [showPassword, setShowPassword] = useState(false)
    const [showConfirmPassword, setShowConfirmPassword] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const router = useRouter()
    const searchParams = useSearchParams()
    const tokenParam = searchParams.get("token")

    const validation = validatePassword(password)
    const allValid = validation.minLength && validation.hasNumber && validation.hasSpecial
    const passwordsMatch = password === confirmPassword

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)

        if (!tokenParam) {
            toast.error("Invalid or missing reset token")
            setIsLoading(false)
            return
        }

        if (!allValid) {
            toast.error("Password does not meet the requirements")
            setIsLoading(false)
            return
        }

        if (!passwordsMatch) {
            toast.error("Passwords do not match")
            setIsLoading(false)
            return
        }

        try {
            const { data, error } = await authClient.resetPassword({
                newPassword: password,
                token: tokenParam,
            })

            if (error) {
                toast.error(error.message || "Failed to reset password")
            } else if (data) {
                toast.success("Password reset successfully")
                router.push("/auth/login")
            }
        } catch {
            toast.error("An unexpected error occurred")
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Card className="w-full max-w-md">
            <CardHeader>
                <CardTitle>Reset Password</CardTitle>
                <CardDescription>Enter your new password</CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleResetPassword} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="password">New Password</Label>
                        <div className="relative">
                            <Input
                                id="password"
                                type={showPassword ? "text" : "password"}
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                disabled={isLoading}
                                className="pr-10"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-muted-foreground transition-colors"
                            >
                                {showPassword ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                            </button>
                        </div>
                        {password.length > 0 && (
                            <div className="space-y-1 pt-1">
                                <CheckItem label="At least 8 characters" met={validation.minLength} />
                                <CheckItem label="Contains a number" met={validation.hasNumber} />
                                <CheckItem label="Contains a special character" met={validation.hasSpecial} />
                            </div>
                        )}
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="confirmPassword">Confirm Password</Label>
                        <div className="relative">
                            <Input
                                id="confirmPassword"
                                type={showConfirmPassword ? "text" : "password"}
                                placeholder="••••••••"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                                disabled={isLoading}
                                className="pr-10"
                            />
                            <button
                                type="button"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-muted-foreground transition-colors"
                            >
                                {showConfirmPassword ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                            </button>
                        </div>
                        {confirmPassword.length > 0 && !passwordsMatch && (
                            <p className="text-xs text-destructive">Passwords do not match</p>
                        )}
                    </div>
                    <Button
                        type="submit"
                        className="w-full cursor-pointer"
                        disabled={isLoading || !allValid || !passwordsMatch}
                    >
                        {isLoading ? "Resetting..." : "Reset Password"}
                    </Button>
                </form>
                <div className="mt-2">
                    <Link
                        href="/auth/login"
                        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <span>&lt;</span>
                        <span>Back to login</span>
                    </Link>
                </div>
            </CardContent>
        </Card>
    )
}

export default function ResetPasswordPage() {
    return (
        <div className="flex min-h-screen items-center justify-center p-4">
            <Suspense>
                <ResetPasswordForm />
            </Suspense>
        </div>
    )
}
