import { describe, expect, it } from 'vitest'

import type { Restaurant } from '@/types/models'
import {
  bandLabel,
  bandWindow,
  formatBudgetWindow,
  formatPrice,
  levelFromPriceRange,
  windowsOverlap,
} from './price'

describe('budget windows', () => {
  it('bandWindow maps $-levels onto regional edges', () => {
    expect(bandWindow(1, 'HK')).toEqual({ min: 0, max: 50 })
    expect(bandWindow(2, 'HK')).toEqual({ min: 50, max: 150 })
    expect(bandWindow(4, 'HK')).toEqual({ min: 400, max: null })
    expect(bandWindow(1, 'JP')).toEqual({ min: 0, max: 1000 })
    expect(bandWindow(3, 'OTHER')).toEqual({ min: 150, max: 400 }) // HK fallback
  })

  it('windowsOverlap handles bounded, unbounded and point windows', () => {
    expect(windowsOverlap({ min: 0, max: 150 }, { min: 100, max: 200 })).toBe(true)
    expect(windowsOverlap({ min: 0, max: 90 }, { min: 100, max: 200 })).toBe(false)
    expect(windowsOverlap({ min: 400, max: null }, { min: 500, max: null })).toBe(true)
    expect(windowsOverlap({ min: 0, max: 300 }, { min: 400, max: null })).toBe(false)
    expect(windowsOverlap({ min: 120, max: 120 }, { min: 100, max: 150 })).toBe(true)
  })

  it('formats windows for humans', () => {
    expect(formatBudgetWindow({ min: 0, max: 50 }, 'HK', 'en')).toMatch(/^< /)
    expect(formatBudgetWindow({ min: 400, max: null }, 'HK', 'en')).toMatch(/\+$/)
    expect(formatBudgetWindow({ min: 120, max: 120 }, 'HK', 'en')).toMatch(/^≈/)
    expect(formatBudgetWindow({ min: 50, max: 150 }, 'OTHER', 'en')).toBe('$50–150')
  })
})

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
