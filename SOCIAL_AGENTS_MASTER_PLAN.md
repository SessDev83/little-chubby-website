# Social Agents & Posting Logic — Master Implementation Plan

**Date:** April 20, 2026  
**Scope:** Social content generation, publishing automation, engagement automation, analytics feedback loop, and incident readiness  
**Approach:** Stabilize first, automate second, optimize third, scale last  

---

## Table of Contents

1. [Current State Snapshot](#1-current-state-snapshot)
2. [Target Operating Model](#2-target-operating-model)
3. [Recommended Publishing Cadence](#3-recommended-publishing-cadence)
4. [System Architecture](#4-system-architecture)
5. [Implementation Plan — Phases](#5-implementation-plan--phases)
6. [Implementation Order & Dependencies](#6-implementation-order--dependencies)
7. [Human Approval & Escalation Rules](#7-human-approval--escalation-rules)
8. [Risk Register & Failure Modes](#8-risk-register--failure-modes)
9. [Incident Playbooks](#9-incident-playbooks)
10. [Testing & Launch Checklist](#10-testing--launch-checklist)
11. [Success Metrics & Review Rhythm](#11-success-metrics--review-rhythm)
12. [Files, Workflows, and Secrets Inventory](#12-files-workflows-and-secrets-inventory)
13. [Natural Next Steps](#13-natural-next-steps)

---

## 1. Current State Snapshot

### Existing Automation Layers

| Layer | What Exists Today | Status |
|------|--------------------|--------|
| Brand rules | `BRAND_VOICE_GUIDE.md`, `CHUBBY_AGENT_REFERENCE.md` | Strong foundation |
| Content generation | `scripts/social/post.mjs`, `scripts/social/ai-generate.mjs`, `scripts/social/content-templates.mjs` | Working |
| Publishing | Bluesky + Facebook + Instagram connectors | Working |
| Engagement | Auto-replies on owned channels + Bluesky outbound outreach | Partially automated |
| Diagnostics | Manual Meta pipeline diagnostics | Working |
| Data collection | Social metrics, traffic aggregation, content performance linking | Working |
| Intelligence layer | Weekly recommendations + smart selector | Working but data-dependent |
| Admin UI | No dedicated social dashboard | Missing |
| Approval workflow | No formal approval gate in automation | Missing |
| Incident playbooks | Knowledge exists across scripts/docs, not consolidated | Missing |

### Current Workflows Already in Repo

| Workflow | Purpose | Current Schedule |
|---------|---------|------------------|
| `.github/workflows/social-post.yml` | Auto-posting content | 5 scheduled runs per day |
| `.github/workflows/social-engage.yml` | Comment monitoring + Bluesky outreach | Monitor every 4 hours; outreach 2x/day |
| `.github/workflows/agent-collectors.yml` | Collect metrics and link traffic | Every 6 hours |
| `.github/workflows/agent-intelligence.yml` | Weekly AI analysis | Weekly |
| `.github/workflows/diagnose-social.yml` | Manual health check for Meta | On demand |

### Current Strengths

- The repo already has a real automation backbone, not just ideas.
- Brand voice and guardrails are unusually strong and explicit.
- The system already understands core brand mechanics: books, blog, gallery, coloring corner, Peanuts, Tickets, giveaway, newsletter.
- Posting, replying, outbound engagement, analytics collection, and strategy recommendations are already separated into clean layers.
- The pipeline already supports anti-repetition through post history and performance-aware generation.

### Current Gaps That Must Be Addressed

| Gap | Why It Matters |
|-----|----------------|
| No single source-of-truth operations document | Knowledge is spread across scripts, prompts, and workflows |
| Scheduled publishing is currently more aggressive than the recommended brand cadence | Risk of over-posting on Facebook and Instagram |
| No formal approval matrix for risky content or comments | Automation can drift into brand or support problems |
| No safe-mode switch in the scheduled workflow | Harder to downgrade quickly during incidents |
| No platform-specific volume strategy in the scheduler | All-platform posting is not always the right choice |
| No central incident response guide | Recovery depends on memory and ad hoc decisions |
| Analytics quality depends on UTM hygiene and collector health | Smart recommendations are only as good as the data |

### Strategic Decision From This Plan

The system should **not** scale by simply publishing more often everywhere. The correct direction is:

1. Keep the infrastructure capable of high throughput.
2. Reduce production feed volume to a disciplined cadence.
3. Use spare automation capacity for monitoring, replies, analytics, and experimentation.
4. Expand to additional channels only after the core loop is stable.

---

## 2. Target Operating Model

### Core Goal

Build a reliable social-agent system that:

- drives daily visits to the website,
- increases registrations, newsletter signups, gallery reviews, and Amazon clicks,
- protects the brand voice and reward-system accuracy,
- supports community growth without looking spammy,
- degrades safely when APIs, tokens, or AI fail.

### Agent Roles

| Role | Responsibility | Primary Implementation |
|------|----------------|------------------------|
| Strategist | Decide what should be posted based on cadence, campaign focus, and performance data | `scripts/agents/smart-selector.mjs`, `weekly-intelligence.mjs` |
| Planner | Map day, slot, platform, language, and content type into a posting queue | Scheduler logic in workflow + future schedule config |
| Creator | Generate platform-ready copy and image prompts | `scripts/social/ai-generate.mjs`, templates |
| Editor / QA | Validate output against brand, compliance, limits, and reward-system rules | **Implementation needed** |
| Publisher | Publish content and persist state/history | `scripts/social/post.mjs` |
| Community Manager | Monitor comments, reply safely, and do limited outreach | `scripts/social/engage.mjs` |
| Analyst | Collect metrics, connect traffic to posts, and recommend changes | Collectors + intelligence workflows |
| Human Operator | Approve risky actions, review exceptions, and handle incidents | Manual workflow dispatch + repo operator |

### Professional Standard for the Social Agent

The agent must behave like an operator with policy, not like a random content bot.

That means every automated action should be governed by:

- a defined content goal,
- a platform-specific rule set,
- a risk level,
- an escalation path,
- a measurable output.

### Automation Boundaries

| Area | Allowed to Auto-Run | Requires Human Review |
|------|----------------------|-----------------------|
| Value posts | Yes | No |
| Blog shares | Yes | No |
| Free coloring and community posts | Yes | No |
| Standard book promos | Yes, if within tone/ratio limits | No |
| Giveaway / reward-system posts | Yes, after validation checks | Recommended for major campaign changes |
| Winner announcements | No by default | Yes |
| Replies to compliments or simple questions | Yes | No |
| Replies to complaints, shipping issues, payment, safety, legal, press | No | Yes |
| Outbound likes/comments on other accounts | Bluesky only, capped | Meta channels require future review |

---

## 3. Recommended Publishing Cadence

### Recommended Production Cadence

This is the cadence the automation should ultimately serve in production.

| Channel | Recommended Cadence | Notes |
|--------|----------------------|-------|
| Instagram feed | 1 post/day | Protect quality and avoid fatigue |
| Facebook feed | 1 post/day | Prioritize share-worthy posts |
| Bluesky feed | 1 post/day + up to 3 extra short posts/week | Best place for higher conversational volume |
| Stories / lightweight support content | 3-5 touchpoints/day | Manual or future automation |
| Comment monitoring | Every 4 hours | Already aligned |
| Bluesky outreach | 2 runs/day, max 8 engagements per run | Already aligned |

### Recommended Weekly Content Mix

| Day | Anchor Post | Primary Goal | Destination |
|-----|-------------|--------------|-------------|
| Monday | `parenting-tip` | Reach + saves | Blog or books |
| Tuesday | `free-coloring` | Registrations + site traffic | Coloring Corner |
| Wednesday | `blog-share` | Website visits | Blog |
| Thursday | `behind-scenes` | Trust + brand depth | About / books / blog |
| Friday | `book-promo` | Amazon clicks + catalog views | Book page or Amazon |
| Saturday | `community` | Gallery, newsletter, reviews | Gallery / newsletter |
| Sunday | Rotate `engagement`, `fun-fact`, `giveaway`, `share-earn` | Comments + community loop | Relevant feature page |

### Important Current-State Mismatch

The current `social-post.yml` workflow is capable of publishing **5 times per day** across platforms.

This is useful as infrastructure, but it should not remain the default cross-platform behavior unless performance data clearly supports it.

### Required Scheduler Change

Before scale, the scheduler should be updated so that:

1. **Anchor slots** publish to all primary platforms.
2. **Support slots** publish to Bluesky only, or stay disabled.
3. **High-risk content** never auto-publishes without the QA layer.
4. Language, platform, and content type are selected independently.

---

## 4. System Architecture

### Layer 0 — Policy and Brand Governance

**Source of truth:**

- `BRAND_VOICE_GUIDE.md`
- `CHUBBY_AGENT_REFERENCE.md`

**Responsibilities:**

- brand tone,
- privacy rules,
- emoji limits,
- platform style,
- Tickets vs Peanuts accuracy,
- content pillar ratios,
- anti-patterns.

### Layer 1 — Data Collection

**Current scripts:**

- `scripts/agents/collect-social-metrics.mjs`
- `scripts/agents/aggregate-traffic.mjs`
- `scripts/agents/link-content-performance.mjs`

**Responsibilities:**

- collect platform metrics,
- track follower and engagement movement,
- aggregate traffic source performance,
- connect social traffic to website outcomes.

### Layer 2 — Intelligence / Recommendation Brain

**Current scripts:**

- `scripts/agents/smart-selector.mjs`
- `scripts/agents/weekly-intelligence.mjs`

**Responsibilities:**

- summarize what is working,
- recommend content directions,
- decide what to emphasize next,
- prioritize outreach topics.

### Layer 3 — Content Generation and Publishing

**Current scripts:**

- `scripts/social/post.mjs`
- `scripts/social/ai-generate.mjs`
- `scripts/social/content-templates.mjs`
- `scripts/social/image-generate.mjs`

**Responsibilities:**

- pick the post type and data object,
- generate content,
- adapt copy by platform,
- resolve images,
- publish,
- persist anti-repetition state.

### Layer 4 — Engagement Automation

**Current script:**

- `scripts/social/engage.mjs`

**Responsibilities:**

- monitor owned-channel comments,
- reply using AI on safe topics,
- do limited outbound outreach on Bluesky,
- track cooldowns and already-engaged users/posts.

### Layer 5 — Diagnostics and Recovery

**Current tooling:**

- `scripts/social/diagnose.mjs`
- `.github/workflows/diagnose-social.yml`

**Responsibilities:**

- token health checks,
- recent-post verification,
- pipeline troubleshooting,
- fast incident triage.

### Missing Layer — Validation / QA Gate

This is the main architectural gap.

The system needs a deterministic validator before publish to check:

- prohibited phrases,
- excessive emojis,
- incorrect platform links,
- reward-system mistakes,
- length constraints,
- missing CTA,
- risky contest or legal wording,
- duplicate hooks.

**This is a P0 implementation item.**

---

## 5. Implementation Plan — Phases

## Phase 0 — Governance, Cadence, and Safe Defaults

**Goal:** Lock policy before increasing automation.

### Tasks

1. Finalize the production posting cadence and stop treating all platforms the same.
2. Convert the approval rules in this document into an explicit operating policy.
3. Decide which content types may auto-publish and which require approval.
4. Define a “safe mode” for scheduled publishing:
   - templates only,
   - or `--no-ai`,
   - or Bluesky-only,
   - or monitor-only.
5. Consolidate the official secret inventory and owners.

### Deliverables

- Approved cadence
- Approved escalation matrix
- Safe-mode definition
- This document adopted as the base playbook

### Exit Criteria

- Team can answer “what publishes automatically, when, where, and under whose approval” without ambiguity.

---

## Phase 1 — Scheduler Refactor and Publishing Stabilization

**Goal:** Make the post scheduler reflect strategy, not just infrastructure capacity.

### Tasks

1. Refactor `social-post.yml` to use explicit slot rules:
   - anchor slot,
   - support slot,
   - platform-specific slot routing.
2. Add workflow inputs for safe-mode operations:
   - `no_ai`
   - `platform_mode`
   - `skip_image_generation`
   - `approval_required`
3. Add a central schedule configuration file instead of encoding all rules in bash.
4. Preserve anti-repetition state while preventing duplicate posts after cache misses.
5. Ensure Instagram fallback behavior is explicit when no valid public image exists.

### Deliverables

- Production-ready scheduler
- Clear slot-to-platform mapping
- Safer manual overrides

### Exit Criteria

- One full week of dry-run schedule output matches the intended cadence.

---

## Phase 2 — Deterministic QA / Validation Layer

**Goal:** Never publish invalid or off-policy AI output.

### Tasks

1. Implement a validation module before `publishPost()` runs.
2. Validate for:
   - emoji count,
   - platform-specific link rules,
   - length limits,
   - forbidden urgency language,
   - forbidden “discovered our own feature” phrasing,
   - Tickets vs Peanuts accuracy,
   - duplicate-hook similarity.
3. On validation failure:
   - retry with AI once,
   - then fall back to templates,
   - then skip publish if still invalid.
4. Log validation failures for weekly review.

### Deliverables

- `validate-social-post` module or equivalent
- Validation result logging
- Publish blocking for invalid content

### Exit Criteria

- Invalid content never reaches a platform in production.

---

## Phase 3 — Engagement Automation with Guardrails

**Goal:** Keep automation helpful and safe, not spammy.

### Tasks

1. Keep auto-replies only for owned-channel comments on Bluesky, Facebook, and Instagram.
2. Keep outbound automation limited to Bluesky until there is a deliberate expansion plan.
3. Add a risk classifier for comments and route high-risk cases to human review.
4. Add a keyword escalation list for:
   - refund,
   - shipping,
   - scam,
   - child safety,
   - privacy,
   - legal,
   - angry or abusive language.
5. Add daily caps per platform to prevent bursty reply behavior.
6. Add operator review samples to ensure replies remain on-brand.

### Deliverables

- Safe reply policy
- Escalation keyword set
- Bluesky-only outbound policy codified

### Exit Criteria

- No unsafe auto-replies in a 30-day pilot window.

---

## Phase 4 — Analytics Reliability and Learning Loop

**Goal:** Ensure smart recommendations are trustworthy.

### Tasks

1. Verify all website CTAs use valid UTM tagging consistently.
2. Audit collector coverage every week.
3. Confirm each published post can be traced into `content_performance`.
4. Define minimum data thresholds before weekly intelligence changes strategy.
5. Add alerts or checklist items for “no data in last 24h” scenarios.
6. Review top pages, top post types, and source traffic every week.

### Deliverables

- Reliable attribution loop
- Weekly review ritual
- Minimum-confidence rules for strategy changes

### Exit Criteria

- Published posts show measurable outcomes within 24 hours whenever platform and pageview data are available.

---

## Phase 5 — Operator Tooling and Incident Readiness

**Goal:** Make the system easy to pause, inspect, and recover.

### Tasks

1. Add a single operator checklist for:
   - publishing issue,
   - engagement issue,
   - token issue,
   - analytics issue.
2. Keep `diagnose-social.yml` available as the first recovery tool for Meta issues.
3. Add explicit pause procedures for:
   - posting,
   - engagement,
   - outreach.
4. Add a runbook for clearing or resetting state files safely.
5. Document secret rotation steps and ownership.

### Deliverables

- Incident runbooks
- Pause / resume procedures
- Secret maintenance checklist

### Exit Criteria

- An operator can diagnose and stabilize a social incident within 30 minutes.

---

## Phase 6 — Scale and Expansion

**Goal:** Expand only after the core loop is stable.

### Tasks

1. Pinterest profile activation and integration via a dedicated connector and pin-specific creative format.
2. Optional admin dashboard for queue visibility and approvals.
3. Optional platform-specific experimentation with multiple content variants per week.
4. Optional Meta outbound engagement only if it is compliant, useful, and explicitly approved.

### Exit Criteria

- Core system remains stable while expansion features are layered in.

### Pinterest Activation Track

Pinterest is approved as a **future expansion channel**, but not as an immediate day-one autopublishing target.

It should be activated only after Phases 0-5 are stable because Pinterest requires:

- a Pinterest Business profile,
- developer app setup and OAuth credentials,
- board taxonomy,
- pin-specific creative format,
- a separate publishing connector,
- a different traffic and attribution model from Facebook/Instagram.

### Pinterest Activation Objectives

1. Create a Pinterest profile that looks brand-consistent and trustworthy.
2. Use Pinterest primarily as a **traffic driver to the website**, not as a copy of Facebook.
3. Route Pinterest traffic first to:
    - Coloring Corner,
    - blog articles,
    - gallery/community pages,
    - selected book pages,
    - only secondarily to Amazon.
4. Add Pinterest to the same analytics and smart-decision loop as other platforms.

### Pinterest Activation Prerequisites

| Requirement | Why It Matters |
|------------|----------------|
| Pinterest Business account | Required for professional publishing and analytics |
| Approved developer app / API access | Required for organic pin automation |
| Defined boards strategy | Pins need destinations and topical grouping |
| Vertical creative format | Pinterest is not optimized for square-first output |
| Public image URLs | Pins require accessible media |
| UTM tagging plan | Needed to attribute Pinterest traffic accurately |

### Pinterest Boards to Create First

| Board | Purpose |
|------|---------|
| Free Coloring Pages for Kids | Top-of-funnel traffic to Coloring Corner |
| Screen-Free Activities for Kids | Evergreen parenting traffic |
| Coloring Book Tips for Parents | Blog distribution |
| Kids Coloring Books by Little Chubby Press | Catalog and book discovery |
| Creative Family Time Ideas | Community and value posts |

### Pinterest Implementation Scope

When implementation starts, it should include:

1. Pinterest Business profile activation and brand setup.
2. Pinterest app registration and secure credential storage.
3. New `pinterest` platform connector under `scripts/social/platforms/`.
4. Platform-specific copy adaptation in `scripts/social/post.mjs`.
5. Pin creative generation with vertical ratio support.
6. Board mapping rules by content type.
7. Pinterest-specific UTM tagging and analytics classification.
8. Optional scheduler lane for Pinterest-only evergreen posts.
9. Dry-run + live-run support aligned with the existing social workflow.

### Pinterest Content Rules

- Pinterest should favor evergreen posts over conversational daily feed logic.
- Best first content types:
   - `free-coloring`
   - `blog-share`
   - selected `community`
   - selected `book-promo`
- Pinterest should not be the first place for fast-moving giveaway or comment-driven content.
- Pinterest should use pin-title and description logic optimized for search/discovery, not just social captions.

### Pinterest Risks to Prepare For

| Risk | Prevention |
|------|------------|
| Treating Pinterest like Facebook | Use a dedicated connector and creative format |
| Low-quality square creatives underperforming | Generate vertical pin assets |
| Pins going to weak landing pages | Send first to evergreen website pages |
| API/app approval delays | Keep Pinterest as a later phase, not a blocking dependency |
| Missing attribution | Add Pinterest UTMs and collector recognition before launch |

### Pinterest Exit Criteria

- Pinterest profile fully branded and configured
- At least 5 core boards created
- Connector supports dry-run and publish modes
- UTM attribution works end to end
- First 2 weeks of pins publish without operational issues

---

## 6. Implementation Order & Dependencies

| Order | Work Item | Depends On | Why Order Matters |
|------|-----------|------------|-------------------|
| 1 | Governance + cadence lock | None | Prevents automating the wrong behavior |
| 2 | Scheduler refactor | Governance | Volume and platform logic must match strategy |
| 3 | QA validation layer | Scheduler | Publishing must be safe before scaling |
| 4 | Engagement escalation rules | QA layer | Reply automation is higher-risk than posting |
| 5 | Analytics reliability review | Stable publishing | Smart decisions need clean output and clean inputs |
| 6 | Incident tooling | Stable core | Operators need recovery paths before scale |
| 7 | Expansion channels and dashboard | All above | Scale comes last |
| 8 | Pinterest activation | Stable core + analytics loop + image format support | Pinterest should launch as a deliberate traffic channel, not as a rushed add-on |

### Hard Dependencies

- `BRAND_VOICE_GUIDE.md` remains the highest authority for content rules.
- Supabase collector tables must keep receiving fresh data.
- GitHub Actions secrets must remain in sync with live platform credentials.
- Meta publishing depends on token validity and a public image URL for Instagram.
- Smart strategy depends on working collectors and enough historical data.

---

## 7. Human Approval & Escalation Rules

### Content Approval Rules

| Content Type | Default Mode |
|-------------|--------------|
| `parenting-tip` | Auto |
| `free-coloring` | Auto |
| `blog-share` | Auto |
| `community` | Auto |
| `fun-fact` | Auto |
| `engagement` | Auto |
| `book-promo` | Auto, as long as ratio limits are respected |
| `share-earn` | Auto after validator confirms reward-system accuracy |
| `giveaway` | Auto only for evergreen rules; campaign changes require review |
| Winner announcement or sensitive milestone post | Human review |
| Any content referencing identifiable family details | Human review |

### Comment / Reply Escalation Rules

**Agent may auto-reply to:**

- compliments,
- simple feature questions,
- thank-yous,
- “where do I start?” questions,
- neutral parenting/activity questions.

**Agent must escalate to human when a comment mentions:**

- shipping,
- refund,
- damaged product,
- child safety,
- privacy,
- legal threat,
- scam accusation,
- harassment,
- repeated negative sentiment,
- press or collaboration requests.

### Outbound Engagement Rules

- Bluesky outreach may continue under caps.
- Facebook and Instagram outbound engagement should remain manual or disabled until a separate approval decision is made.
- Never automate high-volume likes/comments simply to imitate larger creator accounts.

---

## 8. Risk Register & Failure Modes

| ID | Risk | Likelihood | Impact | Prevention | Response |
|----|------|------------|--------|------------|----------|
| R1 | Over-posting on Facebook/Instagram | High | High | Refactor scheduler to platform-aware cadence | Pause scheduled feed posting and revert to anchor-only mode |
| R2 | AI generates off-brand or rule-breaking copy | Medium | High | Add deterministic QA validator | Fallback to templates, review prompt/logs |
| R3 | Meta token expires | High | High | Monthly token check + diagnostics workflow | Refresh token, update secret, rerun diagnostics |
| R4 | Instagram publish fails due to image URL issues | Medium | Medium | Enforce public image URL validation | Skip IG, log incident, republish once fixed |
| R5 | Duplicate posts after cache/state disruption | Medium | High | Safer state handling + idempotency strategy | Pause workflow, inspect state files, manually resume |
| R6 | Collector failures make smart mode misleading | Medium | High | Data freshness checks + minimum thresholds | Disable smart mode temporarily |
| R7 | Reward-system wording is inaccurate | Medium | High | Validation for Tickets vs Peanuts rules | Remove post if needed, publish corrected clarification |
| R8 | Auto-replies answer a sensitive complaint poorly | Medium | High | Risk classification + escalation list | Disable auto-replies and take over manually |
| R9 | Bluesky outreach feels spammy | Medium | Medium | Caps, cooldowns, safety filter | Lower limits or pause outreach |
| R10 | Secret drift between GitHub, local, and production | Medium | High | Secret inventory + rotation checklist | Audit secrets and re-sync owners/values |
| R11 | Platform API changes or rate limits | Low | Medium | Keep connectors isolated and diagnosable | Gracefully skip platform and investigate connector |
| R12 | Weekly intelligence overreacts to sparse data | Medium | Medium | Require minimum data volume before strategy shifts | Ignore recommendations for that period |
| R13 | Negative campaign response escalates in comments | Low | High | Human review on risky themes and promotions | Pause replies, pin clarification, respond manually |
| R14 | Scheduler logic becomes too opaque to maintain | Medium | Medium | Move rules from bash into config | Simplify and document slot logic |
| R15 | Pinterest launched without board strategy | Medium | Medium | Create board taxonomy before connector launch | Pause Pinterest publishing and reorganize boards |
| R16 | Pinterest traffic not attributable | Medium | High | Add Pinterest-specific UTMs and analytics classification first | Disable Pinterest smart decisions until attribution is fixed |
| R17 | Pinterest assets use wrong aspect ratio | High | Medium | Add vertical creative generation rules | Regenerate assets before republishing pins |
| R18 | Pinterest API/app approval delays block rollout | Medium | Low | Treat Pinterest as non-blocking later-phase work | Continue manual profile setup until API access is ready |

### Highest-Risk Areas

The three operational risks to prioritize are:

1. **Meta token expiry**
2. **Publishing volume mismatch across platforms**
3. **No validation layer between AI output and publication**

---

## 9. Incident Playbooks

## Playbook A — Meta Publishing Failure

**Symptoms:** Facebook or Instagram posts stop appearing, workflow logs show Meta API errors.

### Response

1. Run `diagnose-social.yml`.
2. Confirm whether the token is expired or invalid.
3. Refresh the token and update the GitHub secret.
4. Re-run diagnostics.
5. Trigger a manual post in dry-run mode, then live mode.
6. If Instagram alone fails, verify the image URL is public and valid.

---

## Playbook B — Duplicate or Incorrect Post Published

**Symptoms:** Same concept appears twice, wrong platform copy goes live, wrong CTA or reward copy is published.

### Response

1. Pause scheduled publishing.
2. Delete or hide the duplicate/incorrect post if appropriate.
3. Inspect `.post-state.json` and `.post-history.json` handling.
4. Verify whether cache restore/save behaved as expected.
5. Re-enable publishing only after the scheduler or state issue is fixed.

---

## Playbook C — Off-Brand AI Output

**Symptoms:** Content sounds salesy, repetitive, inaccurate, or violates brand rules.

### Response

1. Stop live posting for that slot.
2. Re-run in `--no-ai` or template fallback mode if available.
3. Review the offending prompt, smart context, and recent history summary.
4. Update validation rules to catch the failure class in the future.
5. Review the next 3 scheduled posts before restoring full automation.

---

## Playbook D — Engagement Incident

**Symptoms:** Auto-replies respond badly, a complaint escalates, or outreach seems spammy.

### Response

1. Pause `social-engage.yml` or run manual-only mode.
2. Take over replies manually.
3. Review the triggering comment set and AI outputs.
4. Add or tighten escalation keywords.
5. Resume only after confirming safer guardrails.

---

## Playbook E — Analytics Blind Spot

**Symptoms:** Smart mode has no useful context, weekly intelligence is empty or misleading, traffic attribution disappears.

### Response

1. Run collectors manually in dry-run and live mode as needed.
2. Confirm Supabase secrets and table writes are healthy.
3. Validate UTM tagging on the latest posts.
4. Check whether pageviews are being recorded.
5. Disable smart-mode strategy changes until the data is trustworthy again.

---

## Playbook F — Secret Compromise or Rotation Event

**Symptoms:** Suspected leak, sudden auth failures, or operator turnover.

### Response

1. Rotate the affected secret immediately.
2. Update GitHub Actions secrets.
3. Re-run diagnostics or test workflows.
4. Verify there are no stale local copies in operator machines or temporary files.
5. Record the rotation date and owner.

---

## Playbook G — Pinterest Activation or Publishing Failure

**Symptoms:** Pinterest profile is set up but pins do not publish, boards are wrong, traffic is not being attributed, or the API/app access is not ready.

### Response

1. Confirm whether the issue is profile setup, board mapping, API auth, or creative format.
2. If the connector is not live yet, continue with manual Pinterest profile setup only.
3. If the connector is live, switch Pinterest to dry-run or paused mode.
4. Validate vertical image generation and public image URLs.
5. Confirm Pinterest UTMs are present and analytics classification recognizes Pinterest traffic.
6. Resume only after the profile, connector, board strategy, and attribution are aligned.

---

## 10. Testing & Launch Checklist

### Pre-Launch Content and Policy Checks

- Voice guide reviewed and current
- Chubby reference reviewed and current
- Reward-system rules verified
- Approval matrix agreed
- Production cadence agreed

### Publishing Tests

- `social:generate` preview tested for every content type
- `social:post --dry-run` tested for each platform
- Template fallback tested
- AI generation failure path tested
- Image resolution path tested for:
  - book cover,
  - blog image,
  - AI-generated image

### Engagement Tests

- `social:monitor --dry-run` tested
- `social:outreach --dry-run` tested
- Reply escalation keywords reviewed
- Bluesky caps and cooldowns confirmed

### Data & Intelligence Tests

- Collectors run successfully in dry-run and live mode
- `content_performance` receives new linked rows
- Weekly intelligence completes without errors
- Smart context is not empty when enough data exists

### Incident Readiness Tests

- Diagnostics workflow run successfully
- Token rotation instructions validated
- Safe-mode procedure documented and understood
- Operator knows how to pause post and engage workflows

---

## 11. Success Metrics & Review Rhythm

### Operational Success Metrics

| Metric | Target |
|-------|--------|
| Publishing failure rate | < 5% |
| Duplicate posts | 0 |
| Invalid AI posts published | 0 |
| Auto-reply incidents requiring apology | 0 |
| Metrics freshness gap | < 24 hours |
| Time to diagnose Meta failure | < 30 minutes |

### Growth Metrics

| Metric | What It Measures |
|-------|------------------|
| Daily website visits | Overall reach effectiveness |
| Newsletter signups | Lead capture |
| Coloring Corner visits/download intent | Top-of-funnel usefulness |
| Gallery submissions | Community participation |
| Amazon clicks | Commercial intent |
| Social comments and shares | Community resonance |
| Follower growth by platform | Channel momentum |

### Review Rhythm

| Frequency | Review |
|----------|--------|
| Daily | Scheduled posts, comments, incidents |
| Weekly | Performance by type/platform, top pages, outreach results |
| Monthly | Cadence, platform mix, campaign focus, secret health |
| Quarterly | Expansion decisions: Pinterest, admin UI, new channels |

---

## 12. Files, Workflows, and Secrets Inventory

### Key Files in Scope

| File | Purpose |
|------|---------|
| `BRAND_VOICE_GUIDE.md` | Brand rules and tone |
| `CHUBBY_AGENT_REFERENCE.md` | Product and feature knowledge |
| `scripts/social/post.mjs` | Main publisher |
| `scripts/social/ai-generate.mjs` | AI content generation |
| `scripts/social/content-templates.mjs` | Template fallback |
| `scripts/social/image-generate.mjs` | Social image generation |
| `scripts/social/engage.mjs` | Replies and outreach |
| `scripts/social/diagnose.mjs` | Manual diagnostics |
| `scripts/agents/collect-social-metrics.mjs` | Platform metrics collector |
| `scripts/agents/aggregate-traffic.mjs` | Traffic source aggregation |
| `scripts/agents/link-content-performance.mjs` | Attribution linker |
| `scripts/agents/smart-selector.mjs` | Smart context injector |
| `scripts/agents/weekly-intelligence.mjs` | Weekly recommendations engine |

### State Files to Protect

| File | Why It Matters |
|------|----------------|
| `scripts/social/.post-state.json` | Rotation sequence continuity |
| `scripts/social/.post-history.json` | Anti-repetition memory |
| `scripts/social/.engage-state.json` | Reply and outreach cooldown history |

### Workflow Inventory

| Workflow | Role |
|---------|------|
| `social-post.yml` | Publishing executor |
| `social-engage.yml` | Reply and outreach executor |
| `agent-collectors.yml` | Metrics ingestion |
| `agent-intelligence.yml` | Weekly strategy brain |
| `diagnose-social.yml` | Recovery / diagnostics |

### Future Pinterest Files to Add

| File | Purpose |
|------|---------|
| `scripts/social/platforms/pinterest.mjs` | Pinterest connector |
| `scripts/social/pinterest-format.mjs` or equivalent | Pin-specific copy/creative formatter |
| future scheduler config file | Board routing and slot rules |

### Secret Inventory

| Secret | Used For | Criticality |
|--------|----------|-------------|
| `BLUESKY_HANDLE` | Bluesky posting + outreach | High |
| `BLUESKY_PASSWORD` | Bluesky posting + outreach | High |
| `META_PAGE_ACCESS_TOKEN` | Facebook + Instagram publish/read/reply | High |
| `META_PAGE_ID` | Facebook publish/read | High |
| `META_IG_USER_ID` | Instagram publish/read | High |
| `ANTHROPIC_API_KEY` | AI content and reply generation | High |
| `NANO_BANANA_API_KEY` | AI image generation | Medium |
| `PUBLIC_SUPABASE_URL` | Collectors and smart context | High |
| `SUPABASE_SERVICE_ROLE_KEY` | Collectors and intelligence DB writes | High |
| `RESEND_API_KEY` | Weekly intelligence email reports | Medium |
| `ANALYTICS_EMAIL` | Weekly intelligence recipient | Medium |

### Future Pinterest Secrets

| Secret | Used For | Criticality |
|--------|----------|-------------|
| `PINTEREST_APP_ID` | Pinterest app identity | Medium |
| `PINTEREST_APP_SECRET` | Pinterest OAuth / API auth | High |
| `PINTEREST_ACCESS_TOKEN` | Organic pin publishing | High |
| `PINTEREST_DEFAULT_BOARD_ID` | Default board routing | Medium |

### Immediate Next Implementation Priorities

1. Add the validation / QA gate before publish.
2. Refactor the scheduler so production volume matches channel strategy.
3. Add safe-mode controls for automated posting.
4. Add an escalation classifier for replies.
5. Operationalize weekly review of collector health and smart recommendations.

---

## 13. Natural Next Steps

These are the natural next actions that should happen after adopting this document.

### Immediate Next Steps

1. Convert this plan into a technical backlog with P0, P1, and P2 tasks.
2. Refactor `.github/workflows/social-post.yml` so the live cadence matches the recommended strategy in this document.
3. Implement the validation / QA gate before any further automation expansion.
4. Add safe-mode workflow controls so posting can be downgraded quickly during incidents.
5. Add the first reply-escalation classifier for risky comments.

### Short-Term Next Steps

1. Run the scheduler for one week in dry-run or low-risk mode and review the outputs.
2. Verify collectors and intelligence outputs remain healthy under the new cadence.
3. Review the content mix weekly and tune anchor vs support slots.
4. Define who owns token rotation, secret audits, and incident response.

### Pinterest-Specific Next Steps

Pinterest is now explicitly part of the future roadmap for this system.

The next natural Pinterest steps are:

1. Create and brand the Pinterest Business profile.
2. Define board strategy and naming.
3. Prepare the website flow that Pinterest will drive users into first.
4. Add Pinterest to the implementation backlog after the QA and scheduler work is complete.
5. Implement the Pinterest connector and workflow later as a dedicated task track.

### Website Flow Pinterest Should Support Later

When we implement Pinterest together later, the preferred traffic flow should be:

1. Pinterest Pin
2. Website landing page
3. Registration or newsletter signup
4. Coloring Corner / blog / gallery engagement
5. Community loop and optional book discovery

This keeps Pinterest aligned with the website growth loop instead of sending cold traffic straight to Amazon too early.

---

## Final Principle

The system should behave like a careful operator with memory, rules, and escalation paths.

If there is ever a tradeoff between **more automation** and **more brand safety**, the correct choice is brand safety.

That is how this becomes a durable growth system instead of a content bot.