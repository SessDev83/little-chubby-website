# Master Vision — The Must-Have International App for Coloring & Bedtime-Story Families

> **Status**: North Star · **Created**: April 2026 · **Owners**: Product + Engineering
> **Role**: This is the top-level document. Every other master plan (`PEANUTS_ECONOMY_*`, `GROWTH_*`, `ADMIN_*`, `SOCIAL_AGENTS_*`) is a *component* of this vision. When two plans conflict, this one wins.
> **Hard rule**: Nothing in this plan ships without preserving UX satisfaction, child safety, and backward compatibility. If a feature risks breaking an existing flow, it's gated behind a flag and rolled out gradually.

---

## 🧭 North Star

> **"Every parent who has ever printed a coloring page, every adult who colors to relax, every family that reads bedtime stories — signs up once, stays for the community, and shares us because we genuinely make their evenings better."**

We are not a store with a newsletter. We are the **warm, bilingual home-base** for a global family routine. The peanut economy, the lottery, the community — all of it exists to make that routine **better, freer, and more social** than doing it alone.

### What "must-have" means operationally

A user considers us must-have when **three** things are true at once:
1. **They come back without being told.** Our features fit their *existing* habit (coloring, bedtime, sharing a win with grandma).
2. **They'd be embarrassed if their friends didn't know us.** They share because they get social credit for knowing us, not because we bribe them.
3. **Removing us would create a real gap.** Their kids ask for us by name, or their relaxation routine breaks.

---

## 👨‍👩‍👧 Buyer personas (locked, do not drift)

Every feature in this plan must pass the filter: "which persona benefits, and how?"

### Primary — **Maria, 34, bilingual mom of 2 (ages 3–7)**
- Lives in US / LATAM / Spain / Italy / Brazil / Portugal. Mobile-first. Instagram + WhatsApp heavy.
- Needs: safe screen-free activity, bedtime stories in her native tongue, cheap entertainment with educational value.
- Wins: free printable coloring + monthly book giveaway + a place to brag about her kids.
- Red flags we avoid: paywalls for basics, ads during kid flows, anything NSFW, English-only anything.

### Secondary — **Sofia, 42, "adult colorist" hobbyist**
- Colors at night to unwind. Pinterest + Instagram + Reddit. Buys physical books as gifts.
- Needs: aesthetic free content, small rituals, community of taste.
- Wins: gorgeous downloads, calm UI, elegant frames/themes she can show off.
- Red flags: gamified clutter aimed at kids, infantile aesthetics in "her" spaces.

### Tertiary (emergent, validate before heavy build) — **Laura, 31, preschool teacher**
- Shares printables with her class + parent WhatsApp groups. Could become our volume amplifier.
- Needs: "classroom pack" downloads, attribution-friendly license, no paywalls.
- Wins: verified-educator badge + peanut rebates for referrals.

**Design rule**: Every new surface must not alienate any of the three. If it's kid-themed, we need an "adult mode" counterpart. If it's adult-calm, we need a kid-friendly counterpart.

---

## 🧱 UX principles (non-negotiable guardrails)

These are invariants. Break them and we break trust.

1. **Mobile-first, always.** Every layout ships designed for ≤640px first. Desktop is the enhancement.
2. **Bilingual parity at every touchpoint.** ES ↔ EN, never launch a feature with asymmetric strings. (Future: IT, PT-BR, PT, FR — added two at a time with a verification pass.)
3. **One-tap gratification.** Core actions (download, review, claim ticket, redeem prize) ≤ 3 taps from home.
4. **No dead ends.** Every empty state has an action. Every error has a retry. Every spinner has a cap (2s max visible before skeleton).
5. **Cognitive load = zero for kids, low for parents.** Parent-side pages can show economy; kid-adjacent flows (coloring download) must stay minimal.
6. **Performance is UX.** Lighthouse ≥ 90 on mobile for home, reviews, coloring library, profile. Enforced pre-merge.
7. **Accessibility is UX.** Contrast AA minimum; focus rings visible; keyboard nav on all forms; screen-reader labels on every icon-only button.
8. **Safety is UX.** No user-generated images without moderation queue. No free text rendered into emails without `sanitizeEmailText`. No child photos anywhere, ever.
9. **Reversible by default.** Every destructive action asks once. Every purchase has a grace-period undo (except for cosmetics already visible to others).
10. **No "dark patterns."** No streak-shaming, no forced-social, no FOMO countdowns on daily actions, no artificial scarcity for essentials.

