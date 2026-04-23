# Database Restore Runbook

> **Scope:** Restore the Little Chubby Press Supabase database from a daily physical snapshot after data loss, corruption, or a destructive migration.
> **Owner:** Repository owner (operator).
> **Last verified:** April 23, 2026.
> **Targets:** RPO <= 24h, RTO <= 4h.

This runbook assumes Supabase Pro with **daily physical backups** and **no PITR add-on**. If PITR is later enabled, Step 3 (snapshot selection) changes to a timestamp slider, everything else stays.

---

## 0. Decide the incident mode

Before doing anything, classify the incident:

| Mode | Signal | Action |
|---|---|---|
| **A. Accidental row/table deletion** | Reversible with surgical SQL (e.g., we still know the data) | Do NOT restore. Fix manually with an additive SQL migration. Skip this runbook. |
| **B. Widespread corruption or bad migration** | DB integrity lost, schema broken, or sensitive data leaked | Proceed with full restore below. |
| **C. Entire project unreachable** | Supabase dashboard cannot open the project; region outage | Proceed with "Restore to new project" flow (Step 8). |

If Mode A: stop. Use `supabase db diff` + a new additive migration instead.

---

## 1. Freeze writes to the current DB

1. In Vercel dashboard, set `SUPABASE_SERVICE_ROLE_KEY` and `PUBLIC_SUPABASE_ANON_KEY` to empty strings in Production, then click **Redeploy** on the latest deployment. This takes the app into read-error mode but blocks further writes.
2. Alternative (faster): in Supabase dashboard -> Settings -> API -> **Pause project**. Pausing prevents all DB traffic.

Goal: no new writes while we restore.

---

## 2. Capture current state (for forensics)

Before overwriting anything, dump whatever is still readable. Do this even if the DB is partially broken.

```powershell
# Requires Docker Desktop for `supabase db dump`, OR use pg_dump with the connection string.
$ts = Get-Date -Format "yyyyMMdd-HHmmss"
$dir = "$env:USERPROFILE\lcp-backups"
New-Item -ItemType Directory -Force -Path $dir | Out-Null
# Option A - Supabase CLI (needs Docker):
supabase db dump --linked --file "$dir\pre-restore-$ts.sql"
# Option B - pg_dump direct (no Docker):
# $env:PGPASSWORD = "<DB password>"
# pg_dump "host=aws-0-us-east-1.pooler.supabase.com port=5432 dbname=postgres user=postgres.<project-ref> sslmode=require" > "$dir\pre-restore-$ts.sql"
```

Keep this file on local disk only. Never commit dumps to git.

---

## 3. Choose the snapshot to restore

1. Open Supabase dashboard -> `little-chubby-press` -> **Database** -> **Backups** -> tab **Scheduled backups**.
2. Snapshots are listed in UTC, most recent first.
3. Pick the latest snapshot **before** the incident time. Note the exact timestamp.

Example seen during verification: `23 Apr 2026 09:56:01 (+0000) PHYSICAL` -> Restore.

---

## 4. Execute the restore

**Same-project restore (Mode B):**

1. Click **Restore** on the chosen snapshot row.
2. Confirm the warning dialog. This OVERWRITES the current database.
3. Wait for the job to finish. Typical duration: 2-15 minutes depending on size.
4. Dashboard will show "Restore complete" and the DB goes back online.

**Destructive warning:** Restore is irreversible in-place. Anything written after the snapshot timestamp is lost unless it was captured in Step 2.

---

## 5. Verify the restore

Run these checks in order. Do not restore user traffic until all four pass.

### 5a. Schema integrity

```powershell
# From the repo root
supabase db pull --linked
git diff supabase/migrations/
```

Zero drift expected. If there is drift, the snapshot is older than our current migrations - re-apply the missing migrations with `supabase db push --linked` after careful review.

### 5b. Row counts sanity

In Supabase SQL editor:

