import type { PlacesProvider } from './provider'
import { mockProvider } from './mockProvider'
import { createGooglePlacesProvider } from './googlePlaces'

let currentKey = ''
const google = createGooglePlacesProvider(() => currentKey)

/**
 * Provider factory: Google when the user has pasted their own key,
 * demo fixtures otherwise. The key is read per-call so a key change in
 * Settings takes effect immediately.
 */
export function getProvider(googleApiKey: string): PlacesProvider {
  if (!googleApiKey) return mockProvider
  currentKey = googleApiKey
  return google
}
