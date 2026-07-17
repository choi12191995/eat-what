<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'

import { KEYWORD_GROUPS, MAX_KEYWORD_TAGS, keywordTagById } from '@/lib/places/keywords'
import { useDrawStore } from '@/stores/draw'

const { t } = useI18n()
const drawStore = useDrawStore()

/** Accordion: one group open at a time keeps 39 tags scannable on mobile */
const openGroup = ref<string | null>(null)

const included = computed(() => drawStore.conditions.keywords)
const excluded = computed(() => drawStore.conditions.keywordsExclude)
const atCap = computed(() => included.value.length >= MAX_KEYWORD_TAGS)

type ChipState = 'neutral' | 'include' | 'exclude'

function stateOf(id: string): ChipState {
  if (included.value.includes(id)) return 'include'
  if (excluded.value.includes(id)) return 'exclude'
  return 'neutral'
}

/** Tap cycles: neutral → include → exclude → neutral (at the include cap,
 *  neutral jumps straight to exclude — opting OUT costs nothing) */
function cycle(id: string) {
  const c = drawStore.conditions
  switch (stateOf(id)) {
    case 'neutral':
      if (atCap.value) c.keywordsExclude.push(id)
      else c.keywords.push(id)
      break
    case 'include':
      c.keywords = c.keywords.filter((x) => x !== id)
      c.keywordsExclude.push(id)
      break
    case 'exclude':
      c.keywordsExclude = c.keywordsExclude.filter((x) => x !== id)
      break
  }
}

function clearTag(id: string) {
  const c = drawStore.conditions
  c.keywords = c.keywords.filter((x) => x !== id)
  c.keywordsExclude = c.keywordsExclude.filter((x) => x !== id)
}

function groupCounts(groupId: string): { inc: number; exc: number } {
  const group = KEYWORD_GROUPS.find((g) => g.id === groupId)
  if (!group) return { inc: 0, exc: 0 }
  return {
    inc: group.tags.filter((tag) => stateOf(tag.id) === 'include').length,
    exc: group.tags.filter((tag) => stateOf(tag.id) === 'exclude').length,
  }
}

function emojiOf(id: string): string {
  return keywordTagById(id)?.emoji ?? '🍽️'
}

const chipClass: Record<ChipState, string> = {
  neutral: 'border-stone-300 text-stone-600 dark:border-stone-700 dark:text-stone-300',
  include: 'border-orange-500 bg-orange-500 text-white shadow-sm',
  exclude:
    'border-red-300 bg-red-50 text-red-600 line-through decoration-2 dark:border-red-900 dark:bg-red-950 dark:text-red-400',
}
</script>

<template>
  <div class="space-y-2">
    <!-- active tags: always visible, tap to clear -->
    <div v-if="included.length || excluded.length" class="flex flex-wrap gap-2">
      <button
        v-for="id in included"
        :key="`in-${id}`"
        type="button"
        class="rounded-full border border-orange-500 bg-orange-500 px-3 py-1.5 text-sm text-white shadow-sm active:scale-95"
        @click="clearTag(id)"
      >
        <span aria-hidden="true">{{ emojiOf(id) }}</span>
        {{ t(`kw.${id}`) }} ✕
      </button>
      <button
        v-for="id in excluded"
        :key="`ex-${id}`"
        type="button"
        class="rounded-full border border-red-300 bg-red-50 px-3 py-1.5 text-sm text-red-600 line-through decoration-2 active:scale-95 dark:border-red-900 dark:bg-red-950 dark:text-red-400"
        @click="clearTag(id)"
      >
        <span aria-hidden="true">{{ emojiOf(id) }}</span>
        {{ t(`kw.${id}`) }} ✕
      </button>
    </div>

    <div class="overflow-hidden rounded-2xl border border-stone-200 dark:border-stone-800">
      <div
        v-for="group in KEYWORD_GROUPS"
        :key="group.id"
        class="border-b border-stone-200 last:border-b-0 dark:border-stone-800"
      >
        <button
          type="button"
          class="flex w-full items-center justify-between px-3.5 py-2.5 text-sm font-semibold"
          @click="openGroup = openGroup === group.id ? null : group.id"
        >
          <span>
            {{ group.emoji }} {{ t(`kwGroup.${group.id}`) }}
            <span
              v-if="groupCounts(group.id).inc"
              class="ml-1 rounded-full bg-orange-500 px-1.5 py-0.5 text-xs font-bold text-white"
            >
              {{ groupCounts(group.id).inc }}
            </span>
            <span
              v-if="groupCounts(group.id).exc"
              class="ml-1 rounded-full bg-red-500 px-1.5 py-0.5 text-xs font-bold text-white"
            >
              {{ groupCounts(group.id).exc }}
            </span>
          </span>
          <span
            class="text-stone-400 transition-transform"
            :class="openGroup === group.id ? 'rotate-90' : ''"
            aria-hidden="true"
          >
            ›
          </span>
        </button>
        <div v-if="openGroup === group.id" class="flex flex-wrap gap-2 px-3.5 pt-0.5 pb-3">
          <button
            v-for="tag in group.tags"
            :key="tag.id"
            type="button"
            class="rounded-full border px-3 py-1.5 text-sm transition-all active:scale-95"
            :class="chipClass[stateOf(tag.id)]"
            @click="cycle(tag.id)"
          >
            <span aria-hidden="true">{{ tag.emoji }}</span>
            {{ t(`kw.${tag.id}`) }}
            <span v-if="stateOf(tag.id) === 'include'" aria-hidden="true">✓</span>
            <span v-else-if="stateOf(tag.id) === 'exclude'" aria-hidden="true">✕</span>
          </button>
        </div>
      </div>
    </div>

    <p class="text-xs text-stone-400 dark:text-stone-500">
      {{ t('conditions.keywordHint', { max: MAX_KEYWORD_TAGS }) }}
    </p>
  </div>
</template>
