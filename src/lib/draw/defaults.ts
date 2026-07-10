import type { DrawConditions, PriceLevel } from '@/types/models'
import { bandWindow } from '@/lib/format/price'

/** Fetch radii — cache/API queries snap UP to one of these so the free-form
 *  slider can't fragment the 24 h search cache into per-metre entries. */
export const RADIUS_STEPS = [300, 500, 1000, 2000, 5000] as const

/** Free-form slider bounds (client-side haversine filters to the exact value) */
export const RADIUS_MIN = 100
export const RADIUS_MAX = 5000
export const RADIUS_SLIDER_STEP = 100

export const MAX_WHEEL_SEGMENTS = 10

export const MIN_RATING_CHOICES = [3.5, 4.0, 4.5] as const

export function makeDefaultConditions(): DrawConditions {
  return {
    cuisines: { include: [], exclude: [] },
    keywords: [],
    budgetRange: null,
    requirePrice: false,
    radiusMeters: 1000,
    origin: { mode: 'gps' },
    partySize: 2,
    openNowOnly: true,
    arriveAt: null,
    arriveDate: null,
    minRating: null,
    excludeRecentDays: null,
    drawStyle: 'uniform',
  }
}

export function nextRadiusStep(current: number): number | null {
  const bigger = RADIUS_STEPS.find((r) => r > current)
  return bigger ?? null
}

/**
 * Hydrate persisted/preset conditions from any past build: merge over fresh
 * defaults (fills fields added since) and convert the v1 `budgetLevels`
 * $-level array into today's money window. Legacy levels were saved by HK
 * users pre-regionalization, so HK bands are the conversion basis.
 */
export function hydrateConditions(raw: DrawConditions): DrawConditions {
  const legacy = raw as DrawConditions & { budgetLevels?: PriceLevel[] }
  const merged: DrawConditions & { budgetLevels?: PriceLevel[] } = {
    ...makeDefaultConditions(),
    ...legacy,
  }
  if (!merged.budgetRange && legacy.budgetLevels?.length) {
    const lo = Math.min(...legacy.budgetLevels) as PriceLevel
    const hi = Math.max(...legacy.budgetLevels) as PriceLevel
    merged.budgetRange = { min: bandWindow(lo, 'HK').min, max: bandWindow(hi, 'HK').max }
  }
  merged.budgetRange ??= null
  delete merged.budgetLevels
  return merged
}
