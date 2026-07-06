<script setup lang="ts">
import { onMounted, watchEffect } from 'vue'
import { useI18n } from 'vue-i18n'
import { usePreferredDark } from '@vueuse/core'

import TabBar from '@/components/ui/TabBar.vue'
import SetupChecklist from '@/components/onboarding/SetupChecklist.vue'
import IosInstallHint from '@/components/pwa/IosInstallHint.vue'
import { healSubscription } from '@/lib/push/client'
import { useSettingsStore } from '@/stores/settings'

const settings = useSettingsStore()
const systemDark = usePreferredDark()
const { locale } = useI18n()

onMounted(() => {
  if (!settings.googleApiKey && !settings.setupDismissed) settings.setupOpen = true

  // Re-register the push subscription on every open/resume: iOS can rotate
  // or drop endpoints (e.g. across app updates), and the server prunes dead
  // ones — healing keeps reminders alive without any user action.
  void healSubscription(settings.notifications, settings.locale)
  let lastHeal = Date.now()
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') return
    if (Date.now() - lastHeal < 60_000) return
    lastHeal = Date.now()
    void healSubscription(settings.notifications, settings.locale)
  })
})

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
    <main class="flex-1 pb-32">
      <RouterView />
    </main>
    <TabBar />
    <SetupChecklist />
    <IosInstallHint />
  </div>
</template>
