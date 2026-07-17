import { describe, expect, it } from 'vitest'

import type { Restaurant } from '@/types/models'
import { dedupeBrands, isFastFood, isKnownChain, multiBranchBrands, normalizeBrand } from './chains'

const ORIGIN = { lat: 22.2819, lng: 114.158 }

function place(id: string, name: string, over: Partial<Restaurant> = {}): Restaurant {
  return {
    id,
    name,
    location: ORIGIN,
    types: ['restaurant'],
    photoNames: [],
    fetchedAt: 0,
    ...over,
  }
}

describe('normalizeBrand', () => {
  it('strips spaces, punctuation and branch qualifiers', () => {
    expect(normalizeBrand("McDonald's")).toBe('mcdonalds')
    expect(normalizeBrand('麥當勞（旺角新之城）')).toBe('麥當勞')
    expect(normalizeBrand('Mos Burger - Central')).toBe('mosburger')
    expect(normalizeBrand('譚仔三哥米線 (深水埗店)')).toBe('譚仔三哥米線')
  })
})

describe('isKnownChain / isFastFood', () => {
  it('recognizes the curated offenders in either language', () => {
    expect(isKnownChain("McDonald's")).toBe(true)
    expect(isKnownChain('麥當勞（旺角）')).toBe(true)
    expect(isKnownChain('Starbucks Reserve')).toBe(true)
    expect(isKnownChain('譚仔三哥米線')).toBe(true)
    expect(isKnownChain('譚仔雲南米線')).toBe(true)
    expect(isKnownChain('太興 (燒味)')).toBe(true)
    expect(isKnownChain('金華冰廳')).toBe(false)
    expect(isKnownChain('Sushi Den')).toBe(false)
  })

  it('fast food goes by the Google type', () => {
    expect(isFastFood(['fast_food_restaurant', 'hamburger_restaurant'])).toBe(true)
    expect(isFastFood(['cantonese_restaurant'])).toBe(false)
  })
})

describe('multiBranchBrands', () => {
  it('flags brands appearing at 2+ locations, ignores singletons', () => {
    const raw = [
      place('a1', '未知連鎖店', { location: { lat: 22.28, lng: 114.15 } }),
      place('a2', '未知連鎖店（分店）', { location: { lat: 22.29, lng: 114.16 } }),
      place('b', '獨立小店'),
    ]
    const brands = multiBranchBrands(raw)
    expect(brands.has('未知連鎖店')).toBe(true)
    expect(brands.has('獨立小店')).toBe(false)
  })
})

describe('dedupeBrands', () => {
  it('keeps one branch per brand — the nearest — and preserves others', () => {
    const near = place('m1', "McDonald's", { location: { lat: 22.282, lng: 114.158 } })
    const far = place('m2', "McDonald's", { location: { lat: 22.3, lng: 114.17 } })
    const other = place('x', 'Sushi Den')
    const out = dedupeBrands([far, near, other], ORIGIN)
    expect(out.map((r) => r.id)).toEqual(['m1', 'x'])
  })
})
