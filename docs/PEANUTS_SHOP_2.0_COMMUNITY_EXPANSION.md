# Peanuts Shop 2.0 — Community & Cosmetic Expansion Plan

> **Status**: Planning · **Phase**: F (follows Phase E close-out) · **Created**: April 2026
> **Depends on**: [PEANUTS_ECONOMY_MASTER_PLAN.md](./PEANUTS_ECONOMY_MASTER_PLAN.md) shipped through Phase E.
> **Feeds into**: [MASTER_VISION_MUST_HAVE_APP.md](./MASTER_VISION_MUST_HAVE_APP.md).

**Objective**: Transform the peanuts economy from a private collectible loop into a visible community layer that incentivizes sharing, earning, and spending.

---

## 🎯 Core diagnosis (April 2026)

As of commit `b37827f` the cosmetic economy has these items live:

| Cosmetic | Visibility today |
|---|---|
| `frame_gold`, `frame_silver`, `frame_animated` | Only in the owner's profile |
| `accent_color` (8 allowlisted) | Only in the owner's profile |
| `milestone_50…1000`, `top_reviewer`, `star_parent`, `drop_*`, `top_earner_YYYY_MM` | Listed in profile "Adventure" tab |

**Problem**: No user sees anyone else's cosmetics. Gold frames have no social payoff → no incentive to buy.

**Thesis**: Before expanding the catalog, make existing cosmetics *visible* on high-traffic social surfaces. Only then does catalog expansion convert to peanut spending.

---

## 🏗️ PHASE 0 — Visibility surfaces (mandatory prerequisite)

### The 4 surfaces where identity must render

1. **Review cards** (`src/pages/[lang]/reviews.astro`) — highest traffic. Show avatar+frame, featured badge, accent name, streak/verified flair.
2. **Monthly leaderboard** (`src/pages/[lang]/peanuts.astro`) — currently plain text; add full identity per row.
3. **Community spotlight / home-pin strip** — enrich existing `/api/home-pins` response with owner flair.
4. **Shoutout feed** — public wall of approved `shoutout_orders` with full identity.

### Shared component

Single source of truth: `src/components/UserFlair.astro` (size `sm | md | lg`) rendering `avatar + frame + name(accent) + featured_badge`. All 4 surfaces use it.

### Minimum DB change

```sql
-- Migration 050
ALTER TABLE profiles ADD COLUMN featured_badge text;
-- featured_badge validated to be in the user's profile_badges by POST /api/set-featured-badge
```

### New endpoint

`POST /api/set-featured-badge` — cookie auth, `rate_limit('badge')`, `prerender=false`, no-cache.

---

## 📦 PHASE 1 — Expanded catalog

All tiers reuse existing infrastructure (`profile_badges`, `credit_transactions.reason='boost'|'badge'`, `shop_drops`) unless noted.

### Tier A — Avatar frames (SVG procedural, no assets needed)

| Item | Cost 🥜 | Status |
|---|---|---|
| `frame_gold` | 50 | **Shipped** |
| `frame_silver` | 30 | **Shipped** |
| `frame_animated` | 80 | **Shipped** |
| `frame_rainbow` | 60 | Planned |
| `frame_neon` | 70 | Planned |
| `frame_stars` | 50 | Planned |
| `frame_cosmic` | 90 | Planned |
| `frame_seasonal_*` | 40 | Rotated via `shop_drops` |

### Tier B — Name decorations

| Item | Cost |
|---|---|
| `accent_color` (8 colors, shipped) | 8 |
| `name_gradient_sunset` | 20 |
| `name_gradient_ocean` | 20 |
| `name_sparkle` (auto ✨) | 25 |
| `name_bold_italic` | 10 |

### Tier C — Profile themes

| Item | Cost |
|---|---|
| `theme_forest` | 40 |
| `theme_candy` | 40 |
| `theme_midnight` | 45 |
| `theme_gold_luxury` | 100 |

Stored as `profiles.profile_theme text`.

### Tier D — Review & comment perks (functional)

| Item | Cost | Effect |
|---|---|---|
| `review_sticker_pack` | 15 | Stickers available inside own reviews |
| `highlight_review` | 10 | 7-day gold background on one review |
| `emoji_react_pack` | 20 | Premium reactions 🔥💎🌟 |
| `custom_review_banner` | 30 | Gradient/pattern banner on own review |

### Tier E — Streak & progression boosts (temporary, use `profile_effects`)

| Item | Cost | Effect |
|---|---|---|
| `streak_freeze` | 10 | Protects 1 lost day |
| `streak_double` | 25 | Next 3 days count 2× |
| `xp_boost_weekend` | 15 | Sat+Sun earn 2× peanuts |
| `early_bird_ticket` | 20 | +1 giveaway ticket |

### Tier F — Social reach

