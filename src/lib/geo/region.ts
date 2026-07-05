import type { LatLng } from '@/types/models'

export type Region = 'HK' | 'MO' | 'TW' | 'OTHER'

interface BBox {
  region: Region
  minLat: number
  maxLat: number
  minLng: number
  maxLng: number
}

// Macau first — its box is inside the HK box's longitude span otherwise.
const BOXES: BBox[] = [
  { region: 'MO', minLat: 22.06, maxLat: 22.22, minLng: 113.52, maxLng: 113.62 },
  { region: 'HK', minLat: 22.13, maxLat: 22.58, minLng: 113.82, maxLng: 114.45 },
  { region: 'TW', minLat: 21.85, maxLat: 25.35, minLng: 119.3, maxLng: 122.05 },
]

export function detectRegion(loc: LatLng, fallback: Region = 'OTHER'): Region {
  for (const b of BOXES) {
    if (loc.lat >= b.minLat && loc.lat <= b.maxLat && loc.lng >= b.minLng && loc.lng <= b.maxLng) {
      return b.region
    }
  }
  return fallback
}

export function currencyForRegion(region: Region): string | null {
  switch (region) {
    case 'HK':
      return 'HKD'
    case 'MO':
      return 'MOP'
    case 'TW':
      return 'TWD'
    default:
      return null
  }
}
