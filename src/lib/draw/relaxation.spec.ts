import { describe, expect, it } from 'vitest'

import type { DrawConditions, Restaurant } from '@/types/models'
import { makeDefaultConditions } from './defaults'
import type { FilterContext } from './engine'
import { suggestRelaxations } from './relaxation'

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

const ctx: FilterContext = {
  origin: ORIGIN,
  region: 'HK',
  blockedIds: new Set(),
  recentIds: new Set(),
}

function cond(over: Partial<DrawConditions> = {}): DrawConditions {
  return { ...makeDefaultConditions(), ...over }
}

describe('suggestRelaxations', () => {
  it('suggests dropping open-now when that alone unblocks results', () => {
    const raw = [place({ id: 'a', openNow: false }), place({ id: 'b', openNow: false })]
    const out = suggestRelaxations(raw, cond({ openNowOnly: true }), ctx)
    const drop = out.find((s) => s.kind === 'dropOpenNow')
    expect(drop?.resultCount).toBe(2)
  })

  it('only suggests active constraints', () => {
    const raw = [place({ id: 'a', openNow: false })]
    const out = suggestRelaxations(raw, cond({ openNowOnly: true, minRating: null, budgetRange: null }), ctx)
    const kinds = out.map((s) => s.kind)
    expect(kinds).toContain('dropOpenNow')
    expect(kinds).not.toContain('dropMinRating')
    expect(kinds).not.toContain('dropBudget')
  })

  it('sorts single-drop suggestions by unlocked count, widenRadius last', () => {
    const raw = [
      place({ id: 'a', openNow: false }),
      place({ id: 'b', openNow: false }),
      place({ id: 'c', rating: 3.0 }),
    ]
    const out = suggestRelaxations(raw, cond({ openNowOnly: true, minRating: 4.5 }), ctx)
    expect(out.at(-1)?.kind).toBe('widenRadius')
    const counts = out.filter((s) => s.kind !== 'widenRadius').map((s) => s.resultCount)
    expect(counts).toEqual([...counts].sort((x, y) => y - x))
  })

  it('offers widenRadius with the next step, but not beyond the max', () => {
    const out1 = suggestRelaxations([], cond({ radiusMeters: 1000 }), ctx)
    expect(out1.find((s) => s.kind === 'widenRadius')?.nextRadius).toBe(2000)
    const out2 = suggestRelaxations([], cond({ radiusMeters: 5000 }), ctx)
    expect(out2.find((s) => s.kind === 'widenRadius')).toBeUndefined()
  })
})
