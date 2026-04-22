# Legal & FAQ Maintenance

> **Policy:** While the app is in active development, we review the public-facing
> legal and explainer pages **every 2 weeks**. When anything in the product
> changes that affects data collection, user flows, or monetization, update
> these pages in the same PR as the feature change.

## Pages owned by this schedule

| Page | Path | Source |
|---|---|---|
| Privacy policy | `/es/privacy/`, `/en/privacy/` | [src/pages/[lang]/privacy.astro](../src/pages/%5Blang%5D/privacy.astro) |
| Terms &amp; conditions | `/es/terms/`, `/en/terms/` | [src/pages/[lang]/terms.astro](../src/pages/%5Blang%5D/terms.astro) |
| FAQ | `/es/faq/`, `/en/faq/` | [src/pages/[lang]/faq.astro](../src/pages/%5Blang%5D/faq.astro) |
| Contact | `/es/contact/`, `/en/contact/` | [src/pages/[lang]/contact.astro](../src/pages/%5Blang%5D/contact.astro) |

## Bi-weekly checklist (every other Monday)

1. **Last-updated date** — bump `lastUpdatedES` / `lastUpdatedEN` constants in
   `privacy.astro`, `terms.astro` AND `faq.astro` to today's date in both languages.
2. **Third-party providers** — confirm the list matches reality (currently
   Supabase, Vercel, Resend, Google Fonts, Amazon link-outs). If a new
   integration was shipped (e.g. Stripe, PostHog, Sentry, a new email provider),
   add it to both privacy §5 and FAQ.
3. **New Supabase tables / APIs** — any table that stores user data must be
   covered by privacy §2.2 (automatic collection) or §2.1 (voluntary).
4. **New cookies / localStorage keys** — update privacy §6 if a new key is set.
5. **Age gate / COPPA** — if we ever ship an age gate or parental-consent flow,
   rewrite privacy §8 accordingly.
6. **FAQ alphabetical order** — FAQ **must** remain sorted A→Z in both
   languages. When adding new Q&A, insert in alphabetical position in `faqES`
   and `faqEN` arrays (parity is enforced by code comment).
7. **i18n parity** — any new text must exist in both `es:` and `en:` blocks of
   `src/data/i18n.ts`. Run `grep -c "^\s*\w\+:" src/data/i18n.ts` to spot-check.
8. **Build clean** — `Remove-Item -Recurse -Force dist, .vercel/output; npm run build`
   must pass before pushing.

## Trigger events that require an IMMEDIATE update (not waiting 2 weeks)

- New payment processor added → privacy §5, FAQ "Do you pay real money..."
- New analytics / tracking tool → privacy §2.3 + §6, FAQ "What cookies..."
- Age gate or COPPA flow shipped → privacy §8 rewritten, new FAQ entry
- Data retention policy change → privacy §10
- New user-visible data field in `profiles` → privacy §2.1
- New table capturing user actions → privacy §2.2
- New email type sent to users → privacy §3 + FAQ "How do I unsubscribe..."
- New international market (IT, PT, FR) → add language parity pass + privacy §12

## Gaps logged for the master plan

Tracked in [MASTER_VISION_MUST_HAVE_APP.md](./MASTER_VISION_MUST_HAVE_APP.md)
under the Risk Register. Short list today (April 22, 2026):

1. **No age verification** — app explicitly targets families with kids 3–18.
   COPPA requires verifiable parental consent for direct data collection from
   under-13s. Currently only a text disclaimer in privacy §8 and FAQ. Should
   design an opt-in "I am a parent, my child is X years old" gate.
   _Status:_ ✅ **SHIPPED** (migration 052 + commit pending). Adopted a
   **minimal, privacy-first** design: one checkbox "I'm 18+ and the adult
   managing this account" at signup (hard block) and a **soft non-blocking
   banner** on authenticated pages for legacy users (retroactive). We do NOT
   collect any child data (no name, no age, no birth year). Only
   `profiles.parent_consent_at timestamptz` is stored. FAQ entry and privacy
   §6 updated to match.
