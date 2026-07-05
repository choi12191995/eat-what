import { VALIDATE_MASK } from './fieldMasks'

export type KeyValidation = { ok: true } | { ok: false; reason: 'invalid' | 'network' }

/**
 * Validates a pasted Google key with an IDs-only Text Search — the one SKU
 * that is free and unlimited, so validation never costs anything.
 */
export async function validateGoogleKey(key: string): Promise<KeyValidation> {
  try {
    const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': key,
        'X-Goog-FieldMask': VALIDATE_MASK,
      },
      body: JSON.stringify({ textQuery: 'restaurant', pageSize: 1 }),
    })
    if (res.ok) return { ok: true }
    if (res.status === 401 || res.status === 403 || res.status === 400) {
      return { ok: false, reason: 'invalid' }
    }
    return { ok: false, reason: 'network' }
  } catch {
    return { ok: false, reason: 'network' }
  }
}