---

## 🎁 Value pillars (why they sign up AND share)

A must-have app isn't one killer feature; it's a small stack of pillars each of which alone is strong enough to justify an account.

### Pillar 1 — Free, generous content (coloring + stories)
- Ample library of free printables, bilingual bedtime stories, fun-fact packs.
- Always include a weekly "freshly added" shelf on home for return-triggering.
- Watermark-free downloads for registered users on the free tier (current behavior — protect it).

### Pillar 2 — Real, monthly winnable prizes (the lottery engine)
- Public, transparent: past winners are always visible + state/country shown.
- Tickets are earned via *healthy* behaviors: reviews, shares, streaks — never paywalled.
- 1 guaranteed winner per month minimum, announced same day every month.
- Auto-DM winner + public shout + optional social post (with their consent).

### Pillar 3 — Peanut economy with emotional surface (community layer)
- See Phase F in [PEANUTS_SHOP_2.0_COMMUNITY_EXPANSION.md](./PEANUTS_SHOP_2.0_COMMUNITY_EXPANSION.md) — cosmetics become visible, frames mean something.
- Users feel ownership, collect, customize, and flex.

### Pillar 4 — Family moments (the share asset we create FOR them)
- Weekly "family card" auto-generated: their kid's name + a mini-story page they can share in WhatsApp/Instagram (consent required; photo-free; art-based only).
- Seasonal cards (birthdays, holidays) triggered by opt-in.
- Every asset is pre-branded subtly so sharing = organic reach.

### Pillar 5 — Community & identity
- Public leaderboard (opt-in), community wall (shoutouts), badge collection, streak — low-toxicity because scope is narrow and wholesome.
- Reciprocal kindness tools (gift peanuts, endorse reviews, "thank you" micro-interactions).

### Pillar 6 — Physical book pipeline
- Our "why we exist" product. Every digital loop quietly leads toward a book sale or book giveaway.
- Peanut-redeemable physical books close the loop from engagement → tangible reward.

---

## 🚪 Onboarding — the first 60 seconds

This is the single highest-leverage screen set in the app. 60 seconds decides install-rate, share-rate, and retention.

### Flow (locked spec)

1. **Landing (anon)** — show 2–3 beautiful downloads above the fold, "Create free account to download" CTA.
2. **Sign-up modal** — email only (no password-first); magic-link OR passwordless OTP; explicit bilingual language picker; checkbox for newsletter preference (default ON for Spanish, opt-in for English? — A/B test).
3. **Welcome bounty** — first login gifts **5 🥜 + 1 lottery ticket** immediately with an animated reveal. This is the dopamine hook.
4. **2-question quiz** (optional, skippable): "Age of your little chubby?" + "Favorite topic (dinos, space, princesses, animals…)?" → personalizes the home shelves.
5. **First-download flow** — shows *two* recommendations (based on quiz or default), enlarged CTA, 1-click print.
6. **Post-download overlay** — "Tell us what you loved → earn 5 more 🥜" linking to a 10-second review card (emoji + 1 line).
7. **Day-2 email** (if opted in) — "Here's your giveaway status" + 1 fresh download.

### Success metric
- **D1 return-rate ≥ 35%**. If we're below this we re-design onboarding, not features.

### Anti-patterns banned
- No forced onboarding tour.
- No interstitial ads.
- No paywall before the first download.
- No request to enable push notifications in first session.

---

## 🔁 The daily loop (why they return)

We need a reason to check the app daily without feeling nagged. This is the retention architecture.

