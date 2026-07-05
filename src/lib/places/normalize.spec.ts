import { describe, expect, it } from 'vitest'

import { normalizePlace, todayHoursFrom, type GooglePlace } from './normalize'

const FULL: GooglePlace = {
  id: 'ChIJtest123',
  displayName: { text: '金華燒味' },
  location: { latitude: 22.2836, longitude: 114.1562 },
  shortFormattedAddress: '中環士丹利街 24 號',
  types: ['cantonese_restaurant', 'restaurant', 'food', 'establishment'],
  primaryType: 'cantonese_restaurant',
  rating: 4.4,
  userRatingCount: 1823,
  priceLevel: 'PRICE_LEVEL_INEXPENSIVE',
  priceRange: {
    startPrice: { currencyCode: 'HKD', units: '40' },
    endPrice: { currencyCode: 'HKD', units: '80', nanos: 0 },
  },
  currentOpeningHours: {
    openNow: true,
    weekdayDescriptions: [
      'Monday: 10:00 AM – 9:30 PM',
      'Tuesday: 10:00 AM – 9:30 PM',
      'Wednesday: 10:00 AM – 9:30 PM',
      'Thursday: 10:00 AM – 9:30 PM',
      'Friday: 10:00 AM – 9:30 PM',
      'Saturday: 10:00 AM – 9:30 PM',
      'Sunday: Closed',
    ],
  },
  photos: [{ name: 'places/ChIJtest123/photos/AAA' }, { name: 'places/ChIJtest123/photos/BBB' }],
  googleMapsUri: 'https://maps.google.com/?cid=123',
  businessStatus: 'OPERATIONAL',
}

describe('normalizePlace', () => {
  it('maps a fully-populated place', () => {
    const r = normalizePlace(FULL, () => 42)!
    expect(r).toMatchObject({
      id: 'ChIJtest123',
      name: '金華燒味',
      location: { lat: 22.2836, lng: 114.1562 },
      address: '中環士丹利街 24 號',
      primaryType: 'cantonese_restaurant',
      rating: 4.4,
      userRatingCount: 1823,
      priceLevel: 1,
      openNow: true,
      googleMapsUri: 'https://maps.google.com/?cid=123',
      businessStatus: 'OPERATIONAL',
      fetchedAt: 42,
    })
    expect(r.priceRange).toEqual({
      start: { currencyCode: 'HKD', units: 40 },
      end: { currencyCode: 'HKD', units: 80 },
    })
    expect(r.photoNames).toEqual([
      'places/ChIJtest123/photos/AAA',
      'places/ChIJtest123/photos/BBB',
    ])
    expect(r.todayHours).toBeDefined()
  })

  it('tolerates missing optional fields', () => {
    const r = normalizePlace({
      id: 'x',
      location: { latitude: 1, longitude: 2 },
    })!
    expect(r.name).toBe('x')
    expect(r.rating).toBeUndefined()
    expect(r.priceLevel).toBeUndefined()
    expect(r.priceRange).toBeUndefined()
    expect(r.photoNames).toEqual([])
    expect(r.types).toEqual([])
  })

  it('rejects places without id or location', () => {
    expect(normalizePlace({ id: '', location: { latitude: 1, longitude: 2 } })).toBeNull()
    expect(normalizePlace({ id: 'x' })).toBeNull()
  })

  it('drops malformed money and unknown price levels', () => {
    const r = normalizePlace({
      id: 'x',
      location: { latitude: 1, longitude: 2 },
      priceLevel: 'PRICE_LEVEL_UNSPECIFIED',
      priceRange: { startPrice: { units: '100' } }, // no currency
    })!
    expect(r.priceLevel).toBeUndefined()
    expect(r.priceRange).toBeUndefined()
  })

  it('caps photos at three', () => {
    const r = normalizePlace({
      id: 'x',
      location: { latitude: 1, longitude: 2 },
      photos: [{ name: 'a' }, { name: 'b' }, { name: 'c' }, { name: 'd' }],
    })!
    expect(r.photoNames).toHaveLength(3)
  })
})

describe('todayHoursFrom', () => {
  const week = ['Monday: 1', 'Tuesday: 2', 'Wednesday: 3', 'Thursday: 4', 'Friday: 5', 'Saturday: 6', 'Sunday: 7']

  it('picks the right weekday (Monday-first list)', () => {
    expect(todayHoursFrom(week, new Date('2026-07-06T12:00:00'))).toBe('1') // a Monday
    expect(todayHoursFrom(week, new Date('2026-07-05T12:00:00'))).toBe('7') // a Sunday
  })

  it('strips localized day prefixes', () => {
    const zh = ['星期一: 上午10:00 – 下午9:30', '星期二: 休息', '星期三: x', '星期四: x', '星期五: x', '星期六: x', '星期日: x']
    expect(todayHoursFrom(zh, new Date('2026-07-07T12:00:00'))).toBe('休息') // a Tuesday
  })

  it('returns undefined for empty input', () => {
    expect(todayHoursFrom(undefined)).toBeUndefined()
    expect(todayHoursFrom([])).toBeUndefined()
  })
})
