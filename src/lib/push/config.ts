/**
 * Push server for THIS deployment.
 *
 * Forks: deploy your own worker (see README → "Deploy your own"), generate
 * your own VAPID keys (`pnpm run worker:keys`), then replace both values.
 * The public key is public by design — the private half lives only in the
 * worker's secrets.
 */
export const PUSH_SERVER_URL = 'https://eat-what-push.sc-d46.workers.dev'

export const PUSH_VAPID_PUBLIC_KEY =
  'BE0mXKJg-sQWicgTiHLS6egp4VNj8-CgQTSjm87yO9HSISQPMHR89xynGFJj2zSbuw9o9cXxSpJzVW2T5MEJJr4'