### The "5-minute ritual"

| Surface | Time cost | Value delivered | Peanuts reward |
|---|---|---|---|
| Daily fact / daily coloring tip | 15s | Micro-dopamine, learning moment | +1 🥜 if opened |
| Streak check-in | 5s | Visual streak animation, small pride moment | +2 🥜 (capped daily) |
| 1 quick review (optional) | 45s | Identity expression, adds to leaderboard | +5 🥜 |
| Community wall skim | 1–2 min | Social validation | 0 (consumption) |
| Giveaway status glance | 5s | Aspirational reminder | 0 |

**Design rule**: A user who does zero of these still sees progress. We never *punish* absence; we only *reward* presence. Streak-freeze item exists for grace.

### Weekly anchors
- **Monday**: fresh downloads shelf.
- **Wednesday**: new community spotlight rotates.
- **Friday**: "Family Friday" shareable card auto-generated.
- **Last day of month**: lottery draw + leaderboard reset with fanfare.

---

## 🌐 Viral & sharing loops

A must-have app grows without paid ads. We design share-asset-first; reward share-action-second.

### Loop 1 — Referral ("bring a friend, both win")
- Every user has a referral link (`/?ref=<short_code>`). New signups via that link grant **+10 🥜 to both** at first action verification.
- Cap: max 20 referrals/user per month (abuse guard). Migration for `referral_bonus` already shipped (038).
- Display referral count on profile as a badge tier (Bronze 5 / Silver 15 / Gold 30 referrers).

### Loop 2 — Share-to-earn (lightweight, social-native)
- Every download page has a **"Share & earn 2 🥜"** button that opens native share sheet with pre-baked copy + image.
- Shared URL includes UTM + referral code, so both attribution AND referral stack. Peanuts granted after verified click-through (anti-spam).
- Daily cap per user to prevent flooding.

### Loop 3 — Kid art wall (parental-gated, eventually)
- Parents can upload a **scan of the coloring done by their kid** (face-free, art-only). Goes to a moderation queue → once approved, public in "Little Chubby Hall of Fame".
- Art must be approved by a real human before public. Earns bulk peanuts (+20 🥜) + featured spot for 3 days.
- **High viral potential**: parents share "my kid made it to the hall!" — family-native bragging.
- This requires careful moderation infra — see §Community health.

### Loop 4 — Family / classroom pack
- New account type `family_plan` (≤5 profiles under one email). Encourages household signups without extra revenue pressure. Each sub-profile has separate streak but peanuts go to household pool.
- Classroom pack (`educator_plan`) — verified teacher gets bulk-download license + a public "Classroom of the month" feature.

### Loop 5 — Seasonal campaigns
- Mother's Day, Back-to-school, Christmas, Day of the Dead, Carnaval — each a 2-week themed shop_drop + auto-share card.
- Always bilingual, always respects regional calendar (PT-BR Carnaval ≠ ES calendar).

---

## 🌍 Internationalization roadmap

We're bilingual (ES/EN) today. To go "international" we layer carefully.

### Tier 1 — Languages (order of priority based on persona density)
1. ES (shipped) · EN (shipped)
2. **IT** (shipped brand already bilingual ES/EN; Italian is closest linguistic expansion, Sofia persona dense)
3. **PT-BR** (huge Maria persona market)
4. **PT** (small incremental cost on top of PT-BR)
5. **FR** (France + Quebec + French Africa)
6. **DE** (later; lower priority unless data proves otherwise)

### Tier 2 — i18n invariants
- `src/data/i18n.ts` remains single source; every new key ships in all active languages simultaneously.
- Automated parity check in CI: fail build if keys desynchronize.
- Language picker in header + sticky in profile.
- Auto-detect on first visit (Accept-Language), confirm once, never surprise-switch after.
- **URLs always carry language prefix** `/[lang]/...` (already the pattern; do not regress).

