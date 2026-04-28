---
name: phase-readiness-audit
description: 'Audit a 2026 strategy phase for implementation coverage and next-phase readiness. Use when: diagnosing Phase 01, Phase 1, measurement foundation, strategy package completion, production readiness, owner gates, or whether to proceed to the next phase.'
argument-hint: 'phase name or doc path, e.g. Phase 01 Measurement Foundation'
---

# Phase Readiness Audit

## Outcome

Produce a practical readiness verdict for a 2026 strategy phase by comparing the strategy document, implementation packages, app code, migrations, admin surfaces, scripts, CI, runtime evidence, and open owner decisions.

The result should answer:

- What the phase promised.
- What is actually implemented in the app.
- What is shipped, partial, pending, or blocked.
- Which evidence proves the claim.
- Whether it is safe to start the next phase.

## Procedure

1. Identify the source-of-truth phase document in `docs-internal/2026-strategy/`.
2. Extract the phase purpose, package list, completion checklist, decision register, measurement windows, and explicit must-not-close gates.
3. Build a checklist from the document before judging the code.
4. Search the workspace for each package, event contract, route, helper, migration, script, workflow, and admin page named by the phase.
5. Prefer current app evidence over stale tracker claims. Treat docs as planning evidence, not proof by themselves.
6. Verify implementation depth, not only file presence: read representative helpers, endpoints, layouts, migrations, admin pages, and smoke scripts.
7. Check for mismatches between approved contracts and code, especially event names, props, privacy guardrails, owner decisions, and measurement-window dates.
8. Run the smallest relevant local checks first. For this repo, prefer `npm run admin:kpi-check`, `npm run check`, and `npm run build` when readiness depends on the admin KPI or Astro layer.
9. Classify each item as `Confirmed`, `Partial`, `Pending`, `Blocked`, or `Historical/Stale`.
10. Give one direct verdict: `Ready`, `Conditionally ready`, or `Not ready yet`.

## Decision Rules

- If implementation packages are complete but the measurement window is still open, the phase is implementation-complete but not fully closed.
- If owner decisions are pending, downstream work that depends on those decisions is blocked.
- If data-health checks are missing or stale, do not approve automation, agent autonomy, paid campaigns, or major expansion.
- If a dashboard exists but cannot explain source, action, retention, and book intent, do not call the phase complete.
- If a mismatch exists between a strategy contract and actual emitted events, call it out as a contract-alignment issue even if the app still builds.
- If old docs disagree with current code, cite both and recommend which source should be updated or superseded.

## Quality Bar

The audit is complete when it includes:

- A short executive verdict.
- A phase checklist with status per major gate.
- Evidence grouped by code/docs/migrations/admin/CI.
- Risks ordered by readiness impact.
- A clear recommendation for what can proceed now, what should wait, and what owner decision is needed next.
- Verification commands run, or a clear note explaining why they were not run.

## Report Shape

Use this structure:

```markdown
**Verdict**
<Ready / Conditionally ready / Not ready yet, with one-sentence reason.>

**Implemented**
- <Confirmed package or gate> — <evidence file>

**Gaps**
- <Risk> — <why it matters>

**Next-Phase Gate**
- <What can start now>
- <What must wait>
- <Owner decision needed>

**Verification**
- <Command/check result>
```

## Repo-Specific Notes

- Phase 01 lives primarily in `docs-internal/2026-strategy/01-measurement-foundation.md`.
- Phase 02 starts in `docs-internal/2026-strategy/02-audience-validation.md`.
- The Phase 01 admin KPI smoke command is `npm run admin:kpi-check`.
- The event contract helper is `src/lib/analytics-event-contract.mjs`.
- Server-confirmed analytics are handled by `src/lib/server-analytics.ts`.
- Data health is surfaced at `src/pages/admin/data-health.astro`.
- Current app evidence wins over stale implementation-package trackers.
