<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{ rating?: number; count?: number }>()

const pct = computed(() => `${Math.max(0, Math.min(5, props.rating ?? 0)) * 20}%`)
</script>

<template>
  <div v-if="rating !== undefined" class="flex items-center gap-1.5 text-sm">
    <span class="font-semibold">{{ rating.toFixed(1) }}</span>
    <span class="relative inline-block leading-none" aria-hidden="true">
      <span class="text-stone-300 dark:text-stone-600">★★★★★</span>
      <span class="absolute inset-0 overflow-hidden whitespace-nowrap" :style="{ width: pct }">
        <span class="text-amber-400">★★★★★</span>
      </span>
    </span>
    <span v-if="count" class="text-xs text-stone-500 dark:text-stone-400">({{ count.toLocaleString() }})</span>
  </div>
</template>
