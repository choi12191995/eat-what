<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'

import { useDrawStore } from '@/stores/draw'
import { useSettingsStore } from '@/stores/settings'
import { useHaptics } from '@/composables/useHaptics'

const { t } = useI18n()
const drawStore = useDrawStore()
const settings = useSettingsStore()
const haptics = useHaptics()

const MAX_PRESETS = 8
const saving = ref(false)
const label = ref('')
const appliedId = ref<string | null>(null)

function apply(id: string) {
  const preset = settings.presets.find((p) => p.id === id)
  if (!preset) return
  drawStore.applyConditions(preset.conditions)
  appliedId.value = id
  haptics.tap()
  setTimeout(() => {
    if (appliedId.value === id) appliedId.value = null
  }, 1500)
}

function remove(id: string) {
  settings.presets = settings.presets.filter((p) => p.id !== id)
}

function save() {
  const name = label.value.trim().slice(0, 20)
  if (!name) return
  settings.presets = [
    ...settings.presets,
    {
      id: crypto.randomUUID(),
      label: name,
      conditions: JSON.parse(JSON.stringify(drawStore.conditions)),
    },
  ].slice(0, MAX_PRESETS)
  label.value = ''
  saving.value = false
  haptics.tap()
}
</script>

<template>
  <div>
    <div class="flex flex-wrap items-center gap-2">
      <span
        v-for="p in settings.presets"
        :key="p.id"
        class="inline-flex items-center overflow-hidden rounded-full border text-sm transition-colors"
        :class="
          appliedId === p.id
            ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
            : 'border-orange-300 text-orange-600 dark:border-orange-800 dark:text-orange-400'
        "
      >
        <button type="button" class="py-1.5 pl-3 font-semibold active:scale-95" @click="apply(p.id)">
          {{ appliedId === p.id ? '✅' : '⭐' }} {{ p.label }}
        </button>
        <button
          type="button"
          class="px-2 py-1.5 text-xs text-stone-400 dark:text-stone-500"
          :aria-label="`${t('conditions.presets.remove')} ${p.label}`"
          @click="remove(p.id)"
        >
          ✕
        </button>
      </span>

      <button
        v-if="!saving && settings.presets.length < MAX_PRESETS"
        type="button"
        class="rounded-full border border-dashed border-stone-300 px-3 py-1.5 text-sm text-stone-500 active:scale-95 dark:border-stone-700 dark:text-stone-400"
        @click="saving = true"
      >
        ＋ {{ t('conditions.presets.save') }}
      </button>
    </div>

    <div v-if="saving" class="mt-2 flex gap-2">
      <input
        v-model="label"
        type="text"
        maxlength="20"
        :placeholder="t('conditions.presets.placeholder')"
        class="min-w-0 flex-1 rounded-xl border border-stone-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-orange-500 dark:border-stone-700"
        @keyup.enter="save"
      />
      <button
        type="button"
        class="rounded-xl bg-orange-500 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
        :disabled="!label.trim()"
        @click="save"
      >
        {{ t('conditions.presets.confirm') }}
      </button>
      <button
        type="button"
        class="rounded-xl border border-stone-300 px-3 py-2 text-sm text-stone-500 dark:border-stone-700"
        @click="saving = false"
      >
        ✕
      </button>
    </div>
  </div>
</template>
