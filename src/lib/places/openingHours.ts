import type { OpenPeriod } from '@/types/models'

/**
 * Is a place open at a given local weekday + minutes-since-midnight?
 * Handles past-midnight spans (open Fri 18:00 → close Sat 02:00) and the
 * 24h convention (a period with no close = always open).
 */
export function isOpenAt(periods: readonly OpenPeriod[], day: number, minutes: number): boolean {
  const t = day * 1440 + minutes
  const WEEK = 7 * 1440
  for (const p of periods) {
    if (!p.close) return true // 24h
    const start = p.open.day * 1440 + p.open.hour * 60 + p.open.minute
    let end = p.close.day * 1440 + p.close.hour * 60 + p.close.minute
    if (end <= start) end += WEEK // wraps past the week boundary
    // check t and t shifted a week forward (for spans crossing Sat→Sun)
    if ((t >= start && t < end) || (t + WEEK >= start && t + WEEK < end)) return true
  }
  return false
}

/** "HH:mm" → minutes since midnight, null when malformed. */
export function minutesFromHHmm(time: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(time)
  if (!m) return null
  const h = Number(m[1])
  const min = Number(m[2])
  if (h > 23 || min > 59) return null
  return h * 60 + min
}
