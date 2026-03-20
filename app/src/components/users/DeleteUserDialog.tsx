"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { deleteUser } from "@/server/admin/actions/users"
import { AlertTriangle } from "lucide-react"

export function DeleteUserDialog({
    open,
    onOpenChange,
    user,
    currentUserId,
    onSuccess
}: {
    open: boolean
    onOpenChange: (open: boolean) => void
    user: {
        id: string
        name: string
        email: string
        role: "USER" | "ADMIN"
        _count: {
            sessions: number
            accounts: number
            tryOnOutfits: number
            postLikes: number
            postViews: number
            preferenceTags: number
            productReferrals: number
        }
    } | null
    currentUserId: string
    onSuccess?: () => void
}) {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")

    const handleDelete = async () => {
        if (!user) return

        setLoading(true)
        setError("")

        try {
            await deleteUser(user.id, currentUserId)
            onSuccess?.()
            onOpenChange(false)
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to delete user")
        } finally {
            setLoading(false)
        }
    }

    if (!user) return null

    const totalRelations =
        user._count.sessions +
        user._count.accounts +
        user._count.tryOnOutfits +
        user._count.postLikes +
        user._count.postViews +
        user._count.preferenceTags +
        user._count.productReferrals

    const hasRelations = totalRelations > 0
    const isAdmin = user.role === "ADMIN"

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Delete User</DialogTitle>
                    <DialogDescription>
                        Are you sure you want to delete <strong>{user.name}</strong> ({user.email})?
                    </DialogDescription>
                </DialogHeader>

                {/* Admin warning */}
                {isAdmin && (
                    <div className="flex gap-3 rounded-md border border-amber-500/50 bg-amber-500/10 p-3">
                        <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" />
                        <div className="space-y-1 text-sm">
                            <p className="font-medium text-amber-600">Warning: Admin User</p>
                            <p className="text-muted-foreground">
                                You are about to delete an admin user. This action is irreversible.
                            </p>
                        </div>
                    </div>
                )}

                {/* Cascade delete warning */}
                {hasRelations && (
                    <div className="flex gap-3 rounded-md border border-amber-500/50 bg-amber-500/10 p-3">
                        <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" />
                        <div className="space-y-1 text-sm">
                            <p className="font-medium text-amber-600">Warning: Cascade Delete</p>
                            <p className="text-muted-foreground">
                                This user has {totalRelations} related record{totalRelations === 1 ? "" : "s"}:
                            </p>
                            <ul className="list-disc list-inside text-muted-foreground space-y-1">
                                {user._count.sessions > 0 && (
                                    <li>
                                        {user._count.sessions} session{user._count.sessions === 1 ? "" : "s"}
                                    </li>
                                )}
                                {user._count.accounts > 0 && (
                                    <li>
                                        {user._count.accounts} account{user._count.accounts === 1 ? "" : "s"}
                                    </li>
                                )}
                                {user._count.tryOnOutfits > 0 && (
                                    <li>
                                        {user._count.tryOnOutfits} try-on outfit
                                        {user._count.tryOnOutfits === 1 ? "" : "s"}
                                    </li>
                                )}
                                {user._count.postLikes > 0 && (
                                    <li>
                                        {user._count.postLikes} post like{user._count.postLikes === 1 ? "" : "s"}
                                    </li>
                                )}
                                {user._count.postViews > 0 && (
                                    <li>
                                        {user._count.postViews} post view{user._count.postViews === 1 ? "" : "s"}
                                    </li>
                                )}
                                {user._count.preferenceTags > 0 && (
                                    <li>
                                        {user._count.preferenceTags} preference tag
                                        {user._count.preferenceTags === 1 ? "" : "s"}
                                    </li>
                                )}
                                {user._count.productReferrals > 0 && (
                                    <li>
                                        {user._count.productReferrals} product referral
                                        {user._count.productReferrals === 1 ? "" : "s"}
                                    </li>
                                )}
                            </ul>
                            <p className="text-muted-foreground pt-2">All related data will be permanently deleted.</p>
                        </div>
                    </div>
                )}

                {error && <div className="text-sm text-destructive">{error}</div>}

                <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
                        Cancel
                    </Button>
                    <Button variant="destructive" onClick={handleDelete} disabled={loading}>
                        {loading ? "Deleting..." : "Delete"}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}
