# Growth Content Playbook — Organic Social (90-Day Sprint)

**Version:** 1.0 — April 20, 2026  
**Horizon:** 90 days (April 20, 2026 → July 19, 2026)  
**Scope:** Organic social content only (Instagram, Facebook, Bluesky). Engagement automation is out of scope — see `SOCIAL_AGENTS_MASTER_PLAN.md` Phase 3.  
**Status:** ACTIVE — Authoritative source for content strategy, cadence, agent prompts, QA rules, and measurement during the sprint.  
**Depends on:** `BRAND_VOICE_GUIDE.md` (voice), `CHUBBY_AGENT_REFERENCE.md` (features), `SOCIAL_AGENTS_MASTER_PLAN.md` (governance and incidents).  
**Supersedes for the 90-day window:** cadence and content-mix sections of the master plan.

---

## Table of Contents

1. [North Star & Why This Sprint Exists](#1-north-star--why-this-sprint-exists)
2. [Buyer Personas (Growth Lens)](#2-buyer-personas-growth-lens)
3. [Website Flow — Mapped to Agent Decisions](#3-website-flow--mapped-to-agent-decisions)
4. [The Flywheel We Are Optimizing](#4-the-flywheel-we-are-optimizing)
5. [Content Mix & Post Types](#5-content-mix--post-types)
6. [Per-Platform Cadence & Rules](#6-per-platform-cadence--rules)
7. [Weekly Anchor Calendar](#7-weekly-anchor-calendar)
8. [CTA Hierarchy & Destination Map](#8-cta-hierarchy--destination-map)
9. [UTM & Attribution Spec](#9-utm--attribution-spec)
10. [Agent Training — Prompt Patches](#10-agent-training--prompt-patches)
11. [QA Validator Spec (Deterministic Gate)](#11-qa-validator-spec-deterministic-gate)
12. [Smart-Selector Scoring v2](#12-smart-selector-scoring-v2)
13. [Growth Playbooks (Sprint Tactics)](#13-growth-playbooks-sprint-tactics)
14. [Metrics, Targets & Review Rhythm](#14-metrics-targets--review-rhythm)
15. [Anti-Patterns (Block-List)](#15-anti-patterns-block-list)
16. [Rollout Plan (90 Days)](#16-rollout-plan-90-days)

---

## 1. North Star & Why This Sprint Exists

### The single metric

> **Daily website sessions + daily Peanut-share transactions.**

Every scheduled post, every agent decision, every prompt tweak during the next 90 days is evaluated against that composite metric. Amazon sales are a **lagging indicator** we measure but do not optimize directly during this sprint.

### Why we are not optimizing Amazon sales directly

1. Amazon KDP ads are off the table (budget + ROAS concern).
2. Organic discoverability on Amazon is driven by **reviews and external traffic**, both of which depend on **website audience size first**.
3. The site already has a working share-loop (Peanuts) and review-loop (Tickets → lottery) that, if fed with traffic, compound on their own.
4. Books convert from warm audience, not cold feed. Warm audience is what the next 90 days must produce.

### Success in one sentence

In 90 days, the social system consistently drives traffic to free features on the website, that traffic registers at >20% of visitors, and registered users trigger the share-loop often enough to generate organic referral traffic that meets or exceeds paid-like performance — **without paying for ads**.

---

## 2. Buyer Personas (Growth Lens)

Personas are defined only by **what makes them click, register, and share**. Demographics are secondary.

### Persona A — "Sofia / Sarah" (80% of target traffic)

| Trait | Value |
|---|---|
| Who | Mom, 28-42, 1-3 kids aged 3-10 |
| Income | Mid, price-sensitive, values free-with-purpose |
| Platform residence | Instagram (evening scroll), Facebook (mom groups, sharing with friends/sister), occasional Bluesky |
| Pain point | Screen-time guilt without viable alternatives |
| Share trigger | Content that (a) saves her time, (b) makes her feel like a good mom, (c) makes her laugh |
| Buying pattern | Reads reviews first, buys on Amazon from word-of-mouth, never from ads |
| First site action | Browse Coloring Corner → register when asked to download |
| What NOT to say to her | "Buy now", "Limited offer", anything that smells like marketing |

### Persona B — "Gift-Giver Aunt/Grandma" (15%)

| Trait | Value |
|---|---|
| Who | Adult relative looking for non-plastic, non-screen gifts |
| Platform residence | Facebook primarily |
| Buying pattern | 2-4 purchases/year for birthdays + holidays |
| Share trigger | Gift-idea framing, "creative gift", holiday angles |
| First site action | Browse `/books/` directly |

### Persona C — "Teacher / Homeschool Mom" (5%)

| Trait | Value |
|---|---|
| Who | Educator or homeschooling parent looking for printable resources |
| Amplifier effect | One teacher reaches 20-30 families |
| Platform residence | Facebook groups, Pinterest (future) |
| Share trigger | Free printable + educational benefit framing |
| First site action | Coloring Corner → download → share with peers |

### Persona targeting rules for the agent

- **80% of posts** written for Persona A (default).
- **~15%** explicitly gift-framed (Persona B) — cluster on weekends + seasonal windows (Mother's Day, summer, back-to-school, holidays).
- **~5%** educational-benefit framing that implicitly appeals to Persona C — always includes a free resource link.
- Never write posts that target all three at once. That dilutes the hook.

---

## 3. Website Flow — Mapped to Agent Decisions

The agent must know **which page converts which action** — and pick destinations accordingly.

| Page | Primary user action | Agent should send traffic here when… | KPI it feeds |
|---|---|---|---|
| `/{lang}/coloring-corner/` | Browse free pages → register to download (1 🥜 = 1 download) | Post type: `free-coloring`, Persona A/C, any day | Registrations, downloads |
| `/{lang}/gallery/` | Browse real reviews → share a review link (+1 🥜) | Post type: `community`, `share-earn` referencing gallery highlights | Peanut transactions, social proof |
| `/{lang}/lottery/` | Enter via review (5 🎟️) or buy extra tickets with 🥜 | Post type: `giveaway`, monthly cycle-aware | Reviews submitted, newsletter signups |
| `/{lang}/newsletter/` | Subscribe → unlock ticket purchase + mini-book PDF | Post type: `newsletter` or CTA secondary in other posts | Newsletter confirmed subs |
| `/{lang}/blog/{slug}` | Read article → share or click CTA in footer | Post type: `blog-share` when a new post ships | Blog pageviews, returning visitors |
| `/{lang}/books/` | Browse catalog → Amazon click | Post type: `book-promo` (capped ≤10%) | Amazon clicks (tracked as outbound) |
| `/{lang}/winners/` | View past winners (social proof) | Never a primary destination — support only | Trust signals |
| `/{lang}/peanuts/` | View balance + shop | Post type: `share-earn` educational posts | Economy understanding |
| `/{lang}/about/` | Brand story | Never a social CTA destination during this sprint | — |

### Server-side mechanics the agent must respect

1. **Shares are capped at 3/day/user** ([src/pages/api/share-reward.ts](src/pages/api/share-reward.ts#L10), [src/pages/api/track-share.ts](src/pages/api/track-share.ts#L80)). Do not promise "earn unlimited Peanuts".
2. **Gallery share-reward requires a valid review_id UUID** and is deduplicated per user/review — cannot be farmed.
3. **Downloads cost ≥1 🥜**, are rate-limited to 20/hour/user ([src/pages/api/download-artwork.ts](src/pages/api/download-artwork.ts#L44)). Messaging: "affordable", never "unlimited".
4. **Lottery auto-creates a monthly config row** — there is *always* an active giveaway to promote ([src/pages/[lang]/lottery.astro](src/pages/%5Blang%5D/lottery.astro#L39)).
5. **Gallery injects sample reviews when real count is low** ([src/pages/[lang]/gallery.astro](src/pages/%5Blang%5D/gallery.astro#L43)). The agent must **never** cite a specific gallery review in a post unless it has been confirmed real (see §13.2).
6. **Lead-magnet popup auto-fires at 5s** on public pages for non-logged users. Bonus: mentioning it in newsletter posts reinforces the hook.
7. **Instagram URLs are not clickable** — always "Link in bio" for IG. Our bio-link destination must carry its own UTMs (see §9).

---

## 4. The Flywheel We Are Optimizing

```
                    ┌──────────────────────────────────┐
                    │   1. Post → Social reach (IG/FB/Bsky)
                    └────────────────┬─────────────────┘
                                     │ clicks (tracked via UTM)
                                     ▼
                    ┌──────────────────────────────────┐
                    │   2. Visit Coloring Corner / Gallery
                    └────────────────┬─────────────────┘
                                     │ register prompt on download/share
                                     ▼
                    ┌──────────────────────────────────┐
                    │   3. Register account (free)
                    └────────────────┬─────────────────┘
                                     │ earns Peanuts on first share
                                     ▼
                    ┌──────────────────────────────────┐
                    │   4. Share gallery review or coloring page link
                    └────────────────┬─────────────────┘
                                     │ friends receive link → land on site
                                     ▼
                    ┌──────────────────────────────────┐
                    │   5. New visitor → loop repeats  │
                    └──────────────────────────────────┘
                                     │ eventually (weeks later)
                                     ▼
                    ┌──────────────────────────────────┐
                    │   6. Buys on Amazon              │ ← lagging KPI
                    └──────────────────────────────────┘
```

**Each post should advance exactly one stage of this flywheel.** If a post tries to serve steps 1 and 6 at once, it dilutes both.

### Stage-to-post-type map

| Flywheel stage | Best post types | Primary CTA |
|---|---|---|
| 1 → 2 (attract) | `free-coloring`, `parenting-tip`, `fun-fact`, `blog-share` | Visit a specific page |
| 2 → 3 (convert) | `free-coloring` (category-specific), `giveaway` | Register to download/enter |
| 3 → 4 (activate) | `share-earn`, `community` (gallery highlight) | Share a link |
| 4 → 5 (refer) | `community` (tag-a-friend), `engagement` | Tag a mom friend |
| 5 → 6 (monetize) | `book-promo` (capped ≤10%) | Amazon link |

---

## 5. Content Mix & Post Types

### Target mix (90-day sprint)

| Post type | Share of total | Flywheel stage | Primary platform |
|---|---|---|---|
| `free-coloring` | **40%** | 1→2, 2→3 | All three |
| `share-earn` | **20%** | 3→4 | FB + Bluesky (less Instagram — harder to explain) |
| `community` (gallery highlight, tag-a-friend) | **15%** | 4→5 | IG + FB |
| `parenting-tip` | **10%** | 1→2 | IG + FB |
| `blog-share` | **5%** | 1→2 | All three when a post ships |
| `fun-fact` / `engagement` | **5%** | 1→2 | Bluesky (test bed) |
| `giveaway` | **3%** | 2→3 | Monthly anchor on all three |
| `book-promo` | **≤ 2%** (hard cap) | 5→6 | FB anchor when a review lands or on inventory days |

Total adds to exactly 100%. `book-promo` is rate-limited at the scheduler level, not just an average.

### Why book-promo is capped at 2% (not the 10% ceiling)

The ≤10% is the **sprint ceiling**. During weeks 1-4 we sit near 2% to prioritize trust and flywheel spin-up. We lift toward 5-8% only if two conditions hold: (a) weekly flywheel velocity target met for 2 consecutive weeks, (b) review count ≥10 real (non-sample) approved reviews.

### Post-type purpose sheet

| Type | Single-sentence purpose |
|---|---|
| `free-coloring` | Drive one specific click: "download this free page now". |
| `share-earn` | Teach the Peanut mechanic with generosity framing, not gamification. |
| `community` | Surface real gallery reviews or invite tagging a mom friend. |
| `parenting-tip` | Pure value — actionable tip executable today, no product. |
| `blog-share` | Intrigue teaser for a new blog post. |
| `fun-fact` | Shareable snackable fact that earns saves/bookmarks. |
| `engagement` | Ask one question, no CTA. Pure comment-driver. |
| `giveaway` | Clarify the lottery mechanic this month; drive reviews. |
| `book-promo` | Angle-A "look what we made" only. Never urgency. |

---

## 6. Per-Platform Cadence & Rules

### Instagram — 1 feed post/day

| Rule | Value |
|---|---|
| Post count | 1/day |
| Format preference | Carousel > single image > reel (carousels maximize saves, which boosts reach) |
| Caption length | 300-600 chars |
| Hashtags | 8-15 (mix popular + niche) — always include `#LittleChubbyPress` |
| URLs in caption | **Never clickable** — say "Link in bio" / "Link en bio" |
| Bio link destination | Bio-link hub with UTM-tagged destinations (see §9) |
| Hook rule | First line must stop the scroll — question, surprising claim, or relatable moment |
| CTA rule | End with an action the viewer can do in <15 seconds (save, comment, share to stories, visit link in bio) |
| Content mix (IG-specific) | 50% free-coloring, 20% community, 15% parenting-tip, 10% giveaway, 5% book-promo |

### Facebook — 1 feed post/day

| Rule | Value |
|---|---|
| Post count | 1/day |
| Format preference | Text + 1 image, or link-preview post |
| Body length | 300-600 chars |
| Hashtags | 3-5 at the end |
| URLs | Clickable — always include destination URL with full UTMs |
| Hook rule | Relatable scenario first, pitch second |
| CTA rule | End with a question OR a "tag a mom who…" invitation. Never both in the same post. |
| Content mix (FB-specific) | 40% free-coloring, 20% community, 15% share-earn, 10% parenting-tip, 10% giveaway/blog-share, 5% book-promo |

### Bluesky — 2 short posts/day

| Rule | Value |
|---|---|
| Post count | 2/day (one morning "value", one afternoon "loop") |
| Text body | ≤ 280 chars including URL |
| Hashtags | 2-3 max |
| URLs | Clickable — include with UTMs |
| Hook rule | Punchy, conversational, often starts with a fragment |
| Use as | Experiment lab — hooks that outperform on Bluesky get promoted to IG/FB 24-48h later |
| Content mix (Bsky-specific) | 35% free-coloring, 25% share-earn, 15% fun-fact, 15% parenting-tip, 5% community, 5% giveaway |

### Cross-platform rule

**Never publish identical copy across all three.** Each platform needs its own variant generated by the agent — already supported by the JSON schema in `ai-generate.mjs`. The variants must differ in hook, not just formatting.

---

## 7. Weekly Anchor Calendar

A fixed anchor per day prevents decision fatigue and creates audience habits ("Tuesday is free-coloring day").

| Day | Instagram anchor | Facebook anchor | Bluesky (AM / PM) |
|---|---|---|---|
| Mon | Category carousel (Coloring Corner) | Parenting tip + blog link | Tip / Free-coloring |
| Tue | Gallery highlight (real review) | Free Coloring Corner CTA | Fun fact / Share-earn |
| Wed | Parenting tip (carousel or reel) | Gallery highlight + tag-a-friend | Blog share / Free-coloring |
| Thu | Behind-scenes or brand story | Blog share | Engagement Q / Free-coloring |
| Fri | Free-coloring (weekend theme) | Lottery reminder | Tip / Free-coloring |
| Sat | Community question | Free Coloring Corner (gift/weekend angle) | Fun fact / Share-earn |
| Sun | Share-earn ("how Peanuts work") | Community roundup / weekly wrap | Engagement / Free-coloring |

### Giveaway monthly overlay

The **25th-31st of each month**, replace one Friday Facebook post with a "last days to enter the giveaway" post. The 1st of each month, replace the Bluesky AM slot with a "new month, new prize" announcement.

### Book-promo slot (rare)

At most **1 book-promo/week**, always Friday Facebook, and only when one of these is true: (a) a new approved review for that book is in the gallery this week, (b) a seasonal fit (e.g., Enchanted Easter in April), (c) a restocking/catalog update. Otherwise the Friday Facebook slot stays `lottery` or `free-coloring`.

---

## 8. CTA Hierarchy & Destination Map

Ordered from **highest priority for the sprint** to lowest. The agent must pick the highest applicable CTA unless the post type is explicitly `book-promo`.

1. **Download a free coloring page** → `/{lang}/coloring-corner/`
2. **Share a gallery review (earn a Peanut)** → `/{lang}/gallery/`
3. **Subscribe to the newsletter (get mini-book PDF)** → `/{lang}/newsletter/`
4. **Enter the monthly giveaway (review a book, get 5 🎟️)** → `/{lang}/lottery/`
5. **Read a specific blog article** → `/{lang}/blog/{slug}/`
6. **Tag a mom friend / comment** → no URL, engagement-only
7. **Check out on Amazon** → Amazon URL (last resort, `book-promo` only)

### Secondary CTA rule

A post may carry **at most one secondary CTA**, and only if it is **one flywheel step earlier** than the primary. Example: primary "share a gallery review", secondary "(new here? join the newsletter first)". Never two CTAs of equal weight.

### Soft CTA phrasing (reminders from brand voice)

- "Link in bio if you are curious"
- "Free to browse — link in description"
- "Share it with a mom who needs this today"
- "Drop a 🐘 if you've tried this"

**Never:** "Buy now", "Limited time", "Click the link", "Hurry", "Don't miss out".

---

## 9. UTM & Attribution Spec

UTMs are **the only way** the smart-selector and weekly-intelligence know what works. Any post without complete UTMs is a wasted experiment.

### Canonical schema

| Param | Allowed values | Notes |
|---|---|---|
| `utm_source` | `instagram` \| `facebook` \| `bluesky` \| `instagram-bio` \| `pinterest` (future) | One source per post. `instagram-bio` is reserved for the bio-link hub. |
| `utm_medium` | `social` (always) | Fixed. |
| `utm_campaign` | Post type slug: `free-coloring` \| `share-earn` \| `community` \| `parenting-tip` \| `blog-share` \| `fun-fact` \| `engagement` \| `giveaway` \| `book-promo` | Matches the post type. Used by smart-selector scoring. |
| `utm_content` | `{postType}-{YYYYMMDD}-{platform}-{langCode}` | Required for per-creative attribution. New in v1 — see §10.6. |

### Current state of UTMs in code

- [scripts/social/content-templates.mjs](scripts/social/content-templates.mjs#L17) — `buildUtmUrl` exists, only tags own URLs (skips Amazon). Good.
- [scripts/social/post.mjs](scripts/social/post.mjs#L415) — Bluesky URL extraction + re-tagging with `source=bluesky`, `campaign=postType`. Good.
- [scripts/social/post.mjs](scripts/social/post.mjs#L445) — Facebook same pattern. Good.
- [scripts/social/post.mjs](scripts/social/post.mjs#L507) — destination URL builder uses UTMs. Good.
- **Gap:** `utm_content` is not currently set → no per-creative attribution.
- **Gap:** Instagram bio-link does not carry `utm_source=instagram-bio` → IG traffic is blind.

### Required changes during rollout (tracked in §16)

1. Add `utm_content` parameter to `buildUtmUrl` callers in `post.mjs`. Format: `{postType}-{YYYYMMDD}-{platform}-{lang}`.
2. Publish a bio-link page (static Astro route) that links to top 5 destinations, each with `utm_source=instagram-bio`.
3. Teach `link-content-performance.mjs` ([scripts/agents/link-content-performance.mjs](scripts/agents/link-content-performance.mjs#L136)) to group by `utm_content` for creative-level scoring.

### Amazon UTM rule

Amazon strips UTMs. Instead of UTMs, we rely on:

- `utm_source=facebook` etc. on the landing page that precedes the Amazon click.
- An internal pageview event when a user clicks an "outbound" Amazon link from `/books/`.

---

## 10. Agent Training — Prompt Patches

The existing system prompt in [scripts/social/ai-generate.mjs](scripts/social/ai-generate.mjs#L15) is strong on voice but under-indexed on the growth goal. Add the blocks below. Voice and privacy rules from `BRAND_VOICE_GUIDE.md` and `CHUBBY_AGENT_REFERENCE.md` **remain the highest authority** — nothing here overrides them.

### 10.1 Primary-goal block (insert at the very top of `SYSTEM_PROMPT`)

```
═══ PRIMARY GOAL (OVERRIDES EVERYTHING FOR THIS 90-DAY SPRINT) ═══

We are in AUDIENCE BUILDING phase, not book sales.
Every post must measurably advance ONE of these metrics:
  1. Clicks to a littlechubbypress.com page (primary)
  2. Registered-user Peanut share transactions (Peanut loop)
  3. Comments or mom-friend tags that invite new visitors
  4. Newsletter confirmed subscriptions

HARD RULES:
- At most 1 in 50 posts may use Amazon as primary CTA (book-promo type).
- Every post must end with ONE low-friction action a reader can do in under 15 seconds.
- If a post does not clearly serve ONE of the 4 metrics above, REWRITE IT.
- Ambiguous posts are worse than no post. When in doubt, pick the clearer CTA.
```

### 10.2 Persona-targeting block (insert after goal block)

```
═══ PRIMARY PERSONA ═══

Default reader: Sofia/Sarah — mom aged 28-42 with 1-3 kids aged 3-10, mid-income,
price-sensitive, values free-with-purpose, carries low-grade screen-time guilt,
buys on Amazon only from word-of-mouth (never from ads).

She shares content when it:
  (a) saves her time
  (b) makes her feel like a good mom
  (c) makes her laugh

Write every post as if speaking to her specifically, unless the post type is
explicitly gift-framed (Gift-Giver Aunt/Grandma) or educator-framed (Teacher persona).
```

### 10.3 Destination-picker block (insert after persona block)

```
═══ DESTINATION PICKING ═══

When you must include a URL, pick in this priority order:
  1. /{lang}/coloring-corner/   — for free-coloring, parenting-tip, fun-fact
  2. /{lang}/gallery/            — for community, share-earn referencing reviews
  3. /{lang}/newsletter/         — for newsletter/lead-magnet hooks
  4. /{lang}/lottery/            — for giveaway
  5. /{lang}/blog/{slug}/        — for blog-share
  6. Amazon URL                  — ONLY for book-promo type

For Instagram, DO NOT include URLs — say "Link in bio" / "Link en bio".
```

### 10.4 Post-type-specific additions

Add to the existing `buildPrompt` in [scripts/social/ai-generate.mjs](scripts/social/ai-generate.mjs#L215):

**`free-coloring` additions:**

```
Required: the hook must reference a CONCRETE situation
(rainy afternoon, long drive, waiting-room time, airplane trip,
 post-school decompression, sibling-quiet-time, grandparent-visit-day)
AND name a specific Coloring Corner category
(Animals & Nature, Space, Dinosaurs, Food & Drinks, Jobs, Machines,
 Kids Favorites, Mini Scenes, Basic Elements).

Never say "hundreds of pages" without also naming one category.
Never describe the Coloring Corner as generic "free pages" — always specific.
```

**`share-earn` additions:**

```
Frame sharing as "help another mom find this free resource".
The Peanut is the brand's THANK-YOU gift, not a reward the user is exploiting.
Avoid any phrasing that sounds like gamification, farming, or reward-hacking.

Required clarity:
- Reviews earn TICKETS (not Peanuts). 5 🎟️ per approved review.
- Sharing a LINK (review or coloring page) earns PEANUTS. +1 🥜 per share, max 3/day.
- These are TWO DIFFERENT currencies.

Never describe sharing as "uploading art" or "posting a photo" — the site only
accepts structured book reviews. Sharing means clicking the share button on a
gallery review or coloring page to send its LINK to a friend.
```

**`community` additions:**

```
Pick ONE angle, never mix:
  (a) Gallery highlight — cite a REAL approved review. Never fabricate or cite
      a sample review. If no real gallery reviews exist yet this week, switch
      to angle (b).
  (b) Tag-a-friend — ask readers to tag one mom friend who would love a
      specific feature. Never more than one friend, never "tag everyone".

End the post with either one question OR one tag-invitation. Never both.
```

**`book-promo` additions (reinforce the ≤2% cap):**

```
You may generate a book-promo ONLY if the caller passes `allow_book_promo: true`.
Otherwise, refuse and return post type `free-coloring` instead.

Use "look what we made" framing (angle A). Never urgency, never discount language.
Connect the book to a specific scenario a parent would recognize.
```

### 10.5 New post type: `tag-a-friend` (add to `buildPrompt`)

```
case "tag-a-friend":
  return `Create a social media post in ${langLabel} designed for viral
sharing among moms.

Requirements:
- Open with a highly relatable mom-moment (one specific scenario, not generic).
- Middle: a single useful observation, tip, or question.
- End with: "Tag a mom who ${specific situation}" — the situation must be
  concrete, not "tag a mom who needs a break" (too generic).

No product mention. No Amazon. No book references. Pure community engagement.
For Facebook: end with the tag-a-friend call. For Bluesky: same but shorter.
For Instagram: use "Tag her in the comments 🐘" and never include a URL.
${IMAGE_GUIDELINES}`;
```

### 10.6 Anti-repetition + creative-ID metadata

Require the agent to return two extra JSON fields alongside the existing schema:

```json
{
  ...existing fields...,
  "creativeId": "{postType}-{YYYYMMDD}-{langCode}",
  "flywheelStage": 1 | 2 | 3 | 4 | 5
}
```

`creativeId` becomes `utm_content`. `flywheelStage` is logged to Supabase alongside `content_performance` for downstream analysis.

### 10.7 Language ratio (unchanged but made explicit)

```
~80% of posts in English (primary audience).
~20% in Spanish. Spanish posts must be written natively — not translated.
Never mix languages in the same post.
```

---

## 11. QA Validator Spec (Deterministic Gate)

A new module `scripts/social/validate-post.mjs` runs between the AI generator and the publisher. It **blocks publish** when any rule below fails. On failure: one AI retry with the violation hint injected; if still invalid, skip the slot and log.

### Blocking rules (fail → do not publish)

| ID | Rule | Applies to |
|---|---|---|
| V1 | Emoji count > 2 | All platforms |
| V2 | Contains any of: "buy now", "order now", "limited time", "don't miss", "hurry", "click the link", "compra ya", "no te lo pierdas", "ultima oportunidad" | All |
| V3 | Mentions "Peanuts" in the context of earning from reviews | All |
| V4 | Mentions "Tickets" in the context of earning from shares | All |
| V5 | Uses "upload your kid's art" or equivalent (suggests feature that doesn't exist) | All |
| V6 | Describes sharing as posting an image instead of sharing a link | All |
| V7 | Instagram variant contains a URL (case-insensitive `https?://`) | Instagram only |
| V8 | Bluesky variant + URL exceeds 280 chars | Bluesky only |
| V9 | Post type is not `book-promo` but the post includes an Amazon URL | All |
| V10 | Post type is not `book-promo` and the post primary CTA is an Amazon link | All |
| V11 | Website URL present without `utm_source`, `utm_medium`, `utm_campaign` | All |
| V12 | `#LittleChubbyPress` missing from hashtags | All |
| V13 | `book-promo` posted > 1 time in the last 7 days (rolling window) | All |
| V14 | Opening line matches the last 5 posts' openings (cosine similarity > 0.85) | All |
| V15 | Any privacy-forbidden content: real names of family, exact ages of children, location details, "AI-generated illustrations" | All |
| V16 | ALL-CAPS word (≥3 chars, non-book-title context) | All |
| V17 | Hashtag count out of platform range (IG 8-15, FB 3-5, Bsky 2-3) | Platform-specific |
| V18 | No call to action (no question, no link, no tag-invitation) | All |
| V19 | Mentions a specific gallery review by reviewer name when real-review count < threshold (i.e., post could be citing a sample review) | `community` type |
| V20 | Mentions a specific book with an Amazon URL in a non-`book-promo` post | All |

### Warning rules (log, do not block)

| ID | Rule |
|---|---|
| W1 | Post is > 500 chars on Bluesky even without URL (likely cut off) |
| W2 | Post has zero emojis (allowed, but flag for variety tracking) |
| W3 | Two consecutive posts use the same content pillar |
| W4 | Post opens with a banned-opener from `BRAND_VOICE_GUIDE.md` §9 |

### Retry contract

On block:

1. Send the failing post + a structured list of violations back to Claude as a user message.
2. Ask for one revised variant that fixes all violations while preserving the concept.
3. Re-validate. If it still fails, **skip** the slot, log a row in a new `validation_failures` table with the violations, the raw AI output, and the timestamp.
4. Never bypass the validator. Never publish on "close enough".

### Dry-run mode

The validator must also support a `--dry-run` mode that returns the violation list without blocking, used by the weekly analytics cron to estimate what would have been caught historically.

---

## 12. Smart-Selector Scoring v2

Current `smart-selector.mjs` ([scripts/agents/smart-selector.mjs](scripts/agents/smart-selector.mjs#L81)) scores by aggregate engagement. During the sprint, engagement is not our KPI — **clicks and Peanut transactions are**. Scoring needs to reflect that.

### New score formula (per `post_type`, computed from last 30 days)

```
score = 0.55 * click_rate_z
      + 0.30 * peanut_share_rate_z
      + 0.10 * comment_rate_z
      + 0.05 * like_rate_z
```

Where:

- `click_rate` = clicks attributed via UTM / impressions
- `peanut_share_rate` = count of `credit_transactions` with `reason = 'share'` attributable to posts of that type / impressions. Attribution window: 48 hours after post.
- Everything is z-scored against the last 30 days of the same post type.

### Decision rules fed to the planner

1. If a post type's `score` > +1.0 σ for 14 consecutive days → **promote** its weekly share by +5% (capped at the post-type ceiling defined in §5).
2. If a post type's `score` < −1.0 σ for 14 consecutive days and has ≥ 10 posts in the window → **demote** by −5% (floored at post-type minimum, never below 0%).
3. If data volume is < 5 posts for a type in 30 days → **no action**, insufficient signal.
4. `book-promo` is **never promoted** beyond the 2% floor during the sprint, regardless of score.

### Additional signals to add to the Supabase context query

Extend the `fetchSmartContext()` call ([scripts/agents/smart-selector.mjs](scripts/agents/smart-selector.mjs#L58)) to also pull:

- `credit_transactions` where `reason='share'` in the last 30 days, joined to `social_shares.shared_url` → map back to the `utm_content` that drove the share.
- `newsletter_subscribers` created in the last 30 days with `source` tagged — confirm our social posts are driving signups, not just pageviews.

### Minimum-confidence guardrail

Weekly-intelligence already has this notion. Reinforce: **no strategy change fires with < 100 total post-impressions/week**. Below that, we are pattern-matching noise.

---

## 13. Growth Playbooks (Sprint Tactics)

Six tactical plays we run during the 90 days. Each has an owner action, expected effect, and shutdown criteria.

### 13.1 Pin post per platform (week 1)

A single evergreen pinned post on each platform, always a `free-coloring` variant that names all 9 categories and the "free to browse" promise. Permanent top-of-profile hook.

**Expected effect:** +15-25% profile-visit-to-click conversion.

### 13.2 Gallery reciprocity loop (weekly, starting week 2)

Every time a **real** (non-sample) review is approved, the agent auto-generates a public thank-you post in IG Stories + Bluesky:

> "Thank you {firstName + initial} for sharing — your review is now live in the gallery 🐘"

The thanked user frequently re-shares. Their network becomes new first-party traffic.

**Shutdown criteria:** if the thank-you rate exceeds 2/day on any one platform, throttle to 1/day to avoid "same face" fatigue.

### 13.3 Category-of-the-day (permanent, week 1)

The `free-coloring` posts rotate a **fixed category per weekday**:

| Day | Category |
|---|---|
| Mon | Dinosaurs |
| Tue | Space |
| Wed | Animals & Nature |
| Thu | Jobs (educational angle) |
| Fri | Kids Favorites (weekend-ready) |
| Sat | Mini Scenes / Food & Drinks |
| Sun | Basic Elements / Machines |

Creates a habit and simplifies image generation — one category per day per week.

### 13.4 Themed weeks (every 2 weeks)

Every other week, 5 consecutive posts tied to one meta-theme:

- "Rainy-Week Creativity"
- "Travel-Kit Week"
- "Screen-Free Saturdays (5-day build-up)"
- "Gift-Week" (around holidays)
- "Back-to-School Creativity"

Algorithms reward topical coherence; audience forms expectations.

### 13.5 Peanut micro-challenges (monthly)

Announced in newsletter first, amplified on social 48h later:

> "This week only: the first 10 families who share a gallery review link get +2 bonus Peanuts on their next share (applied manually)."

Requires a manual Peanut grant via admin — **not an automated endpoint change**. Keep manual to preserve the server-side caps.

### 13.6 Bluesky hook lab → IG/FB promotion

Track Bluesky post clicks + engagement hourly. If a Bluesky hook outperforms its type's 30-day z-score by ≥ 2σ in the first 24h, queue a manual-approval IG + FB variant of the same hook within 48h.

This turns Bluesky from a secondary platform into our A/B testing lab.

---

## 14. Metrics, Targets & Review Rhythm

### Daily dashboard (auto-computed)

| Metric | Source |
|---|---|
| Sessions/day | `pageviews` table |
| New registrations/day | `auth.users` via admin cron |
| Peanut shares/day | `credit_transactions` where reason=share |
| Coloring Corner downloads/day | `downloads` table or `credit_transactions` where reason=download-deduct |
| Newsletter confirmed subs/day | `newsletter_subscribers` confirmed=true |
| Posts published/day | `content_performance` rows |
| Validator pass rate | `validation_failures` table (inverse) |

### 90-day targets (multiplier from current baseline)

| KPI | Target |
|---|---|
| Daily sessions | 3-5× |
| Daily registrations | 3× |
| Daily Peanut-share transactions | 5× |
| Daily Coloring Corner downloads | 5× |
| Weekly newsletter confirmed subs | 3× |
| Approved reviews / month | 2× |
| Validator pass rate | ≥ 95% |
| Zero invalid-content publishes | hard target |
| Amazon organic orders / month | **measure only — not optimized this sprint** |

Baseline is captured in week 0 (first 7 days of rollout) from the existing `aggregate-traffic.mjs` output.

### Review cadence

| Frequency | What | Owner | Duration |
|---|---|---|---|
| Daily | Dashboard scan, validator failure check | Operator | 5 min |
| Weekly (Mon) | Post-type scoring review, cadence adjustments, theme-week decision | Operator + smart-selector output | 30 min |
| Bi-weekly | Growth playbook refresh (13.4 themed weeks) | Operator | 15 min |
| Monthly | Full KPI review, decide to lift `book-promo` from 2% | Operator | 60 min |
| Day 90 | Sprint retrospective → write v2 of this playbook | Operator | 2 h |

### Kill-switch criteria

Pause the social-post workflow immediately if any of these trigger:

- Validator pass rate < 80% for 3 consecutive days → prompt drift likely, investigate before resuming.
- Peanut-share rate drops > 30% week-over-week → share-loop broken, check `/api/share-reward` and `/api/track-share` health.
- Three or more V15 privacy violations in a single week → halt AI, run template-only until root-caused.
- Meta API publishing failure rate > 20% in a day → run `diagnose-social.yml`, keep Bluesky-only until fixed.

---

## 15. Anti-Patterns (Block-List)

Explicit list of things the agent and operator must not do. Violations of items marked ⛔ justify deleting a published post.

| ID | Anti-pattern | Severity |
|---|---|---|
| AP1 | Publishing identical copy across all three platforms | ⛔ |
| AP2 | Book-promo > 1/week during the sprint | ⛔ |
| AP3 | Amazon URL in non-`book-promo` posts | ⛔ |
| AP4 | Confusing Peanuts with Tickets in published copy | ⛔ |
| AP5 | Citing a specific gallery review by name when sample reviews are still showing | ⛔ |
| AP6 | More than 2 emojis per post | ⛔ |
| AP7 | Using `#Hurry`, `#LimitedTime`, `#BuyNow` or equivalent hashtags | ⛔ |
| AP8 | Creating giveaways outside the `/lottery/` system (fragmenting the loop) | ⛔ |
| AP9 | Posting with URL but no UTMs | ⚠ |
| AP10 | Opening two consecutive posts with the same hook pattern | ⚠ |
| AP11 | Posts with no CTA (except pure `engagement` type) | ⚠ |
| AP12 | Reusing `utm_content` across different creatives | ⚠ |
| AP13 | Pretending to "discover" our own features ("I just found out we have…") | ⛔ |
| AP14 | Promising "unlimited Peanuts" or ignoring the 3/day cap | ⛔ |
| AP15 | Describing sharing as uploading images | ⛔ |

---

## 16. Rollout Plan (90 Days)

### Week 0 — Baseline capture (April 20-26, 2026)

- [ ] Run `aggregate-traffic.mjs` for the last 30 days to capture baselines.
- [ ] Snapshot current Peanut-share transactions per day, Coloring Corner downloads per day, newsletter signups per week.
- [ ] Commit this playbook to the repo root.
- [ ] Add baseline numbers to this section in a follow-up PR.

### Week 1 — Foundation (April 27 - May 3)

- [ ] Implement `validate-post.mjs` with rules V1-V20 (§11).
- [ ] Wire it into `post.mjs` between generation and publish.
- [ ] Add the Primary-Goal / Persona / Destination blocks to `SYSTEM_PROMPT` (§10.1-10.3).
- [ ] Deploy pin posts on IG / FB / Bluesky (§13.1).
- [ ] Publish bio-link Astro route `/bio/` with UTM-tagged destinations.
- [ ] Add `utm_content` parameter to `buildUtmUrl` callers (§9).

### Week 2 — Cadence alignment (May 4-10)

- [ ] Refactor `social-post.yml` to match the calendar in §7 (anchor slot per day/platform).
- [ ] Enforce `book-promo` 1/week cap at the scheduler level, not just the prompt.
- [ ] Enable category-of-the-day rotation (§13.3).
- [ ] Stand up `validation_failures` Supabase table.
- [ ] First weekly review of post-type performance.

### Weeks 3-4 — Loop activation (May 11-24)

- [ ] Implement gallery reciprocity auto-thank-you post (§13.2).
- [ ] Add `peanut_share_rate` + `click_rate` signals to smart-selector (§12).
- [ ] Run first themed week (§13.4).
- [ ] First monthly KPI review (end of week 4).

### Weeks 5-8 — Scale what works (May 25 - June 21)

- [ ] Smart-selector scoring v2 fully live, weekly promote/demote rules firing.
- [ ] Launch Peanut micro-challenge (§13.5).
- [ ] Begin Bluesky hook lab → IG/FB promotion pipeline (§13.6).
- [ ] If KPI targets on track, evaluate lifting `book-promo` toward 5%.

### Weeks 9-12 — Optimize and harden (June 22 - July 19)

- [ ] Full backfill of `utm_content` analytics into weekly-intelligence reports.
- [ ] Retrospective on hooks, categories, and destination performance.
- [ ] Prepare Pinterest activation plan (if audience targets hit) — see master plan Phase 6.
- [ ] Draft v2 of this playbook for the next sprint.

### Day 90 exit criteria

At least 4 of the 7 KPI targets in §14 met. Validator pass rate ≥ 95%. Zero ⛔-class anti-patterns published. If met, graduate to a v2 playbook with lifted `book-promo` ceiling and potential Pinterest addition. If not met, hold the current playbook for another 30 days and diagnose which link of the flywheel underperformed.

---

**End of playbook v1.**  
Change log: `v1 — April 20, 2026 — initial sprint edition.`  
Owner: project operator. All prompt/validator changes to this playbook require a companion PR against `scripts/social/`.
