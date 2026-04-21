#!/usr/bin/env node
/**
 * Weekly Intelligence Report — Agent Layer 2
 *
 * Runs every Monday at 09:00 UTC (via cron / GitHub Actions / manual).
 * Window: last completed Mon→Sun (ISO week).
 *
 * Produces:
 *   1. A structured JSON report stored in public.weekly_reports (upsert).
 *   2. agent_decisions rows (one per recommendation) for the audit trail.
 *   3. Optional email via Resend (RESEND_API_KEY).
 *   4. stdout text summary for logs / CLI use.
 *
 * Usage:
 *   node scripts/agents/weekly-report.mjs [--dry-run] [--week YYYY-MM-DD]
 *     --week specifies any date within the target week (default: last Mon)
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { buildReport, deriveRecommendations, renderReportText, renderReportHtml } from "./lib/report-builder.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");
const envPath = resolve(ROOT, ".env");
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf-8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("="); if (eq === -1) continue;
    const k = t.slice(0, eq).trim(); const v = t.slice(eq + 1).trim();
    if (!process.env[k]) process.env[k] = v;
  }
}

const SUPABASE_URL = process.env.PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const ANALYTICS_EMAIL = process.env.ANALYTICS_EMAIL || "ivan.c4u@gmail.com";
const DRY_RUN = process.argv.includes("--dry-run");

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

// ─── Date helpers ──────────────────────────────────────────────────────────
function getWeekWindow() {
  const idx = process.argv.indexOf("--week");
  let mon;
  if (idx !== -1 && process.argv[idx + 1]) {
    // Treat the provided date as any day within the target week.
    const ref = new Date(process.argv[idx + 1] + "T00:00:00Z");
    const dow = ref.getUTCDay(); // 0=Sun, 1=Mon
    const diffToMon = (dow + 6) % 7;
    mon = new Date(ref); mon.setUTCDate(mon.getUTCDate() - diffToMon);
  } else {
    // Default: the last fully completed Mon→Sun week (the one that ended
    // on the most recent Sunday that is strictly in the past).
    const today = new Date();
    const dow = today.getUTCDay();
    const daysBackToLastSun = dow === 0 ? 7 : dow; // Sun→7, Mon→1, Tue→2...
    const lastSun = new Date(today);
    lastSun.setUTCDate(lastSun.getUTCDate() - daysBackToLastSun);
    mon = new Date(lastSun); mon.setUTCDate(mon.getUTCDate() - 6);
  }
  mon.setUTCHours(0, 0, 0, 0);
  const sun = new Date(mon); sun.setUTCDate(sun.getUTCDate() + 6);
  sun.setUTCHours(23, 59, 59, 999);
  return { startISO: mon.toISOString(), endISO: sun.toISOString(), weekStart: mon.toISOString().slice(0, 10), weekEnd: sun.toISOString().slice(0, 10) };
}

// ─── Upsert helpers ────────────────────────────────────────────────────────
async function upsertWeekly(row) {
  if (DRY_RUN) { console.log("[DRY RUN] would upsert weekly_reports row", row.week_start); return; }
  const res = await fetch(`${SUPABASE_URL}/rest/v1/weekly_reports?on_conflict=week_start`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json", Prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify(row),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`weekly_reports upsert failed: ${res.status} ${t}`);
  }
}

async function insertDecisions(recs) {
  if (DRY_RUN || !recs.length) return;
  const rows = recs.map((r) => ({
    decision_type: "weekly_report_recommendation",
    recommended_action: r.action,
    reasoning: r.reasoning,
    confidence_score: r.priority === "high" ? 0.9 : r.priority === "medium" ? 0.7 : 0.5,
    context_data: { priority: r.priority, source: "weekly-report" },
  }));
  const res = await fetch(`${SUPABASE_URL}/rest/v1/agent_decisions`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json", Prefer: "return=minimal",
    },
    body: JSON.stringify(rows),
  });
  if (!res.ok) console.log(`⚠️  agent_decisions insert failed: ${res.status}`);
}

async function sendEmail(subject, text, html) {
  if (DRY_RUN || !RESEND_API_KEY) { console.log("(email skipped)"); return; }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: "Little Chubby Analytics <analytics@littlechubbypress.com>",
      to: [ANALYTICS_EMAIL], subject, text, html,
    }),
  });
  if (!res.ok) console.log(`⚠️  email send failed: ${res.status} ${await res.text()}`);
  else console.log("📧 Email sent to", ANALYTICS_EMAIL);
}

// ─── Main ──────────────────────────────────────────────────────────────────
async function main() {
  const { startISO, endISO, weekStart, weekEnd } = getWeekWindow();
  console.log(`🤖 Weekly Report — ${weekStart} → ${weekEnd}`);
  console.log(`   Mode: ${DRY_RUN ? "DRY RUN" : "LIVE"}\n`);

  const env = { SUPABASE_URL, SUPABASE_KEY };
  const report = await buildReport(env, startISO, endISO);
  const recs = deriveRecommendations(report);

  const label = `Weekly Intelligence Report · Little Chubby Press`;
  const text = renderReportText(label, startISO, endISO, report, recs);
  const html = renderReportHtml(label, startISO, endISO, report, recs);
  console.log(text);

  // Summary sentence for the DB row
  const summary = `${report.total_pageviews} pageviews (${report.unique_visitors} unique) · ${report.total_posts} posts · ${report.total_clicks} clicks · ${report.new_subscribers} new subs · top: ${report.best_post_types[0]?.post_type || "—"}`;

  await upsertWeekly({
    week_start: weekStart,
    week_end: weekEnd,
    total_pageviews: report.total_pageviews,
    unique_visitors: report.unique_visitors,
    total_posts: report.total_posts,
    total_clicks: report.total_clicks,
    total_engagement: report.total_engagement,
    new_subscribers: report.new_subscribers,
    follower_deltas: report.follower_deltas,
    top_posts: report.top_posts,
    worst_posts: report.worst_posts,
    best_post_types: report.best_post_types,
    best_posting_hours: report.best_posting_hours,
    source_breakdown: report.source_breakdown,
    blog_performance: report.blog_performance,
    utm_attribution: report.utm_attribution,
    summary,
    recommendations: recs,
    raw_data: {},
  });

  await insertDecisions(recs);
  await sendEmail(`📊 Weekly report · ${weekStart} → ${weekEnd}`, text, html);

  console.log(`\n✅ Weekly report stored for ${weekStart}.`);
}

main().catch((err) => { console.error(`\n❌ ${err.message}\n`); process.exit(1); });
