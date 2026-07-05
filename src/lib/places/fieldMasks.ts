/**
 * Field masks decide the billing SKU: the highest tier field present sets the
 * price of the whole call. WHEEL_MASK includes rating/price/hours → Enterprise
 * tier (1,000 free calls/month) — acceptable because one call fully hydrates
 * every wheel candidate and re-spins never re-query. Never add Atmosphere
 * fields (reviews, editorialSummary…) here.
 */
export const WHEEL_MASK = [
  'places.id',
  'places.displayName',
  'places.location',
  'places.shortFormattedAddress',
  'places.types',
  'places.primaryType',
  'places.businessStatus',
  'places.googleMapsUri',
  'places.photos',
  'places.rating',
  'places.userRatingCount',
  'places.priceLevel',
  'places.priceRange',
  'places.currentOpeningHours',
].join(',')

/** Place Details masks have no `places.` prefix. */
export const RESOLVE_LOCATION_MASK = 'location,formattedAddress,displayName'

/** Essentials-tier (free, unlimited) — used only to validate a pasted key. */
export const VALIDATE_MASK = 'places.id'
