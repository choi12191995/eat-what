<script setup lang="ts">
import { useI18n } from 'vue-i18n'

import { useSettingsStore, type AppLocale, type ThemePref } from '@/stores/settings'

const { t } = useI18n()
const settings = useSettingsStore()

const themes: ThemePref[] = ['light', 'dark', 'system']
const languages: { value: AppLocale; label: string }[] = [
  { value: 'en', label: 'English' },
  { value: 'zh-TW', label: '繁體中文' },
]
</script>

<template>
  <div class="mx-auto max-w-md px-6 pt-10">
    <h1 class="mb-6 text-2xl font-bold">{{ t('settings.title') }}</h1>

    <section class="mb-8">
      <h2 class="mb-2 text-sm font-semibold tracking-wide text-stone-500 uppercase dark:text-stone-400">
        {{ t('settings.appearance') }}
      </h2>
      <div class="flex gap-2">
        <button
          v-for="opt in themes"
          :key="opt"
          class="flex-1 rounded-xl border px-3 py-2 text-sm transition-colors"
          :class="
            settings.theme === opt
              ? 'border-orange-500 bg-orange-500/10 font-semibold text-orange-600 dark:text-orange-400'
              : 'border-stone-300 text-stone-600 dark:border-stone-700 dark:text-stone-300'
          "
          @click="settings.theme = opt"
        >
          {{ t(`settings.theme.${opt}`) }}
        </button>
      </div>
    </section>

    <section class="mb-8">
      <h2 class="mb-2 text-sm font-semibold tracking-wide text-stone-500 uppercase dark:text-stone-400">
        {{ t('settings.language') }}
      </h2>
      <div class="flex gap-2">
        <button
          v-for="lang in languages"
          :key="lang.value"
          class="flex-1 rounded-xl border px-3 py-2 text-sm transition-colors"
          :class="
            settings.locale === lang.value
              ? 'border-orange-500 bg-orange-500/10 font-semibold text-orange-600 dark:text-orange-400'
              : 'border-stone-300 text-stone-600 dark:border-stone-700 dark:text-stone-300'
          "
          @click="settings.locale = lang.value"
        >
          {{ lang.label }}
        </button>
      </div>
    </section>
  </div>
</template>
