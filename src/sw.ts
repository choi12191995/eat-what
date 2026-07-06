/// <reference lib="webworker" />
/**
 * Custom service worker: precache (vite-plugin-pwa injectManifest),
 * SPA navigation fallback, photo runtime cache, and web push handlers
 * for the lunch/dinner nudges.
 */
import { clientsClaim } from 'workbox-core'
import { CacheableResponsePlugin } from 'workbox-cacheable-response'
import { ExpirationPlugin } from 'workbox-expiration'
import {
  cleanupOutdatedCaches,
  createHandlerBoundToURL,
  precacheAndRoute,
  type PrecacheEntry,
} from 'workbox-precaching'
import { NavigationRoute, registerRoute } from 'workbox-routing'
import { CacheFirst } from 'workbox-strategies'

declare let self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: (string | PrecacheEntry)[]
}

// autoUpdate semantics: a new deploy activates immediately and takes over
// open clients — the page reloads itself, zero user action.
self.skipWaiting()
clientsClaim()

precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()

registerRoute(new NavigationRoute(createHandlerBoundToURL('index.html')))

// Winner-card photos: cache hard — every network hit costs photo quota
registerRoute(
  ({ url }) =>
    (url.hostname === 'places.googleapis.com' && url.pathname.endsWith('/media')) ||
    url.hostname.endsWith('googleusercontent.com'),
  new CacheFirst({
    cacheName: 'place-photos',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 7 * 24 * 60 * 60 }),
    ],
  }),
)

interface PushPayload {
  title?: string
  body?: string
  url?: string
  tag?: string
  lang?: string
}

self.addEventListener('push', (event) => {
  let payload: PushPayload | null = null
  try {
    payload = (event.data?.json() as PushPayload) ?? null
  } catch {
    payload = null
  }
  if (!payload?.title) return
  // iOS requires every push to show a notification — never a silent push
  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
      tag: payload.tag ?? 'eat-what',
      lang: payload.lang,
      data: { url: payload.url ?? '/' },
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = (event.notification.data as { url?: string } | undefined)?.url ?? '/'
  event.waitUntil(
    (async () => {
      const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      const client = clients[0]
      if (client) {
        await client.focus()
        try {
          await client.navigate(url)
        } catch {
          // Some platforms disallow SW-initiated navigation — focusing is enough
        }
      } else {
        await self.clients.openWindow(url)
      }
    })(),
  )
})
