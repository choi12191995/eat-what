import { describe, expect, it } from 'vitest'

import en from './en.json'
import zhTW from './zh-TW.json'

function flatKeys(obj: Record<string, unknown>, prefix = ''): string[] {
  return Object.entries(obj).flatMap(([key, value]) =>
    value !== null && typeof value === 'object'
      ? flatKeys(value as Record<string, unknown>, `${prefix}${key}.`)
      : [`${prefix}${key}`],
  )
}

describe('locale resources', () => {
  it('en and zh-TW expose identical key sets', () => {
    expect(flatKeys(zhTW as Record<string, unknown>).sort()).toEqual(
      flatKeys(en as Record<string, unknown>).sort(),
    )
  })

  it('no message is left empty', () => {
    for (const locale of [en, zhTW]) {
      const walk = (obj: Record<string, unknown>): void => {
        for (const value of Object.values(obj)) {
          if (value !== null && typeof value === 'object') walk(value as Record<string, unknown>)
          else expect(String(value).trim()).not.toHaveLength(0)
        }
      }
      walk(locale as Record<string, unknown>)
    }
  })
})
