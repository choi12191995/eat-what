import { describe, expect, it } from 'vitest'

import { snapToQuarter } from './client'

describe('snapToQuarter', () => {
  it('leaves aligned times untouched', () => {
    expect(snapToQuarter('12:00')).toBe('12:00')
    expect(snapToQuarter('18:45')).toBe('18:45')
    expect(snapToQuarter('00:15')).toBe('00:15')
  })

  it('rounds to the nearest quarter hour', () => {
    expect(snapToQuarter('12:07')).toBe('12:00')
    expect(snapToQuarter('12:08')).toBe('12:15')
    expect(snapToQuarter('12:22')).toBe('12:15')
    expect(snapToQuarter('12:23')).toBe('12:30')
    expect(snapToQuarter('9:38')).toBe('09:45')
  })

  it('clamps the midnight edge instead of overflowing to 24:00', () => {
    expect(snapToQuarter('23:53')).toBe('23:45')
    expect(snapToQuarter('23:52')).toBe('23:45')
  })

  it('passes malformed values through unchanged', () => {
    expect(snapToQuarter('noon')).toBe('noon')
    expect(snapToQuarter('')).toBe('')
  })
})
