/**
 * Chain / fast-food detection + same-brand dedupe.
 *
 * Google Places has no "chain" flag, so chains are recognized two ways:
 * a pattern list — curated defaults the user can disable per-pattern and
 * extend with their own keywords in Settings — and self-evidence: when one
 * brand shows up at 2+ locations inside a single search, it's behaving like
 * a chain right here, whatever it's called. Fast food is cleaner — Google
 * types it.
 *
 * Brand identity is PREFIX-aware: 「麥當勞」 and 「麥當勞旺角新之城」 are one
 * brand (branch qualifiers aren't always bracketed), guarded by minimum
 * prefix lengths so 「金華」 can never swallow 「金華冰廳」's neighbours.
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

const hasCjk = (s: string) => /[㐀-鿿]/.test(s)

/**
 * Same brand? Exact, or one is a prefix of the other — branch names often
 * append the district with no brackets. The shorter side must be a real
 * brand-length word (CJK ≥3 · latin ≥5) so short generic prefixes can't
 * merge unrelated shops.
 */
export function sameBrand(a: string, b: string): boolean {
  if (a === b) return a.length > 0
  const [short, long] = a.length <= b.length ? [a, b] : [b, a]
  const min = hasCjk(short) ? 3 : 5
  return short.length >= min && long.startsWith(short)
}

/**
 * The pattern list actually in force: curated defaults minus what the user
 * disabled, plus their own keywords (normalized), from Settings.
 */
export function effectivePatterns(
  disabled: readonly string[] = [],
  custom: readonly string[] = [],
): string[] {
  const off = new Set(disabled)
  return [
    ...CHAIN_PATTERNS.filter((p) => !off.has(p)),
    ...custom.map(normalizeBrand).filter((p) => p.length >= 2),
  ]
}

export function matchesChainPattern(name: string, patterns: readonly string[]): boolean {
  const brand = normalizeBrand(name)
  return patterns.some((p) => brand.includes(p))
}

/** Curated-list check with the default patterns (tests / standalone use). */
export function isKnownChain(name: string): boolean {
  return matchesChainPattern(name, CHAIN_PATTERNS)
}

export function isFastFood(types: readonly string[]): boolean {
  return types.includes('fast_food_restaurant')
}

/** Stale-pool key: edits to the chain config must invalidate fetched pools. */
export function chainConfigKey(
  disabled: readonly string[] = [],
  custom: readonly string[] = [],
): string {
  return `${[...disabled].sort().join(',')}|${[...custom].sort().join(',')}`
}

/** Group brands under their shortest prefix root (input any iteration order). */
function brandRoots(brands: readonly string[]): Map<string, string> {
  const roots: string[] = []
  const assignment = new Map<string, string>()
  for (const brand of [...new Set(brands)].sort((a, b) => a.length - b.length)) {
    const root = roots.find((r) => sameBrand(r, brand))
    if (root) assignment.set(brand, root)
    else {
      roots.push(brand)
      assignment.set(brand, brand)
    }
  }
  return assignment
}

/**
 * Brand roots seen at 2+ locations in one raw result set — local evidence
 * of chain-ness that needs no curated list. Prefix-aware: 「麥當勞」 +
 * 「麥當勞旺角店」 counts as two branches of one brand.
 */
export function multiBranchBrands(raw: readonly Restaurant[]): Set<string> {
  const brands = raw.map((r) => normalizeBrand(r.name)).filter(Boolean)
  const assignment = brandRoots(brands)
  const counts = new Map<string, number>()
  for (const brand of brands) {
    const root = assignment.get(brand)!
    counts.set(root, (counts.get(root) ?? 0) + 1)
  }
  return new Set([...counts.entries()].filter(([, n]) => n >= 2).map(([root]) => root))
}

/** Does this place belong to any evidenced chain root? */
export function isChainBranch(name: string, roots: ReadonlySet<string>): boolean {
  const brand = normalizeBrand(name)
  if (!brand) return false
  for (const root of roots) if (sameBrand(root, brand)) return true
  return false
}

/** One wheel slot per brand (prefix-aware): keep the branch nearest the origin. */
export function dedupeBrands(pool: readonly Restaurant[], origin: LatLng): Restaurant[] {
  const assignment = brandRoots(pool.map((r) => normalizeBrand(r.name)).filter(Boolean))
  const best = new Map<string, Restaurant>()
  const order: string[] = []
  for (const r of pool) {
    const brand = normalizeBrand(r.name)
    const root = (brand && assignment.get(brand)) || r.id
    const seen = best.get(root)
    if (!seen) {
      best.set(root, r)
      order.push(root)
    } else if (haversineMeters(origin, r.location) < haversineMeters(origin, seen.location)) {
      best.set(root, r)
    }
  }
  return order.map((root) => best.get(root)!)
}
