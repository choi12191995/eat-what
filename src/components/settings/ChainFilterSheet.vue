<script setup lang="ts">
/**
 * Editor for the chain/fast-food brand list: the curated patterns can be
 * tapped off individually, and the diner can add their own keywords. In
 * force whenever 唔要快餐 or 唔要連鎖店 is on; edits mark any fetched pool
 * stale so the next draw/room re-queries.
 */
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'

import BottomSheet from '@/components/ui/BottomSheet.vue'
import { CHAIN_PATTERNS, normalizeBrand } from '@/lib/places/chains'
import { useSettingsStore } from '@/stores/settings'
import { useHaptics } from '@/composables/useHaptics'

defineProps<{ open: boolean }>()
const emit = defineEmits<{ close: [] }>()

const { t } = useI18n()
const settings = useSettingsStore()
const haptics = useHaptics()

const draft = ref('')
const MAX_CUSTOM = 30

const activeCount = computed(
  () => CHAIN_PATTERNS.length - settings.chainDisabled.length + settings.chainCustom.length,
)

function isDisabled(pattern: string): boolean {
  return settings.chainDisabled.includes(pattern)
}

function togglePattern(pattern: string) {
  settings.chainDisabled = isDisabled(pattern)
    ? settings.chainDisabled.filter((p) => p !== pattern)
    : [...settings.chainDisabled, pattern]
  haptics.tap()
}

function addCustom() {
  const raw = draft.value.trim()
  const normalized = normalizeBrand(raw)
  if (!raw || normalized.length < 2 || settings.chainCustom.length >= MAX_CUSTOM) return
  if (settings.chainCustom.some((k) => normalizeBrand(k) === normalized)) {
    draft.value = ''
    return
  }
  settings.chainCustom = [...settings.chainCustom, raw]
  draft.value = ''
  haptics.tap()
}

function removeCustom(keyword: string) {
  settings.chainCustom = settings.chainCustom.filter((k) => k !== keyword)
}
</script>

<template>
  <BottomSheet :open="open" @close="emit('close')">
    <div class="space-y-5 px-6 pt-1 pb-4">
      <div>
        <h2 class="text-lg font-bold">⛓️ {{ t('settings.chains.title') }}</h2>
        <p class="mt-1 text-xs text-stone-400 dark:text-stone-500">
          {{ t('settings.chains.note', { n: activeCount }) }}
        </p>
      </div>

      <!-- own keywords -->
      <section>
        <h3 class="mb-2 text-sm font-semibold tracking-wide text-stone-500 uppercase dark:text-stone-400">
          {{ t('settings.chains.custom') }}
        </h3>
        <div class="flex gap-2">
          <input
            v-model="draft"
            type="text"
            maxlength="40"
            :placeholder="t('settings.chains.customPlaceholder')"
            class="min-w-0 flex-1 rounded-2xl border border-stone-300 bg-transparent px-4 py-2.5 text-sm outline-none placeholder:text-stone-400 focus:border-orange-500 dark:border-stone-700"
            @keyup.enter="addCustom"
          />
          <button
            type="button"
            class="rounded-2xl bg-orange-500 px-4 text-sm font-bold text-white active:scale-95 disabled:opacity-50"
            :disabled="!draft.trim()"
            @click="addCustom"
          >
            ＋
          </button>
        </div>
        <div v-if="settings.chainCustom.length" class="mt-2 flex flex-wrap gap-2">
          <button
            v-for="keyword in settings.chainCustom"
            :key="keyword"
            type="button"
            class="rounded-full border border-red-300 bg-red-50 px-3 py-1.5 text-sm text-red-600 active:scale-95 dark:border-red-900 dark:bg-red-950 dark:text-red-400"
            @click="removeCustom(keyword)"
          >
            {{ keyword }} ✕
          </button>
        </div>
      </section>

      <!-- curated defaults, each can be switched off -->
      <section>
        <h3 class="mb-2 text-sm font-semibold tracking-wide text-stone-500 uppercase dark:text-stone-400">
          {{ t('settings.chains.builtin') }}
        </h3>
        <p class="mb-2 text-xs text-stone-400 dark:text-stone-500">
          {{ t('settings.chains.builtinHint') }}
        </p>
        <div class="flex flex-wrap gap-1.5">
          <button
            v-for="pattern in CHAIN_PATTERNS"
            :key="pattern"
            type="button"
            class="rounded-full border px-2.5 py-1 text-xs transition-all active:scale-95"
            :class="
              isDisabled(pattern)
                ? 'border-stone-200 text-stone-300 line-through dark:border-stone-800 dark:text-stone-600'
                : 'border-stone-300 text-stone-600 dark:border-stone-700 dark:text-stone-300'
            "
            @click="togglePattern(pattern)"
          >
            {{ pattern }}
          </button>
        </div>
      </section>

      <button
        type="button"
        class="w-full rounded-2xl bg-orange-500 py-3 text-sm font-bold text-white shadow-md active:scale-95"
        @click="emit('close')"
      >
        {{ t('common.close') }}
      </button>
    </div>
  </BottomSheet>
</template>
