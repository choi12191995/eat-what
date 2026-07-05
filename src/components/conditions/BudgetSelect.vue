<script setup lang="ts">
import { useI18n } from 'vue-i18n'

import type { PriceLevel } from '@/types/models'
import { bandLabel } from '@/lib/format/price'
import { useDrawStore } from '@/stores/draw'

const { t, locale } = useI18n()
const drawStore = useDrawStore()

const LEVELS: { level: PriceLevel; symbol: string }[] = [
  { level: 1, symbol: '$' },
  { level: 2, symbol: '$$' },
  { level: 3, symbol: '$$$' },
  { level: 4, symbol: '$$$$' },
]

function toggle(level: PriceLevel) {
  const set = drawStore.conditions.budgetLevels
  drawStore.conditions.budgetLevels = set.includes(level)
    ? set.filter((l) => l !== level)
    : [...set, level].sort()
}
</script>

<template>
  <div>
    <div class="grid grid-cols-4 gap-2">
      <button
        v-for="{ level, symbol } in LEVELS"
        :key="level"
        type="button"
        class="flex flex-col items-center rounded-xl border px-2 py-2 transition-all active:scale-95"
        :class="
          drawStore.conditions.budgetLevels.includes(level)
            ? 'border-orange-500 bg-orange-500/10 text-orange-600 dark:text-orange-400'
            : 'border-stone-300 text-stone-600 dark:border-stone-700 dark:text-stone-300'
        "
        @click="toggle(level)"
      >
        <span class="text-sm font-bold">{{ symbol }}</span>
        <span class="mt-0.5 text-[10px] leading-tight text-stone-400 dark:text-stone-500">
          {{ bandLabel(level, drawStore.region, locale) }}
        </span>
      </button>
    </div>
    <p class="mt-2 text-xs text-stone-400 dark:text-stone-500">{{ t('conditions.budgetHint') }}</p>
  </div>
</template>