```sql
select 'users' as t, count(*) from public.users
union all select 'reviews', count(*) from public.reviews
union all select 'peanuts_ledger', count(*) from public.peanuts_ledger
union all select 'newsletter_subscribers', count(*) from public.newsletter_subscribers
union all select 'gifts', count(*) from public.gifts;
```

Cross-check with the numbers you remember from before the incident. Significant drops are expected (this is a restore) but they should match the snapshot age.

### 5c. RLS still enforced

```sql
select schemaname, tablename, rowsecurity
from pg_tables
where schemaname = 'public'
order by tablename;
```

Every table must have `rowsecurity = true`. If any row is `false`, a migration is missing.

### 5d. App health

```powershell
curl.exe -s -o NUL -w "health=%{http_code} time=%{time_total}s`n" https://www.littlechubbypress.com/api/health/
curl.exe -s https://www.littlechubbypress.com/api/health/
```

Expect `200` and body `{"ok":true,"db_ms":<number>}`.

---

## 6. Resume writes

1. If project was paused -> click **Resume** in Supabase dashboard.
2. If env vars were zeroed in Vercel -> restore the correct values (they are documented in [APP_MASTER_QUALITY_REFERENCE.md -> VII-A](APP_MASTER_QUALITY_REFERENCE.md)), then **Redeploy** latest production deployment.
3. Smoke test: `/`, `/en/`, `/es/`, `/api/health/`, `/api/me/` should all return `200`.

---

## 7. Rotate secrets IF the incident involved a leak

If the cause of restore was credential exposure (service role key in logs, compromised admin account, etc.):

1. Supabase dashboard -> **Settings** -> **API** -> **Reset** both anon and service role keys.
2. Vercel dashboard -> **Settings** -> **Environment Variables** -> update the new keys in Production + Preview.
3. Redeploy production.
4. Audit the exposure window: search Sentry and Vercel logs for unauthorized access patterns.
5. Log the incident in `/docs/` with date, cause, remediation.

---

## 8. "Restore to new project" (Mode C - full region outage)

1. Supabase dashboard -> Database -> Backups -> tab **Restore to new project** (BETA).
2. Pick a different region than the current one (e.g., if us-east-1 is down, use us-west-1).
3. Select the most recent snapshot.
4. Supabase creates a brand-new project from it. This takes 10-30 minutes.
5. Once ready, collect the new project's: `PROJECT_REF`, `anon key`, `service_role key`, `DB URL`.
6. Update Vercel env vars to point at the new project.
7. Redeploy production.
8. Update the Supabase CLI link locally: `supabase link --project-ref <new-ref>`.
9. Once the primary region is back, decide whether to migrate back (rare; only if costs or latency demand it).

---

## 9. Post-incident actions (within 24 hours)

1. Write a short incident note: what, when, snapshot used, data lost, duration of downtime.
2. Update this runbook if any step needed improvisation.
3. Review Sentry issues for any error that should have caught the cause earlier.
4. Verify the next scheduled Supabase backup ran successfully.

---

## Restore drill (preventive)

The master doc requires a first restore drill before next monetization milestone. Suggested procedure:

1. Create a throwaway Supabase project in the same org.
2. Use **Restore to new project** from a recent LCP snapshot into it.
3. Apply the verification queries from Section 5 against the throwaway project.
4. Record wall-clock time from "click Restore" to "verified clean": that is our measured RTO.
5. Delete the throwaway project.

Target cadence once monetization launches: at least annually.

---

## Related documents

- [docs/APP_MASTER_QUALITY_REFERENCE.md - VII-E Backup & Disaster Recovery](APP_MASTER_QUALITY_REFERENCE.md)
- [docs/DEPLOY_CHECKLIST.md](DEPLOY_CHECKLIST.md) (standard deploy - not incident-specific)
- Supabase docs: <https://supabase.com/docs/guides/platform/backups>
