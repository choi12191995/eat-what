import Dexie, { type EntityTable } from 'dexie'

import type { DrawRecord, Restaurant } from '@/types/models'

export interface SearchCacheRow {
  key: string
  fetchedAt: number
  results: Restaurant[]
}

export interface BlockRow {
  placeId: string
  name: string
  addedAt: number
}

export class EatWhatDB extends Dexie {
  draws!: EntityTable<DrawRecord, 'id'>
  searchCache!: EntityTable<SearchCacheRow, 'key'>
  placeCache!: EntityTable<Restaurant, 'id'>
  blocklist!: EntityTable<BlockRow, 'placeId'>

  constructor(name = 'eatwhat') {
    super(name)
    this.version(1).stores({
      draws: '++id, timestamp, restaurant.id, action',
      searchCache: 'key, fetchedAt',
      placeCache: 'id, fetchedAt',
      blocklist: 'placeId',
    })
  }
}

let instance: EatWhatDB | null = null

/** Lazy singleton so importing repo modules has no side effects (tests make their own). */
export function getDb(): EatWhatDB {
  if (!instance) instance = new EatWhatDB()
  return instance
}