| Item | Cost | Status |
|---|---|---|
| `shoutout` | 30 | **Shipped** |
| `home_pin` | 25 | **Shipped** |
| `community_spotlight_3d` | 40 | Planned |
| `parent_tip_feature` | 35 | Planned |
| `verified_parent_badge` | 100 or earned via 5 verified reviews | Planned |

### Tier G — Titles (text below name)

5–15 🥜 each. Low cost, high volume: "Chubby Champion", "Bedtime Story Pro", "Peanut Millionaire", "Bilingual Family", "Dino Expert", "Space Explorer", …

### Tier H — Redeemable rewards (physical only)

| Item | Cost |
|---|---|
| `free_book_mini` (digital mini-book) | 200 |
| `free_physical_book` | 500 |
| `signed_book` | 800 |
| `bundle_2_books` | 900 |

---

## 🎨 PHASE 2 — Graphics strategy

### Procedural SVG / CSS (preferred for frames, borders, accents)

`frame_gold` already uses `conic-gradient`. Zero assets, zero requests, animatable. All new frames should follow this.

### Static assets only where procedural fails

- Sticker packs (10 PNGs 256×256 per pack)
- Theme backgrounds (1 webp per theme, lazy-loaded)
- Seasonal overlays (Halloween, Christmas, …)

Pipeline: reuse existing image-generation scripts in `scripts/social/`. Add `scripts/generate-shop-assets.mjs` with a prompt registry for consistency. Output → `public/images/shop/<category>/<id>.webp`.

---

## 🔐 PHASE 3 — Safe technical structure

### Principles

1. **Never alter existing columns to NOT NULL without default.**
2. **Reuse `credit_transactions.reason` allowlist** (`boost`, `badge`, `premium_download`, `top_earner_bonus`, `early_access`, …). Add new reason only if truly new category.
3. **Reuse `profile_badges`** for all permanent collectibles.
4. **New table `profile_effects`** for temporary items:

```sql
CREATE TABLE profile_effects (
  id bigserial PRIMARY KEY,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  effect_type text NOT NULL,           -- 'streak_freeze' | 'xp_boost_weekend' | 'highlight_review'
  data jsonb,
  active_from timestamptz DEFAULT now(),
  active_to timestamptz,
  consumed_at timestamptz,
  created_at timestamptz DEFAULT now()
);
```

5. **All new endpoints** follow the established pattern: `prerender=false`, cookie auth, `rate_limit('badge')`, `Cache-Control: no-cache`, RPC with advisory lock.

### Unified catalog table

```sql
CREATE TABLE shop_items (
  id text PRIMARY KEY,                 -- 'frame_rainbow' | 'theme_forest' | …
  category text NOT NULL,              -- 'frame' | 'theme' | 'title' | 'boost' | 'perk' | 'reward'
  cost_peanuts int NOT NULL CHECK (cost_peanuts >= 0),
  label_es text NOT NULL,
  label_en text NOT NULL,
  description_es text,
  description_en text,
  icon text,
  preview_asset text,
  active boolean DEFAULT true,
  is_permanent boolean DEFAULT true,
  duration_days int,
  active_from timestamptz,
  active_to timestamptz,
  sort_order int DEFAULT 100
);
```

Existing `shop_drops` migrates to `shop_items` with `category='frame_drop'` in a later migration.

---

## 🗺️ Roadmap (incremental, no rush)

| Phase | Ship | Migration | Impact |
|---|---|---|---|
| 0.1 | `<UserFlair />` component + integrate in review cards | — | 🔥 Max |
| 0.2 | Same component in leaderboard, home-pin, shoutout feed | — | High |
| 0.3 | `featured_badge` column + picker in profile | 050 | High |
| 1.1 | `shop_items` table + admin management page | 051 | Foundational |
| 1.2 | 3–5 new SVG procedural frames | 052 | Aspirational |
| 1.3 | Titles tier (cheap, high-volume) | 053 | Dopamine loop |
| 1.4 | `profile_effects` table + streak_freeze | 054 | Retention |
| 2.1 | Themes (backgrounds) with AI-assisted assets | 055 | Premium |
| 2.2 | Review highlight / banners | 056 | High-ticket conversion |
| 2.3 | Redeemable rewards (physical/signed books) | 057 | Perceived real value |

---

## ❓ Open decisions (resolve before Phase 1)

1. **Simultaneous cosmetics?** Recommended: `frame + accent + 1 title + 1 featured_badge` all visible at once.
2. **Drop cadence?** Recommended hybrid: 70% permanent catalog, 30% monthly rotating drops for controlled FOMO.
3. **`<UserFlair />` rollout?** Recommended retroactive from day 1.

---

## ✅ Next concrete commit

1. Create `src/components/UserFlair.astro`.
2. Integrate into review cards in `src/pages/[lang]/reviews.astro`.
3. Migration 050: `featured_badge` column + `POST /api/set-featured-badge`.
4. Picker UI in profile "Adventure" tab.
