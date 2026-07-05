import type { Restaurant } from '@/types/models'

/** Universal cross-platform Google Maps link (query is required even with a place id). */
export function buildGoogleMapsUrl(r: Pick<Restaurant, 'name' | 'id' | 'location'>): string {
  const query = r.name || `${r.location.lat},${r.location.lng}`
  const params = new URLSearchParams({ api: '1', query })
  if (r.id) params.set('query_place_id', r.id)
  return `https://www.google.com/maps/search/?${params.toString()}`
}
