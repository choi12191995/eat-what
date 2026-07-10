import { describe, expect, it } from 'vitest'

import { makeDefaultConditions } from '@/lib/draw/defaults'
import { applyConditionPatch, sanitizeAiConditions } from './conditionsSchema'

describe('sanitizeAiConditions', () => {
  it('keeps valid fields and drops unknown ids', () => {
    const patch = sanitizeAiConditions({
      cuisinesInclude: ['japanese', 'made-up', 'thai'],
      keywords: ['hotpot', 'nonsense'],
      budgetLevels: [1, 2, 9],
      openNowOnly: true,
    })!
    expect(patch.cuisinesInclude).toEqual(['japanese', 'thai'])
    expect(patch.keywords).toEqual(['hotpot'])
    expect(patch.budgetLevels).toEqual([1, 2])
    expect(patch.openNowOnly).toBe(true)
  })

  it('snaps radius to 100 m steps within bounds, snaps rating, clamps party size', () => {
    const patch = sanitizeAiConditions({ radiusMeters: 840, minRating: 4.2, partySize: 40 })!
    expect(patch.radiusMeters).toBe(800)
    expect(patch.minRating).toBe(4.0)
    expect(patch.partySize).toBe(12)
    expect(sanitizeAiConditions({ radiusMeters: 12 })!.radiusMeters).toBe(100)
    expect(sanitizeAiConditions({ radiusMeters: 99_999 })!.radiusMeters).toBe(5000)
  })

  it('arriveAt implies openNowOnly false; invalid times dropped', () => {
    const patch = sanitizeAiConditions({ arriveAt: '21:30' })!
    expect(patch.arriveAt).toBe('21:30')
    expect(patch.openNowOnly).toBe(false)
    expect(sanitizeAiConditions({ arriveAt: 'evening' })).toBeNull()
  })

  it('arriveDate rides with arriveAt only, and clears with it', () => {
    const patch = sanitizeAiConditions({ arriveAt: '19:00', arriveDate: '2026-07-13' })!
    expect(patch.arriveDate).toBe('2026-07-13')
    // a date without a time is dropped
    expect(sanitizeAiConditions({ arriveDate: '2026-07-13' })).toBeNull()
    // clearing the time clears the day
    const cleared = sanitizeAiConditions({ arriveAt: null })!
    expect(cleared.arriveAt).toBeNull()
    expect(cleared.arriveDate).toBeNull()
    // garbage dates dropped
    expect(sanitizeAiConditions({ arriveAt: '19:00', arriveDate: '13/07' })!.arriveDate).toBeUndefined()
  })

  it('caps keywords at the tag limit', () => {
    const patch = sanitizeAiConditions({
      keywords: ['hotpot', 'dimSum', 'congee', 'wonton', 'izakaya'],
    })!
    expect(patch.keywords).toHaveLength(3)
  })

  it('returns null for garbage', () => {
    expect(sanitizeAiConditions(null)).toBeNull()
    expect(sanitizeAiConditions('sushi')).toBeNull()
    expect(sanitizeAiConditions({ nonsense: true })).toBeNull()
  })
})

describe('applyConditionPatch', () => {
  it('only touches expressed fields and reports them', () => {
    const cond = makeDefaultConditions()
    cond.cuisines.exclude = ['korean']
    const applied = applyConditionPatch(cond, {
      cuisinesInclude: ['japanese'],
      radiusMeters: 500,
    })
    expect(applied.sort()).toEqual(['cuisines', 'radius'])
    expect(cond.cuisines.include).toEqual(['japanese'])
    expect(cond.cuisines.exclude).toEqual(['korean']) // untouched
    expect(cond.radiusMeters).toBe(500)
    expect(cond.openNowOnly).toBe(true) // untouched default
  })

  it('include wins when the same cuisine appears in both directions', () => {
    const cond = makeDefaultConditions()
    applyConditionPatch(cond, { cuisinesInclude: ['thai'], cuisinesExclude: ['thai', 'korean'] })
    expect(cond.cuisines.include).toEqual(['thai'])
    expect(cond.cuisines.exclude).toEqual(['korean'])
  })

  it('applies arriveDate with arriveAt and resets it when the time moves without a day', () => {
    const cond = makeDefaultConditions()
    applyConditionPatch(cond, { arriveAt: '19:00', arriveDate: '2026-07-13' })
    expect(cond.arriveAt).toBe('19:00')
    expect(cond.arriveDate).toBe('2026-07-13')
    applyConditionPatch(cond, { arriveAt: '12:30' })
    expect(cond.arriveDate).toBeNull()
  })
})
