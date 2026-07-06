import type {
  DrawConditions,
  DrawStyle,
  LatLng,
  Restaurant,
  RelaxationSuggestion,
} from '@/types/models'
import { typesForCuisines, CUISINES } from '@/lib/places/cuisines'
import { keywordTagById, MAX_KEYWORD_TAGS, type KeywordTag } from '@/lib/places/keywords'
import { isOpenAt, minutesFromHHmm } from '@/lib/places/openingHours'
import type { PlacesProvider } from '@/lib/places/provider'
import { haversineMeters } from '@/lib/geo/distance'
import type { Region } from '@/lib/geo/region'
import { levelFromPriceRange } from '@/lib/format/price'
import { cryptoRandomInt, shuffle, weightedRandomIndex } from './random'
import { MAX_WHEEL_SEGMENTS } from './defaults'
import { suggestRelaxations } from './relaxation'

/** Broad food-type net used when no cuisine is selected ("any cuisine"). */
export const ALL_FOOD_TYPES: string[] = [
  ...new Set([
    'restaurant',
    'food_court',
    'meal_takeaway',
    ...CUISINES.flatMap((c) => c.includedTypes),
  ]),
]

export interface FilterContext {
  origin: LatLng
  region: Region
  blockedIds: ReadonlySet<string>
  recentIds: ReadonlySet<string>
  /** "Today" for the arrive-at weekday; injectable for tests */
  now?: Date
}

export interface FilterOverrides {
  skipOpenNow?: boolean
  skipArriveAt?: boolean
  skipMinRating?: boolean
  skipBudget?: boolean
  skipRecent?: boolean
}

// Nearby ranking can be fuzzy at the boundary; allow a small grace margin
// instead of dropping borderline places the user would happily walk to.
const RADIUS_GRACE = 1.15

export function filterPool(
  raw: readonly Restaurant[],
  cond: DrawConditions,
  ctx: FilterContext,
  o: FilterOverrides = {},
): Restaurant[] {
  const excludedTypes = new Set(typesForCuisines(cond.cuisines.exclude))

  return raw.filter((r) => {
    // -- hard filters --
    if (r.businessStatus && r.businessStatus !== 'OPERATIONAL') return false
    if (ctx.blockedIds.has(r.id)) return false
    if (!o.skipRecent && cond.excludeRecentDays !== null && ctx.recentIds.has(r.id)) return false
    // Exclusion wins over inclusion (a Korean BBQ place is dropped when
    // "Korean" is excluded even if "BBQ" is included).
    if (excludedTypes.size && r.types.some((t) => excludedTypes.has(t))) return false
    if (haversineMeters(ctx.origin, r.location) > cond.radiusMeters * RADIUS_GRACE) return false

    // -- soft filters --
    if (!o.skipOpenNow && cond.openNowOnly && r.openNow !== true) return false
    // Pre-draw for later: drop places whose known hours don't cover the
    // arrival time. Places with no structured hours pass (same philosophy
    // as unknown prices — don't punish sparse data).
    if (!o.skipArriveAt && !cond.openNowOnly && cond.arriveAt) {
      const minutes = minutesFromHHmm(cond.arriveAt)
      if (minutes !== null && r.openPeriods?.length) {
        const day = (ctx.now ?? new Date()).getDay()
        if (!isOpenAt(r.openPeriods, day, minutes)) return false
      }
    }
    if (!o.skipMinRating && cond.minRating !== null) {
      if (r.rating === undefined || r.rating < cond.minRating) return false
    }
    if (!o.skipBudget && cond.budgetLevels.length > 0) {
      const level = r.priceLevel ?? (r.priceRange ? levelFromPriceRange(r.priceRange, ctx.region) : undefined)
      // Price-unknown places pass — dropping them would bias against small
      // local shops that simply have no price data on Google.
      if (level !== undefined && !cond.budgetLevels.includes(level)) return false
    }
    return true
  })
}

export interface Selection {
  candidates: Restaurant[]
  winnerIndex: number
}

/**
 * Winner weight per restaurant given how often it was accepted before.
 * favor: regulars up to ~4× base chance · explore: never-tried boosted,
 * repeat visits decay · uniform: everything equal.
 */
export function styleWeight(style: DrawStyle, acceptedCount: number): number {
  switch (style) {
    case 'favor':
      return 1 + Math.min(acceptedCount, 4) * 0.75
    case 'explore':
      return acceptedCount === 0 ? 1.5 : 1 / (1 + acceptedCount)
    default:
      return 1
  }
}

/**
 * Pick up to MAX_WHEEL_SEGMENTS candidates (uniformly — every match deserves
 * a wheel slot) and the winner among them, optionally weighted by id.
 */
export function selectCandidates(
  pool: readonly Restaurant[],
  weights?: ReadonlyMap<string, number>,
): Selection {
  if (pool.length === 0) return { candidates: [], winnerIndex: -1 }
  const candidates = shuffle(pool).slice(0, MAX_WHEEL_SEGMENTS)
  if (!weights) return { candidates, winnerIndex: cryptoRandomInt(candidates.length) }
  const winnerIndex = weightedRandomIndex(candidates.map((c) => weights.get(c.id) ?? 1))
  return { candidates, winnerIndex }
}

