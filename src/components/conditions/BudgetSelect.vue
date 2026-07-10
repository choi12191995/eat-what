<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

import type { PriceLevel } from '@/types/models'
import RangeSlider from '@/components/ui/RangeSlider.vue'
import { bandLabel } from '@/lib/format/price'
import { useDrawStore } from '@/stores/draw'

const { t, locale } = useI18n()
const drawStore = useDrawStore()

const SYMBOLS: Record<PriceLevel, string> = { 1: '$', 2: '$$', 3: '$$$', 4: '$$$$' }
const LEVELS: PriceLevel[] = [1, 2, 3, 4]

// budgetLevels stays the storage format (presets/AI/engine untouched):
// the slider edits a contiguous [lo..hi] view of it; full range ⇒ "any" ⇒ []
const lo = computed(() => {
  const set = drawStore.conditions.budgetLevels
  return set.length ? (Math.min(...set) as PriceLevel) : 1
})
const hi = computed(() => {
  const set = drawStore.conditions.budgetLevels
  return set.length ? (Math.max(...set) as PriceLevel) : 4
})

function setRange(nextLo: number, nextHi: number) {
  drawStore.conditions.budgetLevels =
    nextLo === 1 && nextHi === 4
      ? []
      : (LEVELS.filter((l) => l >= nextLo && l <= nextHi) as PriceLevel[])
}

const summary = computed(() => {
  if (!drawStore.conditions.budgetLevels.length) return t('conditions.any')
  if (lo.value === hi.value) return `${SYMBOLS[lo.value]} · ${bandLabel(lo.value, drawStore.region, locale.value)}`
  return `${SYMBOLS[lo.value]} – ${SYMBOLS[hi.value]}`
})

const inRange = (l: PriceLevel) =>
  drawStore.conditions.budgetLevels.length > 0 && l >= lo.value && l <= hi.value
</script>

<template>
  <div>
    <div class="mb-1 flex items-center justify-between">
      <span class="text-xs text-stone-400 dark:text-stone-500">{{ t('conditions.budgetRange') }}</span>
      <span class="rounded-full bg-orange-500/10 px-2.5 py-0.5 text-xs font-bold text-orange-600 dark:text-orange-400">
        {{ summary }}
      </span>
    </div>

    <RangeSlider
      :min="1"
      :max="4"
      :step="1"
      :lo="lo"
      :hi="hi"
      :aria-label="t('conditions.budget')"
      @update:lo="setRange($event, hi)"
      @update:hi="setRange(lo, $event)"
    />

    <div class="grid grid-cols-4 gap-1 text-center">
      <div v-for="l in LEVELS" :key="l">
        <p
          class="text-sm font-bold"
          :class="inRange(l) ? 'text-orange-600 dark:text-orange-400' : 'text-stone-400 dark:text-stone-600'"
        >
          {{ SYMBOLS[l] }}
        </p>
        <p class="text-[10px] leading-tight text-stone-400 dark:text-stone-500">
          {{ bandLabel(l, drawStore.region, locale) }}
        </p>
      </div>
    </div>

    <!-- opt-in: hide places with no price data at all -->
    <div class="mt-3 flex items-center justify-between gap-3">
      <span class="text-sm">{{ t('conditions.requirePrice') }}</span>
      <button
        type="button"
        role="switch"
        :aria-checked="drawStore.conditions.requirePrice"
        class="relative h-7 w-12 shrink-0 rounded-full transition-colors"
        :class="drawStore.conditions.requirePrice ? 'bg-orange-500' : 'bg-stone-300 dark:bg-stone-700'"
        @click="drawStore.conditions.requirePrice = !drawStore.conditions.requirePrice"
      >
        <span
          class="absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all"
          :class="drawStore.conditions.requirePrice ? 'left-6' : 'left-1'"
        />
      </button>
    </div>
    <p class="mt-2 text-xs text-stone-400 dark:text-stone-500">{{ t('conditions.budgetHint') }}</p>
  </div>
</template>
