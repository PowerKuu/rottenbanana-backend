import { Prisma, User } from "@/prisma/client"
import { prisma } from "../database/prisma"

const CANDIDATE_POOL = 50

type PostWithTags = Prisma.PostGetPayload<{ include: { preferenceTags: true } }>

function shuffle<T>(arr: T[]): T[] {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

async function fetchCandidates(userId: string, gender: User["gender"], unseenOnly: boolean) {
    return prisma.post.findMany({
        where: {
            ...(unseenOnly && { views: { none: { userId } } }),
            gender: gender ?? undefined
        },
        include: { preferenceTags: true },
        take: CANDIDATE_POOL,
        orderBy: { createdAt: "desc" }
    })
}

function scorePost(post: PostWithTags, userTagScores: Map<string, number>): number {
    return post.preferenceTags.reduce((sum, pt) => sum + (userTagScores.get(pt.preferenceTagId) ?? 0), 0)
}

function selectPosts(pool: PostWithTags[], userTagScores: Map<string, number>, take: number): PostWithTags[] {
    // No tag preferences yet — just shuffle
    if (userTagScores.size === 0) return shuffle([...pool]).slice(0, take)

    const explorationCount = Math.max(1, Math.round(take / 10))
    const mainCount = take - explorationCount

    const scored = pool.map(post => ({ post, score: scorePost(post, userTagScores) }))

    // Sort matched by score, then shuffle within the top candidates for variety
    const matchedSorted = scored
        .filter(p => p.score > 0)
        .sort((a, b) => b.score - a.score)
    const topMatched = shuffle(matchedSorted.slice(0, mainCount * 2)).slice(0, mainCount)

    const unmatchedShuffled = shuffle(scored.filter(p => p.score === 0))

    // Main slots: top matched posts. If not enough, fill from unmatched.
    const mainPosts = topMatched.map(p => p.post)
    if (mainPosts.length < mainCount) {
        const fill = unmatchedShuffled.splice(0, mainCount - mainPosts.length)
        mainPosts.push(...fill.map(p => p.post))
    }

    // Exploration slot: from unmatched. If none left, use lowest-scored matched.
    const usedIds = new Set(mainPosts.map(p => p.id))
    const explorationPool = unmatchedShuffled.length > 0
        ? unmatchedShuffled
        : shuffle(scored.filter(p => !usedIds.has(p.post.id)).sort((a, b) => a.score - b.score))
    const explorationPosts = explorationPool.slice(0, explorationCount).map(p => p.post)

    // Shuffle final result so exploration posts land randomly in the feed
    return shuffle([...mainPosts, ...explorationPosts])
}

export async function recommendPost(user: User, take: number) {
    const userTags = await prisma.userPreferenceTag.findMany({
        where: { userId: user.id },
        select: { preferenceTagId: true, score: true }
    })
    const userTagScores = new Map(userTags.map(ut => [ut.preferenceTagId, ut.score]))

    const unseen = await fetchCandidates(user.id, user.gender, true)

    if (unseen.length > 0) return selectPosts(unseen, userTagScores, take)

    // All posts seen — cycle through
    const all = await fetchCandidates(user.id, user.gender, false)
    return selectPosts(all, userTagScores, take)
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
