/**
 * Pure scheduling logic: which meals are due for a subscription at a given
 * instant, evaluated in the SUBSCRIBER'S timezone. No I/O — unit-testable.
 */

export type Meal = 'lunch' | 'dinner'

export interface MealPref {
  enabled: boolean
  /** "HH:mm" in the subscriber's local time */
  time: string
  /** JS weekday numbers, 0 = Sunday … 6 = Saturday */
  days: number[]
}

export interface MealPrefs {
  lunch: MealPref
  dinner: MealPref
}

export interface LocalParts {
  /** YYYY-MM-DD in the target timezone */
  date: string
  /** 0 = Sunday … 6 = Saturday */
  weekday: number
  /** Minutes since local midnight */
  minutes: number
}

/**
 * The cron fires every 15 minutes; the send window is wider so a single
 * failed run still gets a second chance, deduplicated via lastSent.
 */
export const SEND_WINDOW_MINUTES = 20

const WEEKDAYS: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
}

/** Resolve an instant into date/weekday/minutes in a timezone. Null if the tz is invalid. */
export function localParts(now: Date, timeZone: string): LocalParts | null {
  try {
    const fmt = new Intl.DateTimeFormat('en-US', {
      timeZone,
      weekday: 'short',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    })
    const parts: Record<string, string> = {}
    for (const p of fmt.formatToParts(now)) parts[p.type] = p.value
    const weekday = WEEKDAYS[parts.weekday ?? '']
    if (weekday === undefined || !parts.year || !parts.hour) return null
    return {
      date: `${parts.year}-${parts.month}-${parts.day}`,
      weekday,
      minutes: Number(parts.hour) * 60 + Number(parts.minute),
    }
  } catch {
    return null
  }
}

/** "HH:mm" → minutes since midnight, or null if malformed. */
export function parseTime(time: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(time)
  if (!m) return null
  const h = Number(m[1])
  const min = Number(m[2])
  if (h > 23 || min > 59) return null
  return h * 60 + min
}

/**
 * Meals due right now for this subscription: enabled, today is a chosen
 * weekday, local time is inside [meal time, meal time + window), and we
 * haven't already sent for this meal today (lastSent holds local dates).
 */
export function dueMeals(
  prefs: MealPrefs,
  lastSent: Partial<Record<Meal, string>>,
  now: Date,
  timeZone: string,
): { meal: Meal; date: string }[] {
  const local = localParts(now, timeZone)
  if (!local) return []
  const due: { meal: Meal; date: string }[] = []
  for (const meal of ['lunch', 'dinner'] as const) {
    const pref = prefs[meal]
    if (!pref?.enabled) continue
    const start = parseTime(pref.time)
    if (start === null) continue
    if (!pref.days.includes(local.weekday)) continue
    if (local.minutes < start || local.minutes >= start + SEND_WINDOW_MINUTES) continue
    if (lastSent[meal] === local.date) continue
    due.push({ meal, date: local.date })
  }
  return due
}
