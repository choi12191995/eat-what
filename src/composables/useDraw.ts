import { computed } from 'vue'

import type { LatLng, RelaxationSuggestion } from '@/types/models'
import { runDraw } from '@/lib/draw/engine'
import { getProvider } from '@/lib/places'
import { DEMO_ORIGIN } from '@/lib/places/mockProvider'
import { detectRegion } from '@/lib/geo/region'
import { useDrawStore } from '@/stores/draw'
import { useSettingsStore } from '@/stores/settings'

export function useDraw() {
  const drawStore = useDrawStore()
  const settings = useSettingsStore()

  const busy = computed(() => drawStore.phase === 'loading' || drawStore.phase === 'spinning')
  const isDemo = computed(() => !settings.googleApiKey)

  async function resolveOrigin(): Promise<LatLng> {
    const origin = drawStore.conditions.origin
    if (origin.mode === 'picked' && origin.picked) return origin.picked.location
    // GPS flow arrives with the live provider (M2); demo mode draws around Central.
    return DEMO_ORIGIN
  }

  async function startDraw() {
    if (busy.value) return
    drawStore.errorKey = null
    drawStore.showResult = false
    drawStore.relaxations = []
    drawStore.phase = 'loading'
    try {
      const origin = await resolveOrigin()
      const region = detectRegion(origin, 'HK')
      const provider = getProvider(settings.googleApiKey)
      const outcome = await runDraw(drawStore.conditions, origin, {
        provider,
        lang: settings.locale,
        region,
      })
      drawStore.setOutcome(outcome, origin, region)
      if (outcome.candidates.length > 0) {
        drawStore.phase = 'spinning'
      } else {
        drawStore.phase = 'idle'
        if (outcome.relaxations.length === 0) drawStore.errorKey = 'draw.noMatches'
      }
    } catch {
      drawStore.phase = 'idle'
      drawStore.errorKey = 'draw.error'
    }
  }

  async function applyRelaxation(s: RelaxationSuggestion) {
    const cond = drawStore.conditions
    switch (s.kind) {
      case 'dropOpenNow':
        cond.openNowOnly = false
        break
      case 'dropMinRating':
        cond.minRating = null
        break
      case 'dropBudget':
        cond.budgetLevels = []
        break
      case 'dropRecentExclusion':
        cond.excludeRecentDays = null
        break
      case 'widenRadius':
        if (s.nextRadius) cond.radiusMeters = s.nextRadius
        break
    }
    await startDraw()
  }

  return { busy, isDemo, startDraw, applyRelaxation }
}
