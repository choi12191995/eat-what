/**
 * "Speak your craving" → draw conditions. The AI gets a strict JSON contract
 * over our closed vocabularies; everything it returns is re-validated here —
 * unknown ids dropped, numbers snapped/clamped — so a hallucinated field can
 * never corrupt the store.
 */
import type { DrawConditions, DrawStyle, PriceLevel } from '@/types/models'
import { CUISINES, type CuisineId } from '@/lib/places/cuisines'
import { KEYWORD_GROUPS, keywordTagById, MAX_KEYWORD_TAGS } from '@/lib/places/keywords'
import { MIN_RATING_CHOICES, RADIUS_MAX, RADIUS_MIN, RADIUS_SLIDER_STEP } from '@/lib/draw/defaults'
import { minutesFromHHmm } from '@/lib/places/openingHours'

export interface AiConditionPatch {
  cuisinesInclude?: CuisineId[]
  cuisinesExclude?: CuisineId[]
  keywords?: string[]
  budgetLevels?: PriceLevel[]
  radiusMeters?: number
  openNowOnly?: boolean
  arriveAt?: string | null
  arriveDate?: string | null
  minRating?: number | null
  partySize?: number
  drawStyle?: DrawStyle
}

const CUISINE_IDS = new Set<string>(CUISINES.map((c) => c.id))
const STYLE_VALUES = new Set(['uniform', 'favor', 'explore'])

interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export function conditionsMessages(
  utterance: string,
  locale: string,
  now: Date = new Date(),
): ChatMessage[] {
  const cuisineList = CUISINES.map((c) => c.id).join(', ')
  const keywordList = KEYWORD_GROUPS.flatMap((g) =>
    g.tags.map((t) => `${t.id}(${t.q['zh-TW']})`),
  ).join(', ')
  const todayIso = `${now.getFullYear()}-${`${now.getMonth() + 1}`.padStart(2, '0')}-${`${now.getDate()}`.padStart(2, '0')}`
  const weekday = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][now.getDay()]
  const system = `You convert a diner's natural-language request into restaurant draw filters.
Reply with ONLY a strict JSON object — no prose, no code fences.
Include ONLY the fields the user actually expressed; omit everything else.

Fields:
- "cuisinesInclude": array from [${cuisineList}]
- "cuisinesExclude": same vocabulary, for things the user refuses
- "keywords": array (max ${MAX_KEYWORD_TAGS}) from [${keywordList}]
- "budgetLevels": array of 1-4 (1=cheapest). "平/cheap"→[1,2], "貴/fancy"→[3,4]
- "radiusMeters": integer ${RADIUS_MIN}-${RADIUS_MAX} (meters). "近/close"→500, "行遠啲/anywhere"→2000
- "openNowOnly": boolean
- "arriveAt": "HH:mm" 24h, when they mention eating at a specific later time (also set openNowOnly false)
- "arriveDate": "YYYY-MM-DD" when they name a future day ("下星期一"/"next Friday"); ALWAYS give arriveAt with it (dinner→"19:00", lunch→"12:30" if unsaid). Today is ${todayIso} (${weekday}).
- "minRating": one of [${MIN_RATING_CHOICES.join(', ')}] or null to clear
- "partySize": integer 1-12
- "drawStyle": "uniform" | "favor" (their usual places) | "explore" (somewhere new)

The user speaks ${locale === 'zh-TW' ? 'Cantonese/Chinese' : 'English'}. Map dishes to the closest cuisine or keyword (e.g. 想食辣 → cuisinesInclude sichuan + thai; 打邊爐 → keywords hotpot).`
  return [
    { role: 'system', content: system },
    { role: 'user', content: utterance.slice(0, 300) },
  ]
}

function snapTo(values: readonly number[], v: number): number {
  let best = values[0]!
  for (const candidate of values) {
    if (Math.abs(candidate - v) < Math.abs(best - v)) best = candidate
  }
  return best
}

