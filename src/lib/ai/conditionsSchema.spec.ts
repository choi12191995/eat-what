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

  it('snaps radius and rating, clamps party size', () => {
    const patch = sanitizeAiConditions({ radiusMeters: 800, minRating: 4.2, partySize: 40 })!
    expect(patch.radiusMeters).toBe(1000)
    expect(patch.minRating).toBe(4.0)
    expect(patch.partySize).toBe(12)
  })

  it('arriveAt implies openNowOnly false; invalid times dropped', () => {
    const patch = sanitizeAiConditions({ arriveAt: '21:30' })!
    expect(patch.arriveAt).toBe('21:30')
    expect(patch.openNowOnly).toBe(false)
    expect(sanitizeAiConditions({ arriveAt: 'evening' })).toBeNull()
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
})
