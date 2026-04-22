# Record of Processing Activities (RoPA) — GDPR Art. 30

> **Internal-only** document. Do NOT publish. This is the controller's record
> of processing as required by Article 30 of the GDPR. Keep in sync with
> `src/pages/[lang]/privacy.astro` so the public policy and this internal
> ledger never disagree.

---

## 1. Controller

- **Name:** Little Chubby Press (solo operator — Ivan C.)
- **Contact email:** hello@littlechubbypress.com
- **Website:** https://littlechubbypress.com
- **Established:** 2026 (active development)
- **DPO:** Not required (no large-scale monitoring, no special categories).
  Controller acts as data contact.

## 2. Purposes of processing

| # | Purpose | Legal basis (GDPR Art. 6) |
|---|---|---|
| P1 | Account creation and authentication | 6(1)(b) — contract |
| P2 | Providing the reading / review / gallery features | 6(1)(b) — contract |
| P3 | Newsletter delivery (double opt-in) | 6(1)(a) — consent |
| P4 | Symbolic "peanuts" / tickets economy (no real-money value) | 6(1)(b) — contract |
| P5 | Giveaway draws and winner notification | 6(1)(b) — contract |
| P6 | Security, abuse prevention, rate limiting, suspension | 6(1)(f) — legitimate interest |
| P7 | Aggregated, cookie-free analytics (Vercel) | 6(1)(f) — legitimate interest |
| P8 | Legal / tax record-keeping | 6(1)(c) — legal obligation |

## 3. Categories of data subjects

- Adult account holders (18+, self-confirmed via `profiles.parent_consent_at`)
- Newsletter subscribers (adults)
- Contact-form / email correspondents

We do NOT knowingly collect data about children. Children appear only as
audience of the content consumed by the adult account holder; no child data
is stored.

## 4. Categories of personal data

| Category | Field(s) | Table | Retention |
|---|---|---|---|
| Identity | email | `auth.users`, `profiles.email` | Life of account |
| Profile | display_name, avatar_url, preferences | `profiles` | Life of account |
| Consent | parent_consent_at, newsletter opt-in | `profiles`, `newsletter_subscribers` | Life of account / opt-out + 30d |
| Content | reviews, gallery uploads, forum posts | `reviews`, `gallery_*`, `forum_*` | Life of account (user can delete) |
| Economy | peanuts/tickets ledger | `credit_transactions` | Life of account + 12 months |
| Security | rate-limit counters, suspension flag | `rate_limits`, `profiles.suspended` | 90 days rolling |
| Analytics | aggregated page views (no cookies, no PII) | Vercel Web Analytics | 30d (Hobby) / 12mo (Pro) |

## 5. Recipients / processors

| Processor | Purpose | Location | DPA status |
|---|---|---|---|
| Supabase | Database, auth, storage | Frankfurt (eu-central-1) | Standard DPA accepted |
| Vercel | Hosting, edge functions, analytics | EU + US (edge) | Standard DPA accepted |
| Resend | Transactional + newsletter email | EU + US | Standard DPA accepted |
| Google Fonts | Font delivery (self-hosted copies preferred) | Global CDN | No personal data sent |
| Amazon Associates | Outbound book links (user clicks out) | Global | User leaves our site; Amazon controller after click |

## 6. Transfers outside the EEA

- Vercel and Resend may route traffic through US regions. Both provide
  SCCs (Standard Contractual Clauses) under their default DPAs.
- No transfers to jurisdictions without an adequacy decision or SCCs.

## 7. Retention schedule

- Inactive accounts: No auto-deletion. Users can self-delete via
  Profile → Security → Danger zone (calls RPC `delete_user_account`).
- Post-deletion: `auth.users` removal cascades through all user-owned
  tables. `newsletter_subscribers` row removed by email match.
- Aggregated analytics: 30d rolling (Vercel Hobby plan at time of writing).
- Security logs: 90d rolling.

## 8. Technical & organisational measures

- TLS everywhere (Vercel edge, Supabase REST/WebSocket).
- Row Level Security enforced on every user-scoped Supabase table.
- All DEFINER functions run with `SET search_path = ''` and
  `REVOKE public/anon + GRANT authenticated`.
- Secret keys live only in environment variables; never committed.
- Rate limiting on credit-affecting actions via `check_rate_limit` RPC.
- Signup checkbox (hard block) + retroactive banner for parental consent.
- No plaintext passwords stored (Supabase manages hashes).
- Backups: Supabase daily snapshots, retention per plan.

## 9. Data subject rights fulfilment

| Right | How it is fulfilled | Endpoint |
|---|---|---|
| Access | "Download my data" button | `/api/export-my-data` |
| Erasure | "Delete my account" danger zone | `/api/delete-account` |
| Rectification | Profile edit screen | Profile page |
| Object / withdraw consent | Newsletter unsubscribe link; account delete | Email footer / Profile |
| Portability | JSON export covers all user-scoped tables | `/api/export-my-data` |
| Complaint | AEPD (ES), CNIL (FR), Garante (IT), DPC (IE) | Public authorities |

## 10. Change log

| Date | Change | Author |
|---|---|---|
| 2026-04-22 | Initial stub created (gap #7 closure) | Ivan C. |

---

**Next review:** Every bi-weekly legal review (same cadence as
`LEGAL_MAINTENANCE.md`). Flesh out sections before public launch or 250-user
threshold, whichever comes first.
