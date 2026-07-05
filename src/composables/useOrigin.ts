import type { LatLng } from '@/types/models'

export type OriginResult =
  | { ok: true; location: LatLng }
  | { ok: false; reason: 'denied' | 'unavailable' | 'timeout' }

/** One-shot GPS fix with a UX-friendly timeout; must be called from a user gesture flow. */
export function getCurrentLocation(timeoutMs = 10_000): Promise<OriginResult> {
  return new Promise((resolve) => {
    if (!('geolocation' in navigator)) {
      resolve({ ok: false, reason: 'unavailable' })
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({ ok: true, location: { lat: pos.coords.latitude, lng: pos.coords.longitude } }),
      (err) =>
        resolve({
          ok: false,
          reason:
            err.code === err.PERMISSION_DENIED
              ? 'denied'
              : err.code === err.TIMEOUT
                ? 'timeout'
                : 'unavailable',
        }),
      { enableHighAccuracy: false, timeout: timeoutMs, maximumAge: 120_000 },
    )
  })
}
