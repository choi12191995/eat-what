import type { DrawConditions, LatLng, Restaurant, RelaxationSuggestion } from '@/types/models'
import { typesForCuisines, CUISINES } from '@/lib/places/cuisines'
import type { PlacesProvider } from '@/lib/places/provider'
import { haversineMeters } from '@/lib/geo/distance'
import type { Region } from '@/lib/geo/region'
import { levelFromPriceRange } from '@/lib/format/price'
import { cryptoRandomInt, shuffle } from './random'
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
}

export interface FilterOverrides {
  skipOpenNow?: boolean
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

/** Uniformly pick up to MAX_WHEEL_SEGMENTS candidates and the winner among them. */
export function selectCandidates(pool: readonly Restaurant[]): Selection {
  if (pool.length === 0) return { candidates: [], winnerIndex: -1 }
  const candidates = shuffle(pool).slice(0, MAX_WHEEL_SEGMENTS)
  return { candidates, winnerIndex: cryptoRandomInt(candidates.length) }
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

export async function runDraw(
  cond: DrawConditions,
  origin: LatLng,
  deps: DrawEngineDeps,
): Promise<DrawOutcome> {
  const includedTypes = cond.cuisines.include.length
    ? typesForCuisines(cond.cuisines.include)
    : ALL_FOOD_TYPES
  // Server-side exclusion must not overlap inclusion (API rejects conflicts);
  // the client backstop in filterPool still enforces the full exclusion.
  const includedSet = new Set(includedTypes)
  const excludedTypes = typesForCuisines(cond.cuisines.exclude).filter((t) => !includedSet.has(t))

  const key = searchCacheKey(origin, cond, deps.lang)
  let raw = (await deps.cache?.get(key)) ?? null
  if (!raw) {
    raw = await deps.provider.searchNearby(
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
    await deps.cache?.put(key, raw)
  }

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
  const { candidates, winnerIndex } = selectCandidates(pool)
  return { pool, candidates, winnerIndex, relaxations: [] }
}