export interface DrawEngineDeps {
  provider: PlacesProvider
  lang: 'en' | 'zh-TW'
  region: Region
  blockedIds?: ReadonlySet<string>
  recentIds?: ReadonlySet<string>
  /** Optional read-through cache (wired in with IndexedDB) */
  cache?: {
    get(key: string): Promise<Restaurant[] | null>
    put(key: string, value: Restaurant[]): Promise<void>
  }
  /** Winner weights by place id (drawStyle favor/explore) */
  weights?: ReadonlyMap<string, number>
  signal?: AbortSignal
}

export interface DrawOutcome {
  /** Everything that passed the filters (kept for re-spins — no refetch) */
  pool: Restaurant[]
  candidates: Restaurant[]
  winnerIndex: number
  relaxations: RelaxationSuggestion[]
}

export function searchCacheKey(origin: LatLng, cond: DrawConditions, lang: string): string {
  const cell = `${origin.lat.toFixed(3)},${origin.lng.toFixed(3)}`
  const include = [...cond.cuisines.include].sort().join('+') || 'any'
  const exclude = [...cond.cuisines.exclude].sort().join('+') || 'none'
  return `${cell}|${cond.radiusMeters}|${include}|${exclude}|${lang}`
}

/** One cache entry per fine-grained tag — reusable across tag combinations. */
export function keywordCacheKey(
  origin: LatLng,
  radiusMeters: number,
  tagId: string,
  lang: string,
): string {
  const cell = `${origin.lat.toFixed(3)},${origin.lng.toFixed(3)}`
  return `kw|${cell}|${radiusMeters}|${tagId}|${lang}`
}

async function fetchNearby(
  cond: DrawConditions,
  origin: LatLng,
  deps: DrawEngineDeps,
): Promise<Restaurant[]> {
  const includedTypes = cond.cuisines.include.length
    ? typesForCuisines(cond.cuisines.include)
    : ALL_FOOD_TYPES
  // Server-side exclusion must not overlap inclusion (API rejects conflicts);
  // the client backstop in filterPool still enforces the full exclusion.
  const includedSet = new Set(includedTypes)
  const excludedTypes = typesForCuisines(cond.cuisines.exclude).filter((t) => !includedSet.has(t))

  const key = searchCacheKey(origin, cond, deps.lang)
  const cached = await deps.cache?.get(key)
  if (cached) return cached
  const results = await deps.provider.searchNearby(
    {
      origin,
      radiusMeters: cond.radiusMeters,
      includedTypes,
      excludedTypes: excludedTypes.length ? excludedTypes : undefined,
      languageCode: deps.lang,
      maxResults: 20,
    },
    deps.signal,
  )
  await deps.cache?.put(key, results)
  return results
}

async function fetchKeyword(
  tag: KeywordTag,
  cond: DrawConditions,
  origin: LatLng,
  deps: DrawEngineDeps,
): Promise<Restaurant[]> {
  const key = keywordCacheKey(origin, cond.radiusMeters, tag.id, deps.lang)
  const cached = await deps.cache?.get(key)
  if (cached) return cached
  const results = await deps.provider.searchText(
    {
      query: tag.q[deps.lang],
      origin,
      radiusMeters: cond.radiusMeters,
      languageCode: deps.lang,
      maxResults: 20,
    },
    deps.signal,
  )
  await deps.cache?.put(key, results)
  return results
}

export async function runDraw(
  cond: DrawConditions,
  origin: LatLng,
  deps: DrawEngineDeps,
): Promise<DrawOutcome> {
  const tags = (cond.keywords ?? [])
    .map(keywordTagById)
    .filter((t): t is KeywordTag => t !== undefined)
    .slice(0, MAX_KEYWORD_TAGS)

  // Fine tags act as extra "include" selections: results union with the
  // type-based search. Tags alone ⇒ tag results only — a generic nearby
  // sweep would drown 茶餐廳 hits in everything else.
  const searches: Promise<Restaurant[]>[] = []
  if (cond.cuisines.include.length > 0 || tags.length === 0) {
    searches.push(fetchNearby(cond, origin, deps))
  }
  for (const tag of tags) searches.push(fetchKeyword(tag, cond, origin, deps))

  const seen = new Set<string>()
  const raw = (await Promise.all(searches)).flat().filter((r) => {
    if (seen.has(r.id)) return false
    seen.add(r.id)
    return true
  })

  const ctx: FilterContext = {
    origin,
    region: deps.region,
    blockedIds: deps.blockedIds ?? new Set(),
    recentIds: deps.recentIds ?? new Set(),
  }

  const pool = filterPool(raw, cond, ctx)
  if (pool.length === 0) {
    return {
      pool,
      candidates: [],
      winnerIndex: -1,
      relaxations: suggestRelaxations(raw, cond, ctx),
    }
  }
  const { candidates, winnerIndex } = selectCandidates(pool, deps.weights)
  return { pool, candidates, winnerIndex, relaxations: [] }
}
