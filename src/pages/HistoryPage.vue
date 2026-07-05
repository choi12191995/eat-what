<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'

import type { Restaurant } from '@/types/models'
import ResultCard from '@/components/result/ResultCard.vue'
import { createHistoryRepo, type DayGroup } from '@/lib/db/historyRepo'
import { getDb } from '@/lib/db/schema'
import { emojiForTypes } from '@/lib/places/cuisines'

const { t, locale } = useI18n()
const repo = createHistoryRepo(getDb())

const groups = ref<DayGroup[]>([])
const topCuisines = ref<{ id: string; emoji: string; count: number }[]>([])
const selected = ref<Restaurant | null>(null)
const cardOpen = ref(false)

async function load() {
  groups.value = await repo.listGroupedByDay()
  topCuisines.value = await repo.topCuisines(3)
}
onMounted(load)

function dayLabel(day: string): string {
  const date = new Date(`${day}T12:00:00`)
  return new Intl.DateTimeFormat(locale.value, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(date)
}

function timeLabel(ts: number): string {
  return new Intl.DateTimeFormat(locale.value, { hour: '2-digit', minute: '2-digit' }).format(ts)
}

function openRecord(r: Restaurant) {
  selected.value = r
  cardOpen.value = true
}
</script>

<template>
  <div class="mx-auto max-w-md px-6 pt-10">
    <h1 class="mb-4 text-2xl font-bold">{{ t('nav.history') }}</h1>

    <div v-if="topCuisines.length" class="mb-6 flex flex-wrap items-center gap-2 text-sm">
      <span class="text-stone-500 dark:text-stone-400">{{ t('history.topCuisines') }}</span>
      <span
        v-for="c in topCuisines"
        :key="c.id"
        class="rounded-full bg-orange-100 px-2.5 py-0.5 text-orange-700 dark:bg-orange-950 dark:text-orange-300"
      >
        {{ c.emoji }} {{ t(`cuisine.${c.id}`) }} ×{{ c.count }}
      </span>
    </div>

    <p v-if="!groups.length" class="text-sm text-stone-500 dark:text-stone-400">
      {{ t('history.empty') }}
    </p>

    <section v-for="g in groups" :key="g.day" class="mb-6">
      <h2 class="mb-2 text-xs font-bold tracking-wide text-stone-400 uppercase dark:text-stone-500">
        {{ dayLabel(g.day) }}
      </h2>
      <ul class="space-y-2">
        <li v-for="rec in g.records" :key="rec.id">
          <button
            type="button"
            class="flex w-full items-center gap-3 rounded-2xl border border-stone-200 px-3 py-2.5 text-left active:scale-[0.99] dark:border-stone-800"
            @click="openRecord(rec.restaurant)"
          >
            <span class="text-2xl" aria-hidden="true">{{ emojiForTypes(rec.restaurant.types) }}</span>
            <span class="min-w-0 flex-1">
              <span class="block truncate text-sm font-semibold">{{ rec.restaurant.name }}</span>
              <span class="block text-xs text-stone-400 dark:text-stone-500">
                {{ rec.meal === 'lunch' ? '🥪' : '🌙' }} {{ t(`history.${rec.meal}`) }} ·
                {{ timeLabel(rec.timestamp) }}
              </span>
            </span>
            <span v-if="rec.restaurant.rating" class="text-xs text-stone-400">
              ★ {{ rec.restaurant.rating.toFixed(1) }}
            </span>
          </button>
        </li>
      </ul>
    </section>

    <ResultCard :restaurant="selected" :open="cardOpen" @close="cardOpen = false" />
  </div>
</template>