2. **"Delete my account" self-service** — ✅ **SHIPPED** (commit e9c3372,
   migration 051). Danger zone in Profile → Security with email-typed
   confirmation; calls RPC `delete_user_account` which deletes `auth.users`
   (cascades through profiles and all user-owned tables) plus
   `newsletter_subscribers` by email.
3. **"Download my data" self-service** — ✅ **SHIPPED** (commit 906cc4b).
   `/api/export-my-data` returns a single JSON with 17 user-scoped tables;
   button lives in Profile → Security → "Privacy &amp; data".
4. **Terms of Service page** — ✅ **SHIPPED**. `/es/terms/` and `/en/terms/`
   with 12 sections (acceptance, eligibility, community rules, symbolic
   peanuts/tickets, user content license, giveaways, suspension,
   limitation of liability, governing law, changes, contact). Footer link
   added.
5. **Cookie banner lacks granular control** — Current banner is single-tier
   because we only set **essential cookies** (Supabase auth `sb-access-token`,
   `sb-refresh-token`, `sb-logged-in`) plus localStorage keys for UI
   preferences (`lcp-cookies`, lang). Under EU guidance, essential cookies
   do not require opt-in, so a single "Accept" button is compliant today.
   _Status:_ **intentional until non-essential tracking is added.** Trigger
   to upgrade: shipping PostHog, Mixpanel, Google Analytics, Meta Pixel,
   Sentry session replay, or any marketing/advertising cookie. At that
   point we must split into categories (essential / analytics / marketing)
   with per-category toggles and a "Reject all" button.
6. **Retention logs for analytics** — We use Vercel Web Analytics
   (cookie-free, aggregated) and Vercel Speed Insights (cookie-free, client
   performance). Both are GDPR-compliant and **do not store personal data**.
   Vercel's retention on the Hobby plan is **30 days rolling**; on Pro plans
   up to 12 months. Confirm current plan in the Vercel dashboard
   (Project → Analytics) and update this line if we upgrade. Our Supabase
   `rate_limits` and `credit_transactions` tables hold user-scoped logs
   indefinitely — covered by privacy §8.
   _Status:_ **documented**. Action: on every bi-weekly review, eyeball the
   Vercel Analytics panel and record the retention in effect here.
7. **No DPA / Record of Processing Activities** — Required under GDPR art. 30
   once we cross 250 users or process special-category data. Internal-only
   document (not published to users). A stub lives at
   [docs/TOS_RECORD_OF_PROCESSING.md](./TOS_RECORD_OF_PROCESSING.md) and
   must be fleshed out **before** public launch or before the 250-user
   threshold, whichever comes first.
   _Status:_ **stub added** (this commit). Next action: fill data-flow
   diagrams when we finalize Stripe integration.
8. **No cookie policy page separate from privacy** — Some EU jurisdictions
   (ES, FR, IT) prefer a dedicated cookie page. Today we fold cookies into
   privacy §4 ("Cookies") which meets the baseline requirement. Low
   priority while we use only essential cookies.
   _Status:_ **intentional**. Trigger to create a standalone page: same
   trigger as #5 (non-essential tracking added). When that happens, create
   `src/pages/[lang]/cookies.astro`, link it from the Footer alongside
   Privacy/Terms, and update the cookie banner "Learn more" link.

## How to update FAQ content

```text
1. Open src/pages/[lang]/faq.astro
2. Locate faqES or faqEN arrays
3. Insert new { q, a } in alphabetical position (code sorts at render time too,
   but keep source order alphabetical for readability)
4. Mirror the entry in the other language array
5. Bump lastUpdated date
6. Build + test at /es/faq/ and /en/faq/
```

## Commit message convention

```
docs(legal): bi-weekly review YYYY-MM-DD — <summary of changes>
```

Example: `docs(legal): bi-weekly review 2026-05-06 — add PWA install question, note new Sentry integration in privacy`
