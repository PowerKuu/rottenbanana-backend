"use client"

import { useEffect, useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { updateUser, getAllRegionsForSelect } from "@/server/admin/actions/users"

type UserFormData = {
    id: string
    name: string
    email: string
    role: "USER" | "ADMIN"
    gender?: "MALE" | "FEMALE" | "UNISEX" | null
    regionId?: string | null
    emailVerified: boolean
}

export function UserFormDialog({
    open,
    onOpenChange,
    user,
    onSuccess
}: {
    open: boolean
    onOpenChange: (open: boolean) => void
    user: UserFormData | null
    onSuccess?: () => void
}) {
    const [role, setRole] = useState<"USER" | "ADMIN">("USER")
    const [gender, setGender] = useState<string>("none")
    const [regionId, setRegionId] = useState<string>("none")
    const [emailVerified, setEmailVerified] = useState<boolean>(false)
    const [regions, setRegions] = useState<{ id: string; name: string }[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")

    // Load regions on mount
    useEffect(() => {
        const loadRegions = async () => {
            const data = await getAllRegionsForSelect()
            setRegions(data)
        }
        loadRegions()
    }, [])

    // Set form values when user changes
    useEffect(() => {
        if (user) {
            setRole(user.role)
            setGender(user.gender || "none")
            setRegionId(user.regionId || "none")
            setEmailVerified(user.emailVerified)
        }
        setError("")
    }, [user, open])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!user) return

        setError("")
        setLoading(true)

        try {
            await updateUser({
                id: user.id,
                role,
                gender: gender === "none" ? null : (gender as "MALE" | "FEMALE" | "UNISEX"),
                regionId: regionId === "none" ? null : regionId,
                emailVerified
            })

            onSuccess?.()
            onOpenChange(false)
        } catch (err) {
            setError(err instanceof Error ? err.message : "An error occurred")
        } finally {
            setLoading(false)
        }
    }

    if (!user) return null

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Edit User</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Read-only user info */}
                    <div className="space-y-2">
                        <Label>Name</Label>
                        <div className="text-sm text-muted-foreground">{user.name}</div>
                    </div>

                    <div className="space-y-2">
                        <Label>Email</Label>
                        <div className="text-sm text-muted-foreground">{user.email}</div>
                    </div>

                    {/* Editable fields */}
                    <div className="space-y-2">
                        <Label htmlFor="role">Role</Label>
                        <Select value={role} onValueChange={(value) => setRole(value as "USER" | "ADMIN")}>
                            <SelectTrigger id="role">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="USER">User</SelectItem>
                                <SelectItem value="ADMIN">Admin</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="gender">Gender</Label>
                        <Select value={gender} onValueChange={setGender}>
                            <SelectTrigger id="gender">
                                <SelectValue placeholder="Select gender" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">None</SelectItem>
                                <SelectItem value="MALE">Male</SelectItem>
                                <SelectItem value="FEMALE">Female</SelectItem>
                                <SelectItem value="UNISEX">Unisex</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="region">Region</Label>
                        <Select value={regionId} onValueChange={setRegionId}>
                            <SelectTrigger id="region">
                                <SelectValue placeholder="Select region" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">None</SelectItem>
                                {regions.map((region) => (
                                    <SelectItem key={region.id} value={region.id}>
                                        {region.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="emailVerified">Email Verified</Label>
                        <Select value={emailVerified.toString()} onValueChange={(value) => setEmailVerified(value === "true")}>
                            <SelectTrigger id="emailVerified">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="false">Not Verified</SelectItem>
                                <SelectItem value="true">Verified</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {error && <div className="text-sm text-destructive">{error}</div>}

                    <div className="flex justify-end gap-2">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading ? "Saving..." : "Update"}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    )
}
