/**
 * Group-draw rooms client — talks to the same worker as push (rooms are
 * `room:*` KV entries with a 1-hour TTL). Only candidate names/emoji/links
 * leave the device; vetoes are anonymous ids minted per browser.
 */
import type { Restaurant } from '@/types/models'
import { buildGoogleMapsUrl } from '@/lib/links/gmaps'
import { emojiForTypes } from '@/lib/places/cuisines'
import { PUSH_SERVER_URL } from '@/lib/push/config'

export interface RoomCandidate {
  id: string
  name: string
  emoji: string
  mapsUrl?: string
}

export interface RoomView {
  candidates: RoomCandidate[]
  vetoes: Record<string, string>
  result: { placeId: string } | null
  locale: string
  createdAt: string
}

const VOTER_KEY = 'ew.voterId'
const hostKey = (roomId: string) => `ew.room.${roomId}.host`

export function voterId(): string {
  let id = localStorage.getItem(VOTER_KEY)
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem(VOTER_KEY, id)
  }
  return id
}

export function saveHostToken(roomId: string, token: string): void {
  localStorage.setItem(hostKey(roomId), token)
}

export function hostToken(roomId: string): string | null {
  return localStorage.getItem(hostKey(roomId))
}

export function roomUrl(roomId: string): string {
  return `${location.origin}/room/${roomId}`
}

async function request<T>(path: string, init?: RequestInit): Promise<T | null> {
  try {
    const res = await fetch(`${PUSH_SERVER_URL}${path}`, init)
    if (!res.ok) return null
    return (await res.json()) as T
  } catch {
    return null
  }
}

export async function createRoom(
  candidates: Restaurant[],
  locale: string,
): Promise<{ roomId: string; hostToken: string } | null> {
  const payload = {
    locale,
    candidates: candidates.slice(0, 10).map((r) => ({
      id: r.id,
      name: r.name,
      emoji: emojiForTypes(r.types),
      mapsUrl: buildGoogleMapsUrl(r),
    })),
  }
  const created = await request<{ roomId: string; hostToken: string }>('/room', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (created) saveHostToken(created.roomId, created.hostToken)
  return created
}

export async function fetchRoom(roomId: string): Promise<RoomView | null> {
  return request<RoomView>(`/room/${roomId}`)
}

export async function sendVeto(roomId: string, placeId: string): Promise<RoomView | null> {
  return request<RoomView>(`/room/${roomId}/veto`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ placeId, voterId: voterId() }),
  })
}

export async function sendResult(roomId: string, placeId: string): Promise<RoomView | null> {
  const token = hostToken(roomId)
  if (!token) return null
  return request<RoomView>(`/room/${roomId}/result`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ hostToken: token, placeId }),
  })
}
