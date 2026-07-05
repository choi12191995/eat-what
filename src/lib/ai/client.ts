import type { Restaurant } from '@/types/models'
import { blurbMessages, conciergeMessages } from './prompts'

export interface AiConfig {
  baseUrl: string
  apiKey: string
  model: string
}

export function aiConfigured(cfg: AiConfig): boolean {
  return !!(cfg.baseUrl.trim() && cfg.apiKey.trim() && cfg.model.trim())
}

function normalizeBase(baseUrl: string): string {
  return baseUrl.trim().replace(/\/+$/, '')
}

/** GET {base}/models → list of model ids (OpenAI format). */
export async function listModels(cfg: Pick<AiConfig, 'baseUrl' | 'apiKey'>): Promise<string[]> {
  const res = await fetch(`${normalizeBase(cfg.baseUrl)}/models`, {
    headers: { Authorization: `Bearer ${cfg.apiKey}` },
    signal: AbortSignal.timeout(12_000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const data = (await res.json()) as { data?: { id?: string }[] }
  return (data.data ?? [])
    .map((m) => m.id)
    .filter((id): id is string => !!id)
    .sort()
}

interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

/** POST chat/completions; every failure returns null — AI is strictly optional. */
async function chat(cfg: AiConfig, messages: ChatMessage[]): Promise<string | null> {
  try {
    const res = await fetch(`${normalizeBase(cfg.baseUrl)}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${cfg.apiKey}`,
      },
      body: JSON.stringify({ model: cfg.model, messages, temperature: 0.7 }),
      signal: AbortSignal.timeout(15_000),
    })
    if (!res.ok) return null
    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[]
    }
    return data.choices?.[0]?.message?.content ?? null
  } catch {
    return null
  }
}

/**
 * Tolerant JSON extractor for LLM output: strips code fences and grabs the
 * first {...} block. Returns null when nothing parses.
 */
export function extractJson<T>(text: string): T | null {
  const cleaned = text.replace(/```[a-z]*\n?/gi, '').replace(/```/g, '')
  const start = cleaned.indexOf('{')
  const end = cleaned.lastIndexOf('}')
  if (start < 0 || end <= start) return null
  try {
    return JSON.parse(cleaned.slice(start, end + 1)) as T
  } catch {
    return null
  }
}

export interface ConciergePick {
  placeId: string
  reason: string
}

/** Ask the AI to pick one candidate for the diner's mood. Invalid picks → null. */
export async function conciergePick(
  cfg: AiConfig,
  candidates: Restaurant[],
  mood: string,
  locale: string,
  partySize?: number,
): Promise<ConciergePick | null> {
  if (!aiConfigured(cfg) || candidates.length === 0) return null
  const raw = await chat(cfg, conciergeMessages(candidates, mood, locale, partySize))
  if (!raw) return null
  const parsed = extractJson<{ placeId?: unknown; reason?: unknown }>(raw)
  if (!parsed || typeof parsed.placeId !== 'string' || typeof parsed.reason !== 'string') {
    return null
  }
  if (!candidates.some((c) => c.id === parsed.placeId)) return null
  return { placeId: parsed.placeId, reason: parsed.reason.slice(0, 140) }
}

/** One-line appetizing blurb for the result card. */
export async function blurb(cfg: AiConfig, r: Restaurant, locale: string): Promise<string | null> {
  if (!aiConfigured(cfg)) return null
  const raw = await chat(cfg, blurbMessages(r, locale))
  if (!raw) return null
  const line = raw.trim().split('\n')[0]?.trim()
  return line ? line.slice(0, 160) : null
}
