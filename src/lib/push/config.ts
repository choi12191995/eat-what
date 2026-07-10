/**
 * Push server for THIS deployment.
 *
 * Forks: deploy your own worker (see README → "Deploy your own"), generate
 * your own VAPID keys (`pnpm run worker:keys`), then replace both values.
 * The public key is public by design — the private half lives only in the
 * worker's secrets.
 */
// First-party domain — several cellular carriers block *.workers.dev, which
// broke rooms on mobile data. The workers.dev URL still works as a fallback.
export const PUSH_SERVER_URL = 'https://eat-what-api.samsonchoi.hk'

export const PUSH_VAPID_PUBLIC_KEY =
  'BE0mXKJg-sQWicgTiHLS6egp4VNj8-CgQTSjm87yO9HSISQPMHR89xynGFJj2zSbuw9o9cXxSpJzVW2T5MEJJr4'
