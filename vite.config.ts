import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import VueI18nPlugin from '@intlify/unplugin-vue-i18n/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    vue(),
    tailwindcss(),
    VueI18nPlugin({
      include: [fileURLToPath(new URL('./src/locales/**', import.meta.url))],
    }),
    VitePWA({
      registerType: 'autoUpdate',
      // Custom service worker (src/sw.ts): precache + photo cache + web push handlers
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
      },
      manifest: {
        name: 'EatWhat 食乜好',
        short_name: 'EatWhat',
        description: 'Spin a wheel to decide where to eat — 食乜好？抽一下！',
        lang: 'zh-TW',
        display: 'standalone',
        orientation: 'portrait',
        // Android WebAPK captures in-scope links (room invites) into the
        // installed app; reuse the open window instead of stacking new ones.
        // iOS ignores this — links there always open the browser, which is
        // why rooms are also joinable in-app by code/QR.
        launch_handler: { client_mode: 'navigate-existing' },
        theme_color: '#fff7ed',
        background_color: '#fff7ed',
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
