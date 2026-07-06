/**
 * eat-what-push — tiny Cloudflare Worker that delivers the lunch/dinner
 * nudges. It stores push subscriptions + schedules in KV and sends VAPID
 * web push on a 15-minute cron, in each subscriber's own timezone.
 *
 * Privacy contract: this worker never sees Google/AI keys, locations, or
 * draw history — only a push endpoint and the notification schedule.
 */
import { buildPushPayload } from '@block65/webcrypto-web-push'

import { mealCopy, testCopy, type NotificationCopy } from './copy'
import { dueMeals, localParts, parseTime, type MealPref, type MealPrefs } from './schedule'
import type { Env, StoredSubscription } from './types'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

const MAX_BODY_BYTES = 8192

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  })
}

/** Endpoint URLs can exceed KV's key length limit — hash them. */
async function kvKey(endpoint: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(endpoint))
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

function isMealPref(v: unknown): v is MealPref {
  if (typeof v !== 'object' || v === null) return false
  const m = v as Record<string, unknown>
  return (
    typeof m.enabled === 'boolean' &&
    typeof m.time === 'string' &&
    parseTime(m.time) !== null &&
    Array.isArray(m.days) &&
    m.days.length <= 7 &&
    m.days.every((d) => Number.isInteger(d) && (d as number) >= 0 && (d as number) <= 6)
  )
}

function isPrefs(v: unknown): v is MealPrefs {
  if (typeof v !== 'object' || v === null) return false
  const p = v as Record<string, unknown>
  return isMealPref(p.lunch) && isMealPref(p.dinner)
}

/** Validate and normalize the wire subscription into the stored shape. */
function parseSubscription(v: unknown): StoredSubscription['subscription'] | null {
  if (typeof v !== 'object' || v === null) return null
  const s = v as Record<string, unknown>
  const keys = s.keys as Record<string, unknown> | undefined
  if (
    typeof s.endpoint !== 'string' ||
    !s.endpoint.startsWith('https://') ||
    s.endpoint.length >= 1024 ||
    typeof keys?.p256dh !== 'string' ||
    typeof keys?.auth !== 'string'
  ) {
    return null
  }
  return {
    endpoint: s.endpoint,
    expirationTime: typeof s.expirationTime === 'number' ? s.expirationTime : null,
    keys: { p256dh: keys.p256dh, auth: keys.auth },
  }
}

async function readBody(request: Request): Promise<Record<string, unknown> | null> {
  const text = await request.text()
  if (text.length > MAX_BODY_BYTES) return null
  try {
    const parsed: unknown = JSON.parse(text)
    return typeof parsed === 'object' && parsed !== null
      ? (parsed as Record<string, unknown>)
      : null
  } catch {
    return null
  }
}

type SendResult = 'ok' | 'gone' | 'error'

async function sendPush(
  env: Env,
  stored: StoredSubscription,
  copy: NotificationCopy,
  extra: { url: string; tag: string; topic: string },
): Promise<SendResult> {
  try {
    const payload = await buildPushPayload(
      {
        data: JSON.stringify({
          title: copy.title,
          body: copy.body,
          url: extra.url,
          tag: extra.tag,
          lang: stored.locale,
        }),
        options: { ttl: 1800, urgency: 'normal', topic: extra.topic },
      },
      stored.subscription,
      {
        subject: env.VAPID_SUBJECT,
        publicKey: env.VAPID_PUBLIC_KEY,
        privateKey: env.VAPID_PRIVATE_KEY,
      },
    )
    const res = await fetch(stored.subscription.endpoint, payload)
    if (res.status === 404 || res.status === 410) return 'gone'
    return res.ok ? 'ok' : 'error'
  } catch {
    return 'error'
  }
}

