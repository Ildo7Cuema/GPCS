/**
 * Simple in-memory TTL cache for Supabase query results.
 * Prevents redundant network requests when navigating between pages.
 */

interface CacheEntry<T> {
    data: T
    expiresAt: number
}

class MemoryCache {
    private store = new Map<string, CacheEntry<unknown>>()

    get<T>(key: string): T | null {
        const entry = this.store.get(key)
        if (!entry) return null
        if (Date.now() > entry.expiresAt) {
            this.store.delete(key)
            return null
        }
        return entry.data as T
    }

    set<T>(key: string, data: T, ttlMs: number): void {
        this.store.set(key, { data, expiresAt: Date.now() + ttlMs })
    }

    invalidate(prefix: string): void {
        for (const key of this.store.keys()) {
            if (key.startsWith(prefix)) {
                this.store.delete(key)
            }
        }
    }

    clear(): void {
        this.store.clear()
    }
}

export const cache = new MemoryCache()

// TTL constants
export const TTL = {
    SHORT: 30_000,    // 30s — stats, counts
    MEDIUM: 120_000,  // 2min — municipios, areas (rarely change)
    LONG: 300_000,    // 5min — static reference data
} as const

/**
 * Wraps an async function with cache.
 * Returns cached result if available, otherwise fetches and caches.
 */
export async function withCache<T>(
    key: string,
    ttlMs: number,
    fetcher: () => Promise<T>
): Promise<T> {
    const cached = cache.get<T>(key)
    if (cached !== null) return cached

    const data = await fetcher()
    cache.set(key, data, ttlMs)
    return data
}
