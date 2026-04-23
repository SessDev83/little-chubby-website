# Little Chubby Press — App Reference Base

> **Single source of truth** for product strategy, brand voice, operational playbooks, and security posture of the Little Chubby Press app. Every new feature should be aligned with the plans below before touching code.

---

## 📚 Index

### 🎯 Vision & master plans
- [MASTER_VISION_MUST_HAVE_APP.md](./MASTER_VISION_MUST_HAVE_APP.md) — **North Star**: becoming the must-have international app for coloring and bedtime-story families.
- [PEANUTS_ECONOMY_MASTER_PLAN.md](./PEANUTS_ECONOMY_MASTER_PLAN.md) — Original peanut economy plan (Phases A–E, shipped).
- [PEANUTS_SHOP_2.0_COMMUNITY_EXPANSION.md](./PEANUTS_SHOP_2.0_COMMUNITY_EXPANSION.md) — Phase F: visibility surfaces + expanded cosmetic catalog.

### 📣 Growth, voice & content
- [GROWTH_CONTENT_PLAYBOOK.md](./GROWTH_CONTENT_PLAYBOOK.md)
- [CONTENT_CALENDAR_30_DAYS.md](./CONTENT_CALENDAR_30_DAYS.md)
- [BRAND_VOICE_GUIDE.md](./BRAND_VOICE_GUIDE.md)
- [SOCIAL_AGENTS_MASTER_PLAN.md](./SOCIAL_AGENTS_MASTER_PLAN.md)
- [CHUBBY_AGENT_REFERENCE.md](./CHUBBY_AGENT_REFERENCE.md)

### 🏆 Master Quality Reference
- [APP_MASTER_QUALITY_REFERENCE.md](./APP_MASTER_QUALITY_REFERENCE.md) — **5-star audit document**: Security (NIST/OWASP), Performance (Core Web Vitals 2026), Business Logic invariants, Discoverability (GEO/AEO/llms.txt), Legal (GDPR/AEPD/COPPA), Agents. Single point of truth for quality audits and future implementation validation.

### 🛡️ Admin, ops & security
- [ADMIN_PANEL_MASTER_PLAN.md](./ADMIN_PANEL_MASTER_PLAN.md)
- [ADMIN_SECURITY_AUDIT.md](./ADMIN_SECURITY_AUDIT.md)
- [DEPLOY_CHECKLIST.md](./DEPLOY_CHECKLIST.md)

### ⚖️ Legal & user-facing explainers (bi-weekly review)
- [LEGAL_MAINTENANCE.md](./LEGAL_MAINTENANCE.md) — Bi-weekly checklist for privacy policy + FAQ + contact. Tracks gaps (age gate, self-serve deletion, ToS) against the master plan.

### 📎 Also at repo root (GitHub convention)
- `README.md` — public-facing repo readme
- `SECURITY.md` — GitHub security policy

---

## 🧭 How to use this folder

1. **Before any new feature** — read the relevant master plan. If it's a peanut/community feature, start at `MASTER_VISION_MUST_HAVE_APP.md` → then the phase plan that matches.
2. **When a plan ships** — update the "Shipped" section of the matching doc + the repo memory file `/memories/repo/peanuts-economy-shipped.md`.
3. **Never delete** a master plan. Supersede it with a new dated section if the strategy changes.
4. **Keep technical invariants** (DB migrations, API patterns, i18n parity) documented in the plan that introduces them — they become the non-negotiable baseline for the next plan.
