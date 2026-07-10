import type { DrawConditions, Restaurant, RelaxationSuggestion } from '@/types/models'
import { filterPool, type FilterContext } from './engine'
import { nextRadiusStep } from './defaults'

/**
 * Called when a draw produced zero results: try dropping one active
 * constraint at a time (no network) and report which single relaxation
 * would produce matches. Widening the radius is offered last since it
 * needs a fresh provider query.
 */
export function suggestRelaxations(
  raw: readonly Restaurant[],
  cond: DrawConditions,
  ctx: FilterContext,
): RelaxationSuggestion[] {
  const out: RelaxationSuggestion[] = []

  const tryDrop = (kind: RelaxationSuggestion['kind'], active: boolean, skip: object) => {
    if (!active) return
    const count = filterPool(raw, cond, ctx, skip).length
    if (count > 0) out.push({ kind, resultCount: count })
  }

  tryDrop('dropOpenNow', cond.openNowOnly, { skipOpenNow: true })
  tryDrop('dropArriveAt', !cond.openNowOnly && cond.arriveAt !== null, { skipArriveAt: true })
  tryDrop('dropMinRating', cond.minRating !== null, { skipMinRating: true })
  tryDrop('dropBudget', cond.budgetRange !== null, { skipBudget: true })
  tryDrop('dropRequirePrice', cond.requirePrice, { skipRequirePrice: true })
  tryDrop(
    'dropRecentExclusion',
    cond.excludeRecentDays !== null && ctx.recentIds.size > 0,
    { skipRecent: true },
  )

  out.sort((a, b) => b.resultCount - a.resultCount)

  const nextRadius = nextRadiusStep(cond.radiusMeters)
  if (nextRadius !== null) {
    out.push({ kind: 'widenRadius', resultCount: 0, requiresRefetch: true, nextRadius })
  }
  return out
}
