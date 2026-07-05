<script setup lang="ts">
import { RADIUS_STEPS } from '@/lib/draw/defaults'
import { useDrawStore } from '@/stores/draw'

const drawStore = useDrawStore()

function label(meters: number): string {
  return meters < 1000 ? `${meters} m` : `${meters / 1000} km`
}
</script>

<template>
  <div class="grid grid-cols-5 gap-2">
    <button
      v-for="r in RADIUS_STEPS"
      :key="r"
      type="button"
      class="rounded-xl border px-1 py-2 text-sm transition-all active:scale-95"
      :class="
        drawStore.conditions.radiusMeters === r
          ? 'border-orange-500 bg-orange-500/10 font-semibold text-orange-600 dark:text-orange-400'
          : 'border-stone-300 text-stone-600 dark:border-stone-700 dark:text-stone-300'
      "
      @click="drawStore.conditions.radiusMeters = r"
    >
      {{ label(r) }}
    </button>
  </div>
</template>
