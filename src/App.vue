<script setup lang="ts">
import { watchEffect } from 'vue'
import { useI18n } from 'vue-i18n'
import { usePreferredDark } from '@vueuse/core'

import TabBar from '@/components/ui/TabBar.vue'
import { useSettingsStore } from '@/stores/settings'

const settings = useSettingsStore()
const systemDark = usePreferredDark()
const { locale } = useI18n()

watchEffect(() => {
  const dark = settings.theme === 'dark' || (settings.theme === 'system' && systemDark.value)
  document.documentElement.classList.toggle('dark', dark)
})

watchEffect(() => {
  locale.value = settings.locale
  document.documentElement.lang = settings.locale
})
</script>

<template>
  <div class="flex min-h-dvh flex-col">
    <main class="flex-1 pb-24">
      <RouterView />
    </main>
    <TabBar />
  </div>
</template>
