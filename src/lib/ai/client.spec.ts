import { describe, expect, it } from 'vitest'

import { aiConfigured, extractJson } from './client'

describe('extractJson', () => {
  it('parses a bare JSON object', () => {
    expect(extractJson('{"placeId":"a","reason":"soup!"}')).toEqual({
      placeId: 'a',
      reason: 'soup!',
    })
  })

  it('parses fenced output', () => {
    const fenced = '```json\n{"placeId": "b", "reason": "冷天啱飲湯"}\n```'
    expect(extractJson(fenced)).toEqual({ placeId: 'b', reason: '冷天啱飲湯' })
  })

  it('parses JSON buried in prose', () => {
    const prose = 'Sure! Here is my pick: {"placeId":"c","reason":"cozy"} — enjoy!'
    expect(extractJson(prose)).toEqual({ placeId: 'c', reason: 'cozy' })
  })

  it('returns null for garbage', () => {
    expect(extractJson('no json here')).toBeNull()
    expect(extractJson('{broken')).toBeNull()
    expect(extractJson('{"unclosed": ')).toBeNull()
  })
})

describe('aiConfigured', () => {
  it('requires all three fields', () => {
    expect(aiConfigured({ baseUrl: 'https://x', apiKey: 'k', model: 'm' })).toBe(true)
    expect(aiConfigured({ baseUrl: '', apiKey: 'k', model: 'm' })).toBe(false)
    expect(aiConfigured({ baseUrl: 'https://x', apiKey: ' ', model: 'm' })).toBe(false)
    expect(aiConfigured({ baseUrl: 'https://x', apiKey: 'k', model: '' })).toBe(false)
  })
})
