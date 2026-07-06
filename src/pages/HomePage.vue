<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { usePreferredReducedMotion } from '@vueuse/core'
import confetti from 'canvas-confetti'

import SpinWheel, { type WheelItem } from '@/components/wheel/SpinWheel.vue'
import ConditionsDrawer from '@/components/conditions/ConditionsDrawer.vue'
import ResultCard from '@/components/result/ResultCard.vue'
import RelaxationHints from '@/components/result/RelaxationHints.vue'
import { aiConfigured } from '@/lib/ai/client'
import { CUISINES, emojiForTypes } from '@/lib/places/cuisines'
import { useDraw } from '@/composables/useDraw'
import { useHaptics } from '@/composables/useHaptics'
import { useDrawStore } from '@/stores/draw'
import { useSettingsStore } from '@/stores/settings'

const { t } = useI18n()
const drawStore = useDrawStore()
const settings = useSettingsStore()
const { busy, isDemo, startDraw, applyRelaxation } = useDraw()
const haptics = useHaptics()
const motion = usePreferredReducedMotion()

const wheelRef = ref<InstanceType<typeof SpinWheel> | null>(null)

const placeholderItems: WheelItem[] = CUISINES.filter((_, i) => i % 3 === 0)
  .slice(0, 8)
  .map((c) => ({ id: c.id, label: '', emoji: c.emoji }))

const wheelItems = computed<WheelItem[]>(() =>
  drawStore.candidates.length
    ? drawStore.candidates.map((r) => ({
        id: r.id,
        label: r.name,
        emoji: emojiForTypes(r.types),
      }))
    : placeholderItems,
)

const hasAi = computed(() =>
  aiConfigured({
    baseUrl: settings.aiBaseUrl,
    apiKey: settings.aiApiKey,
    model: settings.aiModel,
  }),
)

const activeFilterCount = computed(() => {
  const c = drawStore.conditions
  return (
    c.cuisines.include.length +
    c.cuisines.exclude.length +
    (c.budgetLevels.length ? 1 : 0) +
    (c.minRating !== null ? 1 : 0)
  )
})

watch(
  () => drawStore.phase,
  async (phase) => {
    if (phase !== 'spinning') return
    await nextTick()
    await wheelRef.value?.spin(drawStore.winnerIndex)
    haptics.land()
    if (motion.value !== 'reduce') {
      confetti({ particleCount: 130, spread: 75, origin: { y: 0.55 }, disableForReducedMotion: true })
    }
    drawStore.phase = 'landed'
    setTimeout(() => (drawStore.showResult = true), 350)
  },
)

async function onDraw() {
  haptics.tap()
  await startDraw()
}

// Notification deep link: /?draw=1 spins immediately
const route = useRoute()
const router = useRouter()
watch(
  () => route.query.draw,
  (draw) => {
    if (draw !== '1') return
    void router.replace({ query: {} })
    if (drawStore.phase === 'idle' || drawStore.phase === 'landed') void onDraw()
  },
  { immediate: true },
)
</script>

<template>
  <div class="mx-auto flex max-w-md flex-col items-center gap-5 px-5 pt-6">
    <div class="flex w-full items-center justify-between">
      <h1 class="text-xl font-black tracking-tight">{{ t('app.name') }} 🍜</h1>
      <button
        v-if="isDemo"
        type="button"
        class="rounded-full bg-violet-100 px-2.5 py-1 text-xs font-semibold text-violet-700 active:scale-95 dark:bg-violet-950 dark:text-violet-300"
        @click="settings.setupOpen = true"
      >
        🧪 {{ t('draw.demoData') }}
      </button>
    </div>

    <SpinWheel
      ref="wheelRef"
      :items="wheelItems"
      :placeholder="drawStore.candidates.length === 0"
      aria-live="polite"
    />

    <p
      v-if="drawStore.phase === 'landed' && drawStore.winner"
      class="text-center text-lg font-bold"
      aria-live="assertive"
    >
      🎉 {{ drawStore.winner.name }}
    </p>

    <RelaxationHints
      v-if="!busy && drawStore.candidates.length === 0"
      @apply="applyRelaxation"
    />

    <p v-if="drawStore.errorKey" class="text-sm text-red-500 dark:text-red-400">
      {{ t(drawStore.errorKey) }}
    </p>

    <input
      v-if="hasAi"
      v-model="drawStore.mood"
      type="text"
      maxlength="120"
      :placeholder="t('home.moodPlaceholder')"
      class="w-full max-w-sm rounded-2xl border border-violet-300 bg-transparent px-4 py-2.5 text-sm outline-none placeholder:text-stone-400 focus:border-violet-500 dark:border-violet-900"
    />

    <div class="flex w-full max-w-sm items-center gap-3">
      <button
        type="button"
        class="relative rounded-2xl border border-stone-300 px-4 py-4 text-xl active:scale-95 dark:border-stone-700"
        :disabled="busy"
        :aria-label="t('conditions.title')"
        @click="drawStore.drawerOpen = true"
      >
        🎛️
        <span
          v-if="activeFilterCount > 0"
          class="absolute -top-1.5 -right-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-orange-500 px-1 text-xs font-bold text-white"
        >
          {{ activeFilterCount }}
        </span>
      </button>
      <button
        type="button"
        class="flex-1 rounded-2xl bg-orange-500 py-4 text-xl font-black tracking-wide text-white shadow-lg transition-all active:scale-95 disabled:opacity-60"
        :disabled="busy"
        @click="onDraw"
      >
        <span v-if="drawStore.phase === 'loading'">🔍 {{ t('draw.finding') }}</span>
        <span v-else-if="drawStore.phase === 'spinning'">🎡 …</span>
        <span v-else>{{ t('draw.cta') }}</span>
      </button>
    </div>
  </div>

  <ConditionsDrawer />
  <ResultCard />
</template>
