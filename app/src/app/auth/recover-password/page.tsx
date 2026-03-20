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

function ResetPasswordForm() {
    const [password, setPassword] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const router = useRouter()
    const searchParams = useSearchParams()
    const tokenParam = searchParams.get("token")

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)

        if (!tokenParam) {
            toast.error("Invalid or missing reset token")
            setIsLoading(false)
            return
        }

        if (password !== confirmPassword) {
            toast.error("Passwords do not match")
            setIsLoading(false)
            return
        }

        try {
            const { data, error } = await authClient.resetPassword({
                newPassword: password,
                token: tokenParam
            })

            if (error) {
                toast.error(error.message || "Failed to reset password")
            } else if (data) {
                toast.success("Password reset successfully")
                router.push("/auth/login")
            }
        } catch (err) {
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
                        <Input
                            id="password"
                            type="password"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            disabled={isLoading}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="confirmPassword">Confirm Password</Label>
                        <Input
                            id="confirmPassword"
                            type="password"
                            placeholder="••••••••"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                            disabled={isLoading}
                        />
                    </div>
                    <Button type="submit" className="w-full cursor-pointer" disabled={isLoading}>
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