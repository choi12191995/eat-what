import type { PlacesProvider } from './provider'
import { mockProvider } from './mockProvider'

/**
 * Provider factory: Google when the user has pasted their own key,
 * demo fixtures otherwise. (GooglePlacesProvider lands in M2.)
 */
export function getProvider(googleApiKey: string): PlacesProvider {
  void googleApiKey
  return mockProvider
}
