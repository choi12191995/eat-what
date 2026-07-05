import type { Restaurant } from '@/types/models'
import type { EatWhatDB } from './schema'

export const SEARCH_TTL_MS = 24 * 60 * 60 * 1000

export interface CacheRepo {
  get(key: string): Promise<Restaurant[] | null>
  put(key: string, results: Restaurant[]): Promise<void>
  prune(): Promise<void>
}

/**
 * Read-through cache for Nearby Search responses (the Enterprise-tier calls
 * with a 1,000/month free cap — this cache is what keeps usage inside it).
 */
export function createCacheRepo(db: EatWhatDB, now: () => number = Date.now): CacheRepo {
  return {
    async get(key) {
      const row = await db.searchCache.get(key)
      if (!row) return null
      if (now() - row.fetchedAt > SEARCH_TTL_MS) {
        await db.searchCache.delete(key)
        return null
      }
      return row.results
    },

    async put(key, results) {
      await db.searchCache.put({ key, fetchedAt: now(), results })
    },

    async prune() {
      await db.searchCache
        .where('fetchedAt')
        .below(now() - SEARCH_TTL_MS)
        .delete()
    },
  }
}
