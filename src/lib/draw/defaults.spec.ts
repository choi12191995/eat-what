import { describe, expect, it } from 'vitest'

import type { DrawConditions, PriceLevel } from '@/types/models'
import { hydrateConditions, makeDefaultConditions } from './defaults'

type Legacy = Omit<DrawConditions, 'budgetRange'> & { budgetLevels: PriceLevel[] }

/** Conditions as a v1 build persisted them: $-levels, none of the new keys. */
function legacyConditions(levels: PriceLevel[]): DrawConditions {
  const c = makeDefaultConditions() as DrawConditions & Partial<Legacy>
  delete (c as Partial<DrawConditions>).budgetRange
  delete (c as Partial<DrawConditions>).requirePrice
  delete (c as Partial<DrawConditions>).arriveDate
  c.budgetLevels = levels
  return c as DrawConditions
}

describe('hydrateConditions', () => {
  it('fills fields newer than the persisted shape', () => {
    const out = hydrateConditions(legacyConditions([]))
    expect(out.budgetRange).toBeNull()
    expect(out.requirePrice).toBe(false)
    expect(out.arriveDate).toBeNull()
    expect('budgetLevels' in out).toBe(false)
  })

  it('converts v1 $-levels into HK-band money windows', () => {
    expect(hydrateConditions(legacyConditions([1, 2])).budgetRange).toEqual({ min: 0, max: 150 })
    expect(hydrateConditions(legacyConditions([3])).budgetRange).toEqual({ min: 150, max: 400 })
    expect(hydrateConditions(legacyConditions([4])).budgetRange).toEqual({ min: 400, max: null })
    expect(hydrateConditions(legacyConditions([2, 4])).budgetRange).toEqual({ min: 50, max: null })
  })

  it('leaves a modern budgetRange untouched', () => {
    const modern = { ...makeDefaultConditions(), budgetRange: { min: 25, max: 75 } }
    expect(hydrateConditions(modern).budgetRange).toEqual({ min: 25, max: 75 })
  })
})
