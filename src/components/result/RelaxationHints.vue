<script setup lang="ts">
import { useI18n } from 'vue-i18n'

import type { RelaxationSuggestion } from '@/types/models'
import { useDrawStore } from '@/stores/draw'

const { t } = useI18n()
const drawStore = useDrawStore()

const emit = defineEmits<{ apply: [s: RelaxationSuggestion] }>()

function label(s: RelaxationSuggestion): string {
  if (s.kind === 'widenRadius' && s.nextRadius) {
    const radius = s.nextRadius < 1000 ? `${s.nextRadius} m` : `${s.nextRadius / 1000} km`
    return t('draw.relax.widenRadius', { radius })
  }
  return t(`draw.relax.${s.kind}`)
}
</script>

<template>
  <div v-if="drawStore.relaxations.length" class="mx-auto max-w-sm text-center">
    <p class="mb-3 text-sm text-stone-500 dark:text-stone-400">{{ t('draw.noMatchesRelax') }}</p>
    <div class="flex flex-wrap justify-center gap-2">
      <button
        v-for="s in drawStore.relaxations"
        :key="s.kind"
        type="button"
        class="rounded-full border border-orange-300 bg-orange-500/10 px-3 py-1.5 text-sm text-orange-700 transition-all active:scale-95 dark:border-orange-800 dark:text-orange-300"
        @click="emit('apply', s)"
      >
        {{ label(s) }}
        <span
          v-if="s.resultCount > 0"
          class="ml-1 rounded-full bg-orange-500 px-1.5 text-xs font-bold text-white"
        >
          {{ s.resultCount }}
        </span>
      </button>
    </div>
  </div>
</template>
