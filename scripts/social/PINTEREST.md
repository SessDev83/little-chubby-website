# Pinterest Integration

Full autonomous Pin publishing — integrated into the 4x-daily social pipeline.

## Status

| Piece | State |
|---|---|
| Pinterest app (ID `1563654`) | ✅ Trial access approved |
| OAuth flow (`pinterest-oauth.mjs`) | ✅ Working — tokens in `.env` (30-day access, ~60-day refresh) |
| 5 boards discovered | ✅ IDs cached in `.pinterest-boards.json` |
| Content-type → board mapping | ✅ Manual curation (11 types → 5 boards) |
| Connector (`platforms/pinterest.mjs`) | ✅ Auto-refresh on 401, supports image_base64 |
| Pin image generator (`pin-image-generate.mjs`) | ✅ Parametric 1000×1500 canvas, triptych + hero variants |
| `post.mjs` integration | ✅ Pinterest in adapter + switch case |
| Workflow `.github/workflows/social-post.yml` | ✅ `- pinterest` option + env secrets wired |
| **Write to production** | ❌ Blocked by Pinterest policy — requires Standard access |

## The Trial Access Block

Pinterest response when our Trial app calls `POST /pins`:

> `Apps with Trial access may not create Pins in production — use API Sandbox https://api-sandbox.pinterest.com instead.`

Trial tokens can **read** boards/pins and **write to sandbox** only. To publish real Pins the app must be upgraded to **Standard access**.

## How to unlock production writes

1. Open the app at <https://developers.pinterest.com/apps/1563654/>
2. Under **Production access** → submit the Standard-access application:
   - Explain use case (publishing educational/kids-coloring content to our own boards)
   - Demonstrate proper use (no spam, no scraped content, on-brand Pins)
   - Provide the OAuth redirect URL: `http://localhost:8787/callback`
3. Approval is usually granted within 1–2 business days for legitimate apps.
4. Once approved, no code changes needed — the same tokens will just work.

## GitHub secrets required

| Secret | Purpose |
|---|---|
| `PINTEREST_ACCESS_TOKEN` | OAuth access token |
| `PINTEREST_REFRESH_TOKEN` | OAuth refresh token (auto-used on 401) |
| `PINTEREST_APP_ID` | `1563654` — for token refresh |
| `PINTEREST_APP_SECRET` | — for token refresh |
| `PINTEREST_SANDBOX` | (optional) set to `true` to use sandbox API |

## Local commands

```powershell
# One-time OAuth (opens browser, saves tokens to .env)
node scripts/social/pinterest-oauth.mjs

# List boards and refresh mapping cache
node scripts/social/pinterest-list-boards.mjs

# Preview a Pinterest post (no publish)
node scripts/social/post.mjs generate --platform pinterest --type free-coloring --lang en --no-ai

# Publish a Pin (once Standard access granted)
node scripts/social/post.mjs post --platform pinterest --type free-coloring --lang en

# Publish to all 4 platforms including Pinterest
node scripts/social/post.mjs post --platform all --type free-coloring --lang en --smart
```

## Content-type → board routing

See [`.pinterest-boards.json`](./.pinterest-boards.json) for the live mapping.

| Board | Content types |
|---|---|
| Free Coloring Pages for Kids | free-coloring, giveaway, share-earn |
| Kids Coloring Books by Little Chubby Press | book-promo |
| Coloring Book Tips for Parents | parenting-tip, blog-share, blog-new |
| Creative Family Time Ideas | engagement, community, behind-scenes |
| Screen-Free Activities for Kids | fun-fact |

## Pin image strategy

`generatePinImage()` produces a branded 1000×1500 canvas with:
- Cream gradient background (brand palette)
- Rotated showcase triptych (3 cards from `Free Images/`) or single hero (book cover / blog image)
- SVG text overlay: eyebrow · headline · subtitle · coral CTA badge · logo · domain URL
- Headlines auto-wrap to max 2 lines; per-type copy in `post.mjs`

For `book-promo` posts the book cover is used as hero; for all other types a type-appropriate triptych is composed via `defaultShowcaseForType(type)`.
