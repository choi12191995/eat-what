import type { DrawConditions } from '@/types/models'
import { minutesFromHHmm } from '@/lib/places/openingHours'

/**
 * Epoch ms of the planned arrival for a future draw, or null when the draw
 * is for right now. A plan exists when openNow is off and an arrival time is
 * set; the date defaults to today ("dinner at 19:30 tonight" counts). Times
 * already in the past are not plans.
 */
export function plannedEpoch(
  cond: Pick<DrawConditions, 'openNowOnly' | 'arriveAt' | 'arriveDate'>,
  now: number = Date.now(),
): number | null {
  if (cond.openNowOnly || !cond.arriveAt) return null
  const minutes = minutesFromHHmm(cond.arriveAt)
  if (minutes === null) return null
  // Noon anchor dodges UTC-midnight day drift when parsing the date string
  const base = cond.arriveDate ? new Date(`${cond.arriveDate}T12:00:00`) : new Date(now)
  if (Number.isNaN(base.getTime())) return null
  const at = new Date(base.getFullYear(), base.getMonth(), base.getDate(), 0, minutes)
  return at.getTime() > now ? at.getTime() : null
}
