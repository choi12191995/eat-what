import { describe, expect, it } from 'vitest'

import { plannedEpoch } from './planning'

// Friday 2026-07-10 15:00 local
const NOW = new Date(2026, 6, 10, 15, 0).getTime()

describe('plannedEpoch', () => {
  it('null when drawing for right now', () => {
    expect(plannedEpoch({ openNowOnly: true, arriveAt: null, arriveDate: null }, NOW)).toBeNull()
    expect(plannedEpoch({ openNowOnly: false, arriveAt: null, arriveDate: null }, NOW)).toBeNull()
    // openNow on wins even if a leftover time is set
    expect(plannedEpoch({ openNowOnly: true, arriveAt: '19:00', arriveDate: null }, NOW)).toBeNull()
  })

  it('a later time today is a plan; an earlier one is not', () => {
    const tonight = plannedEpoch({ openNowOnly: false, arriveAt: '19:30', arriveDate: null }, NOW)
    expect(tonight).toBe(new Date(2026, 6, 10, 19, 30).getTime())
    expect(plannedEpoch({ openNowOnly: false, arriveAt: '12:00', arriveDate: null }, NOW)).toBeNull()
  })

  it('a future date + time lands on that exact local slot', () => {
    const monday = plannedEpoch(
      { openNowOnly: false, arriveAt: '19:00', arriveDate: '2026-07-13' },
      NOW,
    )
    expect(monday).toBe(new Date(2026, 6, 13, 19, 0).getTime())
  })

  it('garbage dates and times are not plans', () => {
    expect(plannedEpoch({ openNowOnly: false, arriveAt: '25:99', arriveDate: null }, NOW)).toBeNull()
    expect(
      plannedEpoch({ openNowOnly: false, arriveAt: '19:00', arriveDate: 'not-a-date' }, NOW),
    ).toBeNull()
  })
})
