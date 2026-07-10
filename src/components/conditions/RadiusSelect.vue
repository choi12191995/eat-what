<script setup lang="ts">
import { useI18n } from 'vue-i18n'

import RangeSlider from '@/components/ui/RangeSlider.vue'
import { RADIUS_MAX, RADIUS_MIN, RADIUS_SLIDER_STEP } from '@/lib/draw/defaults'
import { useDrawStore } from '@/stores/draw'

const { t } = useI18n()
const drawStore = useDrawStore()

function label(meters: number): string {
  return meters < 1000 ? `${meters} m` : `${meters / 1000} km`
}
</script>

<template>
  <div>
    <div class="mb-1 flex items-center justify-between">
      <span class="text-xs text-stone-400 dark:text-stone-500">
        {{ label(RADIUS_MIN) }} – {{ label(RADIUS_MAX) }}
      </span>
      <span class="rounded-full bg-orange-500/10 px-2.5 py-0.5 text-xs font-bold text-orange-600 dark:text-orange-400">
        📍 {{ label(drawStore.conditions.radiusMeters) }}
      </span>
    </div>
    <RangeSlider
      :min="RADIUS_MIN"
      :max="RADIUS_MAX"
      :step="RADIUS_SLIDER_STEP"
      :hi="drawStore.conditions.radiusMeters"
      :aria-label="t('conditions.radius')"
      @update:hi="drawStore.conditions.radiusMeters = $event"
    />
  </div>
</template>
