#!/usr/bin/env node
/**
 * Generates a VAPID key pair for the push worker (standard web-push format).
 *
 *   node scripts/generate-vapid-keys.mjs
 *
 * Public key  → worker/wrangler.jsonc `vars.VAPID_PUBLIC_KEY`
 *               AND src/lib/push/config.ts `PUSH_VAPID_PUBLIC_KEY`
 * Private key → NEVER commit it. Set it as a worker secret:
 *               pnpm dlx wrangler@4.80.0 secret put VAPID_PRIVATE_KEY -c worker/wrangler.jsonc
 */
const pair = await crypto.subtle.generateKey(
  { name: 'ECDSA', namedCurve: 'P-256' },
  true,
  ['sign', 'verify'],
)
const rawPublic = Buffer.from(await crypto.subtle.exportKey('raw', pair.publicKey))
const jwk = await crypto.subtle.exportKey('jwk', pair.privateKey)

console.log(`VAPID_PUBLIC_KEY=${rawPublic.toString('base64url')}`)
console.log(`VAPID_PRIVATE_KEY=${jwk.d}`)
