import { describe, expect, it } from 'vitest'

import { dueMeals, localParts, parseTime, SEND_WINDOW_MINUTES, type MealPrefs } from './schedule'

// 2026-07-06 is a Monday. 04:00Z = 12:00 in Hong Kong (UTC+8, no DST).
const HK_NOON_MONDAY = new Date('2026-07-06T04:00:00Z')

function prefs(overrides?: Partial<MealPrefs>): MealPrefs {
  return {
    lunch: { enabled: true, time: '12:00', days: [1, 2, 3, 4, 5] },
    dinner: { enabled: false, time: '18:30', days: [1, 2, 3, 4, 5, 6, 0] },
    ...overrides,
  }
}

describe('localParts', () => {
  it('resolves date/weekday/minutes in the target timezone', () => {
    expect(localParts(HK_NOON_MONDAY, 'Asia/Hong_Kong')).toEqual({
      date: '2026-07-06',
      weekday: 1,
      minutes: 12 * 60,
    })
  })

  it('crosses midnight correctly (h23, next local day)', () => {
    // 16:05Z Monday = 00:05 Tuesday in HK
    expect(localParts(new Date('2026-07-06T16:05:00Z'), 'Asia/Hong_Kong')).toEqual({
      date: '2026-07-07',
      weekday: 2,
      minutes: 5,
    })
  })

  it('handles a DST timezone', () => {
    // July: New York is UTC-4 → 16:05Z = 12:05 Monday
    expect(localParts(new Date('2026-07-06T16:05:00Z'), 'America/New_York')).toEqual({
      date: '2026-07-06',
      weekday: 1,
      minutes: 12 * 60 + 5,
    })
  })

  it('returns null for an invalid timezone', () => {
    expect(localParts(HK_NOON_MONDAY, 'Not/AZone')).toBeNull()
  })
})

describe('parseTime', () => {
  it('parses HH:mm and H:mm', () => {
    expect(parseTime('12:00')).toBe(720)
    expect(parseTime('9:05')).toBe(545)
    expect(parseTime('00:00')).toBe(0)
    expect(parseTime('23:59')).toBe(23 * 60 + 59)
  })

  it('rejects malformed values', () => {
    expect(parseTime('24:00')).toBeNull()
    expect(parseTime('12:60')).toBeNull()
    expect(parseTime('noon')).toBeNull()
    expect(parseTime('12')).toBeNull()
  })
})

describe('dueMeals', () => {
  it('fires at the exact meal time on a chosen weekday', () => {
    expect(dueMeals(prefs(), {}, HK_NOON_MONDAY, 'Asia/Hong_Kong')).toEqual([
      { meal: 'lunch', date: '2026-07-06' },
    ])
  })

  it('fires inside the window, not after it', () => {
    const lastInside = new Date(HK_NOON_MONDAY.getTime() + (SEND_WINDOW_MINUTES - 1) * 60_000)
    const firstOutside = new Date(HK_NOON_MONDAY.getTime() + SEND_WINDOW_MINUTES * 60_000)
    expect(dueMeals(prefs(), {}, lastInside, 'Asia/Hong_Kong')).toHaveLength(1)
    expect(dueMeals(prefs(), {}, firstOutside, 'Asia/Hong_Kong')).toHaveLength(0)
  })

  it('does not fire before the meal time', () => {
    const justBefore = new Date(HK_NOON_MONDAY.getTime() - 60_000)
    expect(dueMeals(prefs(), {}, justBefore, 'Asia/Hong_Kong')).toHaveLength(0)
  })

  it('respects weekday selection', () => {
    // 2026-07-05 was a Sunday — lunch is Mon–Fri only
    const sundayNoon = new Date('2026-07-05T04:00:00Z')
    expect(dueMeals(prefs(), {}, sundayNoon, 'Asia/Hong_Kong')).toHaveLength(0)
  })

  it('dedupes via lastSent for the same local date', () => {
    expect(dueMeals(prefs(), { lunch: '2026-07-06' }, HK_NOON_MONDAY, 'Asia/Hong_Kong')).toHaveLength(0)
    expect(dueMeals(prefs(), { lunch: '2026-07-05' }, HK_NOON_MONDAY, 'Asia/Hong_Kong')).toHaveLength(1)
  })

  it('skips disabled meals and fires enabled ones independently', () => {
    const p = prefs({ dinner: { enabled: true, time: '18:30', days: [1] } })
    // 10:35Z = 18:35 HK Monday → dinner window, lunch long past
    const dinnerTime = new Date('2026-07-06T10:35:00Z')
    expect(dueMeals(p, {}, dinnerTime, 'Asia/Hong_Kong')).toEqual([
      { meal: 'dinner', date: '2026-07-06' },
    ])
  })

  it('evaluates in the subscriber timezone, not UTC', () => {
    // Same instant is lunch in New York but 00:05 in HK
    const nyNoon = new Date('2026-07-06T16:05:00Z')
    expect(dueMeals(prefs(), {}, nyNoon, 'America/New_York')).toHaveLength(1)
    expect(dueMeals(prefs(), {}, nyNoon, 'Asia/Hong_Kong')).toHaveLength(0)
  })

  it('returns nothing for invalid timezone or malformed time', () => {
    expect(dueMeals(prefs(), {}, HK_NOON_MONDAY, 'Not/AZone')).toHaveLength(0)
    const p = prefs({ lunch: { enabled: true, time: 'noonish', days: [1] } })
    expect(dueMeals(p, {}, HK_NOON_MONDAY, 'Asia/Hong_Kong')).toHaveLength(0)
  })
})
