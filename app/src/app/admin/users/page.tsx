"use client"

import { useEffect, useState } from "react"
import { UserCard } from "@/components/users/UserCard"
import { UserFormDialog } from "@/components/users/UserFormDialog"
import { DeleteUserDialog } from "@/components/users/DeleteUserDialog"
import { ProductsPagination } from "@/components/Pagination"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Users as UsersIcon, Search } from "lucide-react"
import { getUsers, getCurrentUserId } from "@/server/admin/actions/users"

type UserWithRelations = Awaited<ReturnType<typeof getUsers>>["users"][number]

export default function UsersPage() {
    const [users, setUsers] = useState<UserWithRelations[]>([])
    const [totalCount, setTotalCount] = useState(0)
    const [pagination, setPagination] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [editDialogOpen, setEditDialogOpen] = useState(false)
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
    const [selectedUser, setSelectedUser] = useState<UserWithRelations | null>(null)
    const [page, setPage] = useState(1)
    const [search, setSearch] = useState("")
    const [localSearch, setLocalSearch] = useState("")
    const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(null)
    const [roleFilter, setRoleFilter] = useState("all")
    const [currentUserId, setCurrentUserId] = useState<string>("")

    // Get current user ID on mount
    useEffect(() => {
        const fetchCurrentUserId = async () => {
            const userId = await getCurrentUserId()
            setCurrentUserId(userId || "")
        }
        fetchCurrentUserId()
    }, [])

    // Debounced search handler
    const handleSearchChange = (value: string) => {
        const SEARCH_DEBOUNCE = 500

        setLocalSearch(value)

        if (debounceTimer) {
            clearTimeout(debounceTimer)
        }

        const timer = setTimeout(() => {
            setSearch(value)
            setPage(1) // Reset to page 1 on search
        }, SEARCH_DEBOUNCE)

        setDebounceTimer(timer)
    }

    // Handle role filter change
    const handleRoleFilterChange = (value: string) => {
        setRoleFilter(value)
        setPage(1) // Reset to page 1 on filter change
    }

    // Cleanup debounce timer
    useEffect(() => {
        return () => {
            if (debounceTimer) {
                clearTimeout(debounceTimer)
            }
        }
    }, [debounceTimer])

    // Fetch users
    useEffect(() => {
        const fetchUsers = async () => {
            setLoading(true)
            setError(null)
            try {
                const data = await getUsers({ page, search, roleFilter })
                setUsers(data.users)
                setTotalCount(data.totalCount)
                setPagination(data.pagination)
            } catch (err) {
                console.error("Error fetching users:", err)
                setError("Failed to load users")
            } finally {
                setLoading(false)
            }
        }

        fetchUsers()
    }, [page, search, roleFilter])

    const handleEdit = (user: UserWithRelations) => {
        setSelectedUser(user)
        setEditDialogOpen(true)
    }

    const handleDelete = (user: UserWithRelations) => {
        setSelectedUser(user)
        setDeleteDialogOpen(true)
    }

    const handleSuccess = () => {
        // Reload users after edit/delete
        getUsers({ page, search, roleFilter }).then((data) => {
            setUsers(data.users)
            setTotalCount(data.totalCount)
            setPagination(data.pagination)
        })
    }

    const hasNoUsers = users.length === 0 && !loading && !search && roleFilter === "all"
    const hasNoSearchResults = users.length === 0 && !loading && (search || roleFilter !== "all")

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Users</h2>
                    <p className="text-sm text-muted-foreground">
                        Manage user accounts and permissions
                        {totalCount > 0 && ` • ${totalCount} total ${totalCount === 1 ? "user" : "users"}`}
                    </p>
                </div>
            </div>

            {/* Search & Filter */}
            <div className="flex gap-2">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        placeholder="Search users by email, name, or ID..."
                        value={localSearch}
                        onChange={(e) => handleSearchChange(e.target.value)}
                        className="pl-9"
                    />
                </div>
                <Select value={roleFilter} onValueChange={handleRoleFilterChange}>
                    <SelectTrigger className="w-35">
                        <SelectValue placeholder="Filter by role" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="USER">User</SelectItem>
                        <SelectItem value="ADMIN">Admin</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Error state */}
            {error && (
                <div className="rounded-lg border border-destructive bg-destructive/10 p-4 text-sm text-destructive">
                    {error}
                </div>
            )}

            {/* Loading state */}
            {loading ? (
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                    {Array.from({ length: 8 }).map((_, i) => (
                        <div key={i} className="space-y-3">
                            <Skeleton className="h-48 w-full" />
                        </div>
                    ))}
                </div>
            ) : hasNoUsers ? (
                <div className="flex min-h-[400px] flex-col items-center justify-center rounded-lg border border-dashed">
                    <UsersIcon className="mb-4 h-12 w-12 text-muted-foreground" />
                    <h3 className="text-lg font-semibold">No users yet</h3>
                    <p className="text-sm text-muted-foreground">Users will appear here once registered</p>
                </div>
            ) : hasNoSearchResults ? (
                <div className="flex min-h-[400px] flex-col items-center justify-center rounded-lg border border-dashed">
                    <UsersIcon className="mb-4 h-12 w-12 text-muted-foreground" />
                    <h3 className="text-lg font-semibold">No users found</h3>
                    <p className="text-sm text-muted-foreground">
                        No results for {search ? `"${search}"` : "the selected filter"}
                    </p>
                </div>
            ) : (
                <>
                    {/* User cards grid */}
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                        {users.map((user) => (
                            <UserCard
                                key={user.id}
                                id={user.id}
                                name={user.name}
                                email={user.email}
                                role={user.role}
                                gender={user.gender}
                                regionName={user.region?.name}
                                emailVerified={user.emailVerified}
                                onboardingCompleted={user.onboardingCompleted}
                                createdAt={user.createdAt}
                                onEdit={() => handleEdit(user)}
                                onDelete={() => handleDelete(user)}
                            />
                        ))}
                    </div>

                    {/* Pagination */}
                    {pagination && pagination.totalPages > 1 && (
                        <ProductsPagination
                            currentPage={pagination.currentPage}
                            totalPages={pagination.totalPages}
                            hasNextPage={pagination.hasNextPage}
                            hasPreviousPage={pagination.hasPreviousPage}
                            onPageChange={setPage}
                        />
                    )}
                </>
            )}

            {/* Dialogs */}
            <UserFormDialog
                open={editDialogOpen}
                onOpenChange={setEditDialogOpen}
                user={
                    selectedUser
                        ? {
                              id: selectedUser.id,
                              name: selectedUser.name,
                              email: selectedUser.email,
                              role: selectedUser.role,
                              gender: selectedUser.gender,
                              regionId: selectedUser.region?.id,
                              emailVerified: selectedUser.emailVerified
                          }
                        : null
                }
                onSuccess={handleSuccess}
            />

            <DeleteUserDialog
                open={deleteDialogOpen}
                onOpenChange={setDeleteDialogOpen}
                user={selectedUser}
                currentUserId={currentUserId}
                onSuccess={handleSuccess}
            />
        </div>
    )
}
