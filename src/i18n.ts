import { createI18n } from 'vue-i18n'
import messages from '@intlify/unplugin-vue-i18n/messages'

export type AppLocale = 'en' | 'zh-TW'

export function createAppI18n(locale: AppLocale) {
  return createI18n({
    legacy: false,
    globalInjection: true,
    locale,
    fallbackLocale: 'en',
    messages,
  })
}
