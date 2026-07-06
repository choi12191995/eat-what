# EatWhat 食乜好 🍜🎡

> Can't decide where to eat? Spin the wheel.

A gamified PWA that draws your lunch/dinner restaurant from conditions you set — cuisine, budget, distance, party size — with everything else left to fate. Pure frontend, zero backend, zero secrets in the build: **you bring your own Google Places API key** (and optionally an OpenAI-compatible AI key), stored only on your device.

**English · 繁體中文 (zh-TW) · Light/Dark · Installable PWA**

## What it does

- 🎯 **Conditional draw** — each condition can be set explicitly, use your saved default, or stay "surprise me"; cuisines support include *and* exclude
- 🥟 **Fine-grained cravings** — OpenRice-style tags Google's type system can't express (茶餐廳, 潮州菜, 點心, 火鍋, 放題, omakase…) searched as a local would type them, up to 3 per draw
- 🎡 **Spinner UX** — up to 10 candidates on a wheel; the winner is drawn fairly (`crypto.getRandomValues`), the spin is the celebration
- 🍽️ **Result card** — photos, star rating, price range in the local currency (HK$/MOP$/NT$…), distance, opening hours, plus one-tap **Google Maps** directions and **OpenRice** (Hong Kong/Macau)
- 🕘 **Local history** — every accepted draw saved on-device (IndexedDB), with "don't repeat recent places" and a personal blocklist
- 🤖 **Optional AI concierge** — paste any OpenAI-compatible endpoint/key/model and get mood-based picks
- 🔔 **Meal reminders** — opt-in lunch/dinner push notifications on the weekdays and times you choose, in your device's timezone; tapping one opens the app and spins immediately
- 🧪 **Demo mode** — no key yet? The whole experience runs on built-in sample data

## Setup (users)

Follow the in-app first-run checklist. Summary:

1. Create a Google Cloud project and enable **Places API (New)** (billing must be attached — personal usage stays inside the free monthly quota)
2. Create an API key; restrict it to this app's website origin and to Places API (New) only
3. **Set daily quota caps** — the hard guarantee your card is never charged (details below)
4. Paste the key in the app → Validate (uses a free call). The key never leaves your device.

### Step 3 in detail: daily quota caps (secure your $0 bill)

> **Prerequisite:** Google only lets you edit quotas after upgrading the account from "Free Trial" to pay-as-you-go (blue **Upgrade** button, top right of the console). You keep every monthly free allowance — and with the caps below, the bill physically cannot leave $0.

In the console open **Google Maps Platform → Quotas**, set the dropdown to **Places API (New)**, then for each request type: tick its checkbox → **Edit Quota** → enter the value → **Submit**.

| Request type | Daily cap | Why this keeps it free |
|---|---|---|
| `SearchNearbyRequest` | **30** | One search per draw, cached 24 h. 30 × 31 days stays inside even the strictest 1,000/month free tier |
| `GetPhotoMediaRequest` | **30** | Photos load only for the winning restaurant |
| `GetPlaceRequest` | **30** | Only used when picking a custom centre point |
| `SearchTextRequest` | **30** | Free key validation + fine-grained tag searches (one per tag per draw, cached 24 h) |
| `AutocompletePlacesRequest` | **300** | Suggestions are free when the session ends in a details call (ours always does) |

Optional extra brake — per-minute limits, so nobody can burn a day's quota in one spree: `SearchNearbyRequest` 3 · `GetPhotoMediaRequest` 10 · `GetPlaceRequest` 4 · `SearchTextRequest` 3 · `AutocompletePlacesRequest` 50.

The caps are sized so that even if a key leaked and every call billed at the most expensive (Enterprise) tier, a full month at the daily maximum still stays inside that tier's 1,000 free calls. Referrer restrictions deter casual reuse, but a forged header bypasses them — **the caps are the real $0 guarantee.**

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

## Meal reminders (web push)

Settings → Meal reminders. Per meal you choose on/off, a time, and weekdays; times run in your device's timezone. Tapping a notification opens the app with `?draw=1` and spins straight away.

- **iOS 16.4+**: install the app first (Share → Add to Home Screen) — Apple only exposes push to installed PWAs. **Android/desktop**: works in the browser too.
- Delivery is the one thing a pure frontend can't do, so a ~40 KB Cloudflare Worker (`worker/`) runs a 15-minute cron, checks each subscription in its own timezone, and sends VAPID web push. It stores **only** a push endpoint + the schedule in KV — never API keys, location, or history.
- A "Send a test notification" button verifies the whole pipeline end to end.

### Deploy your own push worker (forks)

The app works fully without this — notifications are the only feature that needs it.

```bash
pnpm run worker:keys                                          # prints a VAPID key pair
pnpm dlx wrangler@4.80.0 kv namespace create SUBS             # note the id
# edit worker/wrangler.jsonc: kv id + VAPID_PUBLIC_KEY + your VAPID_SUBJECT (site URL)
# edit src/lib/push/config.ts: your workers.dev URL + the same public key
pnpm run worker:deploy
pnpm dlx wrangler@4.80.0 secret put VAPID_PRIVATE_KEY -c worker/wrangler.jsonc
```

## Security notes

- Your API keys live in `localStorage` on your device only; requests go directly from your browser to Google / your AI endpoint
- A restrictive CSP ships via `public/_headers`; there are no third-party scripts
- The referrer restriction + API restriction + your quota cap are the containment story for a key that is by design used client-side

## License

[MIT](LICENSE)
