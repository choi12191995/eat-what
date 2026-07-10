<script setup lang="ts">
/**
 * Money-window slider (per-person spend, local currency). Detents are
 * region-tuned — HK$25 apart at the cheap end, coarser up top — with an ∞
 * stop on the right ("HK$1000+"). Both thumbs on one detent = exact amount.
 * null = no constraint (thumbs parked full-width).
 */
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

import RangeSlider from '@/components/ui/RangeSlider.vue'
import type { Region } from '@/lib/geo/region'
import { budgetTicks, formatBudgetAmount, type BudgetWindow } from '@/lib/format/price'

const props = defineProps<{
  modelValue: BudgetWindow | null
  region: Region
  ariaLabel?: string
}>()
const emit = defineEmits<{ 'update:modelValue': [v: BudgetWindow | null] }>()

const { locale } = useI18n()

const ticks = computed(() => budgetTicks(props.region))
/** Index of the ∞ stop (one past the last finite tick) */
const INF = computed(() => ticks.value.length)

function nearestIdx(v: number): number {
  const t = ticks.value
  let best = 0
  for (let i = 1; i < t.length; i++) {
    if (Math.abs(t[i]! - v) < Math.abs(t[best]! - v)) best = i
  }
  return best
}

const loIdx = computed(() =>
  props.modelValue ? Math.min(nearestIdx(props.modelValue.min), INF.value - 1) : 0,
)
const hiIdx = computed(() =>
  props.modelValue === null || props.modelValue.max === null
    ? INF.value
    : nearestIdx(props.modelValue.max),
)

function commit(lo: number, hi: number) {
  // min thumb never parks on ∞
  const l = Math.min(lo, INF.value - 1)
  if (l === 0 && hi === INF.value) return emit('update:modelValue', null)
  emit('update:modelValue', {
    min: ticks.value[l]!,
    max: hi >= INF.value ? null : ticks.value[hi]!,
  })
}

const leftLabel = computed(() => formatBudgetAmount(0, props.region, locale.value))
const rightLabel = computed(
  () => `${formatBudgetAmount(ticks.value[ticks.value.length - 1]!, props.region, locale.value)}+`,
)
</script>

<template>
  <div>
    <RangeSlider
      :min="0"
      :max="INF"
      :step="1"
      :lo="loIdx"
      :hi="hiIdx"
      :aria-label="ariaLabel"
      @update:lo="commit($event, hiIdx)"
      @update:hi="commit(loIdx, $event)"
    />
    <div class="flex justify-between text-[10px] text-stone-400 dark:text-stone-500">
      <span>{{ leftLabel }}</span>
      <span>{{ rightLabel }}</span>
    </div>
  </div>
</template>
