import 'fake-indexeddb/auto'
import { afterEach, describe, expect, it } from 'vitest'

import type { Restaurant } from '@/types/models'
import { makeDefaultConditions } from '@/lib/draw/defaults'
import { EatWhatDB } from './schema'
import { createBlocklistRepo, createHistoryRepo, mealForHour } from './historyRepo'

let seq = 0
const dbs: EatWhatDB[] = []
function freshDb(): EatWhatDB {
  const db = new EatWhatDB(`hist-${Date.now()}-${seq++}`)
  dbs.push(db)
  return db
}
afterEach(async () => {
  for (const db of dbs.splice(0)) await db.delete()
})

function restaurant(id: string, types: string[] = ['cantonese_restaurant']): Restaurant {
  return {
    id,
    name: `R-${id}`,
    location: { lat: 22.28, lng: 114.16 },
    types,
    photoNames: [],
    fetchedAt: 0,
  }
}

describe('mealForHour', () => {
  it('splits lunch and dinner at 16:00', () => {
    expect(mealForHour(11)).toBe('lunch')
    expect(mealForHour(15)).toBe('lunch')
    expect(mealForHour(16)).toBe('dinner')
    expect(mealForHour(21)).toBe('dinner')
  })
})

describe('historyRepo', () => {
  it('records accepted draws and groups them by day (newest first)', async () => {
    let t = new Date('2026-07-04T12:00:00').getTime()
    const repo = createHistoryRepo(freshDb(), () => t)
    await repo.addAccepted(restaurant('a'), makeDefaultConditions())
    t = new Date('2026-07-05T19:00:00').getTime()
    await repo.addAccepted(restaurant('b'), makeDefaultConditions())
    t = new Date('2026-07-05T12:30:00').getTime()
    await repo.addAccepted(restaurant('c'), makeDefaultConditions())

    const groups = await repo.listGroupedByDay()
    expect(groups.map((g) => g.day)).toEqual(['2026-07-05', '2026-07-04'])
    expect(groups[0]!.records.map((r) => r.restaurant.id)).toEqual(['b', 'c'])
    expect(groups[0]!.records[0]!.meal).toBe('dinner')
    expect(groups[1]!.records[0]!.meal).toBe('lunch')
  })

  it('reports recently accepted place ids within the window', async () => {
    let t = 10 * 24 * 60 * 60 * 1000
    const repo = createHistoryRepo(freshDb(), () => t)
    await repo.addAccepted(restaurant('old'), makeDefaultConditions())
    t += 8 * 24 * 60 * 60 * 1000
    await repo.addAccepted(restaurant('recent'), makeDefaultConditions())
    t += 1000

    const ids = await repo.recentAcceptedPlaceIds(7)
    expect(ids.has('recent')).toBe(true)
    expect(ids.has('old')).toBe(false)
  })

  it('computes top cuisines', async () => {
    const repo = createHistoryRepo(freshDb(), () => 1)
    await repo.addAccepted(restaurant('a', ['cantonese_restaurant']), makeDefaultConditions())
    await repo.addAccepted(restaurant('b', ['cantonese_restaurant']), makeDefaultConditions())
    await repo.addAccepted(restaurant('c', ['ramen_restaurant']), makeDefaultConditions())
    const top = await repo.topCuisines(2)
    expect(top[0]).toMatchObject({ id: 'cantonese', count: 2 })
    expect(top[1]).toMatchObject({ id: 'japanese', count: 1 })
  })

  it('exports and clears', async () => {
    const db = freshDb()
    const repo = createHistoryRepo(db, () => 1)
    const block = createBlocklistRepo(db, () => 1)
    await repo.addAccepted(restaurant('a'), makeDefaultConditions())
    await block.add('bad-place', 'Bad Place')
    const json = JSON.parse(await repo.exportJson()) as { draws: unknown[]; blocklist: unknown[] }
    expect(json.draws).toHaveLength(1)
    expect(json.blocklist).toHaveLength(1)
    await repo.clearAll()
    expect(await repo.count()).toBe(0)
  })
})

describe('blocklistRepo', () => {
  it('adds, lists, removes and reports ids', async () => {
    const repo = createBlocklistRepo(freshDb(), () => 1)
    await repo.add('p1', 'Nope Diner')
    await repo.add('p2', 'Never Again')
    expect((await repo.ids()).has('p1')).toBe(true)
    await repo.remove('p1')
    expect((await repo.ids()).has('p1')).toBe(false)
    expect(await repo.list()).toHaveLength(1)
  })
})
