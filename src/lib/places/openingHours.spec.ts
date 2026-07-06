import { describe, expect, it } from 'vitest'

import type { OpenPeriod } from '@/types/models'
import { isOpenAt, minutesFromHHmm } from './openingHours'

const MON_LUNCH: OpenPeriod = {
  open: { day: 1, hour: 11, minute: 30 },
  close: { day: 1, hour: 15, minute: 0 },
}
const FRI_LATE: OpenPeriod = {
  open: { day: 5, hour: 18, minute: 0 },
  close: { day: 6, hour: 2, minute: 0 }, // past midnight
}
const SAT_TO_SUN: OpenPeriod = {
  open: { day: 6, hour: 22, minute: 0 },
  close: { day: 0, hour: 3, minute: 0 }, // wraps the week boundary
}

describe('isOpenAt', () => {
  it('matches inside a same-day period, excludes the close minute', () => {
    expect(isOpenAt([MON_LUNCH], 1, 12 * 60)).toBe(true)
    expect(isOpenAt([MON_LUNCH], 1, 11 * 60)).toBe(false)
    expect(isOpenAt([MON_LUNCH], 1, 15 * 60)).toBe(false)
    expect(isOpenAt([MON_LUNCH], 2, 12 * 60)).toBe(false)
  })

  it('handles past-midnight spans', () => {
    expect(isOpenAt([FRI_LATE], 5, 23 * 60)).toBe(true)
    expect(isOpenAt([FRI_LATE], 6, 1 * 60)).toBe(true)
    expect(isOpenAt([FRI_LATE], 6, 3 * 60)).toBe(false)
  })

  it('handles the Saturday→Sunday week wrap', () => {
    expect(isOpenAt([SAT_TO_SUN], 6, 23 * 60)).toBe(true)
    expect(isOpenAt([SAT_TO_SUN], 0, 2 * 60)).toBe(true)
    expect(isOpenAt([SAT_TO_SUN], 0, 4 * 60)).toBe(false)
  })

  it('treats a close-less period as 24h open', () => {
    expect(isOpenAt([{ open: { day: 0, hour: 0, minute: 0 } }], 3, 200)).toBe(true)
  })

  it('empty periods → closed', () => {
    expect(isOpenAt([], 1, 720)).toBe(false)
  })
})

describe('minutesFromHHmm', () => {
  it('parses and rejects', () => {
    expect(minutesFromHHmm('18:30')).toBe(18 * 60 + 30)
    expect(minutesFromHHmm('9:05')).toBe(545)
    expect(minutesFromHHmm('24:00')).toBeNull()
    expect(minutesFromHHmm('later')).toBeNull()
  })
})
