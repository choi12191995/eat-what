import type { Meal, MealPrefs } from './schedule'

/** Wire + KV shape. The worker stores ONLY this — never any user API key. */
export interface StoredSubscription {
  subscription: {
    endpoint: string
    expirationTime: number | null
    keys: { p256dh: string; auth: string }
  }
  /** IANA timezone from the subscriber's device */
  tz: string
  /** 'en' | 'zh-TW' — which copy to send */
  locale: string
  prefs: MealPrefs
  /** Local date (YYYY-MM-DD) of the last send, per meal — dedup across cron runs */
  lastSent?: Partial<Record<Meal, string>>
  updatedAt?: string
}

export interface Env {
  SUBS: KVNamespace
  VAPID_PUBLIC_KEY: string
  VAPID_SUBJECT: string
  /** Worker secret — set via `wrangler secret put VAPID_PRIVATE_KEY` */
  VAPID_PRIVATE_KEY: string
}
