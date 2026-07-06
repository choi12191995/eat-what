/**
 * Recommended Google Cloud quota caps, per Places API (New) request type.
 *
 * Sizing rule: a full month at the daily cap must stay inside EVERY free
 * tier that request type can bill — including Enterprise (1,000 free
 * calls/month), which is what our wheel search's field mask uses and what
 * a leaked key could be pointed at. Referrer restrictions don't stop a
 * curl with a forged header; these caps are the actual $0 guarantee.
 *
 * 30/day × 31 days = 930 < 1,000. Autocomplete is session-based and free
 * when the session ends in a details call (ours always does), so its cap
 * only bounds abuse against the 10,000/month per-request bucket.
 */
export interface QuotaCap {
  /** i18n key suffix under setup.quota.* */
  key: string
  /** Exact metric name as shown in the Google Cloud quotas table */
  metric: string
  perDay: number
  perMinute: number
}

export const QUOTA_CAPS: QuotaCap[] = [
  { key: 'searchNearby', metric: 'SearchNearbyRequest', perDay: 30, perMinute: 3 },
  { key: 'photo', metric: 'GetPhotoMediaRequest', perDay: 30, perMinute: 10 },
  { key: 'getPlace', metric: 'GetPlaceRequest', perDay: 30, perMinute: 4 },
  { key: 'searchText', metric: 'SearchTextRequest', perDay: 30, perMinute: 3 },
  { key: 'autocomplete', metric: 'AutocompletePlacesRequest', perDay: 300, perMinute: 50 },
]
