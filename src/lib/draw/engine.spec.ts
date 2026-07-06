import { describe, expect, it } from 'vitest'

import type { DrawConditions, Restaurant } from '@/types/models'
import type { PlacesProvider } from '@/lib/places/provider'
import { makeDefaultConditions } from './defaults'
import {
  ALL_FOOD_TYPES,
  filterPool,
  runDraw,
  selectCandidates,
  searchCacheKey,
  type FilterContext,
} from './engine'

const ORIGIN = { lat: 22.2819, lng: 114.158 }

function place(over: Partial<Restaurant>): Restaurant {
  return {
    id: over.id ?? 'p1',
    name: 'Test Place',
    location: ORIGIN,
    types: ['restaurant'],
    photoNames: [],
    businessStatus: 'OPERATIONAL',
    openNow: true,
    fetchedAt: 0,
    ...over,
  }
}

function cond(over: Partial<DrawConditions> = {}): DrawConditions {
  return { ...makeDefaultConditions(), ...over }
}

function ctx(over: Partial<FilterContext> = {}): FilterContext {
  return { origin: ORIGIN, region: 'HK', blockedIds: new Set(), recentIds: new Set(), ...over }
}

describe('filterPool', () => {
  it('drops non-operational places', () => {
    const raw = [place({ id: 'a' }), place({ id: 'b', businessStatus: 'CLOSED_TEMPORARILY' })]
    expect(filterPool(raw, cond(), ctx()).map((r) => r.id)).toEqual(['a'])
  })

  it('drops blocklisted and recently-visited places', () => {
    const raw = [place({ id: 'a' }), place({ id: 'blocked' }), place({ id: 'recent' })]
    const c = cond({ excludeRecentDays: 7 })
    const out = filterPool(raw, c, ctx({ blockedIds: new Set(['blocked']), recentIds: new Set(['recent']) }))
    expect(out.map((r) => r.id)).toEqual(['a'])
  })

  it('keeps recently-visited places when the recent filter is off', () => {
    const raw = [place({ id: 'recent' })]
    const out = filterPool(raw, cond({ excludeRecentDays: null }), ctx({ recentIds: new Set(['recent']) }))
    expect(out).toHaveLength(1)
  })

  it('excluded cuisine wins over included cuisine (backstop)', () => {
    // Korean BBQ place: BBQ included, Korean excluded → dropped
    const raw = [place({ id: 'kbbq', types: ['korean_barbecue_restaurant', 'restaurant'] })]
    const c = cond({ cuisines: { include: ['bbq'], exclude: ['korean'] } })
    expect(filterPool(raw, c, ctx())).toHaveLength(0)
  })

  it('re-checks radius with a grace margin', () => {
    const nearEdge = place({ id: 'edge', location: { lat: 22.2905, lng: 114.158 } }) // ~960 m north
    const farAway = place({ id: 'far', location: { lat: 22.32, lng: 114.158 } }) // ~4.2 km
    const c = cond({ radiusMeters: 1000 })
    expect(filterPool([nearEdge, farAway], c, ctx()).map((r) => r.id)).toEqual(['edge'])
  })

  it('openNowOnly drops closed and unknown-status places', () => {
    const raw = [place({ id: 'open' }), place({ id: 'closed', openNow: false }), place({ id: 'unknown', openNow: undefined })]
    expect(filterPool(raw, cond({ openNowOnly: true }), ctx()).map((r) => r.id)).toEqual(['open'])
    expect(filterPool(raw, cond({ openNowOnly: false }), ctx())).toHaveLength(3)
  })

  it('minRating drops low-rated and unrated places', () => {
    const raw = [place({ id: 'good', rating: 4.4 }), place({ id: 'meh', rating: 3.8 }), place({ id: 'unrated' })]
    expect(filterPool(raw, cond({ minRating: 4.0 }), ctx()).map((r) => r.id)).toEqual(['good'])
  })

  it('budget filters by priceLevel but lets price-unknown places pass', () => {
    const raw = [
      place({ id: 'cheap', priceLevel: 1 }),
      place({ id: 'fancy', priceLevel: 4 }),
      place({ id: 'nodata' }),
    ]
    const out = filterPool(raw, cond({ budgetLevels: [1, 2] }), ctx())
    expect(out.map((r) => r.id).sort()).toEqual(['cheap', 'nodata'])
  })

  it('budget derives a level from priceRange when priceLevel is missing', () => {
    const raw = [
      place({
        id: 'range-mid',
        priceRange: { start: { currencyCode: 'HKD', units: 60 }, end: { currencyCode: 'HKD', units: 120 } },
      }),
    ]
    // midpoint 90 HKD → level 2 in HK bands
    expect(filterPool(raw, cond({ budgetLevels: [2] }), ctx())).toHaveLength(1)
    expect(filterPool(raw, cond({ budgetLevels: [4] }), ctx())).toHaveLength(0)
  })
})