### Tier 3 — Regional nuance
- Prize shipping varies by region — lottery page shows eligible countries per prize (already supported via winners table schema).
- Calendar/timezone: all schedules in UTC; display in user's locale.
- Currency: peanuts are global, books priced in user's region currency (Amazon affiliate already regional).
- **Cultural bake-in**: Maria persona content rotates by region (Carnaval for BR, Thanksgiving for US, Fiestas Patrias for LATAM).

---

## ♿ Accessibility & kid-safety (hardcoded baselines)

### Accessibility
- WCAG AA minimum everywhere; AAA on kid-adjacent reading flows.
- All images have meaningful `alt`. Decorative ones have `alt=""` (never missing).
- All icon-only buttons have `aria-label` bilingual via i18n.
- Form errors announced via `aria-live` polite.
- Reduced-motion media query respected on all frame animations.
- Minimum touch target 44×44 CSS px on mobile.
- Dyslexia-friendly optional font toggle in profile (future, but plan for it now).

### Kid-safety
- **No chat between users, ever.** Interaction is limited to reviews (moderated), badge gifting (pre-approved actions), and public wall (moderated).
- **No user-uploaded photos of people.** Only art scans, and only after moderation.
- **No public display of children's names.** Only parent display_name; sub-profiles stay household-private.
- **COPPA-safe path for US**: no account for under-13 directly. Parent-managed sub-profiles only.
- **GDPR-safe path for EU**: explicit consent on marketing, data-export on request, right-to-erasure honored.
- **Age-gated features flagged at DB level**: `profiles.age_verified` + `profiles.region_code` — enforced server-side, never client-trusted.

---

## 📱 Progressive Web App + native app feel

Going international on web means mobile web IS the app for most users. PWA closes the gap before we ship native.

### PWA spec
- `public/manifest.json` (exists) refined with proper icons, theme colors, standalone display.
- Service worker: offline support for recently visited pages + downloaded coloring pages.
- Installable banner with soft prompt after 3rd visit (never on first).
- Push notifications (opt-in only, kid-flow-safe): lottery reminder day-of, streak-at-risk nudge, winner announcement.
- Splash screen + icon polish for iOS/Android home-screen install.

### Later: native wrappers
- When DAU justifies, wrap with Capacitor (NOT a rewrite). Same Astro SSR backend.
- Reserve App Store/Play Store names early (operational task, not engineering).

---

## 🧒 Parent-specific features (the "Maria" wedge)

### Parent dashboard (inside profile)
- **Kid mini-profiles** (up to 5) — name, age, favorite topics, favorite characters. Drives personalization.
- **Bedtime timer** — reads one bedtime story aloud (TTS) with calm transition to "night mode" UI (dark, less dopamine).
- **Printable queue** — parent picks 3–5 sheets, batched to one print-ready PDF.
- **Monthly family recap email** (opt-in): "This month your family colored 12 pages, earned 3 badges, and is 2 tickets away from the next giveaway."

### "Quiet hours" setting
- Disables streak anxiety, reminder emails, and push notifications during user-defined hours. Respects family life.

### Kid creations journal
- Private log (not public wall) where the parent saves scans of the kid's finished art as a keepsake. Builds long-term retention via sentimental value.

---

## 👩‍🏫 Educator channel (tertiary, validate first)

Only after Phases F + Family Plan ship — we open educator beta.

- Verified educator (email domain + manual approval) gets:
  - Free bulk download license (with "© Little Chubby Press" credit line).
  - "Classroom pack" landing page with 10-page themed PDFs.
  - 3× peanut earn rate for referrals (classrooms multiply fast).
  - Public "Classroom of the month" feature with consent.
- Educators become our organic distribution: parents sign up because "teacher said to check out Little Chubby Press."

---

## 🛡️ Community health & moderation

This is where free communities usually die. We lock it down now.

### Review moderation (existing, preserve)
- Every review passes through existing moderation pipeline before public.
- Add: reporter button (parent can report a review) → creates moderation ticket.

### Public wall / shoutout feed
- Every item pre-approved by admin (`shoutout_orders` already has approve flow).
- Add shadow-ban capability on admin side (user can post; nothing shows publicly). Silent, no confrontation.

