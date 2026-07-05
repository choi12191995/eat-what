<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'

import { createHistoryRepo } from '@/lib/db/historyRepo'
import { getDb } from '@/lib/db/schema'

const { t } = useI18n()
const repo = createHistoryRepo(getDb())
const cleared = ref(false)

async function exportJson() {
  const json = await repo.exportJson()
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `eatwhat-export-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
}

async function clearAll() {
  if (!confirm(t('settings.data.confirmClear'))) return
  await repo.clearAll()
  cleared.value = true
  setTimeout(() => (cleared.value = false), 2000)
}
</script>

<template>
  <section class="mb-8">
    <h2 class="mb-2 text-sm font-semibold tracking-wide text-stone-500 uppercase dark:text-stone-400">
      💾 {{ t('settings.data.title') }}
    </h2>
    <p class="mb-3 text-xs text-stone-400 dark:text-stone-500">{{ t('settings.data.note') }}</p>
    <div class="flex gap-2">
      <button
        type="button"
        class="flex-1 rounded-xl border border-stone-300 px-3 py-2 text-sm text-stone-600 dark:border-stone-700 dark:text-stone-300"
        @click="exportJson"
      >
        ⬇️ {{ t('settings.data.export') }}
      </button>
      <button
        type="button"
        class="flex-1 rounded-xl border border-red-300 px-3 py-2 text-sm text-red-600 dark:border-red-900 dark:text-red-400"
        @click="clearAll"
      >
        {{ cleared ? '✓' : '🗑️' }} {{ t('settings.data.clear') }}
      </button>
    </div>
  </section>
</template>
