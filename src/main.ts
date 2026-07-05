import '@/assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'

import App from '@/App.vue'
import { createAppI18n } from '@/i18n'
import { router } from '@/router'
import { useSettingsStore } from '@/stores/settings'

const pinia = createPinia().use(piniaPluginPersistedstate)
const app = createApp(App).use(pinia)

// Store must be created after app.use(pinia) — pinia only activates
// plugins registered pre-install at install time.
const settings = useSettingsStore()
const i18n = createAppI18n(settings.locale)

app.use(router).use(i18n).mount('#app')
