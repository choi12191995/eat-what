/**
 * Chain / fast-food detection + same-brand dedupe.
 *
 * Google Places has no "chain" flag, so chains are recognized two ways:
 * a curated list of the big HK/TW/JP offenders (contributions welcome — the
 * list is plain substrings), and self-evidence: when one brand shows up at
 * 2+ locations inside a single search, it's behaving like a chain right
 * here, whatever it's called. Fast food is cleaner — Google types it.
 *
 * Dedupe is unconditional: even when chains are allowed, a wheel should
 * never offer McDonald's three times at three addresses (field-reported).
 */
import type { LatLng, Restaurant } from '@/types/models'
import { haversineMeters } from '@/lib/geo/distance'

/** Normalized-substring patterns (see normalizeBrand). Keep lowercase, no spaces. */
export const CHAIN_PATTERNS: string[] = [
  // global fast food & coffee
  'mcdonald', '麥當勞', 'kfc', '肯德基', '家鄉雞', 'burgerking', '漢堡王', 'subway',
  'pizzahut', '必勝客', 'dominos', '達美樂', 'jollibee', '快樂蜂', 'starbucks', '星巴克',
  'pacificcoffee', 'prêtamanger', 'pretamanger', 'mixue', '蜜雪冰城',
  // HK staples
  '譚仔', 'tamjai', '太興', 'taihing', '大家樂', 'cafedecoral', '大快活', 'fairwood',
  '美心', 'maxim', '一粥麵', '翠華', 'tsuiwah', '元氣壽司', 'genkisushi', '爭鮮', 'sushitake',
  // JP chains (home market + HK/TW branches)
  '吉野家', 'yoshinoya', 'すき家', '食其家', 'sukiya', '松屋', 'matsuya',
  '壹番屋', 'coco壱', 'cocoichibanya', '薩莉亞', 'saizeriya', 'サイゼリヤ',
  '壽司郎', 'sushiro', 'スシロー', 'はま寿司', 'hamasushi', 'くら寿司', 'kurasushi',
  '摩斯', 'mosburger',
  // TW chains
  '八方雲集', '三商巧福', '頂呱呱', '鬍鬚張',
]

const STRIP = /\(.*?\)|（.*?）|【.*?】|[\s·・,，。''']/g

/** Brand key for matching + dedupe: lowercase, branch qualifiers stripped. */
export function normalizeBrand(name: string): string {
  return name.toLowerCase().replace(STRIP, '').split('-')[0]!
}

export function isKnownChain(name: string): boolean {
  const brand = normalizeBrand(name)
  return CHAIN_PATTERNS.some((p) => brand.includes(p))
}

export function isFastFood(types: readonly string[]): boolean {
  return types.includes('fast_food_restaurant')
}

/**
 * Brands seen at 2+ distinct locations in one raw result set — local
 * evidence of chain-ness that needs no curated list.
 */
export function multiBranchBrands(raw: readonly Restaurant[]): Set<string> {
  const counts = new Map<string, number>()
  for (const r of raw) {
    const brand = normalizeBrand(r.name)
    if (brand) counts.set(brand, (counts.get(brand) ?? 0) + 1)
  }
  return new Set([...counts.entries()].filter(([, n]) => n >= 2).map(([brand]) => brand))
}

/** One wheel slot per brand: keep the branch nearest to the draw origin. */
export function dedupeBrands(pool: readonly Restaurant[], origin: LatLng): Restaurant[] {
  const best = new Map<string, Restaurant>()
  const order: string[] = []
  for (const r of pool) {
    const brand = normalizeBrand(r.name) || r.id
    const seen = best.get(brand)
    if (!seen) {
      best.set(brand, r)
      order.push(brand)
    } else if (haversineMeters(origin, r.location) < haversineMeters(origin, seen.location)) {
      best.set(brand, r)
    }
  }
  return order.map((brand) => best.get(brand)!)
}
