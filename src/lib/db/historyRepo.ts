import type { DrawConditions, DrawRecord, Restaurant } from '@/types/models'
import { cuisinesOfTypes } from '@/lib/places/cuisines'
import type { BlockRow, EatWhatDB } from './schema'

export function mealForHour(hour: number): 'lunch' | 'dinner' {
  return hour < 16 ? 'lunch' : 'dinner'
}

export interface DayGroup {
  /** local date key YYYY-MM-DD */
  day: string
  records: DrawRecord[]
}

function dayKey(ts: number): string {
  const d = new Date(ts)
  const m = `${d.getMonth() + 1}`.padStart(2, '0')
  const day = `${d.getDate()}`.padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

export function createHistoryRepo(db: EatWhatDB, now: () => number = Date.now) {
  return {
    async addAccepted(restaurant: Restaurant, conditions: DrawConditions): Promise<void> {
      const ts = now()
      await db.draws.add({
        timestamp: ts,
        meal: mealForHour(new Date(ts).getHours()),
        conditions: JSON.parse(JSON.stringify(conditions)) as DrawConditions,
        restaurant: JSON.parse(JSON.stringify(restaurant)) as Restaurant,
        action: 'accepted',
      })
    },

    async listGroupedByDay(limit = 200): Promise<DayGroup[]> {
      const records = await db.draws.orderBy('timestamp').reverse().limit(limit).toArray()
      const groups: DayGroup[] = []
      for (const rec of records) {
        const day = dayKey(rec.timestamp)
        const last = groups[groups.length - 1]
        if (last && last.day === day) last.records.push(rec)
        else groups.push({ day, records: [rec] })
      }
      return groups
    },

    async recentAcceptedPlaceIds(days: number): Promise<Set<string>> {
      const cutoff = now() - days * 24 * 60 * 60 * 1000
      const records = await db.draws.where('timestamp').above(cutoff).toArray()
      return new Set(records.filter((r) => r.action === 'accepted').map((r) => r.restaurant.id))
    },

    async topCuisines(n = 3): Promise<{ id: string; emoji: string; count: number }[]> {
      const records = await db.draws.toArray()
      const counts = new Map<string, { emoji: string; count: number }>()
      for (const rec of records) {
        const cuisine = cuisinesOfTypes(rec.restaurant.types)[0]
        if (!cuisine) continue
        const entry = counts.get(cuisine.id) ?? { emoji: cuisine.emoji, count: 0 }
        entry.count += 1
        counts.set(cuisine.id, entry)
      }
      return [...counts.entries()]
        .map(([id, v]) => ({ id, ...v }))
        .sort((a, b) => b.count - a.count)
        .slice(0, n)
    },

    async count(): Promise<number> {
      return db.draws.count()
    },

    async clearAll(): Promise<void> {
      await db.draws.clear()
    },

    async exportJson(): Promise<string> {
      const [draws, blocklist] = await Promise.all([db.draws.toArray(), db.blocklist.toArray()])
      return JSON.stringify({ exportedAt: now(), draws, blocklist }, null, 2)
    },
  }
}

export function createBlocklistRepo(db: EatWhatDB, now: () => number = Date.now) {
  return {
    async add(placeId: string, name: string): Promise<void> {
      await db.blocklist.put({ placeId, name, addedAt: now() })
    },
    async remove(placeId: string): Promise<void> {
      await db.blocklist.delete(placeId)
    },
    async list(): Promise<BlockRow[]> {
      return db.blocklist.toArray()
    },
    async ids(): Promise<Set<string>> {
      return new Set((await db.blocklist.toArray()).map((b) => b.placeId))
    },
  }
}
