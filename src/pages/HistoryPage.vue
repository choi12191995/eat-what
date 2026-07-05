<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
</script>

<template>
  <div class="mx-auto max-w-md px-6 pt-10">
    <h1 class="mb-6 text-2xl font-bold">{{ t('nav.history') }}</h1>
    <p class="text-sm text-stone-500 dark:text-stone-400">{{ t('history.empty') }}</p>
  </div>
</template>
