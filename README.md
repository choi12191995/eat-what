# EatWhat 食乜好 🍜🎡

> Can't decide where to eat? Spin the wheel.

A gamified PWA that draws your lunch/dinner restaurant from conditions you set — cuisine, budget, distance, party size — with everything else left to fate. Pure frontend, zero backend, zero secrets in the build: **you bring your own Google Places API key** (and optionally an OpenAI-compatible AI key), stored only on your device.

**English · 繁體中文 (zh-TW) · Light/Dark · Installable PWA**

## What it does

- 🎯 **Conditional draw** — each condition can be set explicitly, use your saved default, or stay "surprise me"; cuisines support include *and* exclude
- 🎡 **Spinner UX** — up to 10 candidates on a wheel; the winner is drawn fairly (`crypto.getRandomValues`), the spin is the celebration
- 🍽️ **Result card** — photos, star rating, price range in the local currency (HK$/MOP$/NT$…), distance, opening hours, plus one-tap **Google Maps** directions and **OpenRice** (Hong Kong/Macau)
- 🕘 **Local history** — every accepted draw saved on-device (IndexedDB), with "don't repeat recent places" and a personal blocklist
- 🤖 **Optional AI concierge** — paste any OpenAI-compatible endpoint/key/model and get mood-based picks
- 🧪 **Demo mode** — no key yet? The whole experience runs on built-in sample data

## Setup (users)

Follow the in-app first-run checklist. Summary:

1. Create a Google Cloud project and enable **Places API (New)** (billing must be attached — personal usage stays inside the free monthly quota)
2. Create an API key; restrict it to this app's website origin and to Places API (New) only
3. **Set a quota cap** (≈100 requests/day) — this is the hard guarantee your card is never charged
4. Paste the key in the app → Validate (uses a free call). The key never leaves your device.

## Development

```bash
pnpm install
pnpm dev        # Vite dev server
pnpm test       # Vitest
pnpm typecheck  # vue-tsc
pnpm lint
pnpm build      # production build → dist/
```

Requires Node ≥ 20.19 and pnpm.

## Deploy your own (Cloudflare Pages)

```bash
pnpm dlx wrangler@4.80.0 login
pnpm dlx wrangler@4.80.0 pages project create eat-what --production-branch main   # once
pnpm run deploy
```

> Wrangler is pinned to 4.80.0 because newer versions require Node ≥ 22; on Node 22+ you can drop the pin. Alternatively skip the CLI entirely: connect the GitHub repo in the Cloudflare Pages dashboard (build command `pnpm build`, output `dist`) and every push deploys automatically.

Any static host works — the build is fully static with no environment variables.

## Cost model & quotas

Google's post-March-2025 pricing gives per-SKU monthly free call caps. The app is engineered to stay inside them:

| What | SKU tier | Free/month | How the app protects it |
|---|---|---|---|
| Restaurant search (with rating/price/hours) | Enterprise | 1,000 | 24 h IndexedDB cache keyed by ~110 m geocell + filters; re-spins reuse the fetched pool, never re-query |
| Place photos | Enterprise | 1,000 | Exactly one photo, only on the winner card, ≤800 px, service-worker CacheFirst (7 days) |
| Location autocomplete | Essentials | 10,000 | Session tokens; one cheap details call terminates each session |
| Key validation | Essentials (IDs-only Text Search) | unlimited | Free by design |

Rough personal usage — ~10 draws/day with varied filters — lands around 100–300 Enterprise calls/month. **Your quota cap (step 3 of setup) is the hard guarantee** either way: worst case the API pauses until tomorrow; your card is never touched.

## Roadmap

- **Phase 2:** configurable lunch/dinner push notifications (per-meal opt-in, weekdays, custom times, your timezone) via a tiny Cloudflare Worker — the Worker never sees your API keys

## Security notes

- Your API keys live in `localStorage` on your device only; requests go directly from your browser to Google / your AI endpoint
- A restrictive CSP ships via `public/_headers`; there are no third-party scripts
- The referrer restriction + API restriction + your quota cap are the containment story for a key that is by design used client-side

## License

[MIT](LICENSE)
