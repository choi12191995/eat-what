import { describe, expect, it } from 'vitest'

import type { DrawConditions, PlaceNote, Restaurant } from '@/types/models'
import type { PlacesProvider } from '@/lib/places/provider'
import { makeDefaultConditions } from './defaults'
import {
  ALL_FOOD_TYPES,
  conditionsFingerprint,
  filterPool,
  queryRadiusFor,
  runDraw,
  selectCandidates,
  searchCacheKey,
  styleWeight,
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

  it('requirePrice drops price-unknown places, independent of budget', () => {
    const raw = [place({ id: 'priced', priceLevel: 2 }), place({ id: 'nodata' })]
    expect(filterPool(raw, cond({ requirePrice: true }), ctx()).map((r) => r.id)).toEqual(['priced'])
    // relaxation override restores them
    expect(filterPool(raw, cond({ requirePrice: true }), ctx(), { skipRequirePrice: true })).toHaveLength(2)
  })

  it('arriveDate checks the planned weekday, not today', () => {
    // open Mondays 18:00–22:00 only
    const monDinner = place({
      id: 'mon',
      openPeriods: [{ open: { day: 1, hour: 18, minute: 0 }, close: { day: 1, hour: 22, minute: 0 } }],
    })
    const base = { openNowOnly: false, arriveAt: '19:00' }
    // a Thursday "now", planning for Monday 2026-07-13
    const thursday = new Date('2026-07-09T10:00:00')
    expect(
      filterPool([monDinner], cond({ ...base, arriveDate: '2026-07-13' }), ctx({ now: thursday })),
    ).toHaveLength(1)
    expect(filterPool([monDinner], cond({ ...base }), ctx({ now: thursday }))).toHaveLength(0)
  })
})

describe('filterPool with place notes (diary corrections)', () => {
  const note = (over: Partial<PlaceNote>): PlaceNote => ({
    placeId: 'p1',
    name: 'x',
    updatedAt: 0,
    ...over,
  })
  const notesCtx = (id: string, n: Partial<PlaceNote>) =>
    ctx({ notes: new Map([[id, note({ placeId: id, ...n })]]) })

  it('self-reported closed places are hard-filtered', () => {
    const raw = [place({ id: 'gone' }), place({ id: 'alive' })]
    const out = filterPool(raw, cond(), ctx({ notes: new Map([['gone', note({ placeId: 'gone', closed: true })]]) }))
    expect(out.map((r) => r.id)).toEqual(['alive'])
  })

  it('my rating outranks Google for the minRating filter', () => {
    const raw = [place({ id: 'p1', rating: 3.2 })]
    expect(filterPool(raw, cond({ minRating: 4.0 }), notesCtx('p1', { myRating: 5 }))).toHaveLength(1)
    const rawGood = [place({ id: 'p1', rating: 4.8 })]
    expect(filterPool(rawGood, cond({ minRating: 4.0 }), notesCtx('p1', { myRating: 2 }))).toHaveLength(0)
  })

  it('corrected price band replaces Google level in the budget filter', () => {
    const raw = [place({ id: 'p1', priceLevel: 4 })]
    expect(filterPool(raw, cond({ budgetLevels: [1, 2] }), notesCtx('p1', { priceLevel: 2 }))).toHaveLength(1)
    // and satisfies requirePrice for places Google has no data on
    const noData = [place({ id: 'p1' })]
    expect(filterPool(noData, cond({ requirePrice: true }), notesCtx('p1', { priceLevel: 1 }))).toHaveLength(1)
  })

  it('corrected cuisines replace Google types for exclusion — both directions', () => {
    // Google says Korean, diner corrected to Japanese: survives "no Korean"
    const raw = [place({ id: 'p1', types: ['korean_restaurant'] })]
    const c = cond({ cuisines: { include: [], exclude: ['korean'] } })
    expect(filterPool(raw, c, notesCtx('p1', { cuisines: ['japanese'] }))).toHaveLength(1)
    // Google says Japanese, diner corrected to Korean: now excluded
    const raw2 = [place({ id: 'p1', types: ['japanese_restaurant'] })]
    expect(filterPool(raw2, c, notesCtx('p1', { cuisines: ['korean'] }))).toHaveLength(0)
  })
})

describe('conditionsFingerprint / queryRadiusFor', () => {
  it('changes when any filter changes, ignores partySize', () => {
    const a = conditionsFingerprint(cond())
    expect(conditionsFingerprint(cond())).toBe(a)
    expect(conditionsFingerprint(cond({ partySize: 9 }))).toBe(a)
    expect(conditionsFingerprint(cond({ budgetLevels: [1] }))).not.toBe(a)
    expect(conditionsFingerprint(cond({ radiusMeters: 900 }))).not.toBe(a)
    expect(conditionsFingerprint(cond({ keywords: ['hotpot'] }))).not.toBe(a)
    expect(conditionsFingerprint(cond({ arriveDate: '2026-07-13' }))).not.toBe(a)
  })

  it('quantizes fetch radius up to a step so the slider cannot fragment the cache', () => {
    expect(queryRadiusFor(100)).toBe(300)
    expect(queryRadiusFor(300)).toBe(300)
    expect(queryRadiusFor(900)).toBe(1000)
    expect(queryRadiusFor(1000)).toBe(1000)
    expect(queryRadiusFor(1100)).toBe(2000)
    expect(queryRadiusFor(5000)).toBe(5000)
    // slider values inside one step share a cache key
    expect(searchCacheKey(ORIGIN, cond({ radiusMeters: 900 }), 'en')).toBe(
      searchCacheKey(ORIGIN, cond({ radiusMeters: 1000 }), 'en'),
    )
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

describe('drawStyle weighting', () => {
  it('styleWeight shapes match the promised behavior', () => {
    expect(styleWeight('uniform', 5)).toBe(1)
    expect(styleWeight('favor', 0)).toBe(1)
    expect(styleWeight('favor', 4)).toBe(4)
    expect(styleWeight('favor', 99)).toBe(4) // capped
    expect(styleWeight('explore', 0)).toBe(1.5)
    expect(styleWeight('explore', 2)).toBeCloseTo(1 / 3)
  })

  it('selectCandidates strongly favors a heavily weighted place', () => {
    const pool = [place({ id: 'heavy' }), place({ id: 'a' }), place({ id: 'b' })]
    const weights = new Map([
      ['heavy', 10_000],
      ['a', 0.0001],
      ['b', 0.0001],
    ])
    let heavyWins = 0
    for (let i = 0; i < 40; i++) {
      const { candidates, winnerIndex } = selectCandidates(pool, weights)
      if (candidates[winnerIndex]!.id === 'heavy') heavyWins++
    }
    expect(heavyWins).toBeGreaterThanOrEqual(38)
  })

  it('falls back to uniform when all weights are zero/invalid', () => {
    const pool = [place({ id: 'a' }), place({ id: 'b' })]
    const weights = new Map([
      ['a', 0],
      ['b', 0],
    ])
    const { winnerIndex } = selectCandidates(pool, weights)
    expect(winnerIndex === 0 || winnerIndex === 1).toBe(true)
  })
})
