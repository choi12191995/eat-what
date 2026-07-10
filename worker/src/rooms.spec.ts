import { describe, expect, it } from 'vitest'

import { isRoomId, newRoomId, parsePlannedAt } from './rooms'

describe('room ids', () => {
  it('generates 6-char ids from the unambiguous alphabet', () => {
    for (let i = 0; i < 20; i++) {
      const id = newRoomId()
      expect(id).toMatch(/^[A-Z2-9]{6}$/)
      expect(id).not.toMatch(/[01OIL]/)
      expect(isRoomId(id)).toBe(true)
    }
  })
})

describe('parsePlannedAt', () => {
  const NOW = 1_800_000_000_000

  it('accepts sane future timestamps and recent past', () => {
    expect(parsePlannedAt(NOW + 3 * 24 * 60 * 60 * 1000, NOW)).toBe(NOW + 3 * 24 * 60 * 60 * 1000)
    expect(parsePlannedAt(NOW - 30 * 60 * 1000, NOW)).toBe(NOW - 30 * 60 * 1000)
  })

  it('rejects garbage, the distant past, and >90 days out', () => {
    expect(parsePlannedAt(undefined, NOW)).toBeUndefined()
    expect(parsePlannedAt('tomorrow', NOW)).toBeUndefined()
    expect(parsePlannedAt(Number.NaN, NOW)).toBeUndefined()
    expect(parsePlannedAt(NOW - 2 * 60 * 60 * 1000, NOW)).toBeUndefined()
    expect(parsePlannedAt(NOW + 91 * 24 * 60 * 60 * 1000, NOW)).toBeUndefined()
  })
})
