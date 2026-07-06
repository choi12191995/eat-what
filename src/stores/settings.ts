import { ref } from 'vue'
import { defineStore } from 'pinia'

import type { DrawConditions, NotificationPrefs } from '@/types/models'
import { makeDefaultConditions } from '@/lib/draw/defaults'

export type ThemePref = 'light' | 'dark' | 'system'
export type AppLocale = 'en' | 'zh-TW'

function detectLocale(): AppLocale {
  if (typeof navigator !== 'undefined' && navigator.language?.toLowerCase().startsWith('zh')) {
    return 'zh-TW'
  }
  return 'en'
}

export const useSettingsStore = defineStore(
  'settings',
  () => {
    const locale = ref<AppLocale>(detectLocale())
    const theme = ref<ThemePref>('system')

    // BYO keys — stored only on this device, never shipped in the build
    const googleApiKey = ref('')
    const aiBaseUrl = ref('https://api.openai.com/v1')
    const aiApiKey = ref('')
    const aiModel = ref('')

    // Starting point for every session's draw conditions
    const defaultConditions = ref<DrawConditions>(makeDefaultConditions())

    // Meal notification schedule (Phase 2) — delivery lives on the push
    // worker; this is the local editing copy, synced on change
    const notifications = ref<NotificationPrefs>({
      lunch: { enabled: false, time: '12:00', days: [1, 2, 3, 4, 5] },
      dinner: { enabled: false, time: '18:00', days: [1, 2, 3, 4, 5, 6, 0] },
    })

    // Onboarding checklist state
    const setupDismissed = ref(false)
    const setupTicks = ref({ project: false, restrict: false, cap: false })
    /** Runtime-only: whether the setup checklist overlay is open */
    const setupOpen = ref(false)

    return {
      locale,
      theme,
      googleApiKey,
      aiBaseUrl,
      aiApiKey,
      aiModel,
      defaultConditions,
      notifications,
      setupDismissed,
      setupTicks,
      setupOpen,
    }
  },
  {
    persist: {
      pick: [
        'locale',
        'theme',
        'googleApiKey',
        'aiBaseUrl',
        'aiApiKey',
        'aiModel',
        'defaultConditions',
        'notifications',
        'setupDismissed',
        'setupTicks',
      ],
    },
  },
)
