/**
 * Curated cuisine taxonomy — the single source of truth mapping our UI
 * categories to Google Places API (New) Table A food types (usable in
 * includedTypes / excludedTypes). Types may appear in multiple categories;
 * include = union, exclude = client-side intersection backstop.
 */
export interface CuisineCategory {
  id: string
  emoji: string
  includedTypes: string[]
}

export const CUISINES = [
  { id: 'cantonese', emoji: '🥟', includedTypes: ['cantonese_restaurant'] },
  {
    id: 'chinese',
    emoji: '🥢',
    includedTypes: ['chinese_restaurant', 'chinese_noodle_restaurant'],
  },
  { id: 'taiwanese', emoji: '🧋', includedTypes: ['taiwanese_restaurant'] },
  {
    id: 'japanese',
    emoji: '🍣',
    includedTypes: [
      'japanese_restaurant',
      'sushi_restaurant',
      'ramen_restaurant',
      'japanese_izakaya_restaurant',
      'japanese_curry_restaurant',
    ],
  },
  {
    id: 'korean',
    emoji: '🍲',
    includedTypes: ['korean_restaurant', 'korean_barbecue_restaurant'],
  },
  { id: 'thai', emoji: '🍛', includedTypes: ['thai_restaurant'] },
  { id: 'vietnamese', emoji: '🍜', includedTypes: ['vietnamese_restaurant'] },
  {
    id: 'seAsian',
    emoji: '🌶️',
    includedTypes: ['indonesian_restaurant', 'malaysian_restaurant', 'filipino_restaurant'],
  },
  { id: 'indian', emoji: '🫓', includedTypes: ['indian_restaurant'] },
  { id: 'italian', emoji: '🍝', includedTypes: ['italian_restaurant', 'pizza_restaurant'] },
  { id: 'french', emoji: '🥐', includedTypes: ['french_restaurant'] },
  {
    id: 'western',
    emoji: '🥩',
    includedTypes: [
      'western_restaurant',
      'american_restaurant',
      'steak_house',
      'spanish_restaurant',
      'mediterranean_restaurant',
    ],
  },
  {
    id: 'fastFood',
    emoji: '🍔',
    includedTypes: ['hamburger_restaurant', 'fast_food_restaurant'],
  },
  { id: 'seafood', emoji: '🦞', includedTypes: ['seafood_restaurant'] },
  { id: 'bbq', emoji: '🍖', includedTypes: ['barbecue_restaurant', 'korean_barbecue_restaurant'] },
  { id: 'noodles', emoji: '🍜', includedTypes: ['noodle_shop', 'chinese_noodle_restaurant'] },
  {
    id: 'cafe',
    emoji: '☕',
    includedTypes: ['cafe', 'coffee_shop', 'brunch_restaurant', 'breakfast_restaurant'],
  },
  {
    id: 'dessert',
    emoji: '🍰',
    includedTypes: ['dessert_restaurant', 'dessert_shop', 'ice_cream_shop', 'bakery'],
  },
  {
    id: 'veggie',
    emoji: '🥗',
    includedTypes: ['vegetarian_restaurant', 'vegan_restaurant'],
  },
  { id: 'mexican', emoji: '🌮', includedTypes: ['mexican_restaurant'] },
  {
    id: 'middleEastern',
    emoji: '🧆',
    includedTypes: ['middle_eastern_restaurant', 'turkish_restaurant'],
  },
] as const satisfies readonly CuisineCategory[]

export type CuisineId = (typeof CUISINES)[number]['id']

const byId = new Map<string, CuisineCategory>(CUISINES.map((c) => [c.id, c]))

export function cuisineById(id: CuisineId): CuisineCategory {
  return byId.get(id)!
}

/** Union of Places types for a set of cuisine categories. */
export function typesForCuisines(ids: readonly CuisineId[]): string[] {
  return [...new Set(ids.flatMap((id) => cuisineById(id).includedTypes))]
}

/** Cuisine categories a restaurant belongs to, based on its Places types. */
export function cuisinesOfTypes(types: readonly string[]): CuisineCategory[] {
  return CUISINES.filter((c) => c.includedTypes.some((t) => types.includes(t)))
}

/** Emoji for a restaurant, from its first matching cuisine (fallback 🍽️). */
export function emojiForTypes(types: readonly string[]): string {
  return cuisinesOfTypes(types)[0]?.emoji ?? '🍽️'
}
