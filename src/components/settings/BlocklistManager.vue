<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'

import { createBlocklistRepo } from '@/lib/db/historyRepo'
import { getDb } from '@/lib/db/schema'
import type { BlockRow } from '@/lib/db/schema'

const { t } = useI18n()
const repo = createBlocklistRepo(getDb())
const rows = ref<BlockRow[]>([])

async function load() {
  rows.value = await repo.list()
}
onMounted(load)

async function remove(placeId: string) {
  await repo.remove(placeId)
  await load()
}
</script>

<template>
  <section class="mb-8">
    <h2 class="mb-2 text-sm font-semibold tracking-wide text-stone-500 uppercase dark:text-stone-400">
      🚫 {{ t('settings.blocklist.title') }}
    </h2>
    <p v-if="!rows.length" class="text-xs text-stone-400 dark:text-stone-500">
      {{ t('settings.blocklist.empty') }}
    </p>
    <ul v-else class="space-y-2">
      <li
        v-for="row in rows"
        :key="row.placeId"
        class="flex items-center justify-between rounded-xl border border-stone-200 px-3 py-2 text-sm dark:border-stone-800"
      >
        <span class="truncate">{{ row.name }}</span>
        <button
          type="button"
          class="ml-2 shrink-0 text-xs font-semibold text-orange-600 underline dark:text-orange-400"
          @click="remove(row.placeId)"
        >
          {{ t('settings.blocklist.unblock') }}
        </button>
      </li>
    </ul>
  </section>
</template>
