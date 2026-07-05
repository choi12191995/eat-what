import '@/assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'

import App from '@/App.vue'
import { createAppI18n } from '@/i18n'
import { router } from '@/router'
import { useSettingsStore } from '@/stores/settings'

const pinia = createPinia().use(piniaPluginPersistedstate)
const settings = useSettingsStore(pinia)
const i18n = createAppI18n(settings.locale)

createApp(App).use(pinia).use(router).use(i18n).mount('#app')
