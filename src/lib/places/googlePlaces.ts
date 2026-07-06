import type { LatLng, PlaceSuggestion, Restaurant } from '@/types/models'
import type {
  AutocompleteParams,
  PlacesProvider,
  SearchNearbyParams,
  SearchTextParams,
} from './provider'
import { RESOLVE_LOCATION_MASK, WHEEL_MASK } from './fieldMasks'
import { normalizePlace, type GooglePlace } from './normalize'

const BASE = 'https://places.googleapis.com/v1'

export type GooglePlacesErrorKind = 'keyInvalid' | 'quota' | 'network' | 'response'

export class GooglePlacesError extends Error {
  constructor(
    public kind: GooglePlacesErrorKind,
    message: string,
  ) {
    super(message)
    this.name = 'GooglePlacesError'
  }
}

async function throwForStatus(res: Response): Promise<never> {
  let detail = ''
  let status = ''
  try {
    const body = (await res.json()) as { error?: { message?: string; status?: string } }
    detail = body.error?.message ?? ''
    status = body.error?.status ?? ''
  } catch {
    // non-JSON error body
  }
  if (res.status === 401 || res.status === 403 || status === 'PERMISSION_DENIED') {
    throw new GooglePlacesError('keyInvalid', detail || `HTTP ${res.status}`)
  }
  if (res.status === 429 || status === 'RESOURCE_EXHAUSTED') {
    throw new GooglePlacesError('quota', detail || 'quota exceeded')
  }
  throw new GooglePlacesError('response', detail || `HTTP ${res.status}`)
}

async function post<T>(
  path: string,
  key: string,
  body: unknown,
  fieldMask: string | null,
  signal?: AbortSignal,
): Promise<T> {
  let res: Response
  try {
    res = await fetch(`${BASE}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': key,
        ...(fieldMask ? { 'X-Goog-FieldMask': fieldMask } : {}),
      },
      body: JSON.stringify(body),
      signal,
    })
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') throw e
    throw new GooglePlacesError('network', String(e))
  }
  if (!res.ok) await throwForStatus(res)
  return (await res.json()) as T
}

interface AutocompleteResponse {
  suggestions?: {
    placePrediction?: {
      placeId?: string
      text?: { text?: string }
      distanceMeters?: number
    }
  }[]
}

export function createGooglePlacesProvider(getKey: () => string): PlacesProvider {
  return {
    kind: 'google',

    async searchNearby(p: SearchNearbyParams, signal?: AbortSignal): Promise<Restaurant[]> {
      const data = await post<{ places?: GooglePlace[] }>(
        '/places:searchNearby',
        getKey(),
        {
          locationRestriction: {
            circle: {
              center: { latitude: p.origin.lat, longitude: p.origin.lng },
              radius: p.radiusMeters,
            },
          },
          includedTypes: p.includedTypes,
          ...(p.excludedTypes?.length ? { excludedTypes: p.excludedTypes } : {}),
          maxResultCount: Math.min(p.maxResults ?? 20, 20),
          rankPreference: 'POPULARITY',
          languageCode: p.languageCode,
          ...(p.regionCode ? { regionCode: p.regionCode } : {}),
        },
        WHEEL_MASK,
        signal,
      )
      return (data.places ?? [])
        .map((place) => normalizePlace(place))
        .filter((r): r is Restaurant => r !== null)
    },

    async searchText(p: SearchTextParams, signal?: AbortSignal): Promise<Restaurant[]> {
      // Same WHEEL_MASK as Nearby → same Enterprise billing bucket, but a
      // separate quota metric (SearchTextRequest) — reflected in the setup
      // guide's caps. locationBias (not restriction): fine-tag places just
      // outside the circle are still useful; the engine re-checks distance.
      const data = await post<{ places?: GooglePlace[] }>(
        '/places:searchText',
        getKey(),
        {
          textQuery: p.query,
          locationBias: {
            circle: {
              center: { latitude: p.origin.lat, longitude: p.origin.lng },
              radius: p.radiusMeters,
            },
          },
          pageSize: Math.min(p.maxResults ?? 20, 20),
          languageCode: p.languageCode,
          ...(p.regionCode ? { regionCode: p.regionCode } : {}),
        },
        WHEEL_MASK,
        signal,
      )
      return (data.places ?? [])
        .map((place) => normalizePlace(place))
        .filter((r): r is Restaurant => r !== null)
    },

    async autocomplete(p: AutocompleteParams, signal?: AbortSignal): Promise<PlaceSuggestion[]> {
      const data = await post<AutocompleteResponse>(
        '/places:autocomplete',
        getKey(),
        {
          input: p.input,
          sessionToken: p.sessionToken,
          languageCode: p.languageCode,
          ...(p.biasCenter
            ? {
                locationBias: {
                  circle: {
                    center: { latitude: p.biasCenter.lat, longitude: p.biasCenter.lng },
                    radius: p.biasRadiusMeters ?? 20000,
                  },
                },
              }
            : {}),
          ...(p.includedRegionCodes?.length ? { includedRegionCodes: p.includedRegionCodes } : {}),
        },
        null,
        signal,
      )
      return (data.suggestions ?? [])
        .map((s) => s.placePrediction)
        .filter((pp): pp is NonNullable<typeof pp> => !!pp?.placeId)
        .map((pp) => ({
          placeId: pp.placeId!,
          label: pp.text?.text ?? pp.placeId!,
          distanceMeters: pp.distanceMeters,
        }))
    },

    async resolvePlaceLocation(
      placeId: string,
      sessionToken: string,
    ): Promise<{ location: LatLng; label: string }> {
      const key = getKey()
      let res: Response
      try {
        // Essentials-tier Details call; also terminates the autocomplete session.
        res = await fetch(
          `${BASE}/places/${encodeURIComponent(placeId)}?sessionToken=${encodeURIComponent(sessionToken)}`,
          { headers: { 'X-Goog-Api-Key': key, 'X-Goog-FieldMask': RESOLVE_LOCATION_MASK } },
        )
      } catch (e) {
        throw new GooglePlacesError('network', String(e))
      }
      if (!res.ok) await throwForStatus(res)
      const data = (await res.json()) as {
        location?: { latitude?: number; longitude?: number }
        formattedAddress?: string
        displayName?: { text?: string }
      }
      if (data.location?.latitude === undefined || data.location.longitude === undefined) {
        throw new GooglePlacesError('response', 'place has no location')
      }
      return {
        location: { lat: data.location.latitude, lng: data.location.longitude },
        label: data.displayName?.text ?? data.formattedAddress ?? placeId,
      }
    },

    photoUrl(photoName: string, maxWidthPx: number): string | null {
      const key = getKey()
      if (!key || !photoName) return null
      return `${BASE}/${photoName}/media?key=${encodeURIComponent(key)}&maxWidthPx=${maxWidthPx}`
    },
  }
}