async function handleSubscribe(request: Request, env: Env): Promise<Response> {
  const body = await readBody(request)
  if (!body) return json({ error: 'bad request' }, 400)

  const { subscription: rawSubscription, tz, locale, prefs } = body
  const subscription = parseSubscription(rawSubscription)
  if (!subscription) return json({ error: 'invalid subscription' }, 400)
  if (typeof tz !== 'string' || !localParts(new Date(), tz)) {
    return json({ error: 'invalid timezone' }, 400)
  }
  if (!isPrefs(prefs)) return json({ error: 'invalid prefs' }, 400)

  const key = await kvKey(subscription.endpoint)
  const existing = await env.SUBS.get<StoredSubscription>(key, 'json')
  const record: StoredSubscription = {
    subscription,
    tz,
    locale: locale === 'zh-TW' ? 'zh-TW' : 'en',
    prefs,
    // A prefs update must not re-fire a meal already sent today
    lastSent: existing?.lastSent,
    updatedAt: new Date().toISOString(),
  }
  await env.SUBS.put(key, JSON.stringify(record))
  return json({ ok: true })
}

async function handleUnsubscribe(request: Request, env: Env): Promise<Response> {
  const body = await readBody(request)
  const endpoint = body?.endpoint
  if (typeof endpoint !== 'string') return json({ error: 'bad request' }, 400)
  await env.SUBS.delete(await kvKey(endpoint))
  return json({ ok: true })
}

async function handleTest(request: Request, env: Env): Promise<Response> {
  const body = await readBody(request)
  const endpoint = body?.endpoint
  if (typeof endpoint !== 'string') return json({ error: 'bad request' }, 400)
  const key = await kvKey(endpoint)
  const stored = await env.SUBS.get<StoredSubscription>(key, 'json')
  if (!stored) return json({ error: 'not subscribed' }, 404)
  const result = await sendPush(env, stored, testCopy(stored.locale), {
    url: '/',
    tag: 'eat-what-test',
    topic: 'test',
  })
  if (result === 'gone') {
    await env.SUBS.delete(key)
    return json({ error: 'subscription expired' }, 410)
  }
  return result === 'ok' ? json({ ok: true }) : json({ error: 'push failed' }, 502)
}

async function deliverDue(env: Env, now: Date): Promise<void> {
  let cursor: string | undefined
  do {
    const page = await env.SUBS.list({ cursor })
    for (const { name: key } of page.keys) {
      const stored = await env.SUBS.get<StoredSubscription>(key, 'json')
      if (!stored) continue

      const due = dueMeals(stored.prefs, stored.lastSent ?? {}, now, stored.tz)
      if (!due.length) continue

      let gone = false
      for (const { meal, date } of due) {
        const result = await sendPush(env, stored, mealCopy(meal, stored.locale), {
          url: '/?draw=1',
          tag: `eat-what-${meal}`,
          topic: meal,
        })
        if (result === 'gone') {
          gone = true
          break
        }
        if (result === 'ok') {
          stored.lastSent = { ...stored.lastSent, [meal]: date }
        }
      }

      if (gone) {
        await env.SUBS.delete(key)
      } else {
        await env.SUBS.put(key, JSON.stringify(stored))
      }
    }
    cursor = page.list_complete ? undefined : page.cursor
  } while (cursor)
}

export default {
  async fetch(request, env): Promise<Response> {
    const url = new URL(request.url)
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS_HEADERS })
    if (url.pathname === '/' && request.method === 'GET') {
      return json({ service: 'eat-what-push', ok: true })
    }
    if (url.pathname === '/subscribe' && request.method === 'POST') {
      return handleSubscribe(request, env)
    }
    if (url.pathname === '/subscribe' && request.method === 'DELETE') {
      return handleUnsubscribe(request, env)
    }
    if (url.pathname === '/test' && request.method === 'POST') {
      return handleTest(request, env)
    }
    return json({ error: 'not found' }, 404)
  },

  async scheduled(_controller, env, ctx): Promise<void> {
    ctx.waitUntil(deliverDue(env, new Date()))
  },
} satisfies ExportedHandler<Env>
