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
      manifest: {
        name: 'EatWhat 食乜好',
        short_name: 'EatWhat',
        description: 'Spin a wheel to decide where to eat — 食乜好？抽一下！',
        lang: 'zh-TW',
        display: 'standalone',
        orientation: 'portrait',
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
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
        navigateFallbackDenylist: [/^\/api/],
        runtimeCaching: [
          {
            // Winner-card photos: cache hard — every network hit costs photo quota
            urlPattern: ({ url }) =>
              (url.hostname === 'places.googleapis.com' && url.pathname.endsWith('/media')) ||
              url.hostname.endsWith('googleusercontent.com'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'place-photos',
              cacheableResponse: { statuses: [0, 200] },
              expiration: { maxEntries: 100, maxAgeSeconds: 7 * 24 * 60 * 60 },
            },
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
