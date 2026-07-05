import type { PriceLevel, Restaurant } from '@/types/models'
import type { Region } from '@/lib/geo/region'

/**
 * Approximate per-person bands for Google's four price levels, per region.
 * Used when a place has no explicit priceRange, and to derive a level from
 * a priceRange when filtering by budget.
 */
const BANDS: Record<Exclude<Region, 'OTHER'>, { currency: string; edges: [number, number, number] }> = {
  HK: { currency: 'HKD', edges: [50, 150, 400] },
  MO: { currency: 'MOP', edges: [50, 150, 400] },
  TW: { currency: 'TWD', edges: [150, 450, 1200] },
}

const LEVEL_SYMBOLS: Record<PriceLevel, string> = { 1: '$', 2: '$$', 3: '$$$', 4: '$$$$' }

function currencyFormatter(locale: string, currency: string): Intl.NumberFormat {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  })
}

/** e.g. "HK$50–150" / "< HK$50" / "HK$400+" — or "$$" outside known regions. */
export function bandLabel(level: PriceLevel, region: Region, locale: string): string {
  if (region === 'OTHER') return LEVEL_SYMBOLS[level]
  const { currency, edges } = BANDS[region]
  const nf = currencyFormatter(locale, currency)
  if (level === 1) return `< ${nf.format(edges[0])}`
  if (level === 4) return `${nf.format(edges[2])}+`
  const [lo, hi] = level === 2 ? [edges[0], edges[1]] : [edges[1], edges[2]]
  return nf.formatRange(lo, hi)
}

/** Derive a price level from an explicit priceRange, using regional bands. */
export function levelFromPriceRange(
  range: NonNullable<Restaurant['priceRange']>,
  region: Region,
): PriceLevel | undefined {
  const start = range.start?.units
  const end = range.end?.units
  const point = start !== undefined && end !== undefined ? (start + end) / 2 : (start ?? end)
  if (point === undefined) return undefined
  const edges = region === 'OTHER' ? BANDS.HK.edges : BANDS[region].edges
  if (point < edges[0]) return 1
  if (point < edges[1]) return 2
  if (point < edges[2]) return 3
  return 4
}

export interface PriceText {
  text: string
  source: 'range' | 'level' | 'none'
}

export function formatPrice(r: Restaurant, locale: string, region: Region): PriceText {
  const range = r.priceRange
  if (range && (range.start || range.end)) {
    const currency = range.start?.currencyCode ?? range.end?.currencyCode
    if (currency) {
      const nf = currencyFormatter(locale, currency)
      const start = range.start?.units
      const end = range.end?.units
      if (start !== undefined && end !== undefined) {
        return { text: nf.formatRange(start, end), source: 'range' }
      }
      if (start !== undefined) return { text: `${nf.format(start)}+`, source: 'range' }
      if (end !== undefined) return { text: `< ${nf.format(end)}`, source: 'range' }
    }
  }
  if (r.priceLevel) {
    const symbols = LEVEL_SYMBOLS[r.priceLevel]
    const band = bandLabel(r.priceLevel, region, locale)
    return { text: region === 'OTHER' ? symbols : `${symbols} · ${band}`, source: 'level' }
  }
  return { text: '', source: 'none' }
}
