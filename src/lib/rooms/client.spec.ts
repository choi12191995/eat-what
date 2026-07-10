import { describe, expect, it } from 'vitest'

import { parseRoomCode } from './client'

describe('parseRoomCode', () => {
  it('accepts bare 6-char codes, uppercased', () => {
    expect(parseRoomCode('b9cgyn')).toBe('B9CGYN')
    expect(parseRoomCode('  B9CGYN  ')).toBe('B9CGYN')
  })

  it('extracts the code from room URLs (any host — we only take the code)', () => {
    expect(parseRoomCode('https://eat-what.samsonchoi.hk/room/B9CGYN')).toBe('B9CGYN')
    expect(parseRoomCode('https://eat-what.samsonchoi.hk/room/B9CGYN?utm=x')).toBe('B9CGYN')
    expect(parseRoomCode('https://evil.example/room/B9CGYN')).toBe('B9CGYN')
  })

  it('rejects everything else', () => {
    expect(parseRoomCode('')).toBeNull()
    expect(parseRoomCode('B9CG')).toBeNull()
    expect(parseRoomCode('B9CGYN7')).toBeNull()
    expect(parseRoomCode('https://evil.example/phishing')).toBeNull()
    expect(parseRoomCode('WIFI:T:WPA;S:home;;')).toBeNull()
  })
})
