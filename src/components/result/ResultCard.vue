<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import ModalShell from '@/components/ui/ModalShell.vue'
import RatingStars from '@/components/ui/RatingStars.vue'
import { cuisinesOfTypes, emojiForTypes } from '@/lib/places/cuisines'
import { formatPrice } from '@/lib/format/price'
import { formatDistance, haversineMeters } from '@/lib/geo/distance'
import { wheelColor } from '@/lib/draw/palette'
import { getProvider } from '@/lib/places'
import { useDrawStore } from '@/stores/draw'
import { useSettingsStore } from '@/stores/settings'

const { t, locale } = useI18n()
const drawStore = useDrawStore()
const settings = useSettingsStore()

const r = computed(() => drawStore.winner)

const photoFailed = ref(false)
watch(r, () => (photoFailed.value = false))

// Photos are the scarcest quota (1,000 free/month) — load exactly one,
// only for the winner, at a capped width.
const photoSrc = computed(() => {
  const first = r.value?.photoNames[0]
  if (!first || photoFailed.value) return null
  return getProvider(settings.googleApiKey).photoUrl(first, 800)
})

const price = computed(() =>
  r.value ? formatPrice(r.value, locale.value, drawStore.region) : null,
)

const distanceText = computed(() => {
  if (!r.value || !drawStore.lastOrigin) return null
  return formatDistance(haversineMeters(drawStore.lastOrigin, r.value.location), locale.value)
})

const cuisineTags = computed(() =>
  r.value ? cuisinesOfTypes(r.value.types).slice(0, 2) : [],
)

const heroEmoji = computed(() => (r.value ? emojiForTypes(r.value.types) : '🍽️'))
const heroColor = computed(() => wheelColor(drawStore.winnerIndex >= 0 ? drawStore.winnerIndex : 0))
</script>

<template>
  <ModalShell :open="drawStore.showResult && !!r" @close="drawStore.acceptWinner()">
    <div v-if="r">
      <!-- hero: real photo when the live provider has one, emoji art otherwise -->
      <img
        v-if="photoSrc"
        :src="photoSrc"
        alt=""
        class="h-44 w-full rounded-t-3xl object-cover"
        loading="lazy"
        @error="photoFailed = true"
      />
      <div
        v-else
        class="flex h-40 items-center justify-center rounded-t-3xl text-7xl"
        :style="{ background: `linear-gradient(135deg, ${heroColor}66, ${heroColor})` }"
      >
        <span aria-hidden="true">{{ heroEmoji }}</span>
      </div>

      <div class="space-y-3 p-5">
        <div>
          <h2 class="text-2xl font-black tracking-tight">{{ r.name }}</h2>
          <div class="mt-1 flex flex-wrap items-center gap-2">
            <RatingStars :rating="r.rating" :count="r.userRatingCount" />
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-2 text-sm">
          <span
            v-for="c in cuisineTags"
            :key="c.id"
            class="rounded-full bg-orange-100 px-2.5 py-0.5 text-orange-700 dark:bg-orange-950 dark:text-orange-300"
          >
            {{ c.emoji }} {{ t(`cuisine.${c.id}`) }}
          </span>
          <span
            v-if="price && price.source !== 'none'"
            class="rounded-full bg-emerald-100 px-2.5 py-0.5 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
          >
            {{ price.text }}
          </span>
          <span
            v-else
            class="rounded-full bg-stone-100 px-2.5 py-0.5 text-stone-500 dark:bg-stone-800 dark:text-stone-400"
          >
            {{ t('result.priceUnknown') }}
          </span>
        </div>

        <div class="space-y-1.5 text-sm text-stone-600 dark:text-stone-300">
          <p v-if="distanceText">📍 {{ t('result.distanceAway', { d: distanceText }) }}</p>
          <p v-if="r.openNow !== undefined">
            <span v-if="r.openNow" class="text-emerald-600 dark:text-emerald-400">
              🟢 {{ t('result.openNow') }}
            </span>
            <span v-else class="text-red-500 dark:text-red-400">🔴 {{ t('result.closed') }}</span>
            <span v-if="r.todayHours" class="text-stone-400 dark:text-stone-500">
              · {{ r.todayHours }}</span>
          </p>
          <p v-if="r.address" class="text-stone-500 dark:text-stone-400">🏠 {{ r.address }}</p>
        </div>

        <div class="flex gap-2 pt-2">
          <button
            type="button"
            class="flex-1 rounded-xl border border-stone-300 px-3 py-3 text-sm font-semibold text-stone-600 active:scale-95 dark:border-stone-700 dark:text-stone-300"
            @click="drawStore.respin()"
          >
            🔁 {{ t('result.respin') }}
          </button>
          <button
            type="button"
            class="flex-[2] rounded-xl bg-orange-500 px-3 py-3 text-sm font-bold text-white shadow-md active:scale-95"
            @click="drawStore.acceptWinner()"
          >
            😋 {{ t('result.accept') }}
          </button>
        </div>
      </div>
    </div>
  </ModalShell>
</template>