### Kid art wall
- Double-moderation: image model pass + human approval before public.
- Right-click save disabled on all kid-art images; EXIF stripped; watermarked subtly.
- Parent can retract at any time (hard delete + cache purge).

### Abuse guards
- Rate limits already exist per action — document them as invariants in `ADMIN_SECURITY_AUDIT.md` next pass.
- Add `user_reports` table (user_id, target_type, target_id, reason, created_at, status).
- Auto-escalate after N reports in M minutes to admin email.

---

## 💰 Economy balance (don't inflate, don't frustrate)

Peanut math must stay stable as we add earn and spend surfaces.

### Balance invariants
- Average active user earns **~30–50 🥜 / week** organically (review + streak + share + daily fact).
- Cheapest meaningful cosmetic ≥ **20 🥜** (≈ 3–4 days of light engagement).
- Mid-tier cosmetic ≈ **60–90 🥜** (≈ 2 weeks).
- Top-tier physical reward ≈ **500–900 🥜** (≈ 2–3 months of engaged use) — feels earnable but special.
- **Never** let users earn more passively than they can reasonably spend. If catalog lags, pause earn multipliers.

### Telemetry needed before next drop
- Dashboard: avg weekly earn, avg weekly spend, peanut velocity by cohort.
- Alert: when weekly earn > 1.5× weekly spend for 4 straight weeks → pause earn boosts until catalog expansion lands.

### Anti-whale & anti-abuse
- Hard cap `peanut_balance` sanity check (≥ 10000 → flag for review).
- All RPCs that mint peanuts use advisory lock + idempotent `reason` constraint. (Already in place — protect.)

---

## 📈 Measurement — how we know we became "must-have"

North-star metric: **Weekly active households (WAH) × retention at 12 weeks (W12)**.

### Leading indicators (check weekly)
- D1 return-rate of new signups (target ≥ 35%)
- W4 retention cohort curve (target ≥ 25%)
- Review-per-active-user per month (target ≥ 1.2)
- Share button CTR on download pages (target ≥ 8%)
- Referral conversion rate (referred signup / click) (target ≥ 12%)

### Lagging indicators (check monthly)
- Monthly active households (MAH)
- Organic traffic share (target: ≥ 60% non-paid)
- Peanut economy velocity (earn ≈ spend, ±15%)
- Giveaway participation rate (tickets claimed / active users) (target ≥ 60%)
- Book purchase attribution from on-site traffic (rising trend, no specific target yet)

### Dashboard
- Build (or extend existing admin analytics) a single `/admin/health` page that shows all of the above at a glance, red/yellow/green per metric, updated daily via cron.

---

## 🧪 Tech invariants (must not break)

These protect the current shipped app. Every plan item in this doc must respect them.

1. **Astro SSR + Vercel** — no Next.js migration, no framework switch.
2. **Supabase** — postgres + RLS is our source of truth; no duplicate state in client.
3. **Cookie auth for all mutating endpoints** — no JWT in localStorage.
4. **`prerender=false` + `Cache-Control: no-cache`** for every authenticated/mutating API.
5. **Rate limit** via `rate_limit(action)` helper on every user-facing mutation.
6. **Advisory locks** in every RPC that touches `peanut_balance`, `lottery_tickets`, `premium_download_credits`.
7. **i18n parity** enforced in CI.
8. **Mobile Lighthouse ≥ 90** on core pages pre-merge.
9. **Migrations are additive** — never drop columns, never rename in place; deprecate + add + backfill + flip reader.
10. **Feature flags** for any new user-facing feature that touches existing flows. Flag off by default; progressive rollout (5% → 25% → 100%) with a kill switch.

### New invariant to adopt (Phase G onward)
- **Zero new client-trusted state**. Any cosmetic, any economy value, any streak day — all derived server-side.

---

## 🗺️ Roadmap — Phase F through Phase K

