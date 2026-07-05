import { describe, expect, it } from 'vitest'

import type { Restaurant } from '@/types/models'
import { bandLabel, formatPrice, levelFromPriceRange } from './price'

function place(over: Partial<Restaurant>): Restaurant {
  return {
    id: 'x',
    name: 'X',
    location: { lat: 0, lng: 0 },
    types: [],
    photoNames: [],
    fetchedAt: 0,
    ...over,
  }
}

describe('formatPrice', () => {
  it('formats an explicit HKD range', () => {
    const r = place({
      priceRange: { start: { currencyCode: 'HKD', units: 100 }, end: { currencyCode: 'HKD', units: 200 } },
    })
    const out = formatPrice(r, 'en', 'HK')
    expect(out.source).toBe('range')
    expect(out.text).toContain('100')
    expect(out.text).toContain('200')
    expect(out.text).toMatch(/HK\$/)
  })

  it('formats an open-ended range with a plus', () => {
    const r = place({ priceRange: { start: { currencyCode: 'HKD', units: 400 } } })
    const out = formatPrice(r, 'en', 'HK')
    expect(out.text.endsWith('+')).toBe(true)
  })

  it('falls back to regional band for a bare price level', () => {
    const out = formatPrice(place({ priceLevel: 2 }), 'zh-TW', 'TW')
    expect(out.source).toBe('level')
    expect(out.text).toContain('$$')
    expect(out.text).toMatch(/150|450/)
  })

  it('uses plain symbols outside known regions', () => {
    const out = formatPrice(place({ priceLevel: 3 }), 'en', 'OTHER')
    expect(out.text).toBe('$$$')
  })

  it('reports none when no price data exists', () => {
    expect(formatPrice(place({}), 'en', 'HK').source).toBe('none')
  })
})

describe('levelFromPriceRange', () => {
  it('maps HK ranges onto band levels via midpoint', () => {
    const mk = (a: number, b: number) => ({
      start: { currencyCode: 'HKD', units: a },
      end: { currencyCode: 'HKD', units: b },
    })
    expect(levelFromPriceRange(mk(20, 40), 'HK')).toBe(1)
    expect(levelFromPriceRange(mk(60, 120), 'HK')).toBe(2)
    expect(levelFromPriceRange(mk(200, 380), 'HK')).toBe(3)
    expect(levelFromPriceRange(mk(500, 900), 'HK')).toBe(4)
  })

  it('works with only a start price', () => {
    expect(levelFromPriceRange({ start: { currencyCode: 'HKD', units: 30 } }, 'HK')).toBe(1)
  })

  it('returns undefined without any amount', () => {
    expect(levelFromPriceRange({}, 'HK')).toBeUndefined()
  })
})

describe('bandLabel', () => {
  it('renders lower/upper bounds per region', () => {
    expect(bandLabel(1, 'HK', 'en')).toContain('<')
    expect(bandLabel(4, 'TW', 'en')).toContain('+')
    expect(bandLabel(2, 'OTHER', 'en')).toBe('$$')
  })
})
