"use client"

import { useState, useEffect, useRef, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { authClient } from "@/lib/authClient"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"

function LoginForm() {
    const searchParams = useSearchParams()
    const invitationParam = searchParams.get("invitation")
    const redirectParam = searchParams.get("redirect")
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const router = useRouter()
    const hasShownUnauthorizedToast = useRef(false)

    useEffect(() => {
        if (redirectParam === "unauthorized" && !hasShownUnauthorizedToast.current) {
            hasShownUnauthorizedToast.current = true
            toast.error("You don't have access to that page. Contact your admin if this is unexpected.")
            router.replace("/auth/login")
        }
    }, [redirectParam, router])

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)

        const { data, error } = await authClient.signIn.email({
            email,
            password
        })

        if (error) {
            toast.error(error.message || "Failed to login")
        } else if (data) {
            if (invitationParam) {
                router.push(`/auth/accept-invitation?invitation=${invitationParam}`)
            } else {
                router.push("/app")
            }
        }

        setIsLoading(false)
    }

    return (
        <div className="flex min-h-screen items-center justify-center p-4">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle>{invitationParam ? "Login to Accept Invitation" : "Login"}</CardTitle>
                    <CardDescription>
                        {invitationParam ? (
                            <>Login to your account to accept the invitation.</>
                        ) : (
                            <>
                                Enter your credentials to access your account. Forgot your password?{" "}
                                <Link href="/auth/recover" className="underline">
                                    Recover it here.
                                </Link>
                            </>
                        )}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleLogin} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="you@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">Password</Label>
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
                        <Button type="submit" className="w-full cursor-pointer" disabled={isLoading}>
                            {isLoading ? "Logging in..." : "Login"}
                        </Button>
                    </form>
                    <div className="mt-2">
                        <Link
                            href="/"
                            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                        >
                            <span>&lt;</span>
                            <span>Back to home</span>
                        </Link>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}

export default function LoginPage() {
    return (
        <Suspense>
            <LoginForm />
        </Suspense>
    )
}
