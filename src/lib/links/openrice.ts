import type { Region } from '@/lib/geo/region'

const OPENRICE_REGION_PATH: Partial<Record<Region, string>> = {
  HK: 'hongkong',
  MO: 'macau',
}

/**
 * OpenRice search deep link — only for regions OpenRice covers (HK/Macau).
 * Verified pattern: https://www.openrice.com/{zh|en}/{region}/restaurants?what=<name>
 */
export function buildOpenRiceUrl(
  name: string,
  region: Region,
  locale: 'en' | 'zh-TW',
): string | null {
  const path = OPENRICE_REGION_PATH[region]
  if (!path || !name.trim()) return null
  const lang = locale === 'zh-TW' ? 'zh' : 'en'
  return `https://www.openrice.com/${lang}/${path}/restaurants?what=${encodeURIComponent(name.trim())}`
}
