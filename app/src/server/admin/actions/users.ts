"use server"

import { prisma } from "@/server/database/prisma"
import { removeUndefinedValues } from "@/lib/utils"
import { Role, Gender } from "@/prisma/client"
import { auth } from "@/server/auth/auth"
import { headers } from "next/headers"
import { adminGuard } from "@/server/auth/guard"

const PAGE_SIZE = 24

export async function getCurrentUserId() {
    if (!await adminGuard()) {
        throw new Error("Unauthorized: Admin access required")
    }

    const session = await auth.api.getSession({
        headers: await headers()
    })

    return session?.user?.id || null
}

export async function getUsers({
    page = 1,
    search = "",
    roleFilter = "all"
}: {
    page?: number
    search?: string
    roleFilter?: string
}) {
    if (!await adminGuard()) {
        throw new Error("Unauthorized: Admin access required")
    }

    const skip = (page - 1) * PAGE_SIZE

    // Search condition: email, name, and id (case-insensitive)
    const searchCondition = search
        ? {
              OR: [
                  {
                      email: {
                          contains: search,
                          mode: "insensitive" as const
                      }
                  },
                  {
                      name: {
                          contains: search,
                          mode: "insensitive" as const
                      }
                  },
                  {
                      id: {
                          contains: search,
                          mode: "insensitive" as const
                      }
                  }
              ]
          }
        : {}

    // Role filter condition
    const roleCondition = roleFilter && roleFilter !== "all" ? { role: roleFilter as Role } : {}

    const where = {
        ...searchCondition,
        ...roleCondition
    }

    // Parallel query pattern
    const [users, totalCount] = await Promise.all([
        prisma.user.findMany({
            where,
            skip,
            take: PAGE_SIZE,
            orderBy: { createdAt: "desc" },
            include: {
                region: {
                    select: {
                        id: true,
                        name: true
                    }
                },
                _count: {
                    select: {
                        sessions: true,
                        accounts: true,
                        tryOnOutfits: true,
                        postLikes: true,
                        postViews: true,
                        preferenceTags: true,
                        productReferrals: true
                    }
                }
            }
        }),
        prisma.user.count({ where })
    ])

    const totalPages = Math.ceil(totalCount / PAGE_SIZE)

    return {
        users,
        totalCount,
        pagination: {
            currentPage: page,
            totalPages,
            hasNextPage: page < totalPages,
            hasPreviousPage: page > 1
        }
    }
}

export async function updateUser({
    id,
    role,
    gender,
    regionId,
    emailVerified
}: {
    id: string
    role?: Role
    gender?: Gender | null
    regionId?: string | null
    emailVerified?: boolean
}) {
    if (!await adminGuard()) {
        throw new Error("Unauthorized: Admin access required")
    }

    const user = await prisma.user.update({
        where: { id },
        data: removeUndefinedValues({
            role,
            gender: gender === null ? null : gender,
            regionId: regionId === null ? null : regionId,
            emailVerified
        })
    })

    return user
}

export async function deleteUser(id: string, currentUserId: string) {
    if (!await adminGuard()) {
        throw new Error("Unauthorized: Admin access required")
    }

    // Self-deletion check
    if (id === currentUserId) {
        throw new Error("You cannot delete your own account")
    }

    const deletedUser = await prisma.user.delete({
        where: { id }
    })

    return deletedUser
}

export async function getAllRegionsForSelect() {
    if (!await adminGuard()) {
        throw new Error("Unauthorized: Admin access required")
    }

    const regions = await prisma.region.findMany({
        select: {
            id: true,
            name: true
        },
        orderBy: {
            name: "asc"
        }
    })

    return regions
}
