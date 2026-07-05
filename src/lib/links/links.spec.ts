import { describe, expect, it } from 'vitest'

import { buildGoogleMapsUrl } from './gmaps'
import { buildOpenRiceUrl } from './openrice'

describe('buildGoogleMapsUrl', () => {
  it('includes encoded name and place id', () => {
    const url = buildGoogleMapsUrl({
      name: '金華燒味 Golden Roast',
      id: 'ChIJabc',
      location: { lat: 22.28, lng: 114.16 },
    })
    expect(url).toContain('https://www.google.com/maps/search/?')
    expect(url).toContain('api=1')
    expect(url).toContain('query_place_id=ChIJabc')
    expect(url).toContain(encodeURIComponent('金華燒味 Golden Roast').replace(/%20/g, '+'))
  })

  it('falls back to coordinates without a name', () => {
    const url = buildGoogleMapsUrl({ name: '', id: '', location: { lat: 22.28, lng: 114.16 } })
    expect(url).toContain('22.28%2C114.16')
    expect(url).not.toContain('query_place_id')
  })
})

describe('buildOpenRiceUrl', () => {
  it('builds zh and en links for Hong Kong', () => {
    expect(buildOpenRiceUrl('太平館', 'HK', 'zh-TW')).toBe(
      'https://www.openrice.com/zh/hongkong/restaurants?what=%E5%A4%AA%E5%B9%B3%E9%A4%A8',
    )
    expect(buildOpenRiceUrl('Golden Roast', 'HK', 'en')).toBe(
      'https://www.openrice.com/en/hongkong/restaurants?what=Golden%20Roast',
    )
  })

  it('maps Macau and rejects unsupported regions', () => {
    expect(buildOpenRiceUrl('cafe', 'MO', 'en')).toContain('/en/macau/')
    expect(buildOpenRiceUrl('cafe', 'TW', 'en')).toBeNull()
    expect(buildOpenRiceUrl('cafe', 'OTHER', 'zh-TW')).toBeNull()
  })

  it('rejects empty names', () => {
    expect(buildOpenRiceUrl('  ', 'HK', 'en')).toBeNull()
  })
})
