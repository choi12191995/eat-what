import { describe, expect, it } from 'vitest'

import type { Restaurant } from '@/types/models'
import {
  chainConfigKey,
  dedupeBrands,
  effectivePatterns,
  isChainBranch,
  isFastFood,
  isKnownChain,
  matchesChainPattern,
  multiBranchBrands,
  normalizeBrand,
  sameBrand,
} from './chains'

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

describe('sameBrand (prefix-aware)', () => {
  it('matches exact names and unbracketed branch suffixes', () => {
    expect(sameBrand('麥當勞', '麥當勞')).toBe(true)
    expect(sameBrand('麥當勞', '麥當勞旺角新之城')).toBe(true)
    expect(sameBrand('starbucks', 'starbucksreservecoffee')).toBe(true)
    expect(sameBrand('譚仔三哥米線', '譚仔三哥米線深水埗店')).toBe(true)
  })

  it('short or unrelated prefixes never merge different shops', () => {
    expect(sameBrand('金華', '金華冰廳')).toBe(false) // 2 CJK chars — below guard
    expect(sameBrand('kfc', 'kfccentral')).toBe(false) // 3 latin — below guard
    expect(sameBrand('pizzahut', 'pizzaexpress')).toBe(false)
    expect(sameBrand('', '')).toBe(false)
  })
})

describe('effectivePatterns / chainConfigKey', () => {
  it('removes disabled patterns and adds normalized custom keywords', () => {
    const patterns = effectivePatterns(['mcdonald', '麥當勞'], ['Tam Chai', '一 蘭', 'x'])
    expect(patterns).not.toContain('mcdonald')
    expect(patterns).not.toContain('麥當勞')
    expect(patterns).toContain('starbucks')
    expect(patterns).toContain('tamchai')
    expect(patterns).toContain('一蘭')
    expect(patterns).not.toContain('x') // too short after normalize
    expect(matchesChainPattern('一蘭拉麵（銅鑼灣）', patterns)).toBe(true)
    expect(matchesChainPattern("McDonald's", patterns)).toBe(false) // disabled
  })

  it('config key is order-insensitive but edit-sensitive', () => {
    expect(chainConfigKey(['a', 'b'], ['x'])).toBe(chainConfigKey(['b', 'a'], ['x']))
    expect(chainConfigKey([], [])).not.toBe(chainConfigKey([], ['x']))
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

  it('counts unbracketed branch-suffix names as the same brand', () => {
    const raw = [
      place('a1', '麥當勞', { location: { lat: 22.28, lng: 114.15 } }),
      place('a2', '麥當勞旺角新之城', { location: { lat: 22.29, lng: 114.16 } }),
    ]
    const brands = multiBranchBrands(raw)
    expect(brands.has('麥當勞')).toBe(true)
    expect(isChainBranch('麥當勞旺角新之城', brands)).toBe(true)
    expect(isChainBranch('金華冰廳', brands)).toBe(false)
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

  it('collapses prefix-variant branch names, keeping the closer one', () => {
    const far = place('s1', 'Starbucks Reserve Roastery', { location: { lat: 22.29, lng: 114.158 } })
    const near = place('s2', 'Starbucks', { location: { lat: 22.282, lng: 114.158 } })
    const shortName = place('k', '金華', { location: ORIGIN }) // guard: must NOT eat 金華冰廳
    const longName = place('kb', '金華冰廳', { location: ORIGIN })
    const out = dedupeBrands([far, near, shortName, longName], ORIGIN)
    expect(out.map((r) => r.id).sort()).toEqual(['k', 'kb', 's2'])
  })
})
