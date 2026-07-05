import { ref } from 'vue'

import type { Restaurant } from '@/types/models'
import { buildGoogleMapsUrl } from '@/lib/links/gmaps'

export function useShareResult() {
  const copied = ref(false)

  async function share(r: Restaurant, appName: string): Promise<void> {
    const rating = r.rating ? ` ★${r.rating.toFixed(1)}` : ''
    const text = `🎡 ${appName}: ${r.name}${rating}\n${buildGoogleMapsUrl(r)}`
    if (navigator.share) {
      try {
        await navigator.share({ text })
        return
      } catch {
        // user cancelled or share failed — fall through to clipboard
      }
    }
    try {
      await navigator.clipboard.writeText(text)
      copied.value = true
      setTimeout(() => (copied.value = false), 2000)
    } catch {
      // clipboard unavailable — nothing else to do
    }
  }

  return { share, copied }
}
