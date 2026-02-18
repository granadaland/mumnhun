import { NextResponse } from "next/server"

type RateLimitEntry = {
    count: number
    resetAt: number
}

type GlobalRateLimitState = {
    __adminRateLimitStore?: Map<string, RateLimitEntry>
}

export type RateLimitConfig = {
    limit: number
    windowMs: number
}

export type RateLimitCheckResult =
    | {
        ok: true
        limit: number
        remaining: number
        resetAt: number
    }
    | {
        ok: false
        limit: number
        remaining: 0
        resetAt: number
        retryAfterSec: number
    }

function getRateLimitStore(): Map<string, RateLimitEntry> {
    const state = globalThis as GlobalRateLimitState
    if (!state.__adminRateLimitStore) {
        state.__adminRateLimitStore = new Map<string, RateLimitEntry>()
    }
    return state.__adminRateLimitStore
}

function cleanupExpiredEntries(store: Map<string, RateLimitEntry>, now: number) {
    if (store.size < 5000) return

    for (const [key, entry] of store.entries()) {
        if (entry.resetAt <= now) {
            store.delete(key)
        }
    }
}

export function checkRateLimit(key: string, config: RateLimitConfig): RateLimitCheckResult {
    const now = Date.now()
    const limit = Math.max(1, Math.floor(config.limit))
    const windowMs = Math.max(1000, Math.floor(config.windowMs))
    const store = getRateLimitStore()

    cleanupExpiredEntries(store, now)

    const existing = store.get(key)

    if (!existing || existing.resetAt <= now) {
        const resetAt = now + windowMs
        store.set(key, { count: 1, resetAt })
        return {
            ok: true,
            limit,
            remaining: Math.max(0, limit - 1),
            resetAt,
        }
    }

    if (existing.count >= limit) {
        const retryAfterSec = Math.max(1, Math.ceil((existing.resetAt - now) / 1000))
        return {
            ok: false,
            limit,
            remaining: 0,
            resetAt: existing.resetAt,
            retryAfterSec,
        }
    }

    existing.count += 1
    store.set(key, existing)

    return {
        ok: true,
        limit,
        remaining: Math.max(0, limit - existing.count),
        resetAt: existing.resetAt,
    }
}

export function createRateLimitExceededResponse(result: Extract<RateLimitCheckResult, { ok: false }>) {
    return NextResponse.json(
        {
            error: "Too Many Requests",
            retryAfterSec: result.retryAfterSec,
        },
        {
            status: 429,
            headers: {
                "Retry-After": String(result.retryAfterSec),
                "X-RateLimit-Limit": String(result.limit),
                "X-RateLimit-Remaining": "0",
                "X-RateLimit-Reset": String(result.resetAt),
            },
        }
    )
}

