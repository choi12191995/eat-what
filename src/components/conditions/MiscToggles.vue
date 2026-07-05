<script setup lang="ts">
import { useI18n } from 'vue-i18n'

import { MIN_RATING_CHOICES } from '@/lib/draw/defaults'
import { useDrawStore } from '@/stores/draw'

const { t } = useI18n()
const drawStore = useDrawStore()

function bumpParty(delta: number) {
  const next = drawStore.conditions.partySize + delta
  drawStore.conditions.partySize = Math.min(12, Math.max(1, next))
}
</script>

<template>
  <div class="space-y-5">
    <!-- open now -->
    <div class="flex items-center justify-between">
      <span class="text-sm">{{ t('conditions.openNow') }}</span>
      <button
        type="button"
        role="switch"
        :aria-checked="drawStore.conditions.openNowOnly"
        class="relative h-7 w-12 rounded-full transition-colors"
        :class="drawStore.conditions.openNowOnly ? 'bg-orange-500' : 'bg-stone-300 dark:bg-stone-700'"
        @click="drawStore.conditions.openNowOnly = !drawStore.conditions.openNowOnly"
      >
        <span
          class="absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all"
          :class="drawStore.conditions.openNowOnly ? 'left-6' : 'left-1'"
        />
      </button>
    </div>

    <!-- min rating -->
    <div class="flex items-center justify-between gap-3">
      <span class="shrink-0 text-sm">{{ t('conditions.minRating') }}</span>
      <div class="flex gap-1.5">
        <button
          type="button"
          class="rounded-full border px-2.5 py-1 text-xs transition-all"
          :class="
            drawStore.conditions.minRating === null
              ? 'border-orange-500 bg-orange-500/10 font-semibold text-orange-600 dark:text-orange-400'
              : 'border-stone-300 text-stone-500 dark:border-stone-700 dark:text-stone-400'
          "
          @click="drawStore.conditions.minRating = null"
        >
          {{ t('conditions.any') }}
        </button>
        <button
          v-for="r in MIN_RATING_CHOICES"
          :key="r"
          type="button"
          class="rounded-full border px-2.5 py-1 text-xs transition-all"
          :class="
            drawStore.conditions.minRating === r
              ? 'border-orange-500 bg-orange-500/10 font-semibold text-orange-600 dark:text-orange-400'
              : 'border-stone-300 text-stone-500 dark:border-stone-700 dark:text-stone-400'
          "
          @click="drawStore.conditions.minRating = r"
        >
          ★{{ r.toFixed(1) }}+
        </button>
      </div>
    </div>

    <!-- party size -->
    <div class="flex items-center justify-between">
      <span class="text-sm">{{ t('conditions.partySize') }}</span>
      <div class="flex items-center gap-3">
        <button
          type="button"
          class="h-8 w-8 rounded-full border border-stone-300 text-lg leading-none text-stone-600 active:scale-95 dark:border-stone-700 dark:text-stone-300"
          :disabled="drawStore.conditions.partySize <= 1"
          @click="bumpParty(-1)"
        >
          −
        </button>
        <span class="w-8 text-center text-sm font-semibold">
          {{ drawStore.conditions.partySize }} 👤
        </span>
        <button
          type="button"
          class="h-8 w-8 rounded-full border border-stone-300 text-lg leading-none text-stone-600 active:scale-95 dark:border-stone-700 dark:text-stone-300"
          :disabled="drawStore.conditions.partySize >= 12"
          @click="bumpParty(1)"
        >
          +
        </button>
      </div>
    </div>
  </div>
</template>
