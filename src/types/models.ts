import type { CuisineId } from '@/lib/places/cuisines'

export interface LatLng {
  lat: number
  lng: number
}

export interface MoneyLite {
  currencyCode: string
  units: number
}

export type PriceLevel = 1 | 2 | 3 | 4

export type BusinessStatus = 'OPERATIONAL' | 'CLOSED_TEMPORARILY' | 'CLOSED_PERMANENTLY'

/**
 * Provider-agnostic restaurant shape. This exact object is snapshotted into
 * draw history, so keep it JSON-serializable and additive-only.
 */
export interface Restaurant {
  id: string
  name: string
  location: LatLng
  address?: string
  types: string[]
  primaryType?: string
  rating?: number
  userRatingCount?: number
  priceLevel?: PriceLevel
  priceRange?: { start?: MoneyLite; end?: MoneyLite }
  openNow?: boolean
  todayHours?: string
  photoNames: string[]
  googleMapsUri?: string
  businessStatus?: BusinessStatus
  fetchedAt: number
}

export interface OriginSetting {
  mode: 'gps' | 'picked'
  picked?: { label: string; location: LatLng }
}

/** Every condition supports "Any": empty arrays / null mean unconstrained. */
export interface DrawConditions {
  cuisines: { include: CuisineId[]; exclude: CuisineId[] }
  /** Fine-grained tag ids (keywords.ts) — each adds one Text Search per draw */
  keywords: string[]
  /** OR-set of acceptable price levels; empty = any */
  budgetLevels: PriceLevel[]
  radiusMeters: number
  origin: OriginSetting
  /** Metadata + AI hint only — Places cannot filter on it */
  partySize: number
  openNowOnly: boolean
  minRating: number | null
  /** Don't suggest places accepted within the last N days; null = off */
  excludeRecentDays: number | null
}

export type DrawAction = 'accepted' | 'respun'

export interface DrawRecord {
  id?: number
  timestamp: number
  meal: 'lunch' | 'dinner'
  conditions: DrawConditions
  restaurant: Restaurant
  action: DrawAction
}

export type RelaxationKind =
  | 'dropOpenNow'
  | 'dropMinRating'
  | 'dropBudget'
  | 'dropRecentExclusion'
  | 'widenRadius'

export interface RelaxationSuggestion {
  kind: RelaxationKind
  /** How many places become available after this relaxation (0 for refetch kinds) */
  resultCount: number
  /** True when applying it needs a new provider query (e.g. wider radius) */
  requiresRefetch?: boolean
  nextRadius?: number
}

export interface PlaceSuggestion {
  placeId: string
  label: string
  distanceMeters?: number
}

/** One meal's notification schedule (Phase 2). Times are device-local. */
export interface MealNotifPref {
  enabled: boolean
  /** "HH:mm" */
  time: string
  /** JS weekday numbers, 0 = Sunday … 6 = Saturday */
  days: number[]
}

export interface NotificationPrefs {
  lunch: MealNotifPref
  dinner: MealNotifPref
}