describe('selectCandidates', () => {
  it('returns empty selection for an empty pool', () => {
    expect(selectCandidates([])).toEqual({ candidates: [], winnerIndex: -1 })
  })

  it('caps candidates at 10, keeps them unique, winner within range', () => {
    const pool = Array.from({ length: 25 }, (_, i) => place({ id: `p${i}` }))
    for (let run = 0; run < 20; run++) {
      const { candidates, winnerIndex } = selectCandidates(pool)
      expect(candidates).toHaveLength(10)
      expect(new Set(candidates.map((c) => c.id)).size).toBe(10)
      expect(winnerIndex).toBeGreaterThanOrEqual(0)
      expect(winnerIndex).toBeLessThan(10)
    }
  })
})

describe('searchCacheKey', () => {
  it('is stable under small GPS jitter and sensitive to filters', () => {
    const a = searchCacheKey({ lat: 22.28191, lng: 114.15799 }, cond(), 'en')
    const b = searchCacheKey({ lat: 22.28209, lng: 114.15801 }, cond(), 'en')
    expect(a).toBe(b)
    const c = searchCacheKey(ORIGIN, cond({ radiusMeters: 2000 }), 'en')
    expect(c).not.toBe(a)
    const d = searchCacheKey(ORIGIN, cond(), 'zh-TW')
    expect(d).not.toBe(a)
  })
})

describe('ALL_FOOD_TYPES', () => {
  it('contains the generic restaurant type and no duplicates', () => {
    expect(ALL_FOOD_TYPES).toContain('restaurant')
    expect(new Set(ALL_FOOD_TYPES).size).toBe(ALL_FOOD_TYPES.length)
    expect(ALL_FOOD_TYPES.length).toBeLessThanOrEqual(50) // Places API limit
  })
})

describe('runDraw with keyword tags', () => {
  function fakeProvider(overrides: Partial<PlacesProvider> = {}): PlacesProvider & {
    nearbyCalls: number
    textQueries: string[]
  } {
    const state = { nearbyCalls: 0, textQueries: [] as string[] }
    return {
      kind: 'mock',
      nearbyCalls: 0,
      textQueries: state.textQueries,
      async searchNearby() {
        state.nearbyCalls += 1
        this.nearbyCalls = state.nearbyCalls
        return [place({ id: 'nearby-1' }), place({ id: 'shared' })]
      },
      async searchText(p) {
        state.textQueries.push(p.query)
        return [place({ id: `kw-${state.textQueries.length}` }), place({ id: 'shared' })]
      },
      async autocomplete() {
        return []
      },
      async resolvePlaceLocation() {
        return { location: ORIGIN, label: 'x' }
      },
      photoUrl() {
        return null
      },
      ...overrides,
    }
  }

  it('keywords alone skip the generic nearby sweep', async () => {
    const provider = fakeProvider()
    const out = await runDraw(cond({ keywords: ['chaChaanTeng'] }), ORIGIN, {
      provider,
      lang: 'zh-TW',
      region: 'HK',
    })
    expect(provider.nearbyCalls).toBe(0)
    expect(provider.textQueries).toEqual(['茶餐廳'])
    expect(out.pool.map((r) => r.id).sort()).toEqual(['kw-1', 'shared'])
  })

  it('keywords + cuisine include union and dedupe by id', async () => {
    const provider = fakeProvider()
    const out = await runDraw(
      cond({ keywords: ['hotpot'], cuisines: { include: ['japanese'], exclude: [] } }),
      ORIGIN,
      { provider, lang: 'en', region: 'HK' },
    )
    expect(provider.nearbyCalls).toBe(1)
    expect(provider.textQueries).toEqual(['hot pot'])
    const ids = out.pool.map((r) => r.id).sort()
    expect(ids).toEqual(['kw-1', 'nearby-1', 'shared'])
  })

  it('unknown tag ids are ignored and the tag count is capped', async () => {
    const provider = fakeProvider()
    await runDraw(
      cond({ keywords: ['nope', 'hotpot', 'dimSum', 'congee', 'wonton'] }),
      ORIGIN,
      { provider, lang: 'en', region: 'HK' },
    )
    expect(provider.textQueries).toHaveLength(3)
  })

  it('keyword searches hit the cache on the second draw', async () => {
    const provider = fakeProvider()
    const store = new Map<string, Restaurant[]>()
    const cache = {
      async get(k: string) {
        return store.get(k) ?? null
      },
      async put(k: string, v: Restaurant[]) {
        store.set(k, v)
      },
    }
    const deps = { provider, lang: 'en' as const, region: 'HK' as const, cache }
    await runDraw(cond({ keywords: ['dimSum'] }), ORIGIN, deps)
    await runDraw(cond({ keywords: ['dimSum'] }), ORIGIN, deps)
    expect(provider.textQueries).toHaveLength(1)
    expect([...store.keys()].some((k) => k.startsWith('kw|'))).toBe(true)
  })

  it('conditions persisted before the keywords field still draw (undefined-safe)', async () => {
    const provider = fakeProvider()
    const legacy = cond()
    delete (legacy as Partial<DrawConditions>).keywords
    const out = await runDraw(legacy, ORIGIN, { provider, lang: 'en', region: 'HK' })
    expect(provider.nearbyCalls).toBe(1)
    expect(out.pool.length).toBeGreaterThan(0)
  })
})
