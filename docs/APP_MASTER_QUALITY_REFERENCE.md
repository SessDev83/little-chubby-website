# APP MASTER QUALITY REFERENCE
## Little Chubby Press — Security · Performance · Logic · Discoverability · Legal · Agents

> **Type:** Living reference document — not a roadmap, not a task list.
> **Purpose:** Single point of truth for quality audits, future implementation reviews, and architectural decisions. Every future feature or change should be validated against this document before touching code.
> **Guiding source:** Operational Guide — *"Plan Maestro Operativo: Arquitectura Lógica, Seguridad, Rendimiento y Descubrimiento Mediante Agentes de IA"* (April 2026) — mapped 1:1 to Little Chubby Press's actual stack.
> **Language:** English (technical sections) — bilingual product invariants preserved in Spanish where they appear in the codebase.
> **Last updated:** April 2026
> **Owner:** Engineering + Product

---

## TABLE OF CONTENTS

- [Section 0 — Platform Identity](#section-0--platform-identity)
- [Section I — Security](#section-i--security)
- [Section II — Performance](#section-ii--performance)
- [Section III — Business Logic](#section-iii--business-logic)
- [Section IV — Discoverability (GEO / AEO)](#section-iv--discoverability-geo--aeo)
- [Section V — Legal Compliance](#section-v--legal-compliance)
- [Section VI — Agents & Automation](#section-vi--agents--automation)
- [Section VII — Operations & Infrastructure](#section-vii--operations--infrastructure)
- [Section VIII — Accessibility](#section-viii--accessibility)
- [Appendix A — Master Audit Checklists](#appendix-a--master-audit-checklists)
- [Appendix B — Technical Glossary](#appendix-b--technical-glossary)

---

---

# SECTION 0 — PLATFORM IDENTITY

## 0.1 What the platform is

**Little Chubby Press** is a bilingual (EN/ES) web application for families and children centered around coloring pages, bedtime stories, and a community loyalty economy ("Peanuts"). It operates as a static-first, server-assisted web platform targeting mobile-first users across Spanish-speaking and English-speaking households globally.

**Core value loops:**
- Free printable coloring pages + bedtime stories → registered account
- Peanut economy (earn/spend virtual currency) → retention
- Monthly book lottery (giveaway) → excitement + return
- Blog content (bilingual, SEO-driven) → organic acquisition

**Primary audience:** Parents (Maria persona, 34, bilingual, mobile-first, LATAM/Spain/US)
**Secondary audience:** Adult colorists (Sofia, 42, hobbyist)
**Tertiary (future):** Educators (Laura, 31, classroom use)

**Critical constraint:** Content platform serving children — highest bar for safety, moderation, and data privacy applies to all product decisions.

---

## 0.2 Tech stack (exact versions as of April 2026)

| Layer | Technology | Version | Notes |
|---|---|---|---|
| Framework | Astro | 6.1.4 | Hybrid output: SSG pages + SSR endpoints via Vercel adapter |
| Output mode | Hybrid (SSG + SSR) | — | `output: 'static'` default; pages/endpoints with `prerender = false` run as Vercel Serverless Functions |
| Deployment | Vercel **Pro plan** | — | Pro required: Crons, Serverless Function limits, Edge Network. Downgrading to Hobby silently breaks all cron jobs. |
| Database | Supabase (PostgreSQL) | — | Hosted Postgres + RLS + RPCs |
| Auth | Supabase Auth (GoTrue) | — | httpOnly cookies, no JWT in localStorage |
| DB client | @supabase/supabase-js | 2.102.1 | |
| Analytics | @vercel/analytics | 2.0.1 | Privacy-respecting, no cookie |
| Performance | @vercel/speed-insights | 2.0.0 | Core Web Vitals field data (RUM) |
| Sitemap | @astrojs/sitemap | 3.7.2 | Auto-generated, /admin/ and /api/ excluded |
| RSS | @astrojs/rss | 4.0.18 | Blog feed |
| TypeScript | typescript | 5.9.3 | Strict |
| Node.js | ≥ 22.12.0 | — | Required by package.json engines field |
| Image processing | sharp | 0.34.5 | Dev dependency for cover + coloring page processing |
| CI/CD | GitHub Actions | — | 8 active workflows (social, blog, analytics, agents, Amazon sync) — **no Lighthouse or build-test workflow exists yet** |

---

## 0.3 Architecture overview

The app is **hybrid**: most public content is pre-built (SSG) and served from Vercel's CDN in milliseconds. All authenticated, dynamic, and mutating routes run as Vercel Serverless Functions (SSR) with per-request execution. Understanding this distinction is critical for performance budgeting, caching strategy, and cold-start planning.

```
Browser
  │
  ├── Vercel Edge Network (CDN + WAF + Global Headers)
  │     ├── Static assets (/_astro/*, /images/*) → Cache-Control: immutable (1 year)
  │     ├── SSG pages → pre-built HTML, served from CDN edge (~10–50ms TTFB)
  │     ├── SSR pages / API routes → forwarded to Serverless Functions (~100–800ms TTFB)
  │     └── HTTP Security Headers → applied globally via vercel.json (all routes)
  │
  ├── PATH A — SSG (Static, CDN-served, no server cost per request)
  │     ├── /[lang]/               → home page
  │     ├── /[lang]/books/         → book catalog
  │     ├── /[lang]/blog/[slug]/   → all blog articles (200+)
  │     ├── /[lang]/about/         → about, contact, FAQ, terms, privacy
  │     └── /[lang]/winners/       → lottery winners (public)
  │
  ├── PATH B — SSR (Serverless Function, prerender=false, subject to cold starts)
  │     ├── /[lang]/profile/           → authenticated user profile
  │     ├── /[lang]/gallery/           → dynamic content gallery
  │     ├── /[lang]/lottery/           → user's ticket status
  │     ├── /[lang]/coloring-corner/[id]/ → individual coloring page (dynamic)
  │     ├── /[lang]/login/             → auth pages
  │     ├── /[lang]/auth/callback/     → OAuth callback
  │     ├── /admin/*                   → all admin pages (13 pages)
  │     └── /api/*                     → all API mutation endpoints
  │
  └── Supabase (Backend — always accessed server-side)
        ├── PostgreSQL → source of truth, RLS on every table
        ├── Auth (GoTrue) → session validated via httpOnly cookie on every SSR request
        └── RPCs (Postgres functions) → all atomic mutations (peanuts, tickets, purchases)

Vercel Cron Jobs (Pro plan required → /api/cron/*)
  ├── monthly-draw        → 1st of month, 08:00 UTC  (heavy: DB + email batch)
  ├── award-top-earners   → 1st of month, 00:05 UTC  (medium: reads + writes)
  ├── newsletter-reminders → daily, 09:00 UTC        (medium: email sending)
  ├── weekly-newsletter   → Mondays, 10:00 UTC       (medium: email batch)
  ├── refund-expired-gifts → daily, 11:00 UTC        (light: scan + refund)
  └── refresh-leaderboard → every 15 minutes         (light: aggregation query)

GitHub Actions Automation (independent of Vercel deploy)
  ├── social-post.yml          → Pinterest + social posting (every 4h)
  ├── social-engage.yml        → community engagement monitoring
  ├── daily-blog-post.yml      → automated blog content generation
  ├── agent-collectors.yml     → content intelligence data collection
  ├── agent-intelligence.yml   → AI-driven content analysis
  ├── daily-analytics-email.yml → admin analytics report (daily)
  ├── sync-amazon-ratings.yml  → syncs book ratings from Amazon
  └── diagnose-social.yml      → social media health diagnostics

External Integrations (outbound only, no inbound tracking)
  ├── Google Fonts (CSS: fonts.googleapis.com + fonts.gstatic.com) — ⚠️ cross-origin, not self-hosted
  ├── Buttondown.email (newsletter form action — whitelisted in CSP)
  ├── Formspree.io (contact form action — whitelisted in CSP)
  └── Amazon (affiliate links — no tracking pixel, pure outbound href)
```

### Cold start awareness

Serverless Functions on Vercel have cold starts of ~100–500ms when the function instance has been idle. This affects:
- First visit to `/[lang]/profile` after a period of inactivity
- First admin page load
- First request to any `/api/*` endpoint after inactivity

Cold starts do not affect SSG pages (served from CDN). For performance budgeting, use separate TTFB targets for SSG paths vs. SSR paths (see Section II).

---

## 0.4 URL structure

| Path | Render mode | CDN cached | Auth required | Notes |
|---|---|---|---|---|
| `/` | Redirect | — | No | Redirects to default lang |
| `/[lang]/` | SSG | ✅ | No | Home page |
| `/[lang]/books/` | SSG | ✅ | No | Book catalog |
| `/[lang]/blog/[slug]/` | SSG | ✅ | No | 200+ articles |
| `/[lang]/about/`, `/faq/`, `/privacy/`, `/terms/` | SSG | ✅ | No | Static content |
| `/[lang]/winners/` | SSG | ✅ | No | Public lottery history |
| `/[lang]/coloring-corner/[id]/` | SSR | ❌ | No (but personalizes if auth) | Dynamic per-page |
| `/[lang]/gallery/` | SSR | ❌ | No (but personalizes if auth) | Dynamic gallery |
| `/[lang]/lottery/` | SSR | ❌ | Yes | Ticket status |
| `/[lang]/profile/` | SSR | ❌ | Yes | User dashboard |
| `/[lang]/login/`, `/register/`, `/auth/callback/` | SSR | ❌ | No | Auth flow |
| `/api/*` | SSR (Serverless) | ❌ | Yes (most) | All mutations |
| `/admin/*` | SSR (Serverless) | ❌ | Yes (`is_admin`) | Admin panel |

**Invariant (must never break):** All user-facing pages live under `/[lang]/`. Changing URL patterns requires 301 redirects + `Link: rel=canonical`. The `/[lang]/` prefix is permanent architecture.

**Prefetch awareness:** Astro's global `prefetch: true` is active. Links pointing to SSR pages (profile, gallery, lottery) trigger Serverless Function invocations on hover/link-enter — even for unauthenticated users. Navigation links to authenticated SSR pages should use `data-astro-prefetch="false"` to avoid ghost invocations and unnecessary cold-start triggers.

---

## 0.5 Non-negotiable platform invariants

These are hardcoded rules from `MASTER_VISION_MUST_HAVE_APP.md`. Status column reflects current reality — `✅ Active` means the control is in place today; `🔲 Pending` means the policy is defined but the technical enforcement does not yet exist.

| # | Invariant | Status | Notes |
|---|---|---|---|
| 1 | **No framework switch** — Astro + Vercel is permanent. No Next.js, no Remix, no rewrite. | ✅ Active | |
| 2 | **No JWT in localStorage** — auth is httpOnly cookies only. | ✅ Active | Verified: GoTrue uses cookie sessions |
| 3 | **No client-trusted state** — economy values (peanuts, tickets, streaks) derived server-side. | ✅ Active | All RPCs check server-side; Phase G makes this absolute for new features |
| 4 | **Cookie auth on all mutating endpoints** — `prerender=false` + `Cache-Control: no-cache` on every `/api/*`. | ✅ Active | Verified in API routes |
| 5 | **Rate limiting on every user-facing mutation** — via `rate_limit(action)` helper. | ✅ Active | Verify completeness when adding new endpoints |
| 6 | **Advisory locks** on every RPC touching `peanut_balance`, `lottery_tickets`, `premium_download_credits`. | ✅ Active | Core economic RPCs confirmed |
| 7 | **Additive migrations only** — never drop columns, never rename in place. | ✅ Active | Policy documented; enforced by convention |
| 8 | **Feature flags** for any new user-facing feature touching existing flows. | 🔲 Pending | Infrastructure planned for Phase G (migration 055–058). Until then: deploy-based rollout only. Do not block Phase F work on this. |
| 9 | **Bilingual parity** — build fails if i18n keys desynchronize. | 🔲 Partial | Check exists for some keys; full CI enforcement not yet in place. No GitHub Actions workflow runs this check today. Target: extend before Phase H (multi-language expansion). |
| 10 | **Mobile Lighthouse ≥ 90** on core pages, enforced pre-merge. | 🔲 Pending | Policy stated in MASTER_VISION but no CI workflow enforces it. No `@lhci/cli` or Lighthouse GitHub Action exists. Enforcement is currently manual. Target: add CI workflow before Phase G launch. |
| 11 | **No chat between users, ever** — interaction limited to moderated reviews + pre-approved badge gifting. | ✅ Active | No messaging infrastructure exists |
| 12 | **No user-uploaded photos of people** — only moderated art scans. | ✅ Active | Upload endpoints validate file type; moderation queue required before publish |
| 13 | **No ad networks, no user data sales, no crypto/NFTs** — permanent non-goals. | ✅ Active | |
| 14 | **Vercel Pro plan must be maintained** — Crons, Serverless Function execution, and Edge Network features require Pro. Downgrading silently breaks all 6 scheduled jobs. | ✅ Active | Operational dependency — not a code invariant. Flag if billing changes are considered. |
| 15 | **SSR links in navigation must not prefetch** — nav links pointing to authenticated SSR pages (profile, lottery, gallery) must use `data-astro-prefetch="false"` to prevent ghost Serverless invocations for unauthenticated users. | 🔲 To verify | Global `prefetch: true` is active. Header/nav component should be audited to confirm this is applied. |

---

---

# SECTION I — SECURITY

> **Reference standard:** NIST SP 800-63B (2026 revision), OWASP Authentication Cheat Sheet, OWASP Password Storage Cheat Sheet, CSA Agentic AI Security Framework.

---

## I-A: Authentication & Identity Management

### I-A.1 Current implementation

| Property | Implementation | Status |
|---|---|---|
| Session storage | httpOnly cookie, sameSite: lax, secure: true | ✅ Correct |
| Auth provider | Supabase Auth (GoTrue) | ✅ |
| Password hashing | bcrypt (GoTrue default) | ⚠️ See gap below |
| JWT in localStorage | None — cookie-only | ✅ |
| Magic link / passwordless | Planned (onboarding spec) | 🔲 Future |
| Forced password complexity | Not enforced (correct per NIST 2026) | ✅ |
| Forced password rotation | Not enforced (correct per NIST 2026) | ✅ |
| Security questions on recovery | Not used (correct per NIST 2026) | ✅ |
| Admin access | Hardcoded `ADMIN_EMAILS` array (primary fast path) + DB `is_admin` flag (secondary check) | ⚠️ Gap — see I-A.5 |

### I-A.2 NIST 2026 compliance mapping

The operational guide mandates abandoning forced complexity rules and periodic rotation. Our implementation already aligns on these points. The remaining areas to be aware of:

**Password length policy (NIST 2026 standard):**
- Minimum: 8 characters (absolute floor) — to be enforced if/when custom password flow is added
- Recommended: 12–16 characters (should be communicated to users, not forced)
- Maximum: 64 characters (Supabase GoTrue supports this)
- Must accept full ASCII + Unicode (GoTrue supports this)
- No forced complexity rules (uppercase/numbers/symbols) — correct, do not add

**Password storage gap:**
- GoTrue uses bcrypt — acceptable but the OWASP 2026 recommendation is **Argon2id** (19 MiB memory cost, t=2, p=1) as the gold standard
- For Little Chubby Press: GoTrue bcrypt is the provider's responsibility. When evaluating future auth provider changes, prioritize Argon2id support.
- No action needed now — document as a future migration consideration when changing auth providers.

### I-A.3 Session management

- Session cookies: `httpOnly=true`, `sameSite=lax`, `secure=true` (production)
- Sessions are server-validated on every API call via Supabase RLS
- No session data stored in browser storage (localStorage, sessionStorage)
- `prerender=false` + `Cache-Control: no-cache` on all `/api/*` endpoints ensures no CDN caching of authenticated responses

**Deliberate Supabase client security config (`src/lib/supabase.ts`) — do not revert:**

```ts
auth: {
  flowType: "pkce",
  detectSessionInUrl: false,   // prevents token leakage via URL fragment
  autoRefreshToken: false,     // no background token refresh on server-side client
  persistSession: false,       // no session stored in localStorage — critical invariant
}
```

These three flags (`detectSessionInUrl`, `autoRefreshToken`, `persistSession`) are deliberate security decisions. Reverting any of them to defaults would cause session data to be stored in `localStorage` or enable URL-based session injection. Do not change without a full security review.

### I-A.5 Admin authorization gap — hardcoded email fast path

In `src/lib/supabase.ts`, the `isAdmin()` function checks `ADMIN_EMAILS` **first**. If the email matches, the DB `is_admin` flag lookup is skipped entirely:

```ts
export const ADMIN_EMAILS = ["ivan.c4u@gmail.com", "hello@littlechubbypress.com"];
export async function isAdmin(user): Promise<boolean> {
  if (user.email && ADMIN_EMAILS.includes(user.email)) return true; // DB check never reached
  // DB check only runs if email not in hardcoded array
}
```

**Risk:** If admin access needs to be revoked for one of these emails (account compromise, role change), removing the DB flag alone is insufficient — the hardcoded array still grants full access. The two sources can silently diverge.

**Correct path:** The DB `is_admin` flag should be the single authoritative source. The hardcoded array should be removed or demoted to a last-resort emergency-only fallback documented explicitly.

**Priority:** Medium — no immediate threat (known emails, no public registration), but a future security hygiene item before team expansion.

---

### I-A.4 Future: Passkeys / FIDO2 (Phase G+)

Per the operational guide, the long-term strategy is passwordless authentication via FIDO2/WebAuthn (Passkeys). This:
- Eliminates phishing risk entirely (cryptographically bound to the exact origin URL)
- Removes password fatigue
- Provides the best UX (biometric = 1-tap login)
- Is cryptographically superior to any password-based system

**When to consider:** At Phase G (Growth loops) or when Supabase Auth adds native Passkey support. Do not implement custom WebAuthn — use provider-native support only.

---

## I-B: HTTP Security Headers

All headers are deployed globally via `vercel.json`. This is the audit of each header:

| Header | Current value | Standard | Status |
|---|---|---|---|
| Strict-Transport-Security | `max-age=63072000; includeSubDomains; preload` | ≥ 1 year with preload | ✅ Excellent (2 years) |
| X-Content-Type-Options | `nosniff` | nosniff | ✅ |
| X-Frame-Options | `DENY` | DENY or SAMEORIGIN | ✅ |
| Referrer-Policy | `strict-origin-when-cross-origin` | strict-origin-when-cross-origin | ✅ |
| Permissions-Policy | `camera=(), microphone=(), geolocation=()` | Deny unused APIs | ✅ |
| Cross-Origin-Opener-Policy | `same-origin` | same-origin | ✅ |
| Cross-Origin-Resource-Policy | `same-site` | same-site or same-origin | ✅ |
| Content-Security-Policy | See detailed audit below | See below | ⚠️ Gap |
| X-XSS-Protection | Not set | Deprecated — omit | ✅ (correct to omit) |

### I-B.1 Content Security Policy — detailed audit

**Current CSP:**
```
default-src 'self';
base-uri 'self';
object-src 'none';
frame-ancestors 'none';
form-action 'self' https://buttondown.email https://formspree.io;
img-src 'self' data: blob: https:;
font-src 'self' data: https://fonts.gstatic.com;
script-src 'self' 'unsafe-inline';
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
style-src-elem 'self' 'unsafe-inline' https://fonts.googleapis.com;
connect-src 'self' https:;
upgrade-insecure-requests
```

**Analysis per directive:**

| Directive | Current | Issue | Priority |
|---|---|---|---|
| `script-src 'unsafe-inline'` | Allows all inline scripts | XSS risk if any untrusted content injected | ⚠️ Known gap |
| `style-src 'unsafe-inline'` | Allows all inline styles | Lower risk than script | Low |
| `img-src https:` | Any HTTPS image | Broad, but acceptable for coloring content | Low |
| `connect-src https:` | Any HTTPS connection | Broad — should eventually enumerate allowed APIs | Medium |
| `object-src 'none'` | Blocks Flash/plugins | ✅ |
| `frame-ancestors 'none'` | Blocks all iframes | ✅ |

**The `'unsafe-inline'` on scripts — context:**
Astro SSG generates inline `<script>` tags for hydration and page behavior. Removing `'unsafe-inline'` requires nonce-based CSP, which requires SSR (not SSG). This is an architectural constraint.

**Recommended path (not immediate — document for Phase G+):**
When/if the app transitions to SSR output mode (e.g., for personalization), implement nonce-based CSP:
```
script-src 'self' 'nonce-{random-per-request}';
```
Until then, the current CSP with `'unsafe-inline'` is the pragmatic maximum achievable with SSG.

**Immediate opportunity — tighten `connect-src`:**
`connect-src https:` is very broad. It could be tightened to the known endpoints:
```
connect-src 'self' https://*.supabase.co https://vitals.vercel-insights.com https://va.vercel-scripts.com;
```
This should be evaluated and tightened in a future pass.

### I-B.2 Subresource Integrity (SRI)

**Current state:** No SRI on external resources.

**Gap:** Google Fonts is loaded via `<link href="https://fonts.googleapis.com/...">`. If Google's CDN were compromised, malicious CSS could be served.

**Recommendation:** Add SRI hashes to external CSS links. For dynamic font imports, this is complex — a simpler approach is to self-host fonts, which also improves performance (eliminates cross-origin request).

**Priority:** Medium — Google's infrastructure is extremely reliable, but self-hosting fonts resolves both SRI and performance concerns simultaneously.

---

## I-C: Database Security

### I-C.1 Row Level Security (RLS)

RLS is enabled on all Supabase tables. This is the foundation of the data security model — it ensures that even if an API endpoint has a bug, the database enforces access control independently.

**Critical RLS invariants:**
- Users can only read/write their own data
- Review update policy restricts columns: only `rating`, `review_text`, `photo_url`, `extra_photos`, `show_in_gallery` are user-writable — not `status` (prevents self-approval bypass)
- Service client (`getServiceClient()`) is only used server-side, never exposed to browser
- Admin actions use the service client only on explicitly authorized admin routes

**Never break:**
- Do not add new update policies without column-level restrictions
- Do not use service client in any endpoint accessible without `is_admin` verification

### I-C.2 Atomic operations & advisory locks

**Operations that use advisory locks (must remain atomic forever):**

| RPC Function | Protects | Advisory Lock |
|---|---|---|
| `buy_lottery_entry()` | `peanut_balance` + `lottery_tickets` | ✅ |
| `purchase_badge()` | `peanut_balance` | ✅ |
| `purchase_boost()` | `peanut_balance` | ✅ |
| `purchase_download()` | `peanut_balance` + `premium_download_credits` | ✅ |
| `enter_giveaway()` | `lottery_tickets` | ✅ |
| `buy_tickets()` | `lottery_tickets` | ✅ |

**Rule:** Any new RPC that touches `peanut_balance`, `lottery_tickets`, or `premium_download_credits` MUST use advisory locks in a single transaction. No exceptions.

### I-C.3 Rate limiting

Rate limiting is implemented at the DB level via the `check_rate_limit` RPC. **Not all endpoints are covered** — see gap table below.

**Verified rate-limited endpoints:**

| Endpoint / Action | Rate limit | Pattern |
|---|---|---|
| `buy-lottery-entry.ts` | Via `check_rate_limit` RPC | ✅ Standard |
| Badge / boost purchases | 5 per hour | ✅ Standard |
| Artwork downloads | 20 per hour | ✅ Standard |
| Share rewards | 3 per day | ⚠️ Direct DB query — not via standard RPC |

**Known gaps:**

| Endpoint | Issue |
|---|---|
| `touch-streak.ts` | **No rate limiting at all** |
| `subscribe-newsletter.ts` | Global throttle only (30 new subs/hour globally — not per user). A single user or multiple accounts can bypass this. |
| `share-reward.ts` | Uses a direct DB query instead of the `check_rate_limit` RPC — inconsistent, harder to audit and update centrally |

**Rule:** Every new endpoint that writes to the database must call the `check_rate_limit` RPC before processing. Direct DB queries for rate limiting are not acceptable — they bypass the centralized helper and create audit blind spots. No client-side-only rate limiting is acceptable.

### I-C.4 Data integrity constraints

- `UNIQUE(user_id, month)` on `lottery_winners` — prevents duplicate winners
- `peanut_balance` sanity check: balances ≥ 10,000 are flagged for admin review
- Idempotent `reason` constraint on all RPCs that mint peanuts — prevents duplicate reward grants
- `crypto.getRandomValues()` used for lottery draws (not `Math.random()`)

---

## I-D: Application-Level Security

### I-D.1 CSRF protection

**Two distinct protection levels exist — do not conflate them:**

| Route type | CSRF protection | Strength |
|---|---|---|
| `/admin/*` pages | `validateOrigin()` (Origin header check) + `sameSite: lax` cookie | ✅ Strong |
| `/api/*` endpoints | `sameSite: lax` cookie only — **no Origin header check** | ⚠️ Baseline |

`validateOrigin()` is implemented in `src/lib/csrf.ts` and currently applied only on the 6 admin pages. All `/api/*` mutation endpoints rely exclusively on `sameSite: lax` behavior.

`sameSite: lax` prevents cross-site POST requests triggered from a third-party page, which covers the common CSRF attack. However, it does not protect against:
- Attacks from same-site subdomains (if any exist)
- Certain browser-level configuration edge cases

**Recommended improvement (not urgent):** Extend `validateOrigin()` to all `/api/*` POST endpoints for defense-in-depth. This is a future hardening step, not a critical blocker.

- Form actions in CSP are whitelisted: only `'self'`, `buttondown.email`, and `formspree.io`

**Never remove:** Origin validation on all admin POST endpoints.

### I-D.2 Input validation & sanitization

- Server-side length caps on all text inputs (review_text, reviewer_note, etc.)
- HTML escaping via `escapeHtml()` helper in `notifications.ts` — all user-supplied content in emails is escaped before insertion
- No user-generated HTML rendering anywhere
- Avatar uploads go through server-side validation before storage (file type: jpeg/png/webp only; max 2MB)

**Mutation-method invariant:**

All endpoints that write to the database must only accept `POST`, `PUT`, or `PATCH`. `GET` must never trigger a mutation.

**Known gap — `touch-streak.ts`:** This endpoint currently exports both `GET` and `POST` handlers that execute the same mutation (streak update). A GET-triggered mutation can be silently fired by:
- Astro's global `prefetch: true` on hover/link-enter
- `<img>` tags, bookmarks, or any browser pre-fetching mechanism

This endpoint also has no rate limiting (see I-C.3). Combined, these two gaps mean streak can be updated at scale without any friction. Both issues should be resolved together: remove the GET handler, add rate limiting.

### I-D.3 Child safety hardcoded rules

These are non-negotiable security invariants for the children's content context:

| Rule | Implementation |
|---|---|
| No direct child accounts | Terms-layer enforcement: account holder must be 18+ (see V-D). No COPPA sub-profile flow is currently shipped. |
| No user photos of people | Server-side validation on upload endpoints |
| No chat between users | Architecture decision — no messaging infrastructure |
| Age / consent gating | Parental consent captured on `profiles.parent_consent_at` (timestamptz). No `age_verified` or `region_code` columns exist in the schema — verified April 2026 against live DB. Enforcement is at the Terms layer, not via DB age columns. |
| Kid art moderation | Double-moderation: automated model + human approval before publish |
| No children's names publicly displayed | Only parent `display_name`; household sub-profiles not implemented |
| EXIF stripping on uploads | Required policy on all image uploads (audit in `upload-avatar.ts` and any future art upload) |
| Right-click save disabled on kid art | Client-side + no direct URL exposure |

### I-D.4 CRON endpoint protection

All cron endpoints (`/api/cron/*`) require `CRON_SECRET` header validation. This prevents unauthorized triggering of background jobs (monthly draw, newsletter, etc.).

**Verify before adding any new cron endpoint:** The secret must be validated as the first operation, before any database writes.

---

## I-E: Security Audit Checklist

Run this checklist on every significant release or monthly as a standalone audit.

### Authentication
- [ ] Cookie flags verified: `httpOnly=true`, `sameSite=lax`, `secure=true` in production
- [ ] No JWT or session tokens in localStorage or sessionStorage
- [ ] Confirm `ADMIN_EMAILS` array in `src/lib/supabase.ts` still matches intended admins (primary fast path — DB flag not reached for these emails)
- [ ] Service client (`getServiceClient()`) not reachable from any non-admin endpoint
- [ ] All admin POST endpoints validate `Origin` header

### Database
- [ ] RLS enabled on all tables (verify in Supabase dashboard)
- [ ] Review update policy restricted to allowed columns only
- [ ] All peanut/ticket RPCs use advisory locks (grep for `pg_advisory_xact_lock`)
- [ ] `lottery_winners` UNIQUE constraint on (user_id, month) in place
- [ ] Lottery draw uses `crypto.getRandomValues()` not `Math.random()`
- [ ] `peanut_balance` sanity check (flag ≥ 10,000) active

### API Endpoints
- [ ] Every mutating endpoint calls `check_rate_limit` RPC (not a direct DB query)
- [ ] `touch-streak.ts` — rate limiting added and GET handler removed
- [ ] `subscribe-newsletter.ts` — per-user rate limit in place (not just global throttle)
- [ ] `share-reward.ts` — migrated to standard `check_rate_limit` RPC
- [ ] Every mutating endpoint only accepts POST/PUT/PATCH — no GET-triggered mutations
- [ ] Every cron endpoint validates `CRON_SECRET`
- [ ] No endpoint uses service client without admin verification
- [ ] Input length validation on all text fields
- [ ] HTML escaping applied to all user content inserted into emails
- [ ] `validateOrigin()` applied to all `/api/*` POST endpoints (or deviation documented)

### HTTP Headers
- [ ] HSTS: `max-age=63072000; includeSubDomains; preload` in vercel.json
- [ ] CSP directive present and includes `object-src 'none'` and `frame-ancestors 'none'`
- [ ] X-Frame-Options: DENY
- [ ] X-Content-Type-Options: nosniff
- [ ] Referrer-Policy: strict-origin-when-cross-origin
- [ ] Permissions-Policy denies camera, microphone, geolocation

### Child Safety
- [ ] No public display of children's names or faces
- [ ] No direct messaging between users
- [ ] Art upload pipeline requires moderation before publish
- [x] Parental consent captured at registration + legacy soft banner (`profiles.parent_consent_at`) — see V-D
- [ ] Terms-layer 18+ enforcement reviewed every bi-weekly legal cycle (see `docs/LEGAL_MAINTENANCE.md`)

---

---

# SECTION II — PERFORMANCE

> **Reference standard:** Core Web Vitals 2026 (Google), TTFB optimization, Astro Islands Architecture, Vercel Edge CDN.

---

## II-A: Core Web Vitals Targets

| Metric | What it measures | Target (2026 standard) | Priority |
|---|---|---|---|
| **LCP** (Largest Contentful Paint) | Time to render the largest visible element | ≤ 2.5 seconds | Critical |
| **INP** (Interaction to Next Paint) | Latency of ALL interactions across page lifetime | ≤ 200 milliseconds | Critical |
| **CLS** (Cumulative Layout Shift) | Unexpected visual shifts during load | ≤ 0.1 score | Critical |
| **TTFB** (Time to First Byte) | Server response time | ≤ 800ms | Important |
| **FCP** (First Contentful Paint) | First content renders | ≤ 1.8 seconds | Important |

**Architecture performance split — use separate TTFB budgets per path:**

| Path type | Examples | TTFB target | Why |
|---|---|---|---|
| SSG (CDN-served) | Home, books, blog, about, winners | < 100ms | Pre-built HTML served from Vercel edge |
| SSR (Serverless Function) | Profile, gallery, lottery, coloring-corner, /api/* | 100–800ms | On-demand execution + possible cold start |

The blanket claim "no server processing time on page loads" applies only to SSG paths. Core user-facing pages (profile, lottery, gallery) are SSR and carry serverless overhead. Performance targets and Lighthouse scores should be tracked separately per path type.

**Lighthouse target:** ≥ 90 on mobile for home, coloring library, and book catalog (SSG pages). Profile and gallery are SSR — score separately, account for cold start in field data.

---

## II-B: Asset Caching Strategy

### Current cache configuration (from vercel.json)

| Path pattern | Cache-Control | Duration |
|---|---|---|
| `/images/*` | `public, max-age=31536000, immutable` | 1 year |
| `/_astro/*` | `public, max-age=31536000, immutable` | 1 year |
| All other routes | Not explicitly set (Vercel default) | Varies |

**What `/_astro/*` covers:** All Astro-generated JS chunks, CSS files (content-hashed filenames). Correct to cache immutably because Astro generates new filenames on every build.

**What `immutable` means:** Browser never re-validates these assets. Correct because the hash-in-filename strategy guarantees cache busting on changes.

**Gap — HTML pages:** Static HTML pages do not have explicit cache headers. Vercel's default for static HTML is short caching. This is acceptable for correctness (fresh content) but could be optimized.

### Cache strategy rules

1. **Never cache authenticated responses.** All `/api/*` routes must include `Cache-Control: no-cache, no-store` or `prerender=false`.
2. **Content-addressed assets get 1-year immutable cache.** Any new static asset type added to the build pipeline should follow the `/_astro/*` pattern.
3. **User-uploaded images** (avatars, art) must not be served from the immutable cache path. They need cache-busting via query parameter or short TTL.

---

## II-C: LCP Optimization Rules

The Largest Contentful Paint element on most pages is the hero image or primary heading. Rules for every page template:

### Image rules for LCP elements

```html
<!-- CORRECT: LCP hero image -->
<img
  src="/images/hero.avif"
  alt="[meaningful description]"
  width="800"
  height="600"
  fetchpriority="high"
  decoding="async"
/>
<!-- Note: NO loading="lazy" on LCP element -->

<!-- CORRECT: preload hint in <head> for LCP image -->
<link rel="preload" as="image" href="/images/hero.avif" fetchpriority="high" />
```

### What is FORBIDDEN on LCP elements

- `loading="lazy"` — delays browser discovery of the LCP asset
- CSS `background-image` for the LCP element — hides it from the browser's preload scanner
- No `width`/`height` attributes — causes layout shifts (CLS regression)
- Unoptimized format (PNG/JPEG) when AVIF/WebP is available

### Image format requirements

| Format | Use case | Priority |
|---|---|---|
| **AVIF** | Hero images, featured content, coloring page thumbnails | Primary |
| **WebP** | Fallback where AVIF not supported, gallery images | Secondary |
| **PNG** | Only for images requiring transparency with complex edges | Last resort |
| **JPEG** | Avoid — superseded by AVIF/WebP for all use cases | Do not add |
| **SVG** | Logos, icons, decorative elements | Use freely |

**Conversion tool:** The project already has `sharp` (0.34.5) as a dev dependency — use it for batch image optimization in the `scripts/` folder.

---

## II-D: INP Optimization Rules

INP measures all interactions (clicks, taps, key presses) across the entire page lifetime. Target: ≤ 200ms on all interactions.

### Astro Islands Architecture (current implementation advantage)

Astro's Islands Architecture is the correct pattern for INP. Static HTML is served instantly; JavaScript hydrates only interactive components. This keeps the main thread free for input response.

**Rules for component hydration directives:**

| Directive | When to use | Main thread impact |
|---|---|---|
| `client:idle` | Non-critical interactive elements | Minimal — waits for idle time |
| `client:visible` | Below-fold interactive elements | Minimal — only hydrates on scroll |
| `client:load` | Critical above-fold interactions (header, auth, cart) | Immediate — use sparingly |
| `client:only` | Components that cannot SSR | Avoid when possible |

**Rule:** Never use `client:load` for components that are not immediately needed on page interaction. Every unnecessary `client:load` adds to main thread blocking time.

### JavaScript weight rules

- Audit JS bundle size on every significant dependency addition
- Unused code paths should be eliminated via tree-shaking (Astro + Vite handle this automatically — do not add side-effect imports)
- Third-party scripts (analytics, speed insights) are loaded asynchronously — do not change their loading strategy
- Heavy computation (data transformation, sorting large arrays) belongs in a server endpoint, not client-side

### Third-party script management

Current third-party scripts:
- `@vercel/analytics` — loaded asynchronously, negligible INP impact ✅
- `@vercel/speed-insights` — loaded asynchronously, negligible INP impact ✅
- Google Fonts — loaded **non-blocking** via `rel="preload" as="style" onload="this.rel='stylesheet'"` + `<noscript>` fallback + `preconnect` hints to `fonts.googleapis.com` and `fonts.gstatic.com` ✅

**Rule for future integrations:** Any new third-party script must be loaded with `async` or `defer`. Scripts that cannot be async/deferred should not be added without performance impact assessment.

### View Transitions (`<ClientRouter />`) — analytics and script execution

`BaseLayout.astro` uses Astro's `<ClientRouter />` (View Transitions), which converts page navigations into SPA-like transitions. This has a critical implication for any script in `<body>`:

**Standard `<script>` blocks execute only on initial page load** — not on subsequent View Transition navigations. This affects `@vercel/analytics` and `@vercel/speed-insights`, which are injected once and may not track subsequent navigations unless those libraries internally listen to `astro:after-swap`.

The custom pageview tracker correctly handles this:
```js
document.addEventListener("astro:after-swap", _showMsgToast); // re-fires on navigation
```

**Rule:** Any new analytics or tracking script added to `BaseLayout.astro` must either:
1. Use `is:inline` and listen to `document.addEventListener("astro:after-swap", ...)`, or
2. Be verified to natively support Astro View Transitions

**Verification item:** Confirm that Vercel Analytics page view counts match actual traffic in the dashboard. If counts are lower than expected, the analytics script may not be tracking post-navigation views.

---

## II-E: CLS Optimization Rules

CLS measures unexpected layout shifts. Target: ≤ 0.1 score.

### Image dimensions rule

Every `<img>` tag in the codebase must have `width` and `height` attributes. These reserve space before the image loads.

```html
<!-- CORRECT -->
<img src="/images/cover.avif" width="400" height="533" alt="Book cover" />

<!-- WRONG — causes CLS -->
<img src="/images/cover.avif" alt="Book cover" />
```

This applies to:
- Book cover images
- Coloring page thumbnails
- User avatars
- Blog header images
- Any image loaded below the fold

### Font loading rule

Google Fonts are loaded via external CSS. To prevent FOUT (Flash of Unstyled Text) which causes CLS:

```css
/* CORRECT — in font CSS or head style */
@font-face {
  font-family: 'YourFont';
  font-display: swap; /* or 'optional' for lower CLS risk */
}
```

**Future optimization:** Self-host fonts instead of loading from `fonts.googleapis.com`. Benefits:
1. Eliminates cross-origin DNS lookup latency
2. Allows `font-display: optional` without FOUT
3. Removes SRI gap
4. Reduces LCP time

### Client-side generated `<img>` tags — known CLS gaps

The rule "every `<img>` must have `width` and `height`" applies to static Astro templates (mostly compliant). However, two places generate `<img>` tags dynamically in JavaScript strings without dimensions:

| File | Line | Issue |
|---|---|---|
| `src/pages/[lang]/index.astro` | ~128 | Pin photos: `'<img src="${photo}" alt="" loading="lazy" decoding="async" />'` — no width/height |
| `src/pages/[lang]/coloring-corner/index.astro` | ~196 | Thumbnails: `'<img src="' + thumbSrc + '" loading="lazy" />'` — no width/height |

These cause CLS because the browser cannot reserve layout space before the images load. When implementing any fix, add explicit `width` and `height` to both.

### Dynamic content rules

- Ads: Not used (non-goal) ✅
- Cookie consent banners: If added, must be positioned to not shift existing content (use fixed overlay, not document flow)
- Toast notifications / modals: Must use fixed positioning, never push content
- Animated counters / balance updates: Use CSS transitions, not layout-affecting reflows

---

## II-F: Server-Side & Caching Performance

### TTFB target: ≤ 800ms

With SSG + Vercel CDN, TTFB should be consistently < 100ms for most users (CDN edge serves static HTML). API endpoints (`/api/*`) have higher TTFB due to server processing — document and monitor per endpoint.

### Cron job performance considerations

| Cron job | Schedule | Duration concern |
|---|---|---|
| `monthly-draw` | 1st of month, 08:00 UTC | Heavy — runs DB function, sends emails. Expected: 5–30s |
| `award-top-earners` | 1st of month, 00:05 UTC | Medium — reads + writes multiple rows |
| `newsletter-reminders` | Daily, 09:00 UTC | Medium — email sending, rate-limited by provider |
| `weekly-newsletter` | Mondays, 10:00 UTC | Medium — email batch |
| `refund-expired-gifts` | Daily, 11:00 UTC | Light — scans + refunds |
| `refresh-leaderboard` | Every 15 minutes | Light — aggregation query |

**Rule:** Cron jobs must complete within Vercel's function timeout (10s default for hobby, 60s for pro). If `monthly-draw` approaches timeout, move to background job or break into stages.

---

## II-G: Performance Monitoring

| Tool | What it monitors | Where to check | Status |
|---|---|---|---|
| @vercel/speed-insights | Real User Monitoring (RUM) — field CWV data | Vercel dashboard | ✅ Active |
| @vercel/analytics | Page views, traffic | Vercel dashboard | ✅ Active |
| Lighthouse CI | Synthetic performance — pre-merge score gate | GitHub Actions | 🔲 Pending — no workflow exists yet. Currently manual only. Add before Phase G. |
| Vercel Build logs | Bundle size changes | Per deployment | ✅ Active |

**Rule:** Do not remove `@vercel/speed-insights`. It provides real-world CWV data from actual users — more valuable than synthetic tests.

---

## II-H: Performance Audit Checklist

Run this checklist on every significant release or monthly.

### LCP
- [ ] Hero image on each key page uses AVIF or WebP format
- [ ] Hero image has `fetchpriority="high"` attribute
- [ ] Hero image has `decoding="async"` attribute
- [ ] Hero image has explicit `width` and `height` attributes
- [ ] NO `loading="lazy"` on LCP element
- [ ] `<link rel="preload" as="image">` in `<head>` for LCP image
- [ ] LCP element is NOT a CSS `background-image`
- [ ] TTFB < 800ms for static pages (check Vercel speed insights)

### INP
- [ ] Only critical above-fold components use `client:load`
- [ ] No synchronous heavy computation in event handlers
- [ ] Third-party scripts loaded with `async` or `defer`
- [ ] No new `client:load` directives added without justification

### CLS
- [ ] All static `<img>` tags have `width` and `height` attributes
- [ ] Client-side generated img tags (index.astro ~128, coloring-corner ~196) have width/height added
- [ ] All iframes have explicit dimensions
- [ ] Font loading uses `font-display: swap` or `optional`
- [ ] No content injected above existing content on load
- [ ] Cookie banners / toasts use fixed positioning (not document flow)

### View Transitions
- [ ] Verify Vercel Analytics page view counts match actual traffic (View Transitions may suppress post-navigation tracking)
- [ ] Any new tracking script in BaseLayout.astro uses `astro:after-swap` event or is verified to support View Transitions natively

### General
- [ ] Mobile Lighthouse score ≥ 90 on: home, coloring library, book catalog (SSG paths)
- [ ] SSR pages (profile, gallery, lottery) benchmarked separately — account for serverless cold start
- [ ] New dependencies assessed for bundle size impact before merge
- [ ] `@vercel/speed-insights` still installed and active
- [ ] Cache-Control headers verified for static assets (immutable)
- [ ] No authenticated responses reaching CDN cache

---

---

# SECTION III — BUSINESS LOGIC

> The Peanuts economy, lottery, and purchase flows are the core retention mechanisms. Their integrity is paramount. This section documents every invariant that must never be broken.

---

## III-A: Peanuts Economy Invariants

### Economy balance targets

| Metric | Target | Alert threshold |
|---|---|---|
| Average weekly earn (active user) | 30–50 🥜 | < 20 or > 60 |
| Cheapest meaningful cosmetic | ≥ 20 🥜 | If lowered below 15 |
| Mid-tier cosmetic | 60–90 🥜 | — |
| Top-tier physical reward | 500–900 🥜 | — |
| Peanut velocity ratio | Earn ≈ Spend (±15%) | Earn > 1.5× Spend for 4+ weeks |
| Balance sanity cap | Flag if ≥ 10,000 🥜 | Admin review required |

**Critical balance rule:** If weekly earn consistently exceeds weekly spend by 50%+ for 4 straight weeks, pause earn multipliers and expand the catalog before resuming. Do not ignore this signal.

### Earn actions and daily caps

| Action | Peanuts earned | Cap |
|---|---|---|
| Daily fact / tip opened | +1 🥜 | 1/day |
| Streak check-in | +2 🥜 | 1/day |
| Writing a review | +5 🥜 | Per review (moderated) |
| Share-to-earn (download) | +2 🥜 | Daily cap per user |
| Referral (first action verified) | +10 🥜 | 20 referrals/month max |
| Kid art published to Hall of Fame | +20 🥜 | Per approved artwork |
| Welcome bonus (first login) | +5 🥜 | Once |
| First lottery ticket (welcome) | +1 🎟️ | Once |

**Anti-abuse rule:** Share reward clicks must be verified (not just clicks — actual referral action required). All rewards use idempotent `reason` constraint to prevent double-grant.

---

## III-B: Rate Limits Reference

Every endpoint that grants peanuts or performs economy actions is rate-limited. These limits are enforced at the DB level.

| Endpoint | Rate limit | Pattern |
|---|---|---|
| `share-reward.ts` | 3 per day | ⚠️ Direct DB query (not `check_rate_limit` RPC) |
| `buy-badge.ts` | 5 per hour | ✅ `check_rate_limit` RPC |
| `boost-review.ts` | 5 per hour | ✅ `check_rate_limit` RPC |
| `download-artwork.ts` | 20 per hour | ✅ `check_rate_limit` RPC |
| `buy-tickets.ts` | 10 per hour | ✅ `check_rate_limit` RPC |
| `buy-lottery-entry.ts` | 10 per hour | ✅ `check_rate_limit` RPC |
| `enter-giveaway.ts` | 10 per hour | ⚠️ Direct query on `lottery_entries` — valid exception: the standard RPC reads `credit_transactions`, which does not track giveaway entries |
| `gift-ticket.ts` | Inside `gift_tickets` DB RPC | ⚠️ No application-layer rate limit call. Rate limit enforced atomically inside the RPC (returns `error: "rate_limit"`). API-level cap: max 5 tickets per gift transaction. See III-D exception note. |
| `touch-streak.ts` | **None** | ❌ Gap — see Section I-C.3 |

**Rule:** When adding any new endpoint that grants or spends peanuts, define and implement the rate limit before the endpoint goes live. Prefer the `check_rate_limit` RPC pattern for consistency. Direct DB queries are acceptable only when the action cannot be tracked via `credit_transactions` (document the exception).

---

## III-C: Lottery System Rules

| Property | Implementation |
|---|---|
| Randomness | `crypto.getRandomValues()` with **rejection sampling** — cryptographically secure and modulo-bias free |
| Duplicate prevention | `UNIQUE(user_id, month)` on `lottery_winners` |
| Cron trigger | 1st of month at 08:00 UTC (GET endpoint, CRON_SECRET required) |
| Audit trail | `lottery_draw_log` table — all draws logged |
| Winner notification | Auto-email notification via Resend + public announcement (with consent) |
| Manual override | Admin can trigger draw from panel |
| CRON_SECRET | Required on `/api/cron/monthly-draw` — validated as first operation |

**Invariants:**
- Never use `Math.random()` anywhere in draw logic
- Never simplify the rejection sampling — `do { crypto.getRandomValues(arr); } while (arr[0] >= limit)` is intentional to eliminate modulo bias
- Always log to `lottery_draw_log` before announcing winner
- Duplicate winner prevention is at DB level (UNIQUE constraint) — do not rely on application logic alone

---

## III-D: Purchase Flow Rules

All purchase operations follow this pattern and must continue to do so:

```
1. Validate user session (cookie auth)
2. Rate limit check (rate_limit(action))
3. Verify ownership / eligibility (server-side, never client-trusted)
4. Execute DB function (advisory lock + check + deduct + grant in ONE transaction)
5. Return success/failure to client
```

**Atomic DB functions (must never be split into multiple queries):**

| Function | Atomically does |
|---|---|
| `buy_lottery_entry()` | Check balance → deduct peanuts → insert ticket |
| `purchase_badge()` | Check balance → deduct → grant badge |
| `purchase_boost()` | Check balance → deduct → apply boost |
| `purchase_download()` | Check balance → deduct → grant download credit |
| `enter_giveaway()` | Check tickets → deduct ticket → record entry |

**Rule:** Never replace a DB function with multiple sequential API calls. Race conditions will occur.

**Accepted exception — RPC-delegated rate limiting (`gift-ticket.ts`):**

`gift-ticket.ts` is the only endpoint where rate limiting happens **inside** the `gift_tickets` DB RPC (not before calling it). The API has no `check_rate_limit` call — the RPC returns `error: "rate_limit"` and the API maps it to HTTP 429. This pattern is valid when the rate limit and the operation must be atomic (gift ticket deduction + rate check happen in the same transaction). Do not "fix" this by adding an application-layer rate check — that would create a TOCTOU gap.

### Known lottery product issues (flagged April 22, 2026)

Deadline to fix: **before the May 1, 2026 draw**. Status: open.

1. **[LOTTERY-001] Monthly prize is fixed, but claim UI lets the winner choose any book.**
   - `src/data/books.ts :: getMonthlyPrizeBook(month)` returns a single, deterministic book for each month (e.g. `2026-03` → "The Cozy Kids' Club").
   - `src/pages/[lang]/lottery.astro` claim form renders a grid of all books and lets the winner pick any one.
   - Consequence: winner can expect a book that was not the advertised prize of that month. Admin/operational confusion, potential trust issue.
   - Required fix: claim form must display **only** `getMonthlyPrizeBook(winner.month)`, with no selection UI. Backend must validate the submitted `book_slug` equals the month's fixed prize and reject otherwise.

2. **[LOTTERY-002] Claim banner dominates the entire `/lottery/` page for winners.**
   - When a pending unclaimed win exists, the page replaces the active monthly giveaway context with a full-bleed "Congratulations!" banner + claim form.
   - Consequence: winner loses visibility of the current month's giveaway, countdown, and participant count. Poor UX for a user who won last month but wants to keep competing.
   - Required fix: render a compact "🏆 You have a pending prize — claim it" banner at the top of the page. Keep the normal giveaway UI below. Open the full claim form only when the banner's CTA is clicked.

3. **[LOTTERY-003] Reviews grant 5 tickets to every future monthly draw, perpetually.**
   - `src/pages/api/cron/monthly-draw.ts` adds 5 tickets per approved review to the draw pool **without filtering by month** (`.eq("status", "approved")` with no date filter).
   - Consequence: a review written in January grants 5 tickets in every subsequent monthly draw, forever. Reviews accumulate advantage over time. This may be intentional recurring recognition, but it is undocumented and creates long-tail bias in the draws.
   - Required decision: either (a) document this as intentional in V-D + peanuts economy docs, (b) filter by `book_reviews.created_at` matching the draw month, or (c) cap the recurring ticket allocation (e.g. 12 months max per review).

---

## III-E: User Roles & Permission Levels

| Role | How determined | Access |
|---|---|---|
| Anonymous | No valid session cookie | Public pages only, no downloads, no economy |
| Registered | Valid Supabase session | Downloads, economy, reviews, profile |
| Admin | `profiles.is_admin = true` in DB | Admin panel, moderation, all data |

**Admin check rule:** Admin pages call `isAdmin(user)` on every page load. However, `ADMIN_EMAILS` in `src/lib/supabase.ts` is the **primary fast path** — if the email matches, the DB `is_admin` flag check is skipped entirely. See Section I-A.5 for the full gap description and recommended fix. Do not treat the hardcoded array as a safe fallback — it is the current primary gate and can diverge from the DB.

### Age and parental-consent gating

The schema does **not** contain `age_verified` or `region_code` columns (verified April 2026 against the live Supabase DB; migrations 001–052 in sync with remote).

| DB column / rule | Purpose | Enforcement |
|---|---|---|
| `profiles.parent_consent_at` (timestamptz, nullable) | Parental-consent timestamp. Set at registration via `auth.signUp` metadata → `handle_new_user()` trigger, or backfilled through the legacy soft-banner path (`/api/confirm-parental-consent`). | Server-side only; exposed to layouts as `Astro.locals.parentConsentAt`. |
| 18+ account rule | Sole account holder must be an adult. | Enforced at the Terms layer (registration checkbox, see `src/pages/[lang]/terms.astro` §2). Not a DB column. |

**Rule:** Never introduce a new age- or region-based gate without first adding the backing column (and migration) and documenting its source of truth here. Client-sent age or region values must never be trusted.

---

## III-F: Data Integrity Rules

- **Additive migrations only** — no `DROP COLUMN`, no `RENAME COLUMN` in place
- Every migration gets a sequential number (e.g., `020_security_hardening.sql`)
- Backfill pattern: Add new column → migrate data → switch readers → deprecate old column → eventual drop (in a later major version)
- No migration touches production without a rollback plan documented in the migration file
- Feature flags in the `feature_flags` table (Phase G) gate all new user-facing flows

---

## III-G: Business Logic Audit Checklist

### Economy
- [ ] Peanut velocity dashboard shows earn ≈ spend (±15%)
- [ ] No user has balance ≥ 10,000 without admin review
- [ ] All earn actions have idempotent `reason` constraint
- [ ] Referral cap (20/month/user) enforced
- [ ] All rate limits verified and active on every economy endpoint

### Lottery
- [ ] Draw uses `crypto.getRandomValues()` (grep codebase to confirm)
- [ ] `UNIQUE(user_id, month)` constraint on `lottery_winners`
- [ ] CRON_SECRET validated on `/api/cron/monthly-draw`
- [ ] `lottery_draw_log` receives entry for every draw
- [ ] Admin panel shows draw history

### Purchases
- [ ] All purchase flows use DB functions (not multi-query sequences)
- [ ] Advisory locks present in all peanut/ticket RPCs
- [ ] No purchase endpoint trusts client-sent balance values
- [ ] Ownership verified before boost/badge operations

### Roles & Consent
- [ ] `is_admin` check reads from DB on every admin page
- [ ] Parental consent (`profiles.parent_consent_at`) captured at registration + backfilled via legacy soft-banner path (see V-D)
- [ ] Service client never used in non-admin endpoints

---

---

# SECTION IV — DISCOVERABILITY (GEO / AEO)

> **Reference standard:** Technical SEO for AI Search (2026), GEO (Generative Engine Optimization), AEO (Answer Engine Optimization). The operational guide establishes that traditional SEO must expand to accommodate LLM crawlers as primary discovery engines.

---

## IV-A: Foundational Advantage — SSG & LLM Crawlability

Little Chubby Press's `output: 'static'` architecture is the single most important discoverability decision. LLM crawlers (GPTBot, ClaudeBot, PerplexityBot) are less capable than Googlebot at executing JavaScript-dependent content rendering.

**What this means:**
- All blog content, coloring page descriptions, and product pages are served as pre-built HTML
- No JavaScript execution required to read content
- Content is visible to ALL crawlers immediately on request
- This SSG foundation requires no change — protect it

**Do not introduce client-side rendering for content.** If a future feature requires dynamic data loading (e.g., personalized content), ensure the static base content remains fully readable without JavaScript.

---

## IV-B: AI Crawler Policy Management

### robots.txt configuration

Two separate exclusion layers exist today and must not be confused:

| Layer | File | Current behavior |
|---|---|---|
| Sitemap generation filter | `astro.config.mjs` | Excludes `/admin/` and `/api/` from `sitemap-index.xml` ✅ |
| Crawler directives | `public/robots.txt` | Only `Disallow: /admin/` + sitemap reference ⚠️ |

**Current `public/robots.txt` (shipped):**
```
User-agent: *
Allow: /
Disallow: /admin/

Sitemap: https://www.littlechubbypress.com/sitemap-index.xml
```

**Gap:** `/api/` is excluded from the sitemap but NOT from `robots.txt`. Crawlers can still hit API routes directly. `robots.txt` should also explicitly name AI crawlers so their policy is deterministic rather than inherited from `User-agent: *`.

The `robots.txt` file should be explicitly configured to:

1. **Allow** major AI crawlers access to all public content
2. **Block** admin and API paths from all crawlers
3. **Selectively block** specific crawlers if the brand's IP policy requires

Recommended `robots.txt` structure:
```
User-agent: *
Disallow: /admin/
Disallow: /api/
Allow: /

# AI crawlers — explicitly allowed (they index for LLM training / RAG)
User-agent: GPTBot
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: Googlebot
Allow: /

Sitemap: https://www.littlechubbypress.com/sitemap-index.xml
```

**Policy decision required (owner):** Decide whether to allow or disallow LLM training crawlers (GPTBot for training vs. GPTBot for search). These are separate User-Agent values. For maximum discoverability in AI search results, allowing search indexing crawlers is recommended.

### llms.txt — missing, critical gap

The `llms.txt` standard (2026) is a machine-readable semantic contract that tells LLMs how to consume, summarize, and attribute content from a website. It is the `robots.txt` for AI comprehension.

**Current status:** No `llms.txt` exists on `www.littlechubbypress.com`. This is a significant gap for AI search discoverability.

**Recommended `llms.txt` structure for Little Chubby Press:**
```
# Little Chubby Press — llms.txt
# AI Content Usage Policy

name: Little Chubby Press
url: https://www.littlechubbypress.com
description: Bilingual (English/Spanish) family app for coloring pages, bedtime stories, and children's activities. Community-driven with monthly book giveaways.
language: en, es
audience: families, parents of children ages 3-12, adult colorists

## Permitted uses
- Index and cite content from blog articles
- Include coloring page descriptions in search summaries
- Attribute content as: "Source: Little Chubby Press (littlechubbypress.com)"
- Summarize blog articles with attribution link

## Content guidelines
- Maximum excerpt: 400 words from any single article
- Always include a link back to the source page
- Do not reproduce full coloring page catalogs without attribution
- Brand name in summaries: "Little Chubby Press" (not abbreviated)

## Contact
hello@littlechubbypress.com
```

This file should be placed at: `public/llms.txt` → served at `https://www.littlechubbypress.com/llms.txt`

### Noindex policy for private & dynamic pages (shipped)

`src/layouts/BaseLayout.astro` auto-emits `<meta name="robots" content="noindex, nofollow">` for the following path patterns, and `index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1` for everything else:

| Path pattern | Reason |
|---|---|
| `/admin` | Admin panel |
| `/login`, `/register`, `/forgot-password`, `/auth`, `/logout` | Auth surfaces |
| `/books/early-access` | Per-user dynamic content |
| `/premium-downloads` | Per-user dynamic content |

This is the source of truth for page-level indexing policy. Any new private or per-user route MUST be added to `noIndexPaths` or `noIndexSubstrings` in `BaseLayout.astro`.

### RSS feeds as AI-crawl surfaces (shipped)

`BaseLayout.astro` advertises two RSS feeds on every page:

| Feed | URL |
|---|---|
| EN blog | `/rss.xml` |
| ES blog | `/rss-es.xml` |

RSS is a high-value LLM ingestion surface — feeds present clean, dated, titled content that AI crawlers can consume without JS. Keep both feeds healthy and include full article excerpts.

---

## IV-C: Content Architecture for LLM Indexing

LLMs do not read pages like humans. They tokenize text and embed it in vector spaces. The content structure must facilitate this process.

### Semantic chunking rules for blog content

The operational guide specifies 300–400 words per semantic block (300–500 tokens) as the optimal density for LLM ingestion.

| Rule | Implementation |
|---|---|
| Article intro | First paragraph answers the core question directly (no fluff) |
| Section headings | H2/H3 in interrogative natural language ("How does X help Y?") |
| Paragraph length | Max 4–5 sentences per paragraph |
| Lists | Use bullet lists for steps, comparisons, and multi-point answers |
| Article length | 800–1,500 words for SEO articles; 400–600 for fun-fact / joke pages |

**Current blog:** 200+ articles in EN and ES. The bilingual parallel structure is a significant asset — E-E-A-T signals are stronger for topics covered in both languages with quality content.

### Heading format recommendation

Current headings should follow interrogative format for maximum LLM ingestion:

```
<!-- Good — LLM knows exactly what this section answers -->
<h2>How Does Coloring Help Kids Develop Fine Motor Skills?</h2>

<!-- Weaker — no question signal for the parser -->
<h2>Fine Motor Skills and Coloring</h2>
```

---

## IV-D: Schema.org Structured Data

Structured data injects deterministic trust signals directly into the data layer that LLMs and search engines process.

### Required Schema.org types per page type

| Page type | Required schema | Priority | Status |
|---|---|---|---|
| Every page (global) | `Organization`, `WebSite` | Critical | ✅ Shipped in `BaseLayout.astro` |
| Any page with breadcrumbs | `BreadcrumbList` | Critical | ✅ Shipped (conditional on `breadcrumbs` prop) |
| Blog article | `Article` (with author + publisher) | Critical | ✅ Shipped (conditional on `articleSchema` prop) |
| Books index | `ItemList` → `Book` + `AggregateRating` | Critical | ✅ Shipped in `src/pages/[lang]/books.astro` |
| Book detail page | `Book`, `Offer`, `AggregateRating` | Critical | 🔲 Audit required |
| Coloring page | `ImageObject`, `CreativeWork` | High | 🔲 Not shipped |
| FAQ sections | `FAQPage`, `Question`, `Answer` | High | 🔲 Not shipped |
| Lottery / giveaway | `Event` or `Offer` | Medium | 🔲 Not shipped |
| Home page | `SearchAction` on `WebSite` | Medium | 🔲 Not shipped |

**Organization schema — actually shipped (generated per-page by `BaseLayout.astro`):**
```json
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "Little Chubby Press",
  "url": "https://www.littlechubbypress.com",
  "logo": "https://www.littlechubbypress.com/<siteConfig.brandAssets.logoMark>",
  "sameAs": [
    "<instagram>", "<facebook>", "<bluesky>", "<amazonAuthor>"
  ],
  "contactPoint": [{
    "@type": "ContactPoint",
    "email": "hello@littlechubbypress.com",
    "contactType": "customer support"
  }]
}
```

Values are sourced from `siteConfig` — do not hardcode URLs in the layout. To add a new social profile to `sameAs`, update `siteConfig.social`.

**Article schema** includes `headline`, `description`, `datePublished`, `author` (Organization), `publisher` (Organization with logo `ImageObject`), `image`, and `mainEntityOfPage`. It is emitted only when a page passes `articleSchema` into `BaseLayout`.

**Remaining gaps** (documented in IV-G checklist): `FAQPage`, `CreativeWork`/`ImageObject` per coloring page, `Event`/`Offer` for lottery, `SearchAction` on the `WebSite` node.

---

## IV-E: Bilingual SEO Invariants

| Rule | Implementation | Status |
|---|---|---|
| Language-prefixed URLs | `/[lang]/...` pattern | ✅ Correct |
| `hreflang` alternates | Emitted by `BaseLayout.astro` on every page (current lang + alternate lang + `x-default`) | ✅ Shipped |
| `rel=canonical` | Emitted by `BaseLayout.astro` on every page | ✅ Shipped |
| Sitemap includes both languages | `/sitemap-index.xml` generated by `@astrojs/sitemap` | ✅ Shipped |
| i18n keys in sync | CI parity check | ✅ |

**`hreflang` pattern as actually shipped:**
```html
<link rel="canonical" href="https://www.littlechubbypress.com/[lang]/[slug]/" />
<link rel="alternate" hreflang="en" href="https://www.littlechubbypress.com/en/[slug]/" />
<link rel="alternate" hreflang="es" href="https://www.littlechubbypress.com/es/[slug]/" />
<link rel="alternate" hreflang="x-default" href="https://www.littlechubbypress.com/" />
```

**Note on `x-default`:** the shipped implementation points `x-default` to the site root (`/`), not to the EN counterpart of the current page. This is an intentional choice (let Google language-detect at the root) but diverges from the common pattern of defaulting to EN. Revisit if EN traffic from non-English locales underperforms.

**Rule:** Never change the `/[lang]/` URL structure without 301 redirects and canonical updates. URL changes without redirects destroy accumulated SEO authority.

---

## IV-F: E-E-A-T Signals (Experience, Expertise, Authority, Trust)

Generative engines evaluate E-E-A-T to determine whether to cite a source. For Little Chubby Press:

| Signal | Current state | Opportunity |
|---|---|---|
| Author attribution on blog | Unknown — audit | Add author bio with photo + credentials |
| External citations | Blog articles cite no sources | Add references where appropriate |
| Trust marks | No security/privacy badges visible | Consider displaying (GDPR compliance, etc.) |
| About page quality | Unknown | Strengthen with mission, team, real story |
| Social proof | Lottery winners visible | Expand — review counts, community size |
| Content freshness | 200+ articles, dates present | Ensure dates are accurate and articles updated |

---

## IV-G: Discoverability Audit Checklist

### AI Crawlability
- [ ] `public/llms.txt` exists with brand guidelines and attribution policy
- [ ] `robots.txt` explicitly allows GPTBot, ClaudeBot, PerplexityBot on public paths
- [x] `robots.txt` blocks `/admin/`
- [ ] `robots.txt` blocks `/api/` (currently only excluded from sitemap, not from crawlers)
- [x] All public content is visible in raw HTML — SSG baseline (`output: 'static'`)
- [x] Sitemap covers all public pages in EN and ES (`@astrojs/sitemap` with `/admin/` + `/api/` filter)
- [x] RSS feeds (`/rss.xml`, `/rss-es.xml`) advertised on every page
- [x] `noindex` applied to auth, admin, and per-user dynamic pages (see IV-B)

### Structured Data
- [x] `Organization` schema on every page (from `BaseLayout.astro`)
- [x] `WebSite` schema on every page
- [x] `BreadcrumbList` schema on pages with breadcrumbs
- [x] `Article` schema on blog posts that pass `articleSchema` prop
- [x] `ItemList` + `Book` + `AggregateRating` on the books index
- [ ] `Book` / `Offer` / `AggregateRating` on individual book detail pages (audit)
- [ ] `FAQPage` schema where FAQ sections exist
- [ ] `CreativeWork` / `ImageObject` per coloring page
- [ ] `Event` / `Offer` for lottery / giveaway
- [ ] `SearchAction` on `WebSite` (home)
- [ ] Validate all schemas via Google Rich Results Test

### Bilingual SEO
- [x] `hreflang` tags emitted on every page (current lang + alternate + `x-default`)
- [x] `rel=canonical` emitted on every page
- [ ] No duplicate content without canonicalization (audit)
- [ ] EN and ES blog articles are parallel content (same topic, not machine translation)

### Content Quality
- [ ] Blog article headings use interrogative natural language format
- [ ] Articles have clear intro that answers the core question in first paragraph
- [ ] Author attribution present on blog articles
- [ ] External sources cited where claims are made

---

---

# SECTION V — LEGAL COMPLIANCE

> **Reference standard:** GDPR/RGPD (EU 2016/679), AEPD 2026 guidelines on agentic AI, ENS (Esquema Nacional de Seguridad), COPPA (US — for child-directed content).

---

## V-A: Jurisdiction & Applicable Law

Little Chubby Press operates from Spain and serves EU users, US users, and LATAM users. Applicable regulations:

| Regulation | Jurisdiction | Applicability | Priority |
|---|---|---|---|
| GDPR / RGPD | European Union | Collects data from EU residents | Critical |
| AEPD guidelines | Spain | Primary operational base | Critical |
| ENS | Spain | If serving Spanish public entities | Medium |
| COPPA | United States | Children's content platform | High |
| LGPD | Brazil | LATAM expansion (PT-BR phase) | Future |

---

## V-B: Personal Data Inventory

| Data type | Where stored | Legal basis | Retention |
|---|---|---|---|
| Email address | Supabase `profiles` | Consent (account creation) | Until account deletion |
| Display name | Supabase `profiles` | Contract (service delivery) | Until account deletion |
| Peanut balance & history | `credit_transactions` | Contract | Until account deletion |
| Lottery ticket history | `ticket_transactions` | Contract | Until account deletion |
| Review content | `book_reviews` | Consent | Until review deletion |
| Newsletter subscription | External (Buttondown) | Consent (explicit opt-in) | Until unsubscribe |
| Avatar image | Supabase storage | Consent | Until deletion |
| `profiles.parent_consent_at` | Supabase `profiles` | Consent (parental declaration, see V-D) | Until account deletion |
| Auth security timestamps (last sign-in, failed attempts) | Supabase Auth (`auth.users`) | Legitimate interest (account protection / fraud prevention) | Per Supabase Auth defaults |
| Session cookies (httpOnly) | Browser | Strictly necessary (not consent-required) | Session duration |
| Analytics data | Vercel (aggregated, cookie-free) | Legitimate interest | Per Vercel's policy |

**Not collected (by design):**

| Category | Status |
|---|---|
| Payment data (card numbers, billing address) | 🚫 NOT collected — platform is entirely free; peanuts are earned, never purchased |
| Behavioral tracking (GA, Meta Pixel, session replay) | 🚫 NOT used — Vercel Analytics is cookie-free and aggregated |
| Age fields (`age_verified`, `date_of_birth`, `region_code`) | 🚫 NOT in schema — age enforcement is handled at the Terms layer (18+ account) rather than by DB columns |
| Biometrics / facial recognition on uploads | 🚫 NOT performed |

---

## V-C: User Rights Implementation

| Right | Implementation | Status |
|---|---|---|
| Right of access | `/api/export-my-data.ts` | ✅ Implemented |
| Right to erasure | `/api/delete-account.ts` | ✅ Implemented |
| Right to unsubscribe | `/api/unsubscribe.ts` | ✅ Implemented |
| Right to withdraw consent | Newsletter opt-out | ✅ Via unsubscribe |
| Right to data portability | export-my-data (verify format) | ✅ (verify output format) |
| Right to object | Contact form | 🔲 Document the process |
| Right to rectification | `/[lang]/profile/` edit page | ✅ Shipped (audit: confirm all user-editable fields are exposed) |

---

## V-D: Child Protection Legal Framework

This is the highest-risk compliance area due to the children's content nature of the platform. The shipped model is **adult-only accounts with parent-supervised family use** — the platform does not accept child registrations.

### Account model (as shipped in Terms)

Per `src/pages/[lang]/terms.astro` §2:
- Accounts are **18+ only**. The adult of the family (parent, guardian, grandparent) is the account holder.
- Children may participate *with* the adult (read books, pick coloring pages, help write a review) but the account is always in the adult's name.
- One account per person. Duplicates are treated as fraud.

This model sidesteps direct child-data collection. COPPA and GDPR child-consent thresholds are relevant only in that minors may *view content alongside a parent*, not because the platform registers them.

### Parental consent capture flow (shipped)

Consent is captured on `profiles.parent_consent_at` (timestamptz, nullable) via two paths:

| Path | Trigger | File |
|---|---|---|
| New users | Required checkbox at registration writes `parent_consent_at` into `auth.signUp` user metadata; `handle_new_user()` DB trigger carries it over to `profiles` | `src/pages/[lang]/register.astro`, `supabase/migrations/052_parental_consent.sql` |
| Legacy users | Soft banner shown to authenticated users with `parent_consent_at = NULL`; POSTs to `/api/confirm-parental-consent` which uses `coalesce(parent_consent_at, now())` for idempotency | `src/components/ParentalConsentBanner.astro`, `src/pages/api/confirm-parental-consent.ts` |

Middleware reads `profiles.parent_consent_at` on every request and exposes it as `Astro.locals.parentConsentAt` so layouts and components can gate UI accordingly.

### COPPA (US) — applicability
- Platform does not accept accounts from users under 13 (18+ by Terms).
- No behavioral advertising to any user (ad-free platform — ✅ non-goal).
- No persistent identifiers tied to minors are collected.
- If a future feature ever targets under-13 users directly, a verifiable parental consent (VPC) mechanism would be required before launch.

### GDPR — Children's consent (EU) — applicability
- Account holder is ≥18; Spanish AEPD minimum of 14 is not relevant under current design.
- Marketing consent (newsletter) is separate, opt-in, not pre-checked — verify this remains true on every signup/profile edit surface.

### AEPD 2026 Agentic AI guidelines
Per AEPD's 2026 publication on agentic AI and data protection:
- Agentic systems (Chubby AI agent, social agents) that access user data must operate on minimal data necessary.
- No agent should have write access to user PII without explicit SOP authorization.
- Agent actions that process personal data must be logged with reasoning (audit trail).
- Privacy by Design must be applied to all agent prompt engineering.

### Moderation requirements for user-submitted content
- User-submitted art: automated content-model screening + human approval before publish (Admin gallery approval flow).
- EXIF data should be stripped from all uploaded images before storage. **Audit flag:** verify the upload pipeline actually strips EXIF; this is asserted as policy but implementation has not been re-verified in this audit.
- No facial recognition or biometric processing on any uploaded image.
- The adult account holder can retract any submitted art at any time (hard delete + cache purge).

---

## V-E: Privacy by Design Rules for New Features

Every new feature must pass this check before implementation:

1. **Data minimization** — Does this feature require collecting new personal data? If yes, is it strictly necessary?
2. **Purpose limitation** — Is data collected for this feature used only for this feature's stated purpose?
3. **Consent** — If new data is collected, does the user have a clear opportunity to consent or refuse?
4. **Access control** — Which roles can access this data? Is it more than necessary?
5. **Retention** — How long is this data kept? Is it deleted with account deletion?
6. **Children** — Does this feature interact with child users? Apply the highest standard.
7. **Agent access** — If an AI agent processes this data, is it read-only, minimal scope, and logged?

---

## V-F: ENS Classification Estimate

The Esquema Nacional de Seguridad (ENS) classifies systems in three categories:

| Category | When | Our estimate |
|---|---|---|
| Básica | Limited impact from security incident | Current stage |
| Media | Significant harm possible | Target as user base grows |
| Alta | Critical infrastructure, extreme sensitivity | Not applicable |

As the platform handles user registrations, purchase transactions, and children's content, a **Categoría Media** designation is the appropriate target. This requires:
- Documented business continuity plan
- Forensic traceability policies
- Regular security audits with documented results
- Admin audit log (already implemented ✅)

---

## V-G: Legal Audit Checklist

### GDPR
- [x] Privacy policy has `lastUpdated` tracked and refreshed bi-weekly per `docs/LEGAL_MAINTENANCE.md`
- [ ] Privacy policy lists ALL current data processing activities (review on next bi-weekly cycle)
- [ ] Marketing consent (newsletter) is opt-in, separate, not pre-checked on every signup/profile surface
- [x] Cookie banner accurately reflects zero tracking-cookies stance (`src/components/CookieConsent.astro`)
- [x] Data export endpoint shipped (`/api/export-my-data`)
- [ ] Data export returns complete and portable format (JSON) — verify output covers every PII table
- [x] Account deletion endpoint shipped (`/api/delete-account`)
- [ ] Account deletion cascade removes all PII (verify every table referencing `user_id` is cleaned)
- [x] Newsletter unsubscribe shipped (`/api/unsubscribe`) — Buttondown applies immediately, well within the GDPR 10-day requirement
- [x] Parental consent captured (`profiles.parent_consent_at`) via registration checkbox + legacy soft banner

### Child Safety
- [x] No direct accounts for users under 18 (enforced at Terms layer)
- [x] No marketing to minors — newsletter subscribers are adult account holders only
- [ ] EXIF stripped from all image uploads (audit: confirm in upload pipeline)
- [x] Moderation pipeline in place for user-generated content (admin gallery approval)
- [ ] If an age gate or child sub-profile is ever added, implement verifiable parental consent (VPC) before launch

### Agents & Data
- [ ] Chubby agent does not store conversation PII beyond session
- [ ] Social agents do not access user PII tables
- [ ] Agent actions logged with purpose (audit trail)

---

---

# SECTION VI — AGENTS & AUTOMATION

> **Reference standard:** CSA Agentic AI Autonomy Levels (0–5), SOP-first architecture, Zero Trust for agents.

---

## VI-A: Active Agents Inventory

Agents and automations at Little Chubby Press run across three distinct runtimes. The table below reflects what is shipped today — not aspirational state.

### Client-side (browser)

| Agent | Implementation | Autonomy level | Notes |
|---|---|---|---|
| **Chubby** (chat widget) | Client-side keyword / intent matching against the pre-built `CHUBBY_AGENT_REFERENCE` knowledge base. **No LLM, no external API call.** | Level 0 — deterministic | See `src/components/ChubbyChat.astro`. `getResponse()` is swappable for a future LLM backend, but today it is a lookup table. |

### Vercel Cron (serverless, authenticated)

See VI-D for the full cron table. 6 scheduled endpoints at `/api/cron/*`, each protected by Bearer `CRON_SECRET`. These are Level 1 — fully scripted, deterministic.

### GitHub Actions (scheduled workflows)

| Workflow file | Purpose | Schedule | Autonomy |
|---|---|---|---|
| `social-post.yml` | Publish pre-authored posts to Instagram / Facebook / Bluesky | 5× daily (12, 16, 20, 00, 04 UTC) | Level 2 — scheduled push of human-reviewed queue content (see VI-C) |
| `social-engage.yml` | Monitor comments and run Bluesky outreach engagement | Scheduled + `workflow_dispatch` | Level 2 — replies drawn from approved response set |
| `diagnose-social.yml` | Diagnostics for social integrations | `workflow_dispatch` only | Level 0 — manual |
| `daily-blog-post.yml` | Generate a daily blog post and commit to repo | Scheduled | Level 2 — automated authoring with SOP guardrails (Brand Voice Guide) |
| `daily-analytics-email.yml` | Send daily analytics email | Scheduled | Level 1 |
| `agent-intelligence.yml` | Weekly intelligence analysis + weekly/monthly analytics reports | Weekly (monthly on the 1st) | Level 2 |
| `agent-collectors.yml` | Collect social metrics, aggregate traffic, link content performance | Scheduled | Level 1 — data collection only |
| `sync-amazon-ratings.yml` | Sync Amazon book ratings, commit if changed | Weekly Monday 00:00 UTC + `workflow_dispatch` | Level 1 — external scraper |

**Protection model differences:**
- Vercel Cron endpoints validate `Authorization: Bearer ${CRON_SECRET}` at request time.
- GitHub Actions workflows do NOT use `CRON_SECRET`; they run in GitHub's runner and authenticate to third-party APIs (Resend, Instagram, Facebook, Bluesky, Amazon, etc.) using GitHub repository secrets.

### CSA Autonomy Level Reference

| Level | Description | Our usage |
|---|---|---|
| 0 | Full human control | Manual admin actions |
| 1 | Human-initiated, automated execution | Cron jobs, deterministic scripts |
| 2 | AI analyzes + proposes; human approves changes to core data | Chubby, social agents |
| 3 | Conditional autonomy; executes within strict guardrails | Target for future AI features |
| 4–5 | Full autonomy (AGI range) | Not applicable — explicitly out of scope |

**Policy:** All agents operating on Little Chubby Press are Level 0, 1 or 2 today. No agent has Level 3+ autonomy without explicit product approval and guardrail documentation.

---

## VI-B: Chubby Agent — Current Implementation & LLM-Upgrade Guardrails

Chubby is the brand's on-site assistant (personality: friendly elephant).

### Current implementation (shipped)

| Property | Reality |
|---|---|
| Runtime | Client-side JavaScript inside `src/components/ChubbyChat.astro` |
| Response engine | Keyword / intent matching against a pre-built knowledge base (`CHUBBY_AGENT_REFERENCE`) |
| LLM involved | **No** — no external AI API is called |
| Autonomy level | Level 0 (deterministic lookup) |
| Data access | None — never touches Supabase, never reads user session, never calls `/api/*` |
| Output surface | Text only, rendered in the chat widget |

This makes Chubby effectively immune to prompt injection today — there is no model to override. Its "guardrails" are simply the scope of the pre-written response set.

### Requirements IF/WHEN Chubby is upgraded to an LLM backend

The `getResponse()` function is intentionally swappable. Before any LLM backend ships, the following must be in place:

| Property | Required specification |
|---|---|
| Domain restriction | System prompt locks responses to Little Chubby Press topics (brand, books, peanuts, coloring) |
| Data access | Read-only; no access to user DB, no session tokens, no PII tables |
| PII handling | Never repeats, stores, or processes user PII in responses |
| Financial actions | Cannot initiate purchases, refunds, or economy changes |
| Escalation | Routes to `hello@littlechubbypress.com` for all out-of-scope requests |
| Prompt injection defense | Domain restriction + input sanitization + refusal on instruction-override patterns |
| Tool-use | If tools are granted, implement a secondary auditor pass before any tool execution |
| Logging | Log prompt + response + reasoning for audit trail (no user PII in logs) |

Upgrading Chubby to an LLM backend is a Level 2+ change and requires a full VI-E pre-approval pass before deployment.

---

## VI-C: Social Agents — Guardrails & SOPs

Social agents run as GitHub Actions workflows (`social-post.yml`, `social-engage.yml`, `daily-blog-post.yml`, `agent-intelligence.yml`, `agent-collectors.yml`). They are scheduled, not manually triggered.

### Two-tier execution model

| Tier | What it does | Autonomy | SOP checkpoint |
|---|---|---|---|
| 1. Content authoring | Human (or assisted) creation of post copy / blog draft; queued into repo (`_PIN_POSTS_*.txt`, `PIN_TO_COPY/`, blog queue) | Level 2 — human review against `BRAND_VOICE_GUIDE.md` is the SOP | Review happens BEFORE merge/commit |
| 2. Scheduled publish | `social-post.yml` picks the next queued post and publishes on the 5×-daily cron | Level 1 — deterministic push of pre-approved content | No per-post review at publish time — trust is in the queue |

**Operating rule:** Nothing goes into the queue that has not been reviewed against the Brand Voice Guide. If at any point `social-post.yml` starts generating novel content at publish time (e.g., calling an LLM to write the post), that becomes Level 3 autonomy and requires a VI-E pre-approval pass.

### Engagement workflow notes

- `social-engage.yml` replies to comments and runs Bluesky outreach. Replies must be drawn from an approved response set or pre-written templates — do NOT let it free-generate replies without moderation.
- `daily-blog-post.yml` generates posts from `scripts/create-blog-post.mjs`. Brand Voice Guide compliance is enforced by the script's prompts/templates; audit periodically to confirm output quality.

### User data access

None of the social workflows touch Supabase user tables. They operate on content data, public analytics endpoints, and third-party social APIs only.

---

## VI-D: Cron Automation — Operational Rules

Schedules below are the source of truth in [`vercel.json`](../vercel.json). Every endpoint validates `Authorization: Bearer ${CRON_SECRET}` and returns 500 if the secret is not configured.

| Cron job | Schedule (UTC) | CRON_SECRET | Human override | Idempotent |
|---|---|---|---|---|
| `monthly-draw` | `0 8 1 * *` (1st of month, 08:00) | ✅ | Admin panel re-trigger | Must be (checks for existing winner) |
| `award-top-earners` | `5 0 1 * *` (1st of month, 00:05) | ✅ | Manual SQL | Should be |
| `newsletter-reminders` | `0 9 * * *` (daily 09:00) | ✅ | Admin panel | Must be (avoid duplicate sends) |
| `weekly-newsletter` | `0 10 * * 1` (Monday 10:00) | ✅ | Admin panel | Must be |
| `refund-expired-gifts` | `0 11 * * *` (daily 11:00) | ✅ | Manual SQL | Must be |
| `refresh-leaderboard` | `15 * * * *` (hourly at :15) | ✅ | Manual SQL | ✅ (stateless aggregation) |

**Protection model reminder (from VI-A):** `CRON_SECRET` applies only to Vercel Cron endpoints. GitHub Actions workflows authenticate to third-party APIs via GitHub repository secrets and do not pass through `CRON_SECRET`.

**Idempotency rule:** Every cron job must be safe to run multiple times within the same period without causing duplicate side effects (duplicate emails, duplicate peanuts, duplicate winners).

---

## VI-E: Future Agent Integrations — Pre-Approval Requirements

Before adding any new AI agent or increasing an existing agent's autonomy level, document:

1. **Agent purpose** — specific task, no scope creep
2. **Autonomy level** — which CSA level and why
3. **Tools granted** — exhaustive list of what the agent can read/write
4. **Guardrails** — what it cannot do; who audits its output
5. **SOP document** — the standard operating procedure it follows
6. **Human checkpoint** — which actions require human approval before execution
7. **Prompt injection defense** — how indirect injection is mitigated
8. **Logging** — what is logged and where

---

## VI-F: Agents Audit Checklist

- [x] Chubby agent cannot access user PII tables — client-side only, never touches Supabase
- [x] Chubby agent cannot execute economy mutations — no write access to any system
- [x] All Vercel Cron endpoints validate `Authorization: Bearer ${CRON_SECRET}` (6/6)
- [x] Social posting queue is reviewed against Brand Voice Guide before commit (SOP)
- [ ] Every cron job's idempotency guard has been verified in code (per-table audit)
- [ ] `social-engage.yml` replies are restricted to an approved template set (audit implementation)
- [ ] `daily-blog-post.yml` output sampled monthly for Brand Voice Guide compliance
- [ ] No agent operating at Level 3+ without documented guardrails
- [ ] Agent actions that process user data are logged with reasoning (currently no agent processes user PII — maintain this invariant)
- [ ] If Chubby is ever upgraded to an LLM backend, complete VI-B upgrade requirements BEFORE deployment

---

---

# SECTION VII — OPERATIONS & INFRASTRUCTURE

> **Reference standard:** 12-Factor config, Zero Trust secret management, explicit RPO/RTO definition, defense in depth at the delivery layer.
>
> **Grounding note:** This section is verified against live infrastructure via `vercel env ls production`, `gh secret list`, `gh api`, and `supabase migration list --linked` on April 22, 2026. Stack: Vercel Pro (Astro preset, Node.js 24.x) + Supabase (project ref `igbnuxndcgxwymyoywbn`, region East US North Virginia) + GitHub (private repo `SessDev83/little-chubby-website`).

---

## VII-A: Environment Variable Inventory

Two separate secret stores are in use. Do not mix them.

### Vercel production environment (15 active vars — authoritative for runtime)

| Variable | Purpose | Classification |
|---|---|---|
| `PUBLIC_SITE_URL` | Canonical site URL for SSR + link building | Public |
| `PUBLIC_SUPABASE_URL` | Supabase project URL | Public (safe to expose) |
| `PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key (RLS-enforced) | Public (safe to expose) |
| `PUBLIC_BUTTONDOWN_USERNAME` | Newsletter form action | Public |
| `PUBLIC_FORMSPREE_FORM_ID` | Contact form action | Public |
| `SUPABASE_SERVICE_ROLE_KEY` | **Bypasses RLS.** Only for admin/service paths. | **SECRET — high risk** |
| `CRON_SECRET` | Bearer token validated by all 6 `/api/cron/*` endpoints | **SECRET** |
| `RESEND_API_KEY` | Transactional email (newsletters, receipts) | **SECRET** |
| `ANALYTICS_EMAIL` | Recipient for daily analytics reports | Low risk |
| `BETTERSTACK_HEARTBEAT_MONTHLY_DRAW` | Heartbeat URL for monthly draw cron watchdog | Sensitive (treat as secret) |
| `BETTERSTACK_HEARTBEAT_WEEKLY_NEWSLETTER` | Heartbeat URL for weekly newsletter cron watchdog | Sensitive (treat as secret) |
| `BETTERSTACK_HEARTBEAT_NEWSLETTER_REMINDERS` | Heartbeat URL for newsletter reminders cron watchdog | Sensitive (treat as secret) |
| `BETTERSTACK_HEARTBEAT_AWARD_TOP_EARNERS` | Heartbeat URL for top-earners cron watchdog | Sensitive (treat as secret) |
| `BETTERSTACK_HEARTBEAT_REFUND_EXPIRED_GIFTS` | Heartbeat URL for refund-expired-gifts cron watchdog | Sensitive (treat as secret) |
| `BETTERSTACK_HEARTBEAT_REFRESH_LEADERBOARD` | Heartbeat URL for refresh-leaderboard cron watchdog | Sensitive (treat as secret) |

### Planned (code integrated, env pending)

| Variable | Purpose | Classification |
|---|---|---|
| `PUBLIC_SENTRY_DSN` | Sentry DSN used by browser + server SDK | Public-safe (DSN is not a secret) |
| `SENTRY_DSN` | Optional server-only DSN override | Secret (optional) |
| `SENTRY_AUTH_TOKEN` | Source map upload auth token (CI only) | **SECRET** |
| `SENTRY_ORG`, `SENTRY_PROJECT` | Sentry source map upload target | Low risk |

### GitHub Actions repository secrets (13 vars — used by 8 workflows)

| Variable | Used by workflow(s) | Purpose |
|---|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | `daily-analytics-email`, `agent-intelligence`, `agent-collectors`, `social-engage`, `social-post` | **Admin-level DB access from CI.** See VII-C audit item. |
| `PUBLIC_SUPABASE_URL` | Same set | DB endpoint |
| `RESEND_API_KEY` | `daily-analytics-email`, `agent-intelligence` | Email delivery |
| `ANALYTICS_EMAIL` | `daily-analytics-email` | Recipient |
| `ANTHROPIC_API_KEY` | Social / blog generation scripts | LLM calls (Claude) |
| `NANO_BANANA_API_KEY` | `daily-blog-post`, `social-post` | Image generation |
| `BLUESKY_HANDLE`, `BLUESKY_PASSWORD` | `social-post`, `social-engage` | Bluesky posting |
| `META_PAGE_ACCESS_TOKEN`, `META_PAGE_ID`, `META_IG_USER_ID` | `social-post` | Facebook / Instagram posting |
| `DATAFORSEO_LOGIN`, `DATAFORSEO_PASSWORD` | `sync-amazon-ratings` | Amazon rating scraping |

### Drift flags (April 2026)

- `.env.example` now includes `NANO_BANANA_API_KEY`, `CRON_SECRET`, Sentry vars, and Better Stack heartbeats.
- `CRON_SECRET` exists ONLY in Vercel (correct) \u2014 never replicate into GH secrets.
- Vercel has `PUBLIC_FORMSPREE_FORM_ID` and `PUBLIC_BUTTONDOWN_USERNAME`; GH secrets does not (correct \u2014 those are client-injected at build time only).
- Sentry SDK is integrated in code, but DSN vars are not yet present in Vercel. Until DSN is set, no Sentry runtime events are emitted.

---

## VII-B: Secret Handling Rules

1. **`SUPABASE_SERVICE_ROLE_KEY` bypasses RLS.** It MUST only be used server-side (Vercel runtime or GH Actions runner). Never expose it to the browser, never log it, never commit it. Any code path that uses it must first verify caller identity (admin user or valid cron bearer).
2. **Public keys (`PUBLIC_*`) are safe to ship to the browser.** They are protected by Supabase RLS policies \u2014 not by secrecy.
3. **Secret rotation cadence.** Not currently documented. Recommended baseline: rotate `CRON_SECRET` every 6 months or immediately on suspected leak; rotate `SUPABASE_SERVICE_ROLE_KEY` annually or on any personnel change with admin access; rotate third-party API keys per provider guidance.
4. **Shared surface audit.** `SUPABASE_SERVICE_ROLE_KEY` lives in TWO secret stores (Vercel + GitHub). Rotation requires updating both within the same maintenance window.
5. **Least privilege in CI.** GitHub Actions workflows should use dedicated service accounts when the provider supports them (e.g., a separate Meta app for CI) rather than shared human credentials.

---

## VII-C: Deployment & Rollback

| Property | Value |
|---|---|
| Platform | Vercel Pro |
| Project ID | `prj_SgMuFZqWuhlot4UrDYdP1oSCqSAT` |
| Framework preset | Astro |
| Node runtime | **24.x** |
| Root directory | `.` |
| Build command | `npm run build` (or `astro build`) |
| Install command | `yarn install`, `pnpm install`, `npm install`, or `bun install` (Vercel autodetect) |
| Production branch | `main` |
| Preview deploys | Every non-`main` branch and pull request |

### Deployment rules

- `main` is always deployed to production. Any merge to `main` ships.
- Branch protection is enabled on `main` (force-push blocked, deletion blocked, conversation resolution required). Keep using PRs as the default flow even when admin bypass is technically possible.
- Before any destructive migration (even via additive pattern), create a restore point via Supabase backup and record the snapshot ID in the PR description.

### Rollback

- **Code rollback:** Vercel dashboard \u2192 Deployments \u2192 promote the previous successful deployment. Rollback is ~30 seconds.
- **DB rollback:** Migrations are additive-only (see III-F). For a true rollback, restore from the latest Supabase backup \u2014 RPO up to the last backup interval (Pro default: daily). Document the restore procedure BEFORE it's needed; the first attempt during an incident is too late.

---

## VII-D: Observability & Alerting

### Shipped

| Capability | Implementation |
|---|---|
| Traffic analytics | `@vercel/analytics` (cookie-free, GDPR-compliant) |
| Performance monitoring | `@vercel/speed-insights` |
| Runtime logs | Vercel Functions logs (default retention) |
| Daily analytics report | `daily-analytics-email.yml` cron \u2192 Resend \u2192 `ANALYTICS_EMAIL` |
| Uptime monitoring | Better Stack monitors for Home EN + Home ES + API (`LCP API Me (temp)`) |
| Cron non-execution watchdog | Better Stack heartbeats (`BETTERSTACK_HEARTBEAT_*` in Vercel Production) |
| Error tracking SDK | `@sentry/astro` integrated in app code (DSN env pending for production event delivery) |

### Current state (updated April 22, 2026)

- [Partial] Error tracking is integrated in code: `@sentry/astro` installed, `sentry.client.config.ts` + `sentry.server.config.ts` added with PII scrubbing and low trace sample rate (`0.1`), and cron failure notifications now also call Sentry capture in `notifyAdminCronError`.
- [Done] Uptime monitoring is configured in Better Stack with Home EN + Home ES monitors.
- [Done] Cron non-execution detection is configured with 6 Better Stack heartbeats and 6 `BETTERSTACK_HEARTBEAT_*` vars in Vercel Production.
- [Done] Cron execution-failure alerting is configured via `notifyAdminCronError` email notifications and Sentry capture hook.
- [Partial] API uptime monitor currently uses `https://www.littlechubbypress.com/api/me/` as a temporary stable endpoint. Switch it back to `/api/health/` after the `src/pages/api/health.ts` route is merged to `main` and deployed.
- [Gap] GitHub Actions failures are still not wired to the same on-call inbox.

### Remaining activation steps

1. Add `PUBLIC_SENTRY_DSN` in Vercel (and optional `SENTRY_DSN`) to fully enable Sentry event delivery in production.
2. After deploying `/api/health/` on `main`, repoint Better Stack monitor `LCP API Me (temp)` to `/api/health/`.
3. Add GitHub Actions failure notifications (email/webhook) to close the CI alerting gap.

### Minimum observability baseline (status)

1. Error-tracking SDK with PII scrubbing: [Partial] code complete, DSN env pending.
2. Uptime probe on home page + one API endpoint: [Done] (API endpoint currently temporary).
3. Cron + CI failure alerts to the same inbox: [Partial] cron done, CI pending.

---

## VII-E: Backup & Disaster Recovery

| Property | Current state |
|---|---|
| DB backups | Supabase Pro default (daily) |
| Point-in-time recovery (PITR) | Not verified via CLI \u2014 check Supabase dashboard; recommended to enable on Pro |
| Restore procedure | Not documented anywhere in the repo |
| Last restore drill | Never performed |
| RPO target | **UNDEFINED** (recommended: \u2264 24h) |
| RTO target | **UNDEFINED** (recommended: \u2264 4h for full restore) |
| Secondary region | None |

**Action items (not urgent but non-negotiable as the user base grows):**

1. Confirm PITR status on Supabase dashboard. Enable if not on.
2. Document the restore runbook in this repo (e.g., `docs/RUNBOOK_DB_RESTORE.md`) including: how to create a new project, apply the linked migrations, restore from a specific snapshot, and rotate connection strings.
3. Run a restore drill on a throwaway Supabase project at least once. An untested backup is not a backup.
4. Declare RPO/RTO in this section once the runbook exists.

---

## VII-F: Repository & Supply-Chain Security

Verified April 2026 against `gh api` and repository settings:

| Control | Status | Notes |
|---|---|---|
| Branch protection on `main` | [Done] Enabled | Force-push blocked, deletion blocked, conversation resolution required. `enforce_admins` remains `false` for emergency owner bypass. |
| Required status checks | [Gap] Not configured | No mandatory CI gate yet. |
| Required PR reviews | [Gap] Not configured | Kept flexible for solo-dev workflow. |
| Dependabot alerts | [Done] Enabled | Vulnerability alerting active. |
| Automated security fixes | [Done] Enabled | Dependabot security PR automation active. |
| Code scanning (CodeQL) | [Gap] Not enabled | Recommended next supply-chain hardening step. |
| Secret scanning | [Partial] Not verified in this run | Check Settings -> Code security & analysis. |
| `.gitignore` covers `.env*` | [Done] Verified | No `.env` committed. |

### Remaining hardening steps

1. Enable CodeQL scanning.
2. Decide if required PR reviews and required status checks should be enforced now or after CI stabilizes.
3. Verify secret scanning toggle and alert routing.

---

## VII-G: Third-Party Provider Map

| Provider | Role | PII exposure | Legal basis |
|---|---|---|---|
| Vercel | Hosting, cron, analytics, speed insights | IP addresses (aggregated) | Legitimate interest |
| Better Stack | Uptime monitors, heartbeat watchdogs, incident alerting | On-call contact email/phone; monitor metadata | Legitimate interest |
| Sentry | Runtime error tracking + stack traces | Potential technical metadata from requests/errors (PII-scrubbed in SDK config) | Legitimate interest |
| Supabase | Postgres DB, Auth, Storage | Full user PII (profiles, reviews, uploads) | Contract / Consent |
| Resend | Transactional email + newsletters | Email addresses | Consent (marketing), Contract (service emails) |
| Buttondown | Newsletter list management | Email addresses | Consent (explicit opt-in) |
| Formspree | Contact form relay | Whatever user submits in contact | Consent |
| Anthropic | LLM calls for social / blog generation | None (prompts are about content, not users) | N/A (no PII processed) |
| Nano Banana | Image generation for blog + social | None | N/A |
| DataForSEO | Amazon rating scraping | None (public product data) | N/A |
| Meta / Bluesky | Social posting outputs | None (posts are brand content) | N/A (terms of service) |

**Rule:** Adding any provider that processes user PII requires: (a) entry in V-B Personal Data Inventory, (b) update to `src/pages/[lang]/privacy.astro`, (c) DPA (Data Processing Agreement) on file, (d) entry in this table.

---

## VII-H: Operations Audit Checklist

### Secrets & config
- [x] `.env.example` matches the current env var inventory (`NANO_BANANA_API_KEY`, Better Stack, and Sentry vars included)
- [ ] No secret committed to the repo (grep for known key prefixes; verify `.gitignore`)
- [ ] `SUPABASE_SERVICE_ROLE_KEY` used only in server-side code paths (audit `grep`)
- [ ] Every GitHub Actions workflow uses the minimum set of secrets it needs
- [ ] Secret rotation schedule documented and followed

### Deployment
- [x] Vercel production branch is `main`
- [x] Preview deploys enabled for non-`main` branches
- [ ] Rollback procedure (Vercel deployment promote) tested at least once
- [ ] Destructive migrations gated by explicit snapshot capture step

### Observability
- [x] Sentry SDK integrated with PII scrubbing (`sentry.client.config.ts`, `sentry.server.config.ts`)
- [ ] Sentry DSN configured in Vercel production env (`PUBLIC_SENTRY_DSN` / optional `SENTRY_DSN`)
- [x] Uptime probe on home pages + one API endpoint (temporary API monitor target: `/api/me/`)
- [ ] Vercel Cron and GitHub Actions failures trigger the same on-call channel (cron done, GitHub Actions pending)

### Backup & DR
- [ ] Supabase PITR enabled (dashboard check)
- [ ] DB restore runbook documented in repo
- [ ] DB restore drill performed within the last 12 months
- [ ] RPO and RTO declared and tracked

### Supply chain
- [x] Branch protection on `main` enabled (force-push/delete blocked, conversation resolution required)
- [x] Dependabot alerts and automated security fixes enabled
- [ ] `npm audit` shows zero high/critical vulnerabilities at release time

---

---

# SECTION VIII — ACCESSIBILITY

> **Reference standard:** WCAG 2.2 Level AA, European Accessibility Act (EAA, in effect since June 2025), EN 301 549.
>
> Bilingual kids-focused content with adult account holders means accessibility is both a legal obligation (EU) and a UX necessity (caregivers using the site one-handed, in noisy environments, on older devices).

---

## VIII-A: Current Accessibility Baseline (shipped)

Verified by grep against `src/**` (April 2026):

| Pattern | Implementation | Files |
|---|---|---|
| Skip link | `BaseLayout.astro` emits `<a class="skip-link" href="#contenido-principal">` on every page | `src/layouts/BaseLayout.astro` |
| Tab interfaces | `role="tablist"`, `role="tab"`, `aria-selected`, `aria-controls`, `aria-labelledby` | `src/pages/[lang]/profile.astro` |
| Radio groups | `role="radiogroup"` + `role="radio"` | `src/pages/[lang]/peanuts.astro` |
| Listboxes | `role="listbox"` + `role="option"` | `src/pages/[lang]/reviews.astro` |
| Live regions | `role="status"` + `aria-live="polite"` | `profile.astro`, `reviews.astro` |
| Accessible names | `aria-label` on icon-only buttons, rotate controls, star-rating buttons | `reviews.astro`, `ChubbyChat.astro` |
| Decorative images | `alt=""` on review thumbnails and icon images | `reviews.astro`, `BaseLayout.astro` |
| Reduced motion | `@media (prefers-reduced-motion: no-preference)` gating animations | `profile.astro` (3 occurrences) |
| Language attribute | `<html lang={lang}>` set per route | `BaseLayout.astro` |
| Bilingual hreflang | Emitted on every page (see IV-E) | `BaseLayout.astro` |

The code is in decent shape. The doc has simply never acknowledged it.

---

## VIII-B: Targets & Invariants

| Target | Rule |
|---|---|
| WCAG level | **AA** on all public pages |
| Color contrast | Body text \u2265 4.5:1, large text \u2265 3:1 |
| Keyboard operability | Every interactive control reachable and usable with Tab / Shift+Tab / Enter / Space / Arrow keys |
| Focus visibility | Every focusable element has a visible focus style (no `outline: none` without replacement) |
| Motion | Respect `prefers-reduced-motion: reduce` on every animation (including view transitions) |
| Forms | Every input has an associated `<label>`. Errors announced via `aria-live`. |
| Media | All meaningful images have descriptive `alt`. Decorative images use `alt=""`. Videos (if ever added) ship with captions. |
| Language | Page language declared on `<html lang>`. Inline lang changes wrapped with `lang=\"...\"` where languages mix. |
| Headings | Logical heading outline; no skipped levels (`h1 \u2192 h2 \u2192 h3`). |
| Touch targets | Minimum 44\u00d744 CSS pixels for primary interactive elements. |

---

## VIII-C: Known Gaps & Audit Items

These are either unverified or need explicit auditing before a WCAG AA claim can be made:

1. **Automated contrast audit.** No tool in CI. Recommend running `axe-core` or Pa11y periodically against the production URL.
2. **Keyboard path on Chubby chat.** Focus trap inside the open chat widget is not verified. When the widget opens, focus should move into it; when closed, focus should return.
3. **View Transitions + screen readers.** `<ClientRouter />` SPA navigation may not announce page changes. Consider an `aria-live` \"page loaded\" announcement on `astro:after-swap`.
4. **`prefers-reduced-motion` coverage.** Confirmed in `profile.astro`. Not confirmed across all pages that animate (homepage hero, coloring-corner interactions, badge strips).
5. **Form error announcements.** Confirm every form error message is inside an `aria-live=\"polite\"` region (not just displayed).
6. **Language switch.** When the user switches EN\u2194ES, the `lang` attribute changes correctly, but any persistent components (Chubby chat, open modals) should re-render or update their language attribute.
7. **Dark mode contrast.** The auto dark mode in `BaseLayout.astro` uses `#1a1613` / `#f6f1e7` theme colors. Contrast ratios in dark mode have not been measured.

---

## VIII-D: Legal Framing \u2014 European Accessibility Act

EAA applies to private-sector e-commerce and consumer digital services sold in the EU. Little Chubby Press is currently an ad-free, no-payments platform. Strict EAA applicability is debatable until commercial flows are introduced, but:

- Books are sold via third-party Amazon links (EAA does not transfer to us).
- Newsletter and community features are free services with EU users. Good-faith WCAG AA is the safest posture.
- If a paid feature (premium downloads, subscription, checkout) ever ships in the EU, EAA conformance becomes explicit and a formal accessibility statement must be published.

Maintain WCAG AA now; formalize the accessibility statement at that trigger.

---

## VIII-E: Accessibility Audit Checklist

### Shipped (verified)
- [x] Skip link on every page
- [x] `role` + `aria-*` attributes on tabs, radios, listboxes, live regions
- [x] `alt` present on all `<img>` (decorative or meaningful)
- [x] `prefers-reduced-motion` respected in at least one key surface (`profile.astro`)
- [x] `lang` attribute set per route

### To audit
- [ ] Automated WCAG AA scan (axe-core or Pa11y) clean on: home, blog article, book detail, coloring-corner, profile, peanuts, reviews, lottery
- [ ] Keyboard-only walkthrough on every top-level public page
- [ ] Focus visible on every focusable element (no `outline: none` without replacement)
- [ ] Color contrast verified in both light and dark modes
- [ ] `prefers-reduced-motion` honored on every animation (hero, badges, coloring-corner, view transitions)
- [ ] Chubby chat focus management (focus in when opened, focus return when closed)
- [ ] View Transitions announce page changes to screen readers (post-`astro:after-swap`)
- [ ] Form errors announced via `aria-live` regions
- [ ] Every form input has an associated `<label>`
- [ ] Touch targets \u2265 44\u00d744 CSS px on mobile
- [ ] No meaningful content conveyed by color alone

---

---

# APPENDIX A — MASTER AUDIT CHECKLISTS

> Consolidated view of all section checklists. Run this full checklist monthly or before major releases.
>
> **Source of truth:** This appendix mirrors the checklists in Sections I–VIII. If anything here disagrees with a section checklist, the section is authoritative. Update both in the same pass.

## A.1 Security (mirrors I-E)

### Authentication
- [ ] Cookie flags verified: `httpOnly=true`, `sameSite=lax`, `secure=true` in production
- [ ] No JWT or session tokens in localStorage or sessionStorage
- [ ] Confirm `ADMIN_EMAILS` array in `src/lib/supabase.ts` still matches intended admins (primary fast path — DB flag not reached for these emails)
- [ ] Service client (`getServiceClient()`) not reachable from any non-admin endpoint
- [ ] All admin POST endpoints validate `Origin` header

### Database
- [ ] RLS enabled on all tables (verify in Supabase dashboard)
- [ ] Review update policy restricted to allowed columns only
- [ ] All peanut/ticket RPCs use advisory locks (grep for `pg_advisory_xact_lock`)
- [ ] `lottery_winners` UNIQUE constraint on `(user_id, month)` in place
- [ ] Lottery draw uses `crypto.getRandomValues()` not `Math.random()`
- [ ] `peanut_balance` sanity check (flag ≥ 10,000) active

### API Endpoints
- [ ] Every mutating endpoint calls `check_rate_limit` RPC (not a direct DB query)
- [ ] `touch-streak.ts` — rate limiting added and GET handler removed
- [ ] `subscribe-newsletter.ts` — per-user rate limit in place (not just global throttle)
- [ ] `share-reward.ts` — migrated to standard `check_rate_limit` RPC
- [ ] Every mutating endpoint only accepts POST/PUT/PATCH — no GET-triggered mutations
- [ ] Every cron endpoint validates `CRON_SECRET`
- [ ] No endpoint uses service client without admin verification
- [ ] Input length validation on all text fields
- [ ] HTML escaping applied to all user content inserted into emails
- [ ] `validateOrigin()` applied to all `/api/*` POST endpoints (or deviation documented)

### HTTP Headers
- [ ] HSTS: `max-age=63072000; includeSubDomains; preload` in `vercel.json`
- [ ] CSP directive present and includes `object-src 'none'` and `frame-ancestors 'none'`
- [ ] X-Frame-Options: DENY
- [ ] X-Content-Type-Options: nosniff
- [ ] Referrer-Policy: strict-origin-when-cross-origin
- [ ] Permissions-Policy denies camera, microphone, geolocation

### Child Safety
- [ ] No public display of children's names or faces
- [ ] No direct messaging between users
- [ ] Art upload pipeline requires moderation before publish
- [ ] Age-gated features enforced at DB / policy level, not client-side

## A.2 Performance (mirrors II-H)

### LCP
- [ ] Hero image on each key page uses AVIF or WebP format
- [ ] Hero image has `fetchpriority="high"` attribute
- [ ] Hero image has `decoding="async"` attribute
- [ ] Hero image has explicit `width` and `height` attributes
- [ ] NO `loading="lazy"` on LCP element
- [ ] `<link rel="preload" as="image">` in `<head>` for LCP image
- [ ] LCP element is NOT a CSS `background-image`
- [ ] TTFB < 800ms for static pages (check Vercel speed insights)

### INP
- [ ] Only critical above-fold components use `client:load`
- [ ] No synchronous heavy computation in event handlers
- [ ] Third-party scripts loaded with `async` or `defer`
- [ ] No new `client:load` directives added without justification

### CLS
- [ ] All static `<img>` tags have `width` and `height` attributes
- [ ] Client-side generated img tags (`index.astro` ~128, `coloring-corner` ~196) have width/height added
- [ ] All iframes have explicit dimensions
- [ ] Font loading uses `font-display: swap` or `optional`
- [ ] No content injected above existing content on load
- [ ] Cookie banners / toasts use fixed positioning (not document flow)

### View Transitions
- [ ] Verify Vercel Analytics page view counts match actual traffic (View Transitions may suppress post-navigation tracking)
- [ ] Any new tracking script in `BaseLayout.astro` uses `astro:after-swap` event or is verified to support View Transitions natively

### General
- [ ] Mobile Lighthouse score ≥ 90 on SSG pages (home, coloring library, book catalog) — **manual check**, no Lighthouse CI exists today
- [ ] SSR pages (profile, gallery, lottery) benchmarked separately — account for serverless cold start
- [ ] New dependencies assessed for bundle size impact before merge
- [ ] `@vercel/speed-insights` still installed and active
- [ ] Cache-Control headers verified for static assets (immutable on `/_astro/*` and `/images/*`)
- [ ] No authenticated responses reaching CDN cache

## A.3 Business Logic (mirrors III-G)

### Economy
- [ ] Peanut velocity dashboard shows earn ≈ spend (±15%)
- [ ] No user has balance ≥ 10,000 without admin review
- [ ] All earn actions have idempotent `reason` constraint
- [ ] Referral cap (20/month/user) enforced
- [ ] All rate limits verified and active on every economy endpoint

### Lottery
- [ ] Draw uses `crypto.getRandomValues()` (grep codebase to confirm)
- [ ] `UNIQUE(user_id, month)` constraint on `lottery_winners`
- [ ] CRON_SECRET validated on `/api/cron/monthly-draw`
- [ ] `lottery_draw_log` receives entry for every draw
- [ ] Admin panel shows draw history

### Purchases
- [ ] All purchase flows use DB functions (not multi-query sequences)
- [ ] Advisory locks present in all peanut/ticket RPCs
- [ ] No purchase endpoint trusts client-sent balance values
- [ ] Ownership verified before boost/badge operations

### Roles & Consent
- [ ] `is_admin` check reads from DB on every admin page
- [ ] Parental consent (`profiles.parent_consent_at`) captured at registration + legacy soft-banner path
- [ ] Service client never used in non-admin endpoints

## A.4 Discoverability (mirrors IV-G)

### AI Crawlability
- [ ] `public/llms.txt` exists with brand guidelines and attribution policy
- [ ] `robots.txt` explicitly allows GPTBot, ClaudeBot, PerplexityBot on public paths
- [x] `robots.txt` blocks `/admin/`
- [ ] `robots.txt` blocks `/api/` (currently only excluded from sitemap, not from crawlers)
- [x] All public content is visible in raw HTML — SSG baseline (`output: 'static'`)
- [x] Sitemap covers all public pages in EN and ES (`@astrojs/sitemap` with `/admin/` + `/api/` filter)
- [x] RSS feeds (`/rss.xml`, `/rss-es.xml`) advertised on every page
- [x] `noindex` applied to auth, admin, and per-user dynamic pages

### Structured Data
- [x] `Organization` schema on every page (from `BaseLayout.astro`)
- [x] `WebSite` schema on every page
- [x] `BreadcrumbList` schema on pages with breadcrumbs
- [x] `Article` schema on blog posts that pass `articleSchema` prop
- [x] `ItemList` + `Book` + `AggregateRating` on the books index
- [ ] `Book` / `Offer` / `AggregateRating` on individual book detail pages (audit)
- [ ] `FAQPage` schema where FAQ sections exist
- [ ] `CreativeWork` / `ImageObject` per coloring page
- [ ] `Event` / `Offer` for lottery / giveaway
- [ ] `SearchAction` on `WebSite` (home)
- [ ] Validate all schemas via Google Rich Results Test

### Bilingual SEO
- [x] `hreflang` tags emitted on every page (current lang + alternate + `x-default`)
- [x] `rel=canonical` emitted on every page
- [ ] No duplicate content without canonicalization (audit)
- [ ] EN and ES blog articles are parallel content (same topic, not machine translation)

### Content Quality
- [ ] Blog article headings use interrogative natural language format
- [ ] Articles have clear intro that answers the core question in first paragraph
- [ ] Author attribution present on blog articles
- [ ] External sources cited where claims are made

## A.5 Legal (mirrors V-G)

### GDPR
- [x] Privacy policy has `lastUpdated` tracked and refreshed bi-weekly per `docs/LEGAL_MAINTENANCE.md`
- [ ] Privacy policy lists ALL current data processing activities (review on next bi-weekly cycle)
- [ ] Marketing consent (newsletter) is opt-in, separate, not pre-checked on every signup/profile surface
- [x] Cookie banner accurately reflects zero tracking-cookies stance (`src/components/CookieConsent.astro`)
- [x] Data export endpoint shipped (`/api/export-my-data`)
- [ ] Data export returns complete and portable format (JSON) — verify output covers every PII table
- [x] Account deletion endpoint shipped (`/api/delete-account`)
- [ ] Account deletion cascade removes all PII (verify every table referencing `user_id` is cleaned)
- [x] Newsletter unsubscribe shipped (`/api/unsubscribe`) — Buttondown applies immediately
- [x] Parental consent captured (`profiles.parent_consent_at`) via registration checkbox + legacy soft banner

### Child Safety
- [x] No direct accounts for users under 18 (enforced at Terms layer)
- [x] No marketing to minors — newsletter subscribers are adult account holders only
- [ ] EXIF stripped from all image uploads (audit: confirm in upload pipeline)
- [x] Moderation pipeline in place for user-generated content (admin gallery approval)
- [ ] If an age gate or child sub-profile is ever added, implement verifiable parental consent (VPC) before launch

### Agents & Data
- [ ] Chubby agent does not store conversation PII beyond session
- [ ] Social agents do not access user PII tables
- [ ] Agent actions logged with purpose (audit trail)

## A.6 Agents (mirrors VI-F)

- [x] Chubby agent cannot access user PII tables — client-side only, never touches Supabase
- [x] Chubby agent cannot execute economy mutations — no write access to any system
- [x] All Vercel Cron endpoints validate `Authorization: Bearer ${CRON_SECRET}` (6/6)
- [x] Social posting queue is reviewed against Brand Voice Guide before commit (SOP)
- [ ] Every cron job's idempotency guard has been verified in code (per-table audit)
- [ ] `social-engage.yml` replies are restricted to an approved template set (audit implementation)
- [ ] `daily-blog-post.yml` output sampled monthly for Brand Voice Guide compliance
- [ ] No agent operating at Level 3+ without documented guardrails
- [ ] Agent actions that process user data are logged with reasoning (currently no agent processes user PII — maintain this invariant)
- [ ] If Chubby is ever upgraded to an LLM backend, complete VI-B upgrade requirements BEFORE deployment

---

---

# APPENDIX B — TECHNICAL GLOSSARY

Terms from the operational guide applied to the Little Chubby Press context.

**Advisory lock** — A PostgreSQL mechanism that prevents two concurrent DB transactions from executing the same operation simultaneously. Used in all peanut/ticket RPCs to prevent race conditions and double-spending.

**AEO (Answer Engine Optimization)** — Optimizing content so that AI-powered answer engines (Perplexity, ChatGPT Search, Google AI Overviews) can ingest, summarize, and cite it in their responses.

**Argon2id** — The OWASP 2026 recommended algorithm for password hashing. Memory-hard (19 MiB minimum), resistant to GPU brute-force attacks. Currently not used (Supabase GoTrue uses bcrypt). Document for future auth provider evaluation.

**CLS (Cumulative Layout Shift)** — Core Web Vital measuring unexpected visual content shifts during page load. Target: ≤ 0.1.

**CSA Autonomy Levels** — Cloud Security Alliance framework defining 6 levels of AI autonomy (0 = full human control, 5 = full AGI autonomy). All Little Chubby Press agents operate at Level 1–2.

**E-E-A-T** — Experience, Expertise, Authority, Trust. Google and LLM signals used to evaluate content credibility. High E-E-A-T = more likely to be cited in AI search summaries.

**GEO (Generative Engine Optimization)** — The practice of structuring content so that Large Language Models (LLMs) can accurately discover, understand, and cite it.

**Guardrail** — A hard-coded constraint that limits what an AI agent can do. Examples: "Chubby can only answer brand questions" or "social agents cannot post without human review."

**INP (Interaction to Next Paint)** — Core Web Vital measuring response latency for all user interactions across the page's lifetime. Target: ≤ 200ms.

**Islands Architecture** — Astro's approach to hydration. Pages are served as static HTML; interactive "islands" of JavaScript hydrate independently. Minimizes main-thread blocking.

**LCP (Largest Contentful Paint)** — Core Web Vital measuring time for the largest visible element to render. Target: ≤ 2.5 seconds.

**llms.txt** — Emerging 2026 web standard. A plain-text file at the domain root that defines how AI models may consume, summarize, and attribute a site's content.

**NIST SP 800-63B** — US National Institute of Standards and Technology guidelines for digital identity. 2026 revision abolishes forced password complexity and rotation requirements.

**OWASP** — Open Web Application Security Project. Provides the definitive cheat sheets for web application security (authentication, password storage, CSP, etc.).

**Peanuts (🥜)** — Little Chubby Press virtual currency. Earned through engagement actions (reviews, streaks, shares, referrals). Spent on cosmetics, lottery entries, and download credits.

**Privacy by Design** — Architectural principle requiring that data privacy be built into system design from the start, not added afterward. Every new feature must pass the data minimization and purpose limitation test.

**RLS (Row Level Security)** — PostgreSQL feature enforced by Supabase. Database-level access control that ensures users can only read/write rows they are authorized to access. Cannot be bypassed by application bugs.

**RPC (Remote Procedure Call)** — In the Supabase context: a PostgreSQL function callable via the Supabase client. Used for all atomic economy operations to ensure transactional integrity.

**SOAR** — Security Orchestration, Automation, and Response. Enterprise security framework unifying threat detection, incident response, and remediation. Aspirational for future phase when monitoring scale justifies it.

**SOP-first** — Design philosophy where AI agents operate according to explicit Standard Operating Procedures, reducing probabilistic LLM output variance in production environments.

**SRI (Subresource Integrity)** — Browser security feature allowing verification that external resources (CSS, JS) haven't been tampered with. Implemented via `integrity` attribute with hash.

**SSG (Static Site Generation)** — Astro's `output: 'static'` mode. All pages pre-built at deploy time and served from CDN. Optimal for performance and LLM crawlability. Little Chubby Press's current and permanent output mode.

**TTFB (Time to First Byte)** — Time from browser request to first byte received from server. Target: ≤ 800ms. With SSG + Vercel CDN, typically < 100ms.

**Zero Trust (for agents)** — Security model that treats every AI agent as a potential attack surface. Applies principle of least privilege: agents get the minimum access necessary for their specific task.

---

*This document is maintained in `docs/APP_MASTER_QUALITY_REFERENCE.md`. Update when the stack changes, when a new security audit is completed, or when a new major phase ships. Never delete sections — supersede with dated updates.*

*Cross-reference: See `MASTER_VISION_MUST_HAVE_APP.md` for product strategy, `PEANUTS_ECONOMY_MASTER_PLAN.md` for economy detail, `ADMIN_SECURITY_AUDIT.md` for historical security fixes, `LEGAL_MAINTENANCE.md` for bi-weekly legal review checklist.*
