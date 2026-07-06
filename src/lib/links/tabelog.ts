import type { Region } from '@/lib/geo/region'

/**
 * Tabelog keyword-search deep link — Japan's OpenRice equivalent. No public
 * API; the search endpoint handles restaurant names well (verified live,
 * redirects to their mobile site on phones).
 */
export function buildTabelogUrl(name: string, region: Region): string | null {
  if (region !== 'JP') return null
  return `https://tabelog.com/rst/rstsearch/?sk=${encodeURIComponent(name)}`
}
