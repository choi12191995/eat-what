<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
</script>

<template>
  <div class="mx-auto flex max-w-md flex-col items-center gap-6 px-6 pt-16 text-center">
    <img
      src="/favicon.svg"
      alt=""
      class="h-44 w-44 animate-[spin_14s_linear_infinite] drop-shadow-lg"
    />
    <h1 class="text-4xl font-black tracking-tight">{{ t('app.name') }}</h1>
    <p class="text-lg text-stone-600 dark:text-stone-400">{{ t('app.tagline') }}</p>
    <p class="text-sm text-stone-400 dark:text-stone-500">{{ t('home.comingSoon') }}</p>
  </div>
</template>
