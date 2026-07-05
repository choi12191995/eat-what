import { ref } from 'vue'
import { defineStore } from 'pinia'

import type { DrawConditions } from '@/types/models'
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

    return { locale, theme, googleApiKey, aiBaseUrl, aiApiKey, aiModel, defaultConditions }
  },
  { persist: true },
)
