<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

import BudgetRangeSlider from './BudgetRangeSlider.vue'
import { formatBudgetWindow } from '@/lib/format/price'
import { useDrawStore } from '@/stores/draw'

const { t, locale } = useI18n()
const drawStore = useDrawStore()

const summary = computed(() => {
  const range = drawStore.conditions.budgetRange
  if (!range) return t('conditions.any')
  return formatBudgetWindow(range, drawStore.region, locale.value)
})
</script>

<template>
  <div>
    <div class="mb-1 flex items-center justify-between">
      <span class="text-xs text-stone-400 dark:text-stone-500">{{ t('conditions.budgetRange') }}</span>
      <span class="rounded-full bg-orange-500/10 px-2.5 py-0.5 text-xs font-bold text-orange-600 dark:text-orange-400">
        💰 {{ summary }}
      </span>
    </div>

    <BudgetRangeSlider
      v-model="drawStore.conditions.budgetRange"
      :region="drawStore.region"
      :aria-label="t('conditions.budget')"
    />

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
