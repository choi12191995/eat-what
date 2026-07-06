/**
 * Browser side of the push pipeline: capability detection, subscribe /
 * unsubscribe against the service worker, and syncing the schedule to the
 * push worker. Only the push endpoint + schedule ever leave the device —
 * never keys, location, or history.
 */
import type { NotificationPrefs } from '@/types/models'

import { PUSH_SERVER_URL, PUSH_VAPID_PUBLIC_KEY } from './config'

export type PushSupport = 'ok' | 'iosInstall' | 'unsupported'

/**
 * iOS exposes the Push API only to Home-Screen-installed apps (16.4+), so a
 * plain Safari tab reports as "install first" rather than "unsupported".
 */
export function pushSupport(): PushSupport {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return 'unsupported'
  if ('serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window) {
    return 'ok'
  }
  const isIos =
    /iPhone|iPad|iPod/.test(navigator.userAgent) ||
    (navigator.userAgent.includes('Macintosh') && navigator.maxTouchPoints > 1)
  const standalone =
    (navigator as Navigator & { standalone?: boolean }).standalone === true ||
    window.matchMedia('(display-mode: standalone)').matches
  return isIos && !standalone ? 'iosInstall' : 'unsupported'
}

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const raw = atob((base64 + padding).replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(raw, (c) => c.charCodeAt(0))
}

async function getRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null
  return (await navigator.serviceWorker.getRegistration()) ?? null
}

export async function getExistingSubscription(): Promise<PushSubscription | null> {
  const reg = await getRegistration()
  return reg ? await reg.pushManager.getSubscription() : null
}

export async function syncPrefs(
  sub: PushSubscription,
  prefs: NotificationPrefs,
  locale: string,
): Promise<boolean> {
  try {
    const res = await fetch(`${PUSH_SERVER_URL}/subscribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subscription: sub.toJSON(),
        tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
        locale,
        prefs,
      }),
    })
    return res.ok
  } catch {
    return false
  }
}

export type EnableResult =
  | { ok: true }
  | { ok: false; reason: 'denied' | 'noSw' | 'subscribeFailed' | 'serverError' }

/** Must be called from a user gesture — it triggers the permission prompt. */
export async function enablePush(prefs: NotificationPrefs, locale: string): Promise<EnableResult> {
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return { ok: false, reason: 'denied' }

  // The SW only exists in production builds — dev mode has none
  const reg = await getRegistration()
  if (!reg) return { ok: false, reason: 'noSw' }

  let sub = await reg.pushManager.getSubscription()
  if (!sub) {
    try {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(PUSH_VAPID_PUBLIC_KEY) as BufferSource,
      })
    } catch {
      return { ok: false, reason: 'subscribeFailed' }
    }
  }

  return (await syncPrefs(sub, prefs, locale)) ? { ok: true } : { ok: false, reason: 'serverError' }
}

export async function disablePush(): Promise<void> {
  const sub = await getExistingSubscription()
  if (!sub) return
  try {
    await fetch(`${PUSH_SERVER_URL}/subscribe`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint: sub.endpoint }),
    })
  } catch {
    // Server cleanup is best-effort; the cron prunes dead endpoints anyway
  }
  await sub.unsubscribe()
}

export type HealResult = 'synced' | 'failed' | 'none'

/**
 * Self-healing re-registration, safe to call on every app open (no user
 * gesture needed once permission is granted). iOS can silently invalidate a
 * push endpoint — e.g. across app/service-worker updates — which leaves the
 * server pushing into a void until it prunes the record. Re-reading the
 * live subscription and re-upserting it keeps the server's copy current,
 * and re-subscribes if the browser lost the subscription entirely.
 */
export async function healSubscription(
  prefs: NotificationPrefs,
  locale: string,
): Promise<HealResult> {
  if (pushSupport() !== 'ok' || Notification.permission !== 'granted') return 'none'
  const reg = await getRegistration()
  if (!reg) return 'none'

  let sub = await reg.pushManager.getSubscription()
  if (!sub) {
    if (!prefs.lunch.enabled && !prefs.dinner.enabled) return 'none'
    try {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(PUSH_VAPID_PUBLIC_KEY) as BufferSource,
      })
    } catch {
      return 'failed'
    }
  }
  return (await syncPrefs(sub, prefs, locale)) ? 'synced' : 'failed'
}

/** "12:07" → "12:00", "12:08" → "12:15" — reminders align to quarter hours. */
export function snapToQuarter(time: string): string {
  const m = /^(\d{1,2}):(\d{2})$/.exec(time)
  if (!m) return time
  let total = Math.round((Number(m[1]) * 60 + Number(m[2])) / 15) * 15
  if (total >= 24 * 60) total = 23 * 60 + 45
  const h = Math.floor(total / 60)
  const min = total % 60
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`
}

export async function sendTestPush(): Promise<boolean> {
  const sub = await getExistingSubscription()
  if (!sub) return false
  try {
    const res = await fetch(`${PUSH_SERVER_URL}/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint: sub.endpoint }),
    })
    return res.ok
  } catch {
    return false
  }
}
