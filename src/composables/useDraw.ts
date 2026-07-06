import { computed } from 'vue'

import type { LatLng, RelaxationSuggestion } from '@/types/models'
import { runDraw, styleWeight } from '@/lib/draw/engine'
import { GooglePlacesError } from '@/lib/places/googlePlaces'
import { getProvider } from '@/lib/places'
import { DEMO_ORIGIN } from '@/lib/places/mockProvider'
import { detectRegion } from '@/lib/geo/region'
import { conciergePick } from '@/lib/ai/client'
import { createCacheRepo } from '@/lib/db/cacheRepo'
import { createBlocklistRepo, createHistoryRepo } from '@/lib/db/historyRepo'
import { getDb } from '@/lib/db/schema'
import { getCurrentLocation } from './useOrigin'
import { useDrawStore } from '@/stores/draw'
import { useSettingsStore } from '@/stores/settings'

export function useDraw() {
  const drawStore = useDrawStore()
  const settings = useSettingsStore()
  const history = createHistoryRepo(getDb())
  const blocklist = createBlocklistRepo(getDb())

  const busy = computed(() => drawStore.phase === 'loading' || drawStore.phase === 'spinning')
  const isDemo = computed(() => !settings.googleApiKey)

  async function resolveOrigin(): Promise<LatLng | null> {
    const origin = drawStore.conditions.origin
    if (origin.mode === 'picked' && origin.picked) return origin.picked.location
    if (isDemo.value) return DEMO_ORIGIN
    const fix = await getCurrentLocation()
    if (fix.ok) return fix.location
    drawStore.errorKey = fix.reason === 'denied' ? 'draw.locationDenied' : 'draw.locationFailed'
    return null
  }

  /**
   * Fetch + filter + pick. `spin: false` fills the wheel without spinning —
   * used by group draw, where the final pick happens in the room.
   * Returns whether at least one candidate landed on the wheel.
   */
  async function startDraw(opts: { spin?: boolean } = {}): Promise<boolean> {
    const spin = opts.spin !== false
    if (busy.value) return false
    drawStore.errorKey = null
    drawStore.showResult = false
    drawStore.relaxations = []
    drawStore.phase = 'loading'
    try {
      const origin = await resolveOrigin()
      if (!origin) {
        drawStore.phase = 'idle'
        return false
      }
      const region = detectRegion(origin, 'HK')
      const provider = getProvider(settings.googleApiKey)
      const cond = drawStore.conditions

      // drawStyle: bias the winner pick by how often each place was accepted.
      // Places absent from the map default to weight 1 in selectCandidates,
      // so store each weight RELATIVE to the never-tried weight — that keeps
      // explore's boost for unknown places without enumerating them.
      let weights: Map<string, number> | undefined
      if (cond.drawStyle !== 'uniform') {
        const counts = await history.acceptedCountsByPlaceId()
        const base = styleWeight(cond.drawStyle, 0)
        weights = new Map()
        for (const [id, count] of counts) {
          weights.set(id, styleWeight(cond.drawStyle, count) / base)
        }
      }

      const outcome = await runDraw(cond, origin, {
        provider,
        lang: settings.locale,
        region,
        cache: provider.kind === 'google' ? createCacheRepo(getDb()) : undefined,
        blockedIds: await blocklist.ids(),
        recentIds:
          cond.excludeRecentDays !== null
            ? await history.recentAcceptedPlaceIds(cond.excludeRecentDays)
            : new Set(),
        weights,
      })
      drawStore.setOutcome(outcome, origin, region)
      drawStore.aiReason = null
      if (outcome.candidates.length === 0) {
        drawStore.phase = 'idle'
        if (outcome.relaxations.length === 0) drawStore.errorKey = 'draw.noMatches'
        return false
      }
      if (!spin) {
        drawStore.phase = 'idle'
        return true
      }
      // Concierge: with a mood set and AI configured, the "random" winner is
      // AI-picked instead — the wheel still spins to it like any other draw.
      const mood = drawStore.mood.trim()
      if (mood) {
        const pick = await conciergePick(
          { baseUrl: settings.aiBaseUrl, apiKey: settings.aiApiKey, model: settings.aiModel },
          outcome.candidates,
          mood,
          settings.locale,
          cond.partySize,
        )
        if (pick) {
          const idx = outcome.candidates.findIndex((c) => c.id === pick.placeId)
          if (idx >= 0) {
            drawStore.winnerIndex = idx
            drawStore.aiReason = pick.reason
          }
        }
      }
      drawStore.phase = 'spinning'
      return true
    } catch (e) {
      drawStore.phase = 'idle'
      if (e instanceof GooglePlacesError) {
        drawStore.errorKey =
          e.kind === 'keyInvalid'
            ? 'draw.keyInvalid'
            : e.kind === 'quota'
              ? 'draw.quotaReached'
              : 'draw.error'
      } else {
        drawStore.errorKey = 'draw.error'
      }
      return false
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

  /** Accept the winner: close the card and persist the draw to local history. */
  async function accept() {
    const winner = drawStore.winner
    drawStore.acceptWinner()
    if (winner) {
      try {
        await history.addAccepted(winner, drawStore.conditions)
      } catch {
        // history is best-effort; never block the happy path
      }
    }
  }

  /** "Never suggest this again": blocklist the winner and spin a replacement. */
  async function blockCurrent() {
    const winner = drawStore.winner
    if (!winner) return
    try {
      await blocklist.add(winner.id, winner.name)
    } catch {
      // best-effort
    }
    drawStore.respin()
  }

  return { busy, isDemo, startDraw, applyRelaxation, accept, blockCurrent }
}
