"use client"

import { useState } from "react"
import Link from "next/link"
import { authClient } from "@/lib/authClient"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"

export default function RecoverPage() {
    const [email, setEmail] = useState("")
    const [isLoading, setIsLoading] = useState(false)

    const handleRecover = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)

        try {
            const { data, error } = await authClient.requestPasswordReset({
                email,
                redirectTo: "/auth/recover-password"
            })

            if (error) {
                toast.error(error.message || "Failed to send recovery email")
            } else {
                toast.success("Password reset link has been sent to your email address")
                setEmail("")
            }
        } catch (err) {
            toast.error("An unexpected error occurred")
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="flex min-h-screen items-center justify-center p-4">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle>Recover Password</CardTitle>
                    <CardDescription>Enter your email to receive a password reset link</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleRecover} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="you@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                disabled={isLoading}
                            />
                        </div>
                        <Button type="submit" className="w-full cursor-pointer" disabled={isLoading}>
                            {isLoading ? "Sending..." : "Send Reset Link"}
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
        </div>
    )
}
