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
  JP: { currency: 'JPY', edges: [1000, 3000, 8000] },
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

/**
 * A per-person spend window in the region's local currency.
 * max null = unbounded ("HK$400+"). Used by the budget filter (conditions),
 * diary spend corrections, and Google data mapped into the same space.
 */
export interface BudgetWindow {
  min: number
  max: number | null
}

/** The money window one of Google's four price levels stands for. */
export function bandWindow(level: PriceLevel, region: Region): BudgetWindow {
  const edges = region === 'OTHER' ? BANDS.HK.edges : BANDS[region].edges
  if (level === 1) return { min: 0, max: edges[0] }
  if (level === 2) return { min: edges[0], max: edges[1] }
  if (level === 3) return { min: edges[1], max: edges[2] }
  return { min: edges[2], max: null }
}

/** Two windows overlap when neither sits entirely above the other. */
export function windowsOverlap(a: BudgetWindow, b: BudgetWindow): boolean {
  return a.min <= (b.max ?? Infinity) && (a.max ?? Infinity) >= b.min
}

/**
 * Slider detents for the budget range — dense at the cheap end where a
 * HK$25 difference matters, sparse up top. The UI appends an ∞ stop.
 */
const BUDGET_TICKS: Record<Exclude<Region, 'OTHER'>, number[]> = {
  HK: [0, 25, 50, 75, 100, 125, 150, 200, 250, 300, 400, 500, 750, 1000],
  MO: [0, 25, 50, 75, 100, 125, 150, 200, 250, 300, 400, 500, 750, 1000],
  TW: [0, 50, 100, 150, 200, 300, 400, 500, 750, 1000, 1500, 2000, 2500, 3000],
  JP: [0, 300, 500, 800, 1000, 1500, 2000, 3000, 4000, 5000, 6000, 8000, 10000, 15000],
}

export function budgetTicks(region: Region): number[] {
  return BUDGET_TICKS[region === 'OTHER' ? 'HK' : region]
}

export function formatBudgetAmount(v: number, region: Region, locale: string): string {
  if (region === 'OTHER') return `$${v}`
  return currencyFormatter(locale, BANDS[region].currency).format(v)
}

/** "< HK$50" · "HK$50–150" · "HK$400+" · exact "≈HK$120". */
export function formatBudgetWindow(w: BudgetWindow, region: Region, locale: string): string {
  if (w.max === null) return `${formatBudgetAmount(w.min, region, locale)}+`
  if (w.min === w.max) return `≈${formatBudgetAmount(w.min, region, locale)}`
  if (w.min <= 0) return `< ${formatBudgetAmount(w.max, region, locale)}`
  if (region === 'OTHER') return `$${w.min}–${w.max}`
  return currencyFormatter(locale, BANDS[region].currency).formatRange(w.min, w.max)
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
