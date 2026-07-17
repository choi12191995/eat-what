<script setup lang="ts">
import { useI18n } from 'vue-i18n'

import { CUISINES, type CuisineId } from '@/lib/places/cuisines'
import { useDrawStore } from '@/stores/draw'

const { t } = useI18n()
const drawStore = useDrawStore()

type ChipState = 'neutral' | 'include' | 'exclude'

function stateOf(id: CuisineId): ChipState {
  if (drawStore.conditions.cuisines.include.includes(id)) return 'include'
  if (drawStore.conditions.cuisines.exclude.includes(id)) return 'exclude'
  return 'neutral'
}

/** Tap cycles: neutral → include → exclude → neutral */
function cycle(id: CuisineId) {
  const c = drawStore.conditions.cuisines
  switch (stateOf(id)) {
    case 'neutral':
      c.include.push(id)
      break
    case 'include':
      c.include = c.include.filter((x) => x !== id)
      c.exclude.push(id)
      break
    case 'exclude':
      c.exclude = c.exclude.filter((x) => x !== id)
      break
  }
}

const chipClass: Record<ChipState, string> = {
  neutral:
    'border-stone-300 text-stone-600 dark:border-stone-700 dark:text-stone-300',
  include:
    'border-orange-500 bg-orange-500 text-white shadow-sm dark:border-orange-400 dark:bg-orange-500',
  exclude:
    'border-red-300 bg-red-50 text-red-600 line-through decoration-2 dark:border-red-900 dark:bg-red-950 dark:text-red-400',
}
</script>

<template>
  <div>
    <div class="flex flex-wrap gap-2">
      <button
        v-for="c in CUISINES"
        :key="c.id"
        type="button"
        class="rounded-full border px-3 py-1.5 text-sm transition-all active:scale-95"
        :class="chipClass[stateOf(c.id)]"
        @click="cycle(c.id)"
      >
        <span aria-hidden="true">{{ c.emoji }}</span>
        {{ t(`cuisine.${c.id}`) }}
        <span v-if="stateOf(c.id) === 'include'" aria-hidden="true">✓</span>
        <span v-else-if="stateOf(c.id) === 'exclude'" aria-hidden="true">✕</span>
      </button>
    </div>
    <p class="mt-2 text-xs text-stone-400 dark:text-stone-500">{{ t('conditions.cuisineHint') }}</p>

    <!-- what KIND of shop: independent of cuisine -->
    <div class="mt-3 flex flex-wrap gap-2">
      <button
        type="button"
        class="rounded-full border px-3 py-1.5 text-sm transition-all active:scale-95"
        :class="
          drawStore.conditions.noFastFood
            ? 'border-red-300 bg-red-50 font-semibold text-red-600 dark:border-red-900 dark:bg-red-950 dark:text-red-400'
            : 'border-stone-300 text-stone-600 dark:border-stone-700 dark:text-stone-300'
        "
        @click="drawStore.conditions.noFastFood = !drawStore.conditions.noFastFood"
      >
        🍔 {{ t('conditions.noFastFood') }}
        <span v-if="drawStore.conditions.noFastFood" aria-hidden="true">✕</span>
      </button>
      <button
        type="button"
        class="rounded-full border px-3 py-1.5 text-sm transition-all active:scale-95"
        :class="
          drawStore.conditions.noChains
            ? 'border-red-300 bg-red-50 font-semibold text-red-600 dark:border-red-900 dark:bg-red-950 dark:text-red-400'
            : 'border-stone-300 text-stone-600 dark:border-stone-700 dark:text-stone-300'
        "
        @click="drawStore.conditions.noChains = !drawStore.conditions.noChains"
      >
        ⛓️ {{ t('conditions.noChains') }}
        <span v-if="drawStore.conditions.noChains" aria-hidden="true">✕</span>
      </button>
    </div>
    <p
      v-if="drawStore.conditions.noChains"
      class="mt-1.5 text-xs text-stone-400 dark:text-stone-500"
    >
      {{ t('conditions.noChainsHint') }}
    </p>
  </div>
</template>
