import type { LatLng } from '@/types/models'

/**
 * Weather nudge via Open-Meteo — free, keyless, CORS-enabled, which keeps
 * the zero-secret rule intact. Only a coarse mood matters here, not a
 * forecast: is it raining / roasting / chilly right now?
 */
export type WeatherMood = 'rain' | 'hot' | 'cold'

interface OpenMeteoCurrent {
  current?: {
    temperature_2m?: number
    precipitation?: number
    weather_code?: number
  }
}

/** WMO weather codes: drizzle/rain/showers/thunder (snow is not a HK concern) */
function isRainCode(code: number): boolean {
  return (code >= 51 && code <= 67) || (code >= 80 && code <= 99)
}

export async function fetchWeatherMood(origin: LatLng): Promise<WeatherMood | null> {
  try {
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${origin.lat.toFixed(3)}` +
      `&longitude=${origin.lng.toFixed(3)}&current=temperature_2m,precipitation,weather_code`
    const res = await fetch(url)
    if (!res.ok) return null
    const data = (await res.json()) as OpenMeteoCurrent
    const cur = data.current
    if (!cur) return null
    if ((cur.precipitation ?? 0) > 0.2 || isRainCode(cur.weather_code ?? 0)) return 'rain'
    if ((cur.temperature_2m ?? 25) >= 31) return 'hot'
    if ((cur.temperature_2m ?? 25) <= 15) return 'cold'
    return null
  } catch {
    return null
  }
}
