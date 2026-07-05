import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

import type {
  DrawConditions,
  LatLng,
  Restaurant,
  RelaxationSuggestion,
} from '@/types/models'
import type { Region } from '@/lib/geo/region'
import { selectCandidates, type DrawOutcome } from '@/lib/draw/engine'
import { useSettingsStore } from './settings'

export type DrawPhase = 'idle' | 'loading' | 'spinning' | 'landed'

function cloneConditions(c: DrawConditions): DrawConditions {
  return JSON.parse(JSON.stringify(c)) as DrawConditions
}

export const useDrawStore = defineStore('draw', () => {
  const settings = useSettingsStore()

  const phase = ref<DrawPhase>('idle')
  const conditions = ref<DrawConditions>(cloneConditions(settings.defaultConditions))
  const pool = ref<Restaurant[]>([])
  const candidates = ref<Restaurant[]>([])
  const winnerIndex = ref(-1)
  const relaxations = ref<RelaxationSuggestion[]>([])
  const lastOrigin = ref<LatLng | null>(null)
  const region = ref<Region>('HK')
  const errorKey = ref<string | null>(null)
  const drawerOpen = ref(false)
  const showResult = ref(false)
  /** Free-text mood for the AI concierge (only used when AI is configured) */
  const mood = ref('')
  /** AI's one-line justification when the winner was concierge-picked */
  const aiReason = ref<string | null>(null)

  const winner = computed<Restaurant | null>(() =>
    winnerIndex.value >= 0 ? (candidates.value[winnerIndex.value] ?? null) : null,
  )

  function setOutcome(outcome: DrawOutcome, origin: LatLng, detectedRegion: Region) {
    pool.value = outcome.pool
    candidates.value = outcome.candidates
    winnerIndex.value = outcome.winnerIndex
    relaxations.value = outcome.relaxations
    lastOrigin.value = origin
    region.value = detectedRegion
  }

  /** Exclude the current winner and spin again from the remaining pool — no refetch. */
  function respin() {
    const current = winner.value
    showResult.value = false
    if (current) pool.value = pool.value.filter((r) => r.id !== current.id)
    if (pool.value.length === 0) {
      candidates.value = []
      winnerIndex.value = -1
      phase.value = 'idle'
      errorKey.value = 'draw.exhausted'
      return
    }
    const sel = selectCandidates(pool.value)
    candidates.value = sel.candidates
    winnerIndex.value = sel.winnerIndex
    phase.value = 'spinning'
  }

  function acceptWinner() {
    showResult.value = false
    phase.value = 'idle'
  }

  function saveConditionsAsDefault() {
    settings.defaultConditions = cloneConditions(conditions.value)
  }

  function resetConditions() {
    conditions.value = cloneConditions(settings.defaultConditions)
  }

  return {
    phase,
    conditions,
    pool,
    candidates,
    winnerIndex,
    relaxations,
    lastOrigin,
    region,
    errorKey,
    drawerOpen,
    showResult,
    mood,
    aiReason,
    winner,
    setOutcome,
    respin,
    acceptWinner,
    saveConditionsAsDefault,
    resetConditions,
  }
})
