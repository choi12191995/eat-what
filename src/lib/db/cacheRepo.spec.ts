import 'fake-indexeddb/auto'
import { afterEach, describe, expect, it } from 'vitest'

import type { Restaurant } from '@/types/models'
import { EatWhatDB } from './schema'
import { createCacheRepo, SEARCH_TTL_MS } from './cacheRepo'

let seq = 0
const dbs: EatWhatDB[] = []

function freshDb(): EatWhatDB {
  const db = new EatWhatDB(`test-${Date.now()}-${seq++}`)
  dbs.push(db)
  return db
}

afterEach(async () => {
  for (const db of dbs.splice(0)) await db.delete()
})

const restaurant: Restaurant = {
  id: 'r1',
  name: 'Testaurant',
  location: { lat: 22.28, lng: 114.16 },
  types: ['restaurant'],
  photoNames: [],
  fetchedAt: 0,
}

describe('cacheRepo', () => {
  it('returns fresh entries and misses on unknown keys', async () => {
    let t = 1_000_000
    const repo = createCacheRepo(freshDb(), () => t)
    expect(await repo.get('k')).toBeNull()
    await repo.put('k', [restaurant])
    t += SEARCH_TTL_MS - 1
    expect(await repo.get('k')).toEqual([restaurant])
  })

  it('evicts stale entries on read', async () => {
    let t = 1_000_000
    const repo = createCacheRepo(freshDb(), () => t)
    await repo.put('k', [restaurant])
    t += SEARCH_TTL_MS + 1
    expect(await repo.get('k')).toBeNull()
  })

  it('prune removes only expired rows', async () => {
    let t = 1_000_000
    const db = freshDb()
    const repo = createCacheRepo(db, () => t)
    await repo.put('old', [restaurant])
    t += SEARCH_TTL_MS / 2
    await repo.put('newer', [restaurant])
    t += SEARCH_TTL_MS / 2 + 1 // 'old' is now expired, 'newer' is not
    await repo.prune()
    expect(await db.searchCache.get('old')).toBeUndefined()
    expect(await db.searchCache.get('newer')).toBeDefined()
  })
})
