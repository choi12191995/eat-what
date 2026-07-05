import type { PriceLevel, Restaurant } from '@/types/models'

interface GoogleMoney {
  currencyCode?: string
  units?: string | number
  nanos?: number
}

export interface GooglePlace {
  id: string
  displayName?: { text?: string }
  location?: { latitude?: number; longitude?: number }
  shortFormattedAddress?: string
  formattedAddress?: string
  types?: string[]
  primaryType?: string
  rating?: number
  userRatingCount?: number
  priceLevel?: string
  priceRange?: { startPrice?: GoogleMoney; endPrice?: GoogleMoney }
  currentOpeningHours?: { openNow?: boolean; weekdayDescriptions?: string[] }
  photos?: { name?: string }[]
  googleMapsUri?: string
  businessStatus?: string
}

const PRICE_LEVEL_MAP: Record<string, PriceLevel> = {
  PRICE_LEVEL_FREE: 1,
  PRICE_LEVEL_INEXPENSIVE: 1,
  PRICE_LEVEL_MODERATE: 2,
  PRICE_LEVEL_EXPENSIVE: 3,
  PRICE_LEVEL_VERY_EXPENSIVE: 4,
}

function toMoney(m: GoogleMoney | undefined) {
  if (!m?.currencyCode) return undefined
  const units = typeof m.units === 'string' ? Number(m.units) : (m.units ?? 0)
  if (!Number.isFinite(units)) return undefined
  return { currencyCode: m.currencyCode, units }
}

/**
 * weekdayDescriptions starts on Monday, e.g. "Monday: 11:00 AM – 10:00 PM"
 * (or "星期一: …"). Returns today's entry with the day prefix stripped.
 */
export function todayHoursFrom(
  weekdayDescriptions: string[] | undefined,
  now: Date = new Date(),
): string | undefined {
  if (!weekdayDescriptions?.length) return undefined
  const mondayFirst = (now.getDay() + 6) % 7
  const entry = weekdayDescriptions[mondayFirst]
  if (!entry) return undefined
  const idx = entry.indexOf(': ')
  return idx >= 0 ? entry.slice(idx + 2) : entry
}

export function normalizePlace(p: GooglePlace, now: () => number = Date.now): Restaurant | null {
  if (!p.id || p.location?.latitude === undefined || p.location?.longitude === undefined) {
    return null
  }
  const priceRange = p.priceRange
    ? { start: toMoney(p.priceRange.startPrice), end: toMoney(p.priceRange.endPrice) }
    : undefined
  return {
    id: p.id,
    name: p.displayName?.text ?? p.id,
    location: { lat: p.location.latitude, lng: p.location.longitude },
    address: p.shortFormattedAddress ?? p.formattedAddress,
    types: p.types ?? [],
    primaryType: p.primaryType,
    rating: p.rating,
    userRatingCount: p.userRatingCount,
    priceLevel: p.priceLevel ? PRICE_LEVEL_MAP[p.priceLevel] : undefined,
    priceRange: priceRange && (priceRange.start || priceRange.end) ? priceRange : undefined,
    openNow: p.currentOpeningHours?.openNow,
    todayHours: todayHoursFrom(p.currentOpeningHours?.weekdayDescriptions),
    photoNames: (p.photos ?? [])
      .map((ph) => ph.name)
      .filter((n): n is string => !!n)
      .slice(0, 3),
    googleMapsUri: p.googleMapsUri,
    businessStatus:
      p.businessStatus === 'OPERATIONAL' ||
      p.businessStatus === 'CLOSED_TEMPORARILY' ||
      p.businessStatus === 'CLOSED_PERMANENTLY'
        ? p.businessStatus
        : undefined,
    fetchedAt: now(),
  }
}
