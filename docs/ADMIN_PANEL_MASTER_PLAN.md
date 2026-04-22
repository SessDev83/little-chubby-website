# Admin Panel — Master Implementation Plan

**Date:** April 20, 2026  
**Scope:** Full admin panel overhaul — security hardening + feature expansion  
**Approach:** Fix security first, then implement features phase by phase  

---

## Table of Contents

1. [Current State Analysis](#1-current-state-analysis)
2. [Backend Systems vs Admin UI Gap](#2-backend-systems-vs-admin-ui-gap)
3. [Security Vulnerabilities — Must Fix Before Implementing](#3-security-vulnerabilities)
4. [Technical Edge Cases & Race Conditions](#4-technical-edge-cases--race-conditions)
5. [Functional Gaps & Missing Features](#5-functional-gaps--missing-features)
6. [Implementation Plan — Phases](#6-implementation-plan)
7. [Implementation Order & Dependencies](#7-implementation-order--dependencies)
8. [Files That Will Be Modified](#8-files-that-will-be-modified)
9. [Database Migrations Needed](#9-database-migrations-needed)
10. [Testing Checklist](#10-testing-checklist)

---

## 1. Current State Analysis

### Existing Admin Pages (3 total)

| Page | Path | What It Does | Lines | Status |
|------|------|-------------|-------|--------|
| Dashboard | `/admin/` → `src/pages/admin/index.astro` | 4 stat cards (users, approved reviews, pending reviews, winners) + 2 nav links | ~84 | Minimal |
| Users | `/admin/users/` → `src/pages/admin/users.astro` | Read-only table: email, name, lang, admin flag, joined date. No actions, no search, no pagination | ~56 | Bare-bones |
| Lottery & Reviews | `/admin/lottery/` → `src/pages/admin/lottery.astro` | **Monolith ~900 lines** mixing: lottery config, draw execution, leaderboard, pending review moderation (approve/reject/bulk/feature/delete), winners history + CSV export | ~900 | Overloaded, needs splitting |

### Existing API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/me` | GET | User session + peanut/ticket balance |
| `/api/my-reviews` | GET | User's own reviews (RLS-enforced) |
| `/api/notifications` | GET/PATCH | User notifications + mark-read |
| `/api/subscribe-newsletter` | POST | Newsletter signup (double opt-in) |
| `/api/confirm-subscription` | GET | Confirm newsletter token |
| `/api/unsubscribe` | GET | Hard unsubscribe via token |
| `/api/buy-tickets` | POST | Spend peanuts → get tickets |
| `/api/buy-lottery-entry` | POST | Spend tickets → enter giveaway (atomic) |
| `/api/enter-giveaway` | POST | Alternate giveaway entry path |
| `/api/buy-badge` | POST | Buy profile badge with peanuts |
| `/api/boost-review` | POST | Boost review in gallery with peanuts |
| `/api/share-reward` | POST | Earn peanuts for sharing |
| `/api/track-share` | POST | Track social shares |
| `/api/download-artwork` | POST | Download artwork, deduct peanuts |
| `/api/credit-history` | GET | User's credit transaction ledger |
| `/api/cron/monthly-draw` | GET | Automated monthly lottery draw |
| `/api/cron/newsletter-reminders` | GET | Drip reminders for unconfirmed subs |
| `/api/cron/weekly-newsletter` | GET | Weekly newsletter to confirmed subs |

### Existing Database Tables (25 migrations)

| Table | Purpose | Used By |
|-------|---------|---------|
| `profiles` | User profiles (name, avatar, address, phone, country, is_admin) | Auth, admin, profile page |
| `book_reviews` | Review submissions (photo, rating, text, status, featured) | Reviews page, admin moderation |
| `pageviews` | Page view tracking | Analytics scripts only |
| `lottery_config` | Monthly lottery settings (max_winners, winner_pct, etc.) | Lottery page, admin, cron |
| `lottery_entries` | User entries per month (entry_count, purchased_at) | Lottery page, admin draw |
| `lottery_winners` | Draw results (book_chosen, shipping, claimed, deadline) | Admin, winners page, cron |
| `lottery_draw_log` | Audit trail for draws | Admin, cron |
| `purchases` | Amazon order verification (⚠️ UNUSED — never wired up) | Nothing |
| `newsletter_subscribers` | Email list (double opt-in, confirm_token, drip state) | Newsletter API, cron |
| `credit_transactions` | Peanut ledger (+5 review, +1 share, -1 download, -N ticket_purchase) | All peanut APIs |
| `ticket_transactions` | Ticket ledger (+5 review_reward, +N peanut_purchase, -N giveaway_entry) | Ticket/giveaway APIs |
| `user_notifications` | In-app notifications (bilingual, read/unread) | Header bell, notification API |
| `free_artworks` | Coloring corner images (title, category, image_path, peanut_cost) | Gallery page, download API |
| `artwork_downloads` | Download tracking per user | Download API |
| `profile_badges` | Purchased badges (frame_gold, frame_silver, top_reviewer, star_parent) | Badge API, gallery |
| `gallery_boosts` | Paid review boosts (pin_7d, gold_border, expires_at) | Boost API, gallery |
| `admin_audit_log` | Admin action audit trail | Admin lottery page |
| `social_metrics` | Social media engagement data (bluesky, facebook, instagram) | Agent scripts only |
| `traffic_insights` | Daily aggregated traffic by source | Agent scripts only |
| `engagement_snapshots` | Weekly engagement summaries | Agent scripts only |
| `content_groups` | Content grouping for analytics | Agent scripts only |

### Existing Auth & Security Infrastructure

- **Auth flow:** PKCE via Supabase Auth, httpOnly cookies, `sameSite: lax`, `secure: true`
- **Session refresh:** Middleware auto-refreshes tokens on every request
- **Admin check:** `isAdmin()` checks hardcoded `ADMIN_EMAILS` + DB `profiles.is_admin`
- **CSRF:** Only on `lottery.astro` (admin) via Origin header validation
- **Security headers:** HSTS preload, X-Frame-Options DENY, CSP, COOP, CORP (via `vercel.json`)
- **Rate limiting:** DB-based via `check_rate_limit()` on ticket/badge/boost/download/entry endpoints
- **Audit logging:** `admin_audit_log` table + `lottery_draw_log` table
- **Cron auth:** `CRON_SECRET` Bearer token (but check is conditional — see vulnerability T5)

---

## 2. Backend Systems vs Admin UI Gap

These systems have full backend support but **ZERO admin visibility or control**:

| System | Backend Tables/APIs | What Admin Can't Do |
|--------|-------------------|---------------------|
| **Newsletter Subscribers** | `newsletter_subscribers` + subscribe/confirm/unsubscribe APIs + drip cron | Can't see subscribers, can't see confirmation rates, can't resend confirmation, can't manually unsubscribe, can't export list |
| **Peanut Economy** | `credit_transactions` + share-reward/download-artwork/buy-tickets APIs | Can't see total peanuts in circulation, can't see top earners, can't gift/deduct peanuts, can't see spending patterns |
| **Ticket System** | `ticket_transactions` + buy-tickets/enter-giveaway APIs | Can't see ticket distribution, can't gift tickets, can't see who entered which month |
| **Badges** | `profile_badges` + buy-badge API | Can't see who has badges, can't grant/revoke, can't see purchase stats |
| **Gallery Artworks** | `free_artworks` + download-artwork API | Can't add/edit/toggle artworks, can't set prices, can't see download stats (only via CLI script) |
| **Audit Log** | `admin_audit_log` | Log exists but no viewer — it's write-only |
| **Notifications** | `user_notifications` + notify_user() RPC | Can't send custom notifications to users, can't see notification status |
| **Analytics** | `pageviews`, `social_metrics`, `traffic_insights` | Only accessible via CLI scripts and daily email — no dashboard |
| **Purchase Verification** | `purchases` table | Table exists from migration 001 but was NEVER wired to any endpoint or UI |
| **Social Media** | `social_metrics`, agent scripts | Post scheduling, engagement data only via CLI |
| **Blog Content** | `src/content/blog/`, `create-blog-post.mjs` | Only manageable via CLI script |

---

## 3. Security Vulnerabilities

### 🔴 CRITICAL — Must fix BEFORE any new implementation

#### C1: No CSRF Protection on Public POST Pages
- **Files affected:** `src/pages/[lang]/profile.astro`, `src/pages/[lang]/reviews.astro`, `src/pages/[lang]/lottery.astro`, `src/pages/[lang]/login.astro`, `src/pages/[lang]/register.astro`, `src/pages/[lang]/forgot-password.astro`
- **Problem:** Only admin `lottery.astro` validates Origin header. All public pages with POST forms (profile save, review submit, lottery claim, password change, email change) have NO CSRF protection.
- **Risk:** A malicious website can craft a form that submits a POST to your site on behalf of a logged-in user. The `sameSite: "lax"` cookie mitigates cross-origin POSTs from `<form>` tags in most modern browsers, but does NOT protect against top-level navigation POSTs or older browser edge cases.
- **Fix:** Add Origin header validation to ALL pages that handle POST, or implement CSRF tokens. When adding new admin pages, EVERY one must include CSRF protection.
- **Implementation note:** Create a shared CSRF validation utility function to avoid copy-pasting the check in every file.

#### C2: No CSRF on Admin Users Page (Before Expansion)
- **File:** `src/pages/admin/users.astro`
- **Problem:** Currently read-only (no POST handler). But when we add user management actions (toggle admin, gift peanuts, ban user), we MUST add CSRF from the start.
- **Fix:** Include CSRF validation in every new admin page from day one.

#### C3: No Server-Side Input Length Validation on Profile Updates
- **File:** `src/pages/[lang]/profile.astro` (lines 49-60)
- **Problem:** `display_name`, `phone`, `address_line1`, `address_line2`, `city`, `state`, `zip_code`, `country` — none have server-side length limits. A user can send multi-megabyte strings via cURL that get stored in the database.
- **DB level:** No `CHECK (length(x) < N)` constraints on `profiles` table.
- **Fix:** Add server-side validation (e.g., `display_name` max 100, `phone` max 30, address fields max 200, etc.) + DB constraints via migration.

#### C4: No Server-Side Length Validation on Lottery Claim
- **File:** `src/pages/[lang]/lottery.astro` (lines 157-168)
- **Problem:** `shipping_name` and `shipping_address` are saved without any length validation.
- **Fix:** Server-side max length (shipping_name: 200, shipping_address: 500) + DB constraints.

#### C5: No Server-Side Length Validation on Review Text
- **File:** `src/pages/[lang]/reviews.astro` (line 63)
- **Problem:** HTML has `maxlength` attribute on frontend but server accepts any length via direct POST.
- **Fix:** Server-side check `review_text.length <= 2000` before insert/update.

#### C6: No Server-Side Length Validation on Admin Reviewer Notes
- **File:** `src/pages/admin/lottery.astro` (lines 149-163)
- **Problem:** HTML has `maxlength="500"` but server doesn't enforce.
- **Fix:** Server-side check `reviewerNote.length <= 500`.

---

### 🟠 IMPORTANT — Security Improvements

#### I1: Modulo Bias in `secureRandomIndex()`
- **Files:** `src/pages/admin/lottery.astro` (lines 41-44), `src/pages/api/cron/monthly-draw.ts` (lines 10-14)
- **Problem:** `crypto.getRandomValues(arr); return arr[0] % max;` — when `max` is not a power of 2, lower indices have slightly higher probability. For a pool of 7, the first 2 have ~14.3% higher chance.
- **Impact:** Unfair lottery draw, small but measurable bias.
- **Fix:** Implement rejection sampling: regenerate random values when they fall in the biased range.
- **Implementation:**
  ```typescript
  function secureRandomIndex(max: number): number {
    const arr = new Uint32Array(1);
    const limit = Math.floor(0xFFFFFFFF / max) * max;
    do {
      crypto.getRandomValues(arr);
    } while (arr[0] >= limit);
    return arr[0] % max;
  }
  ```

#### I2: Admin Origin Check Fails in Local Development
- **File:** `src/pages/admin/lottery.astro` (lines 103-107)
- **Problem:** `allowedOrigins` is hardcoded to `littlechubbypress.com` variants. In `localhost:4321` development, all admin POSTs are blocked by CSRF.
- **Fix:** Include `Astro.url.origin` dynamically in the allowed origins list:
  ```typescript
  const allowedOrigins = [
    new URL(siteUrl).origin,
    "https://www.littlechubbypress.com",
    "https://littlechubbypress.com",
    Astro.url.origin, // allows localhost in dev
  ];
  ```
- **Note:** This is safe because Origin header is set by the browser and cannot be spoofed from cross-origin requests.

#### I3: `getServiceClient()` Creates New Client Per Call
- **File:** `src/lib/supabase.ts` (lines 14-17)
- **Problem:** Every call creates a new Supabase client instance. Not a memory leak but wasteful. With expanded admin pages making 10+ service client calls per page load, this adds unnecessary overhead.
- **Fix:** Cache the service client in a module-level variable:
  ```typescript
  let _serviceClient: ReturnType<typeof createClient> | null = null;
  export function getServiceClient() {
    if (!_serviceClient) {
      _serviceClient = createClient(supabaseUrl, import.meta.env.SUPABASE_SERVICE_ROLE_KEY);
    }
    return _serviceClient;
  }
  ```

#### I4: `participant_boost` Exposed to Frontend
- **File:** `src/pages/[lang]/lottery.astro` (lines 76-78)
- **Problem:** The lottery page selects `participant_boost` from `lottery_config` and adds it to the real count. If a user inspects the Supabase request via network tab, they can see the `participant_boost` field separately, revealing that the participant count is artificially inflated.
- **Fix:** Don't select `participant_boost` in the public page query — compute the boosted count server-side and only send the final number to the template. Or use a DB view/function that returns only the combined count.

#### I5: CSV Export Doesn't Properly Escape Values
- **File:** `src/pages/admin/lottery.astro` (lines 723-743)
- **Problem:** CSV is built by reading `cell.textContent` and wrapping in double quotes, but if a `display_name` contains double quotes, newlines, or commas, the CSV cells will break. The current code does `val.replace(/"/g, '""')` which handles double quotes but NOT embedded newlines.
- **Fix:** Also replace newlines: `val.replace(/\n/g, ' ').replace(/\r/g, '')`.

#### I6: No Pagination on Admin User List
- **File:** `src/pages/admin/users.astro` (lines 14-17)
- **Problem:** Fetches ALL users with `select("*").order(...)`. With 1000+ users, the page becomes slow and expensive.
- **Fix:** Implement server-side pagination with `range()` + page query param.

#### I7: No Pagination on Pending Reviews
- **File:** `src/pages/admin/lottery.astro` (lines 322-326)
- **Problem:** Fetches ALL pending reviews at once. 500+ pending reviews will cause slow page loads.
- **Fix:** Paginate or limit to 50 with a "Load More" button.

#### I8: Winners History Has No Pagination
- **File:** `src/pages/admin/lottery.astro` (line 395)
- **Problem:** Limited to 50 with `.limit(50)` but no way to see older winners. Over time this becomes insufficient.
- **Fix:** Add pagination with month filter.

---

## 4. Technical Edge Cases & Race Conditions

#### T1: Double-Draw Race Condition (Admin Manual Draw)
- **File:** `src/pages/admin/lottery.astro` (lines 227-232)
- **Problem:** The page-load check `drawAlreadyDone` is separate from the POST handler re-check. If admin opens 2 tabs and clicks "Draw" in both simultaneously, both could pass the POST-time check before either inserts winners.
- **Mitigation:** `UNIQUE(user_id, month)` constraint (migration 020) prevents duplicate winners, but the second draw attempt would partially succeed (inserting non-duplicate users). The `lottery_draw_log` would also get duplicate entries.
- **Fix needed:** Use a DB-level advisory lock or a `lottery_draws` table with `UNIQUE(month)` to prevent any second draw attempt at the DB level.

#### T2: Orphaned Photos in Supabase Storage
- **File:** `src/pages/[lang]/reviews.astro` (lines 100-110)
- **Problem:** When a user edits a review and uploads new photos, the code only deletes `${base}.jpg` and `${base}.webp` (the cover photo). Extra interior photos (`${base}_2.jpg`, `${base}_3.jpg`, etc.) from the previous submission remain as orphaned files in Storage.
- **Impact:** Storage bloat over time, potential cost increase on Supabase.
- **Fix:** Before uploading new photos, list and delete all files matching `${user.id}/${bookId}*` in the bucket. Or track file paths in the `book_reviews` record and clean them on update.

#### T3: `confirm_token` Reused for Subscribe AND Unsubscribe
- **Files:** `src/pages/api/confirm-subscription.ts`, `src/pages/api/unsubscribe.ts`
- **Problem:** Both endpoints use the same `confirm_token` UUID. If someone obtains a subscriber's token (e.g., from a forwarded email), they can both confirm and unsubscribe that person.
- **Risk:** Token in email is visible to anyone the email is forwarded to. After confirmation, the token should be rotated so the old link can't be used to unsubscribe.
- **Fix:** After successful confirmation, regenerate the `confirm_token` with a new UUID. The unsubscribe link in subsequent emails will use the new token.

#### T4: Auth Callback Accepts Tokens via Query Params (Implicit Flow)
- **File:** `src/pages/[lang]/auth/callback.astro` (lines 71-90)
- **Problem:** The callback has a legacy fallback that accepts `access_token` and `refresh_token` as URL query parameters. This means auth tokens appear in:
  - Server access logs
  - Browser history
  - Referrer headers sent to other sites
  - Analytics tools
- **Risk:** Token leakage. The PKCE flow (`?code=`) is the primary flow and works correctly.
- **Fix:** Remove the implicit flow fallback entirely. If the `?code=` exchange fails, redirect to login. Don't accept raw tokens from query params.

#### T5: Cron Secret Check is Conditional (CRITICAL)
- **Files:** `src/pages/api/cron/monthly-draw.ts` (lines 23-27), `src/pages/api/cron/newsletter-reminders.ts` (lines 31-35), `src/pages/api/cron/weekly-newsletter.ts`
- **Problem:** The pattern is:
  ```typescript
  const cronSecret = import.meta.env.CRON_SECRET;
  if (cronSecret) {
    // only validate if secret is configured
  }
  ```
  If `CRON_SECRET` is not set in environment variables, **ANY unauthenticated GET request can trigger the monthly draw, send newsletters, or delete unconfirmed subscribers**.
- **Risk:** Complete bypass of cron authentication. Anyone who knows the URL can trigger draws.
- **Fix:** Make cron secret REQUIRED — if not set, return 500 with "CRON_SECRET not configured":
  ```typescript
  const cronSecret = import.meta.env.CRON_SECRET;
  if (!cronSecret) return new Response("Server misconfigured", { status: 500 });
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${cronSecret}`) return new Response("Unauthorized", { status: 401 });
  ```
- **Note:** `CRON_SECRET` was recently added to Vercel env. Verify it's set in ALL environments (production, preview, development).

#### T6: `lottery_config` Auto-Create Without Transaction
- **Files:** `src/pages/admin/lottery.astro` (lines 48-53), `src/pages/[lang]/lottery.astro` (lines 41-47)
- **Problem:** Both admin and public lottery pages do `insert` + `select` without a transaction. Two simultaneous requests for the same month could both try to insert, causing a PK violation error on the second request.
- **Mitigation:** The PK `month` prevents duplicates, but the second request gets a transient error.
- **Fix:** Use `INSERT ... ON CONFLICT DO NOTHING` or `upsert: true` in the Supabase client.

#### T7: Review Update via Service Client Bypasses RLS Column Restrictions
- **File:** `src/pages/[lang]/reviews.astro` (line 120+)
- **Problem:** Review updates use `sc` (service client) with `.eq("user_id", user.id)`. The service client bypasses RLS entirely. While the code correctly checks `user_id`, it also means the app-level code is responsible for ALL column restrictions (not just the DB). If a new field is added to `book_reviews` and the update code accidentally includes it, RLS won't catch it.
- **Not a current vulnerability** but increases risk as the codebase grows.

#### T8: Fake Winners Display on Public Lottery Page
- **File:** `src/pages/[lang]/lottery.astro` (lines 192-201)
- **Problem:** When no real winners exist, the page displays hardcoded sample winners ("Sofia Martinez", "Carlos Rodriguez", "Maria Garcia") with dynamically generated past months. This is misleading to users.
- **Risk:** Users may believe the lottery has been running with real winners. When the first real winner appears, the samples disappear, creating a visual inconsistency.
- **Fix:** Either remove fake winners entirely, or clearly label them as "example" with distinct styling. Or show "No winners yet — be the first!" messaging instead.

---

## 5. Functional Gaps & Missing Features

#### F1: No User Suspension/Ban Mechanism
- **Tables:** `profiles` has no `suspended` or `banned` field
- **Middleware:** `src/middleware.ts` doesn't check for suspension status
- **Impact:** If a user is abusive, there's no way to block them without directly deleting their Supabase Auth account
- **Implementation needed:**
  - Migration: add `suspended boolean default false` to `profiles`
  - Middleware: check `suspended` and clear cookies + redirect if true
  - Admin UI: toggle suspension from user management

#### F2: No Admin "Email User" Feature
- **Backend ready:** `sendToUser()` function exists in `src/lib/notifications.ts` and works (used for review decisions, lottery wins)
- **Missing:** No admin UI or endpoint to send arbitrary custom emails to a specific user
- **Implementation needed:**
  - Admin endpoint: `POST /api/admin/email-user` (validates admin, accepts userId, subject, body, lang)
  - Admin UI: form on user detail page
  - Uses existing `subscriberEmail()` template wrapper for consistent branding

#### F3: Zero Newsletter Admin Visibility
- **Backend:** Full subscriber lifecycle exists (signup → double opt-in → drip reminders → auto-cleanup at 20 days)
- **Missing:** Admin cannot:
  - See subscriber list
  - Filter by confirmed/pending
  - See confirmation rates
  - Resend confirmation manually
  - Export subscriber list as CSV
  - See subscriber growth over time
- **Implementation needed:** New `/admin/newsletter/` page

#### F4: No Manual Peanut Gift/Deduction
- **Backend ready:** `credit_transactions` table supports `reason: 'admin'`
- **Missing:** No endpoint or UI to insert admin-initiated peanut transactions
- **Implementation needed:**
  - Admin endpoint: `POST /api/admin/gift-credits` (validates admin, accepts userId, amount, reason note)
  - Must create audit log entry
  - Admin UI: form on user detail page

#### F5: No Manual Ticket Gift/Deduction
- **Backend ready:** `ticket_transactions` table supports `reason: 'admin'`
- **Missing:** Same gap as F4 but for tickets
- **Implementation needed:** Same pattern as F4

#### F6: No Gallery Artwork Admin CRUD
- **Backend:** `free_artworks` table with title, category, image_path, peanut_cost, active, sort_order
- **Currently managed by:** CLI script `scripts/upload-free-artworks.mjs`
- **Missing:** No admin UI to:
  - View all artworks with download counts
  - Toggle active/inactive
  - Change peanut cost
  - Upload new artworks
  - Reorder artworks
  - See download stats per artwork
- **Implementation needed:** New `/admin/gallery/` page

#### F7: Audit Log Has No Viewer
- **Backend:** `admin_audit_log` table records all admin actions (review moderation, config changes, draws)
- **Missing:** Write-only — no page to read the log
- **Implementation needed:** New `/admin/audit/` page with filters by action type, date range, admin user

#### F8: No Unified User Detail View
- **Problem:** To see everything about a user, admin would need to query 6+ tables manually
- **Missing:** Single page showing a user's:
  - Profile (name, email, avatar, address, country, phone)
  - All reviews (with status)
  - Peanut balance + transaction history
  - Ticket balance + transaction history
  - Badges owned
  - Lottery entries by month
  - Artwork downloads
  - Notification history
  - Newsletter subscription status
- **Implementation needed:** New `/admin/users/[id]/` page

#### F9: `purchases` Table is Completely Unused
- **Table:** `public.purchases` (migration 001) — Amazon order verification
- **Schema:** `id, user_id, amazon_order_id, book_id, status, submitted_at, reviewed_at, reviewer_note`
- **Problem:** No endpoint to submit purchases, no admin UI to review them, no flow references it
- **Decision needed:** Either wire it up as a feature or drop the table to avoid confusion
- **If keeping:** Need user-facing submit form + admin approval UI + ticket reward on approval

#### F10: No Economy Overview Dashboard
- **Missing:** Admin has no way to see:
  - Total peanuts minted vs spent
  - Average balance per user
  - Top earners/spenders
  - Peanut velocity (earn rate vs spend rate)
  - Badge purchase stats
  - Boost purchase stats
- **Implementation needed:** New `/admin/economy/` page or section in dashboard

#### F11: No Analytics Dashboard
- **Backend:** `pageviews`, `social_metrics`, `traffic_insights` tables exist
- **Currently accessible via:** Daily email (`daily-analytics-email.mjs`), agent scripts
- **Missing:** No visual dashboard with charts, trends, top pages
- **Implementation needed:** Future phase — `/admin/analytics/` page

#### F12: No Blog Management from Admin
- **Currently managed by:** `scripts/create-blog-post.mjs` CLI
- **Missing:** No admin UI to list posts, preview, trigger generation, edit metadata
- **Implementation needed:** Future phase

#### F13: No Social Media Dashboard
- **Currently managed by:** `scripts/social/` agent scripts (post.mjs, engage.mjs, etc.)
- **Missing:** No admin UI to schedule posts, view engagement, manage platforms
- **Implementation needed:** Future phase

---

## 6. Implementation Plan

### Phase 0: Security Hardening (BEFORE any new features) ✅ COMPLETE

| Task | Files | Description |
|------|-------|-------------|
| **0.1** Create shared CSRF utility | `src/lib/csrf.ts` (new) | Reusable `validateOrigin(request, astroUrl)` function |
| **0.2** Add CSRF to all admin pages | All `src/pages/admin/**` | Import and call `validateOrigin()` on every POST |
| **0.3** Add CSRF to public POST pages | `profile.astro`, `reviews.astro`, `lottery.astro`, `login.astro`, `register.astro`, `forgot-password.astro` | Same utility, applied to all user-facing POST handlers |
| **0.4** Server-side input length validation | `profile.astro`, `reviews.astro`, `lottery.astro` (public claim), admin `lottery.astro` | Max length checks on all text inputs before DB write |
| **0.5** Fix modulo bias in `secureRandomIndex` | `lottery.astro` (admin), `monthly-draw.ts` (cron) | Rejection sampling for fair draws |
| **0.6** Fix Origin check for localhost | Admin `lottery.astro` | Add `Astro.url.origin` to allowed origins |
| **0.7** Make CRON_SECRET mandatory | All 3 cron endpoints | Fail with 500 if not configured instead of skipping auth |
| **0.8** Remove implicit flow fallback | `src/pages/[lang]/auth/callback.astro` | Delete lines 71-90 that accept raw tokens via query params |
| **0.9** Rotate confirm_token after confirmation | `src/pages/api/confirm-subscription.ts` | Generate new UUID after successful confirmation |
| **0.10** Cache service client | `src/lib/supabase.ts` | Module-level singleton to avoid creating new client per call |
| **0.11** DB migration: input length constraints | New migration `026_input_length_constraints.sql` | `CHECK` constraints on profiles, book_reviews, lottery_winners text columns |
| **0.12** DB migration: suspended field | New migration `027_user_suspension.sql` | Add `suspended boolean default false` to profiles |

### Phase 1: Restructure Existing Admin Pages ✅ COMPLETE

| Task | Files | Description |
|------|-------|-------------|
| **1.1** Extract reviews from lottery.astro | New `src/pages/admin/reviews.astro` | Move all review moderation code (pending reviews, approve/reject/bulk/feature/delete) into dedicated page |
| **1.2** Slim down lottery.astro | `src/pages/admin/lottery.astro` | Keep only: lottery config, draw execution, leaderboard, winners history |
| **1.3** Expand dashboard stats | `src/pages/admin/index.astro` | Add: newsletter subscriber count, total peanuts in circulation, pending reviews (clickable), recent audit log entries (last 10) |
| **1.4** Expand dashboard navigation | `src/pages/admin/index.astro` | Add nav links to all new admin sections |
| **1.5** Shared admin layout/nav | Consider `AdminLayout.astro` component or admin nav component | Consistent sidebar or top-nav across all admin pages |
| **1.6** Pagination for user list | `src/pages/admin/users.astro` | Server-side pagination with `?page=N` |
| **1.7** Pagination for pending reviews | `src/pages/admin/reviews.astro` | Paginate or limit with "load more" |
| **1.8** Pagination for winners | `src/pages/admin/lottery.astro` | Month filter + pagination |
| **1.9** Add user search/filter | `src/pages/admin/users.astro` | Search by email/name, filter by admin/non-admin |

### Phase 2: Newsletter Admin ✅ COMPLETE

| Task | Files | Description |
|------|-------|-------------|
| **2.1** Newsletter admin page | New `src/pages/admin/newsletter.astro` | Full subscriber management |
| **2.2** Subscriber list with filters | Same | Filter: all / confirmed / pending / search by email |
| **2.3** Stats display | Same | Total subscribers, confirmed count, confirmation rate %, growth this month |
| **2.4** Resend confirmation action | Same | Admin can resend confirmation email to a pending subscriber |
| **2.5** Manual unsubscribe action | Same | Admin can remove a subscriber |
| **2.6** CSV export | Same | Export filtered subscriber list |

### Phase 3: User Detail Page + Power Tools ✅ COMPLETE

| Task | Files | Description |
|------|-------|-------------|
| **3.1** User detail page | New `src/pages/admin/users/[id].astro` | Unified view of a user's complete data |
| **3.2** Profile overview section | Same | Name, email, avatar, address, country, phone, joined date, admin status, suspended status |
| **3.3** Reviews section | Same | All reviews with status, rating, dates — link to review moderation |
| **3.4** Peanut balance + history | Same | Current balance, recent transactions, total earned, total spent |
| **3.5** Ticket balance + history | Same | Current balance, recent transactions |
| **3.6** Gift Peanuts form | Same + new API endpoint | Admin form: amount (+/-), reason note → inserts `credit_transactions` with reason `'admin'` |
| **3.7** Gift Tickets form | Same + new API endpoint | Same pattern for tickets |
| **3.8** Toggle admin status | Same | Set/unset `is_admin` on profile |
| **3.9** Toggle suspended status | Same | Set/unset `suspended` on profile, check in middleware |
| **3.10** Badge management | Same | View owned badges, grant/revoke badges |
| **3.11** Lottery entries | Same | Show entries by month, ticket count |
| **3.12** Download history | Same | Artworks downloaded |
| **3.13** Newsletter status | Same | Show if subscribed, confirmed, send custom email |
| **3.14** Send custom email form | Same + new API endpoint | Subject + body (bilingual), uses existing `sendToUser()` |
| **3.15** Middleware suspension check | `src/middleware.ts` | If user's profile has `suspended = true`, clear cookies and redirect to login |

### Phase 4: Economy & Gallery Admin ✅ COMPLETE

| Task | Files | Description |
|------|-------|-------------|
| **4.1** Economy overview page | New `src/pages/admin/economy.astro` | Peanuts in circulation, top earners/spenders, recent large transactions |
| **4.2** Gallery management page | New `src/pages/admin/gallery.astro` | List all artworks, toggle active, edit peanut_cost, view download counts |
| **4.3** Artwork upload from admin | Same | Upload new artwork images to Supabase Storage + insert into `free_artworks` |
| **4.4** Download stats per artwork | Same | Total downloads, unique users, revenue (peanuts collected) |

### Phase 5: Audit Log Viewer ✅ COMPLETE

| Task | Files | Description |
|------|-------|-------------|
| **5.1** Audit log page | New `src/pages/admin/audit.astro` | Searchable, filterable audit log viewer |
| **5.2** Filters | Same | By action type, date range, admin user, target type |
| **5.3** Pagination | Same | Server-side pagination |

### Phase 6: Analytics Dashboard (Future)

| Task | Description |
|------|-------------|
| **6.1** Page views widget | Daily/weekly/monthly pageview trends from `pageviews` table |
| **6.2** Top pages | Most visited pages with percentages |
| **6.3** Social metrics | Follower counts, post engagement from `social_metrics` |
| **6.4** Traffic sources | Breakdown from `traffic_insights` |
| **6.5** Newsletter health | Confirmation rate over time, churn rate |
| **6.6** Lottery participation trends | Month-over-month participation and ticket purchasing |

### Phase 7: Content Management (Future)

| Task | Description |
|------|-------------|
| **7.1** Blog manager | List posts, preview, edit metadata |
| **7.2** Social scheduler | View/schedule social posts via agent scripts |
| **7.3** Book catalog | Consider moving `books.ts` data to Supabase for admin editing |

---

## 7. Implementation Order & Dependencies

```
PHASE 0: Security Hardening ─────────────────────────────────
│ No dependencies — must be done FIRST
│
│  0.1  Create CSRF utility
│  0.2  Apply CSRF to admin pages (depends on 0.1)
│  0.3  Apply CSRF to public pages (depends on 0.1)
│  0.4  Input length validation (independent)
│  0.5  Fix modulo bias (independent)
│  0.6  Fix localhost Origin (independent)
│  0.7  Make CRON_SECRET mandatory (independent)
│  0.8  Remove implicit auth flow (independent)
│  0.9  Rotate confirm_token (independent)
│  0.10 Cache service client (independent)
│  0.11 DB migration: length constraints (independent)
│  0.12 DB migration: suspended field (independent)
│
├─► PHASE 1: Restructure ────────────────────────────────────
│   │ Depends on: Phase 0 complete
│   │
│   │  1.1  Extract reviews → admin/reviews.astro (LARGEST task)
│   │  1.2  Slim lottery.astro (depends on 1.1)
│   │  1.3  Expand dashboard stats (independent)
│   │  1.4  Expand dashboard nav (depends on knowing all new pages)
│   │  1.5  Shared admin nav component (independent but affects all pages)
│   │  1.6  User list pagination (independent)
│   │  1.7  Review pagination (depends on 1.1)
│   │  1.8  Winners pagination (independent)
│   │  1.9  User search/filter (can combine with 1.6)
│   │
│   ├─► PHASE 2: Newsletter Admin ───────────────────────────
│   │   │ Depends on: Phase 1 nav structure
│   │   │ New page only — no impact on existing features
│   │   │
│   │   ├─► PHASE 3: User Detail + Power Tools ──────────────
│   │   │   │ Depends on: Phase 0.12 (suspended field), Phase 1.6 (user list links to detail)
│   │   │   │ New endpoints + page — highest impact
│   │   │   │
│   │   │   │  WARNING: Middleware change (3.15) affects ALL routes
│   │   │   │  — Test thoroughly: login flow, API routes, cron endpoints
│   │   │   │
│   │   │   ├─► PHASE 4: Economy & Gallery ───────────────────
│   │   │   │   │ Depends on: Phase 3 (user detail links to economy)
│   │   │   │   │
│   │   │   │   ├─► PHASE 5: Audit Log ──────────────────────
│   │   │   │   │   │ Independent but benefits from all prior phases generating audit entries
│   │   │   │   │   │
│   │   │   │   │   ├─► PHASE 6-7: Analytics & Content (Future)
```

### Critical Path Items

1. **CSRF utility (0.1)** blocks all other Phase 0 CSRF tasks and ALL new admin pages
2. **Review extraction (1.1)** is the largest single task — lottery.astro must be carefully split
3. **Middleware suspension check (3.15)** is HIGH RISK — affects every route in the app
4. **DB migrations (0.11, 0.12)** must be applied to production before deploying code that depends on them

---

## 8. Files That Will Be Modified

### Existing Files Modified

| File | Phase | Changes |
|------|-------|---------|
| `src/lib/supabase.ts` | 0.10 | Cache service client singleton |
| `src/middleware.ts` | 3.15 | Add suspension check (HIGH RISK) |
| `src/pages/admin/index.astro` | 1.3, 1.4 | Expand stats + navigation |
| `src/pages/admin/users.astro` | 0.2, 1.6, 1.9 | CSRF + pagination + search + link to user detail |
| `src/pages/admin/lottery.astro` | 0.2, 0.4, 0.5, 0.6, 1.2, 1.8 | CSRF fix, input validation, modulo bias fix, Origin fix, extract reviews, paginate winners |
| `src/pages/[lang]/profile.astro` | 0.3, 0.4 | CSRF + input length validation |
| `src/pages/[lang]/reviews.astro` | 0.3, 0.4 | CSRF + review_text length validation |
| `src/pages/[lang]/lottery.astro` | 0.3, 0.4 | CSRF + shipping field length validation |
| `src/pages/[lang]/login.astro` | 0.3 | CSRF (low risk — Supabase handles auth) |
| `src/pages/[lang]/register.astro` | 0.3 | CSRF |
| `src/pages/[lang]/forgot-password.astro` | 0.3 | CSRF |
| `src/pages/[lang]/auth/callback.astro` | 0.8 | Remove implicit flow fallback |
| `src/pages/api/confirm-subscription.ts` | 0.9 | Rotate confirm_token after confirmation |
| `src/pages/api/cron/monthly-draw.ts` | 0.5, 0.7 | Modulo bias fix + mandatory CRON_SECRET |
| `src/pages/api/cron/newsletter-reminders.ts` | 0.7 | Mandatory CRON_SECRET |
| `src/pages/api/cron/weekly-newsletter.ts` | 0.7 | Mandatory CRON_SECRET |
| `src/lib/notifications.ts` | 3.14 | May need new `sendCustomEmail()` wrapper |

### New Files Created

| File | Phase | Purpose |
|------|-------|---------|
| `src/lib/csrf.ts` | 0.1 | Shared CSRF validation utility |
| `src/lib/admin-helpers.ts` | 0.4 | Shared input validation + admin utilities |
| `src/pages/admin/reviews.astro` | 1.1 | Extracted review moderation page |
| `src/pages/admin/newsletter.astro` | 2.1 | Newsletter subscriber management |
| `src/pages/admin/users/[id].astro` | 3.1 | User detail + power tools page |
| `src/pages/admin/economy.astro` | 4.1 | Peanut economy overview |
| `src/pages/admin/gallery.astro` | 4.2 | Artwork management |
| `src/pages/admin/audit.astro` | 5.1 | Audit log viewer |
| `src/pages/api/admin/gift-credits.ts` | 3.6 | Admin gift peanuts endpoint |
| `src/pages/api/admin/gift-tickets.ts` | 3.7 | Admin gift tickets endpoint |
| `src/pages/api/admin/email-user.ts` | 3.14 | Admin send custom email endpoint |
| `src/pages/api/admin/toggle-admin.ts` | 3.8 | Toggle admin status endpoint |
| `src/pages/api/admin/toggle-suspended.ts` | 3.9 | Toggle suspension endpoint |

### New Database Migrations

| File | Phase | Purpose |
|------|-------|---------|
| `supabase/migrations/026_input_length_constraints.sql` | 0.11 | CHECK constraints on text columns |
| `supabase/migrations/027_user_suspension.sql` | 0.12 | `suspended` column on profiles |

---

## 9. Database Migrations Needed

### Migration 026: Input Length Constraints

```sql
-- Profiles
ALTER TABLE public.profiles
  ADD CONSTRAINT chk_display_name_len CHECK (length(display_name) <= 100),
  ADD CONSTRAINT chk_phone_len CHECK (length(phone) <= 30),
  ADD CONSTRAINT chk_address1_len CHECK (length(address_line1) <= 200),
  ADD CONSTRAINT chk_address2_len CHECK (length(address_line2) <= 200),
  ADD CONSTRAINT chk_city_len CHECK (length(city) <= 100),
  ADD CONSTRAINT chk_state_len CHECK (length(state) <= 100),
  ADD CONSTRAINT chk_zip_len CHECK (length(zip_code) <= 20),
  ADD CONSTRAINT chk_country_len CHECK (length(country) <= 100);

-- Book Reviews
ALTER TABLE public.book_reviews
  ADD CONSTRAINT chk_review_text_len CHECK (length(review_text) <= 2000),
  ADD CONSTRAINT chk_reviewer_note_len CHECK (length(reviewer_note) <= 500);

-- Lottery Winners
ALTER TABLE public.lottery_winners
  ADD CONSTRAINT chk_shipping_name_len CHECK (length(shipping_name) <= 200),
  ADD CONSTRAINT chk_shipping_address_len CHECK (length(shipping_address) <= 500),
  ADD CONSTRAINT chk_book_chosen_len CHECK (length(book_chosen) <= 100);

-- Lottery Config
ALTER TABLE public.lottery_config
  ADD CONSTRAINT chk_prize_desc_len CHECK (length(prize_description) <= 500);

-- Admin Audit Log
ALTER TABLE public.admin_audit_log
  ADD CONSTRAINT chk_audit_action_len CHECK (length(action) <= 100),
  ADD CONSTRAINT chk_audit_target_type_len CHECK (length(target_type) <= 50);
```

### Migration 027: User Suspension

```sql
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS suspended boolean NOT NULL DEFAULT false;

-- Index for middleware check (fast lookup on every request)
CREATE INDEX IF NOT EXISTS idx_profiles_suspended
  ON public.profiles (id) WHERE suspended = true;
```

---

## 10. Testing Checklist

### Phase 0 Tests

- [ ] CSRF: submit POST from same-origin → succeeds
- [ ] CSRF: submit POST from different origin (cURL with spoofed Origin) → blocked
- [ ] CSRF: submit POST without Origin header → blocked
- [ ] CSRF: admin lottery POST in localhost:4321 → succeeds (I2 fix)
- [ ] Input validation: submit 10KB display_name → rejected with error
- [ ] Input validation: submit 5KB review_text → rejected with error
- [ ] Input validation: submit 2KB shipping_address → rejected with error
- [ ] DB constraints: insert oversized data directly in Supabase → CHECK violation
- [ ] Cron: call `/api/cron/monthly-draw` without auth header → 401
- [ ] Cron: call `/api/cron/monthly-draw` with wrong secret → 401
- [ ] Cron: call `/api/cron/monthly-draw` with correct secret → 200
- [ ] Auth callback: access `/en/auth/callback/?access_token=x&refresh_token=y` → redirects to login (implicit flow removed)
- [ ] Auth callback: PKCE flow with `?code=` → still works correctly
- [ ] Confirm token rotation: confirm subscriber → old token no longer works for unsubscribe
- [ ] Lottery draw: open 2 tabs, draw simultaneously → only 1 draw succeeds
- [ ] Lottery fairness: run 10000 draws with 7 users → distribution within 1% of expected

### Phase 1 Tests

- [ ] Reviews page loads with all pending reviews
- [ ] Approve/reject/bulk actions work from new reviews page
- [ ] Lottery page no longer shows review section
- [ ] Dashboard shows correct stats for all new cards
- [ ] User list paginates at 50 users per page
- [ ] User search by email returns correct results
- [ ] All admin nav links work from every admin page

### Phase 2 Tests

- [ ] Newsletter page loads subscriber list
- [ ] Filter by confirmed/pending works
- [ ] Resend confirmation sends email
- [ ] Manual unsubscribe removes subscriber
- [ ] CSV export downloads valid file
- [ ] Stats are accurate (cross-check with Supabase)

### Phase 3 Tests

- [ ] User detail page loads all sections
- [ ] Gift peanuts: positive amount increases balance
- [ ] Gift peanuts: negative amount decreases balance
- [ ] Gift peanuts: audit log entry created
- [ ] Gift tickets: same tests as peanuts
- [ ] Toggle admin: user becomes/stops being admin
- [ ] Toggle suspended: user can no longer access site
- [ ] Suspended user: API calls return 401
- [ ] Suspended user: login clears cookies and shows message
- [ ] Send email: user receives email with correct template
- [ ] Badge grant: badge appears on user's profile
- [ ] Badge revoke: badge disappears

### Build & Deploy Tests

- [ ] `npx astro build` succeeds with zero errors
- [ ] `npx supabase db push --linked` applies migrations cleanly
- [ ] Vercel deploy succeeds
- [ ] Production smoke test: all admin pages load behind auth
- [ ] Production smoke test: all public pages still work
- [ ] Production smoke test: lottery draw still works
- [ ] Production smoke test: review submission still works

---

## Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Breaking lottery draw during refactor | Medium | HIGH | Test draw flow end-to-end before and after each phase |
| Middleware suspension check breaking API routes | Medium | HIGH | Suspension check only applies to page routes, not `/api/*` (or explicitly exclude API routes) |
| CSRF protection breaking existing forms | Low | HIGH | Test every form submission after applying CSRF |
| DB migration breaking existing data | Low | HIGH | Test constraints against existing data first with `ALTER TABLE ... VALIDATE CONSTRAINT` |
| Review extraction missing functionality | Medium | Medium | Side-by-side comparison of old vs new page — every feature must exist in new location |
| Service client caching causing stale connections | Low | Low | Supabase client handles reconnection internally |
| Large page loads with many DB queries | Medium | Medium | Add `.limit()` to ALL queries, never fetch unlimited data |

---

## Conventions for All New Admin Code

1. **Every admin page** starts with:
   ```typescript
   const user = Astro.locals.user;
   if (!user || !(await isAdmin(user))) {
     return Astro.redirect("/es/login/");
   }
   ```

2. **Every POST handler** includes CSRF validation:
   ```typescript
   import { validateOrigin } from "../../lib/csrf";
   if (!validateOrigin(Astro.request, Astro.url)) {
     return "⛔ Request blocked: invalid origin.";
   }
   ```

3. **Every admin action** creates an audit log entry:
   ```typescript
   await auditLog("action_name", "target_type", targetId, { details });
   ```

4. **Every text input** has server-side length validation before DB write

5. **Every list query** has `.limit(N)` and supports pagination

6. **Every new admin endpoint** validates admin status + CSRF

7. **Style consistency:** Use existing CSS variables (`--brand-blue`, `--brand-green`, `--brand-brown`, `--accent-gold`, `--ink-soft`, `--line`, `--surface`), `surface-card` class, `Baloo 2` font for headings, `btn btn-primary`/`btn btn-secondary` for buttons

---

*This document is the single source of truth for the admin panel overhaul. Update it as implementation progresses.*
