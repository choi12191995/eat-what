<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'

import { listModels } from '@/lib/ai/client'
import { useSettingsStore } from '@/stores/settings'

const { t } = useI18n()
const settings = useSettingsStore()

const models = ref<string[]>([])
const status = ref<'idle' | 'loading' | 'loaded' | 'error'>('idle')

async function loadModels() {
  status.value = 'loading'
  try {
    models.value = await listModels({ baseUrl: settings.aiBaseUrl, apiKey: settings.aiApiKey })
    status.value = 'loaded'
    if (!settings.aiModel && models.value.length) settings.aiModel = models.value[0]!
  } catch {
    status.value = 'error'
    models.value = []
  }
}

function clearAi() {
  settings.aiApiKey = ''
  settings.aiModel = ''
  models.value = []
  status.value = 'idle'
}
</script>

<template>
  <section class="mb-8">
    <h2 class="mb-2 text-sm font-semibold tracking-wide text-stone-500 uppercase dark:text-stone-400">
      🤖 {{ t('settings.ai.title') }}
    </h2>
    <p class="mb-3 text-xs text-stone-400 dark:text-stone-500">{{ t('settings.ai.note') }}</p>

    <div class="space-y-2">
      <label class="block">
        <span class="mb-1 block text-xs text-stone-500 dark:text-stone-400">
          {{ t('settings.ai.baseUrl') }}
        </span>
        <input
          v-model="settings.aiBaseUrl"
          type="url"
          autocomplete="off"
          spellcheck="false"
          placeholder="https://api.openai.com/v1"
          class="w-full rounded-xl border border-stone-300 bg-transparent px-3 py-2 font-mono text-xs outline-none focus:border-orange-500 dark:border-stone-700"
        />
      </label>

      <label class="block">
        <span class="mb-1 block text-xs text-stone-500 dark:text-stone-400">
          {{ t('settings.ai.apiKey') }}
        </span>
        <input
          v-model="settings.aiApiKey"
          type="password"
          autocomplete="off"
          placeholder="sk-…"
          class="w-full rounded-xl border border-stone-300 bg-transparent px-3 py-2 font-mono text-xs outline-none focus:border-orange-500 dark:border-stone-700"
        />
      </label>

      <div class="flex items-end gap-2">
        <label class="min-w-0 flex-1">
          <span class="mb-1 block text-xs text-stone-500 dark:text-stone-400">
            {{ t('settings.ai.model') }}
          </span>
          <select
            v-if="models.length"
            v-model="settings.aiModel"
            class="w-full rounded-xl border border-stone-300 bg-transparent px-3 py-2 text-xs outline-none focus:border-orange-500 dark:border-stone-700 dark:bg-stone-900"
          >
            <option v-for="m in models" :key="m" :value="m">{{ m }}</option>
          </select>
          <input
            v-else
            v-model="settings.aiModel"
            type="text"
            autocomplete="off"
            spellcheck="false"
            :placeholder="t('settings.ai.modelPlaceholder')"
            class="w-full rounded-xl border border-stone-300 bg-transparent px-3 py-2 font-mono text-xs outline-none focus:border-orange-500 dark:border-stone-700"
          />
        </label>
        <button
          type="button"
          class="shrink-0 rounded-xl border border-stone-300 px-3 py-2 text-xs font-semibold text-stone-600 disabled:opacity-50 dark:border-stone-700 dark:text-stone-300"
          :disabled="status === 'loading' || !settings.aiBaseUrl || !settings.aiApiKey"
          @click="loadModels"
        >
          {{ status === 'loading' ? '…' : t('settings.ai.loadModels') }}
        </button>
        <button
          v-if="settings.aiApiKey"
          type="button"
          class="shrink-0 rounded-xl border border-stone-300 px-3 py-2 text-xs text-stone-500 dark:border-stone-700"
          @click="clearAi"
        >
          ✕
        </button>
      </div>
      <p v-if="status === 'error'" class="text-xs text-red-500">{{ t('settings.ai.loadError') }}</p>
      <p v-else-if="status === 'loaded'" class="text-xs text-emerald-600 dark:text-emerald-400">
        ✅ {{ t('settings.ai.loaded', { n: models.length }) }}
      </p>
    </div>
  </section>
</template>
