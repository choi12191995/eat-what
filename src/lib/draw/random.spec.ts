import { describe, expect, it } from 'vitest'

import { cryptoRandomInt, shuffle } from './random'

describe('cryptoRandomInt', () => {
  it('stays within [0, max)', () => {
    for (let i = 0; i < 500; i++) {
      const v = cryptoRandomInt(7)
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(7)
      expect(Number.isInteger(v)).toBe(true)
    }
  })

  it('handles max = 1', () => {
    expect(cryptoRandomInt(1)).toBe(0)
  })

  it('throws for non-positive or non-integer max', () => {
    expect(() => cryptoRandomInt(0)).toThrow(RangeError)
    expect(() => cryptoRandomInt(-3)).toThrow(RangeError)
    expect(() => cryptoRandomInt(2.5)).toThrow(RangeError)
  })
})

describe('shuffle', () => {
  it('returns a permutation without mutating the input', () => {
    const input = [1, 2, 3, 4, 5, 6, 7, 8]
    const frozen = [...input]
    const out = shuffle(input)
    expect(input).toEqual(frozen)
    expect([...out].sort((a, b) => a - b)).toEqual(frozen)
  })

  it('handles empty and single-element arrays', () => {
    expect(shuffle([])).toEqual([])
    expect(shuffle([42])).toEqual([42])
  })
})
