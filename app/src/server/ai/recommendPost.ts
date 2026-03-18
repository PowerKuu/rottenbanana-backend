import { Prisma, User } from "@/prisma/client"
import { randomShuffle as shuffle } from "@/lib/utils"
import { prisma } from "../database/prisma"

const log = (...args: unknown[]) => console.log("[recommend]", ...args)

type PostWithTags = Prisma.PostGetPayload<{ include: { preferenceTags: true } }>

async function fetchRanked(
    userId: string,
    gender: User["gender"],
    hasTagPreferences: boolean,
    mainCount: number,
    explorationCount: number,
    unseenOnly: boolean
): Promise<PostWithTags[]> {
    log(`fetchRanked — unseenOnly=${unseenOnly} gender=${gender ?? "any"} hasTagPreferences=${hasTagPreferences} mainCount=${mainCount} explorationCount=${explorationCount}`)

    const genderClause = gender
        ? Prisma.sql`AND p.gender = ${gender}`
        : Prisma.sql``
    const seenClause = unseenOnly
        ? Prisma.sql`AND NOT EXISTS (
              SELECT 1 FROM "PostView" pv
              WHERE pv."postId" = p.id AND pv."userId" = ${userId}
          )`
        : Prisma.sql``

    // Main: top-scored posts ranked in the DB, shuffled within the top-2x pool for variety
    let mainIds: string[] = []
    if (hasTagPreferences) {
        const rows = await prisma.$queryRaw<{ id: string }[]>`
            SELECT p.id
            FROM "Post" p
            JOIN "PostPreferenceTag" ppt ON ppt."postId" = p.id
            JOIN "UserPreferenceTag" upt
                ON upt."preferenceTagId" = ppt."preferenceTagId"
                AND upt."userId" = ${userId}
                AND upt.score > 0
            WHERE TRUE ${seenClause} ${genderClause}
            GROUP BY p.id
            ORDER BY SUM(upt.score) DESC, RANDOM()
            LIMIT ${mainCount * 2}
        `
        log(`main query returned ${rows.length} scored candidates (pool=${mainCount * 2})`)
        mainIds = shuffle(rows.map(r => r.id)).slice(0, mainCount)
        log(`main slots after shuffle+slice: ${mainIds.length} posts`)
    } else {
        log("no tag preferences — skipping main query, all slots go to exploration")
    }

    // Exploration: random posts outside the main selection
    const excludeClause = mainIds.length > 0
        ? Prisma.sql`AND p.id NOT IN (${Prisma.join(mainIds)})`
        : Prisma.sql``
    // When no tag preferences, pull the full `take` as exploration (pure random)
    const explorationLimit = hasTagPreferences ? explorationCount : mainCount + explorationCount

    const explorationRows = await prisma.$queryRaw<{ id: string }[]>`
        SELECT p.id
        FROM "Post" p
        WHERE TRUE ${seenClause} ${genderClause} ${excludeClause}
        ORDER BY RANDOM()
        LIMIT ${explorationLimit}
    `
    log(`exploration query returned ${explorationRows.length}/${explorationLimit} posts`)

    const allIds = [...mainIds, ...explorationRows.map(r => r.id)]
    log(`total IDs to fetch: ${allIds.length} (${mainIds.length} main + ${explorationRows.length} exploration)`)

    if (allIds.length === 0) {
        log("no posts found — returning empty")
        return []
    }

    const posts = await prisma.post.findMany({
        where: { id: { in: allIds } },
        include: { preferenceTags: true }
    })

    const result = shuffle(posts)
    log(`returning ${result.length} posts (shuffled)`)
    log("post order:", result.map(p => ({
        id: p.id,
        tags: p.preferenceTags.map(t => t.preferenceTagId)
    })))

    return result
}

export async function recommendPost(user: User, take: number) {
    log(`recommendPost — userId=${user.id} take=${take}`)

    const tagCount = await prisma.userPreferenceTag.count({
        where: { userId: user.id, score: { gt: 0 } }
    })
    log(`user has ${tagCount} positive-score tag(s)`)

    const explorationCount = Math.max(1, Math.round(take / 10))
    const mainCount = take - explorationCount
    log(`slot split — main=${mainCount} exploration=${explorationCount}`)

    for (const unseenOnly of [true, false]) {
        log(`--- attempt: unseenOnly=${unseenOnly} ---`)
        const posts = await fetchRanked(user.id, user.gender, tagCount > 0, mainCount, explorationCount, unseenOnly)
        if (posts.length > 0) {
            log(`done — serving ${posts.length} posts (unseenOnly=${unseenOnly})`)
            return posts
        }
        log(`no posts found with unseenOnly=${unseenOnly}, trying fallback`)
    }

    log("no posts available at all — returning []")
    return []
}

export async function getFullPost(id: string) {
    return prisma.post.findUnique({
        where: { id },
        include: {
            _count: {
                select: {
                    views: true,
                    likes: true
                }
            },
            products: {
                include: {
                    product: {
                        include: {
                            store: true
                        }
                    }
                }
            },
            preferenceTags: true,
            music: true
        },
    })
}
