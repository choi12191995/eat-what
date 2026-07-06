import { describe, expect, it } from 'vitest'

import { formatDistance, haversineMeters } from './distance'
import { currencyForRegion, detectRegion } from './region'

describe('haversineMeters', () => {
  it('is zero for identical points', () => {
    const p = { lat: 22.2819, lng: 114.158 }
    expect(haversineMeters(p, p)).toBe(0)
  })

  it('matches a known distance (Central ↔ TST ≈ 2.2 km)', () => {
    const central = { lat: 22.2819, lng: 114.158 }
    const tst = { lat: 22.2976, lng: 114.1722 }
    const d = haversineMeters(central, tst)
    expect(d).toBeGreaterThan(2000)
    expect(d).toBeLessThan(2600)
  })
})

describe('formatDistance', () => {
  it('uses meters below 1 km and kilometers above', () => {
    expect(formatDistance(850, 'en')).toMatch(/850|m/)
    expect(formatDistance(2300, 'en')).toMatch(/2\.3/)
  })
})

describe('detectRegion', () => {
  it('detects HK, MO, TW and falls back otherwise', () => {
    expect(detectRegion({ lat: 22.2819, lng: 114.158 })).toBe('HK')
    expect(detectRegion({ lat: 22.19, lng: 113.55 })).toBe('MO')
    expect(detectRegion({ lat: 25.033, lng: 121.565 })).toBe('TW')
    expect(detectRegion({ lat: 35.68, lng: 139.76 })).toBe('JP') // Tokyo
    expect(detectRegion({ lat: 51.5, lng: -0.12 })).toBe('OTHER') // London
    expect(detectRegion({ lat: 51.5, lng: -0.12 }, 'HK')).toBe('HK')
  })
})

describe('currencyForRegion', () => {
  it('maps regions to currencies', () => {
    expect(currencyForRegion('HK')).toBe('HKD')
    expect(currencyForRegion('MO')).toBe('MOP')
    expect(currencyForRegion('TW')).toBe('TWD')
    expect(currencyForRegion('OTHER')).toBeNull()
  })
})
