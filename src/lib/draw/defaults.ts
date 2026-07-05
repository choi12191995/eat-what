import type { DrawConditions } from '@/types/models'

export const RADIUS_STEPS = [300, 500, 1000, 2000, 5000] as const

export const MAX_WHEEL_SEGMENTS = 10

export const MIN_RATING_CHOICES = [3.5, 4.0, 4.5] as const

export function makeDefaultConditions(): DrawConditions {
  return {
    cuisines: { include: [], exclude: [] },
    budgetLevels: [],
    radiusMeters: 1000,
    origin: { mode: 'gps' },
    partySize: 2,
    openNowOnly: true,
    minRating: null,
    excludeRecentDays: null,
  }
}

export function nextRadiusStep(current: number): number | null {
  const bigger = RADIUS_STEPS.find((r) => r > current)
  return bigger ?? null
}
