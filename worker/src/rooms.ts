/**
 * Group-draw rooms: the host shares their wheel candidates, each friend
 * gets ONE veto, the host runs the final draw. Rooms live in the same KV
 * as push subscriptions under `room:` keys with a 1-hour TTL — no accounts,
 * no PII, just restaurant names that are public data anyway.
 */
import type { Env } from './types'

export interface RoomCandidate {
  id: string
  name: string
  emoji: string
  mapsUrl?: string
}

export interface Room {
  candidates: RoomCandidate[]
  /** placeId → voterId of whoever vetoed it (one veto per voter) */
  vetoes: Record<string, string>
  result: { placeId: string } | null
  hostToken: string
  locale: string
  createdAt: string
}

const ROOM_TTL_SECONDS = 60 * 60
const ID_ALPHABET = 'ABCDEFGHJKMNPQRSTVWXYZ23456789' // no 0/O/1/I/L

export function roomKey(id: string): string {
  return `room:${id.toUpperCase()}`
}

function newRoomId(): string {
  const buf = new Uint8Array(6)
  crypto.getRandomValues(buf)
  return [...buf].map((b) => ID_ALPHABET[b % ID_ALPHABET.length]).join('')
}

function parseCandidates(v: unknown): RoomCandidate[] | null {
  if (!Array.isArray(v) || v.length < 2 || v.length > 10) return null
  const out: RoomCandidate[] = []
  for (const item of v) {
    const c = item as Record<string, unknown>
    if (typeof c?.id !== 'string' || typeof c?.name !== 'string') return null
    if (c.id.length > 300 || c.name.length > 200) return null
    out.push({
      id: c.id,
      name: c.name,
      emoji: typeof c.emoji === 'string' ? c.emoji.slice(0, 8) : '🍽️',
      mapsUrl:
        typeof c.mapsUrl === 'string' && c.mapsUrl.startsWith('https://') ? c.mapsUrl : undefined,
    })
  }
  return out
}

/** Public view: everything except the host token. */
export function publicRoom(room: Room): Omit<Room, 'hostToken'> {
  return {
    candidates: room.candidates,
    vetoes: room.vetoes,
    result: room.result,
    locale: room.locale,
    createdAt: room.createdAt,
  }
}

export async function createRoom(
  env: Env,
  body: Record<string, unknown>,
): Promise<{ status: number; payload: unknown }> {
  const candidates = parseCandidates(body.candidates)
  if (!candidates) return { status: 400, payload: { error: 'invalid candidates' } }
  const roomId = newRoomId()
  const room: Room = {
    candidates,
    vetoes: {},
    result: null,
    hostToken: crypto.randomUUID(),
    locale: body.locale === 'zh-TW' ? 'zh-TW' : 'en',
    createdAt: new Date().toISOString(),
  }
  await env.SUBS.put(roomKey(roomId), JSON.stringify(room), { expirationTtl: ROOM_TTL_SECONDS })
  return { status: 200, payload: { roomId, hostToken: room.hostToken } }
}

export async function getRoom(env: Env, id: string): Promise<Room | null> {
  if (!/^[A-Za-z0-9]{6}$/.test(id)) return null
  return env.SUBS.get<Room>(roomKey(id), 'json')
}

export async function applyVeto(
  env: Env,
  id: string,
  body: Record<string, unknown>,
): Promise<{ status: number; payload: unknown }> {
  const room = await getRoom(env, id)
  if (!room) return { status: 404, payload: { error: 'room not found' } }
  const { placeId, voterId } = body
  if (typeof placeId !== 'string' || typeof voterId !== 'string' || voterId.length > 64) {
    return { status: 400, payload: { error: 'bad request' } }
  }
  if (room.result) return { status: 409, payload: { error: 'already drawn' } }
  if (!room.candidates.some((c) => c.id === placeId)) {
    return { status: 400, payload: { error: 'unknown candidate' } }
  }
  const alreadyVetoedBy = Object.values(room.vetoes).includes(voterId)
  const vetoCount = Object.keys(room.vetoes).length
  // One veto per person, and at least one candidate must survive
  if (!alreadyVetoedBy && vetoCount < room.candidates.length - 1 && !room.vetoes[placeId]) {
    room.vetoes[placeId] = voterId
    await env.SUBS.put(roomKey(id), JSON.stringify(room), { expirationTtl: ROOM_TTL_SECONDS })
  }
  return { status: 200, payload: publicRoom(room) }
}

export async function setResult(
  env: Env,
  id: string,
  body: Record<string, unknown>,
): Promise<{ status: number; payload: unknown }> {
  const room = await getRoom(env, id)
  if (!room) return { status: 404, payload: { error: 'room not found' } }
  const { hostToken, placeId } = body
  if (hostToken !== room.hostToken) return { status: 403, payload: { error: 'not the host' } }
  if (typeof placeId !== 'string' || !room.candidates.some((c) => c.id === placeId)) {
    return { status: 400, payload: { error: 'unknown candidate' } }
  }
  if (!room.result) {
    room.result = { placeId }
    await env.SUBS.put(roomKey(id), JSON.stringify(room), { expirationTtl: ROOM_TTL_SECONDS })
  }
  return { status: 200, payload: publicRoom(room) }
}