Phases A–E shipped (see `PEANUTS_ECONOMY_MASTER_PLAN.md` + `/memories/repo/peanuts-economy-shipped.md`).

### Phase F — Visibility & identity (April–May 2026)
Enables cosmetics to matter. Detailed in [PEANUTS_SHOP_2.0_COMMUNITY_EXPANSION.md](./PEANUTS_SHOP_2.0_COMMUNITY_EXPANSION.md).
- Migration 050–054.
- `<UserFlair />` component rollout.
- Featured badge, new frames, titles, effects.

### Phase G — Growth loops & onboarding hardening
- Onboarding rewrite to spec above.
- Referral 2.0 (badge tiers for referrers).
- Share-to-earn button on every download page.
- PWA hardening (service worker, offline, install prompt).
- Migration 055–058: `referral_tiers`, `share_events`, `user_reports`, `feature_flags`.

### Phase H — Family & classroom
- Family plan sub-profiles.
- Quiet hours + kid-creation journal (private).
- Educator beta with verification.
- Migration 059–062: `household_id`, `sub_profiles`, `educator_verifications`, `bedtime_sessions`.

### Phase I — Kid art wall (high-moderation feature, last)
- Upload pipeline + 2-step moderation.
- Hall of fame page.
- Social share auto-generation.
- Migration 063–065: `kid_artworks`, `moderation_queue_extend`, `hall_of_fame`.

### Phase J — Internationalization expansion
- IT launch → measure → PT-BR → FR → DE.
- Regional seasonal content (auto-driven by user region).
- Multi-region lottery shipping logic refinement.
- No schema change; data expansion + i18n expansion.

### Phase K — PWA → Native wrapper (only if DAU justifies)
- Capacitor wrapper, no rewrite.
- App Store / Play Store release.
- Push notification infrastructure (opt-in, kid-safe schedule only).

---

## ❌ Explicit non-goals (protect focus)

- Not building real-time chat or DMs between users. Ever.
- Not building a video platform.
- Not competing with Canva/editing tools. Our coloring pages are printable, not editable.
- Not pursuing NFTs, crypto, or on-chain peanuts.
- Not selling user data. Ever.
- Not adding ad networks. Period.
- Not launching a Pro/Premium tier that locks existing free features. New features can be premium; existing ones stay free.

---

## ⚠️ Risk register

| Risk | Severity | Mitigation |
|---|---|---|
| Peanut inflation (earn >> spend) | High | Velocity dashboard + catalog-paced earn boosts. |
| Moderation failure on kid art wall | Critical | Phase I is last; automated pre-moderation model + manual double-check before any publish. |
| i18n drift (lang parity breaks) | Medium | CI parity check (already exists for some; extend to all new keys). |
| Breaking existing users' sessions during migration | High | Additive migrations only; feature-flagged rollouts; staging smoke test before production. |
| Over-gamification alienating Sofia persona | Medium | Adult-mode UI toggle; calm aesthetic option in profile themes. |
| Regional feature mismatch (EU GDPR, US COPPA) | High | Region detection at signup; legal features gated at DB level, not client. |
| Social-share abuse / peanut farming | Medium | Daily caps; verified click-through; admin review of top earners. |
| SEO regression from `/[lang]/` changes | High | Never change URL structure without `Link: rel=canonical` + 301s. |

---

## ✅ Next 3 concrete commits (Phase F kickoff)

1. **Create `src/components/UserFlair.astro`** — shared identity renderer.
2. **Integrate in review cards** in `src/pages/[lang]/reviews.astro` (fetch owner fields: avatar_url, accent_color, featured_badge, top profile_badges).
3. **Migration 050** — `ALTER TABLE profiles ADD COLUMN featured_badge text` + `POST /api/set-featured-badge` endpoint + picker UI in profile "Adventure" tab.

After this commit, existing gold frames have social payoff, and we can validate the loop before investing in catalog expansion.

---

## 📜 Change log

- **April 2026** — document created as the North Star consolidating Phases A–E (shipped) and introducing Phases F–K.
