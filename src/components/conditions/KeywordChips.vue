<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'

import { KEYWORD_GROUPS, MAX_KEYWORD_TAGS, keywordTagById } from '@/lib/places/keywords'
import { useDrawStore } from '@/stores/draw'

const { t } = useI18n()
const drawStore = useDrawStore()

/** Accordion: one group open at a time keeps 38 tags scannable on mobile */
const openGroup = ref<string | null>(null)

const selected = computed(() => drawStore.conditions.keywords)
const atCap = computed(() => selected.value.length >= MAX_KEYWORD_TAGS)

function isOn(id: string): boolean {
  return selected.value.includes(id)
}

function toggle(id: string) {
  const kw = drawStore.conditions.keywords
  const i = kw.indexOf(id)
  if (i >= 0) kw.splice(i, 1)
  else if (!atCap.value) kw.push(id)
}

function selectedCount(groupId: string): number {
  const group = KEYWORD_GROUPS.find((g) => g.id === groupId)
  return group ? group.tags.filter((tag) => isOn(tag.id)).length : 0
}

function emojiOf(id: string): string {
  return keywordTagById(id)?.emoji ?? '🍽️'
}
</script>

<template>
  <div class="space-y-2">
    <!-- selected tags: always visible, tap to remove -->
    <div v-if="selected.length" class="flex flex-wrap gap-2">
      <button
        v-for="id in selected"
        :key="id"
        type="button"
        class="rounded-full border border-orange-500 bg-orange-500 px-3 py-1.5 text-sm text-white shadow-sm active:scale-95"
        @click="toggle(id)"
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
              v-if="selectedCount(group.id)"
              class="ml-1 rounded-full bg-orange-500 px-1.5 py-0.5 text-xs font-bold text-white"
            >
              {{ selectedCount(group.id) }}
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
            :class="
              isOn(tag.id)
                ? 'border-orange-500 bg-orange-500 text-white shadow-sm'
                : atCap
                  ? 'border-stone-200 text-stone-300 dark:border-stone-800 dark:text-stone-600'
                  : 'border-stone-300 text-stone-600 dark:border-stone-700 dark:text-stone-300'
            "
            :disabled="!isOn(tag.id) && atCap"
            @click="toggle(tag.id)"
          >
            <span aria-hidden="true">{{ tag.emoji }}</span>
            {{ t(`kw.${tag.id}`) }}
            <span v-if="isOn(tag.id)" aria-hidden="true">✓</span>
          </button>
        </div>
      </div>
    </div>

    <p class="text-xs text-stone-400 dark:text-stone-500">
      {{ t('conditions.keywordHint', { max: MAX_KEYWORD_TAGS }) }}
    </p>
  </div>
</template>