/** Whitelist/clamp everything the model returned. Null when nothing usable. */
export function sanitizeAiConditions(raw: unknown): AiConditionPatch | null {
  if (typeof raw !== 'object' || raw === null) return null
  const r = raw as Record<string, unknown>
  const patch: AiConditionPatch = {}

  const cuisineArray = (v: unknown): CuisineId[] | undefined => {
    if (!Array.isArray(v)) return undefined
    const ids = v.filter((x): x is CuisineId => typeof x === 'string' && CUISINE_IDS.has(x))
    return ids.length || v.length === 0 ? [...new Set(ids)] : undefined
  }
  const include = cuisineArray(r.cuisinesInclude)
  if (include) patch.cuisinesInclude = include
  const exclude = cuisineArray(r.cuisinesExclude)
  if (exclude) patch.cuisinesExclude = exclude

  if (Array.isArray(r.keywords)) {
    const tags = [
      ...new Set(
        r.keywords.filter((x): x is string => typeof x === 'string' && !!keywordTagById(x)),
      ),
    ].slice(0, MAX_KEYWORD_TAGS)
    if (tags.length || r.keywords.length === 0) patch.keywords = tags
  }

  if (Array.isArray(r.budgetLevels)) {
    const levels = [
      ...new Set(
        r.budgetLevels.filter(
          (x): x is PriceLevel => typeof x === 'number' && Number.isInteger(x) && x >= 1 && x <= 4,
        ),
      ),
    ].sort()
    if (levels.length || r.budgetLevels.length === 0) patch.budgetLevels = levels
  }

  if (typeof r.radiusMeters === 'number' && Number.isFinite(r.radiusMeters)) {
    const snapped = Math.round(r.radiusMeters / RADIUS_SLIDER_STEP) * RADIUS_SLIDER_STEP
    patch.radiusMeters = Math.min(RADIUS_MAX, Math.max(RADIUS_MIN, snapped))
  }
  if (typeof r.openNowOnly === 'boolean') patch.openNowOnly = r.openNowOnly
  if (r.arriveAt === null) {
    patch.arriveAt = null
    patch.arriveDate = null
  } else if (typeof r.arriveAt === 'string' && minutesFromHHmm(r.arriveAt) !== null) {
    patch.arriveAt = r.arriveAt
    patch.openNowOnly = false // arrival time only applies with openNow off
    // A planned DAY only makes sense alongside a time
    if (typeof r.arriveDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(r.arriveDate)) {
      const parsed = new Date(`${r.arriveDate}T12:00:00`)
      if (!Number.isNaN(parsed.getTime())) patch.arriveDate = r.arriveDate
    }
  }
  if (r.minRating === null) patch.minRating = null
  else if (typeof r.minRating === 'number' && Number.isFinite(r.minRating)) {
    patch.minRating = snapTo(MIN_RATING_CHOICES, r.minRating)
  }
  if (typeof r.partySize === 'number' && Number.isFinite(r.partySize)) {
    patch.partySize = Math.min(12, Math.max(1, Math.round(r.partySize)))
  }
  if (typeof r.drawStyle === 'string' && STYLE_VALUES.has(r.drawStyle)) {
    patch.drawStyle = r.drawStyle as DrawStyle
  }

  return Object.keys(patch).length ? patch : null
}

/** Merge a sanitized patch onto live conditions (only expressed fields move). */
export function applyConditionPatch(cond: DrawConditions, patch: AiConditionPatch): string[] {
  const applied: string[] = []
  if (patch.cuisinesInclude !== undefined) {
    cond.cuisines.include = patch.cuisinesInclude
    applied.push('cuisines')
  }
  if (patch.cuisinesExclude !== undefined) {
    cond.cuisines.exclude = patch.cuisinesExclude.filter(
      (id) => !cond.cuisines.include.includes(id),
    )
    if (!applied.includes('cuisines')) applied.push('cuisines')
  }
  if (patch.keywords !== undefined) {
    cond.keywords = patch.keywords
    applied.push('keywords')
  }
  if (patch.budgetLevels !== undefined) {
    cond.budgetLevels = patch.budgetLevels
    applied.push('budget')
  }
  if (patch.radiusMeters !== undefined) {
    cond.radiusMeters = patch.radiusMeters
    applied.push('radius')
  }
  if (patch.openNowOnly !== undefined) {
    cond.openNowOnly = patch.openNowOnly
    applied.push('openNow')
  }
  if (patch.arriveAt !== undefined) {
    cond.arriveAt = patch.arriveAt
    // A cleared or re-set time resets the day unless the patch names one
    cond.arriveDate = patch.arriveDate ?? null
    applied.push('arriveAt')
  }
  if (patch.minRating !== undefined) {
    cond.minRating = patch.minRating
    applied.push('rating')
  }
  if (patch.partySize !== undefined) {
    cond.partySize = patch.partySize
    applied.push('party')
  }
  if (patch.drawStyle !== undefined) {
    cond.drawStyle = patch.drawStyle
    applied.push('style')
  }
  return applied
}
