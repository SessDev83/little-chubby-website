#!/usr/bin/env node
/**
 * Monthly Intelligence Report — Agent Layer 2
 *
 * Runs on the 1st of each month at 09:30 UTC.
 * Window: the previous calendar month (UTC).
 *
 * Produces:
 *   1. A structured JSON report stored in public.monthly_reports (upsert).
 *   2. agent_decisions rows for each recommendation.
 *   3. Optional email via Resend.
 *
 * Usage:
 *   node scripts/agents/monthly-report.mjs [--dry-run] [--month YYYY-MM]
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { buildReport, deriveRecommendations, renderReportText, renderReportHtml, queryTable } from "./lib/report-builder.mjs";

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
const ANALYTICS_EMAIL = process.env.ANALYTICS_EMAIL || "hello@littlechubbypress.com";
const DRY_RUN = process.argv.includes("--dry-run");

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

function getMonthWindow() {
  const idx = process.argv.indexOf("--month");
  let y, m;
  if (idx !== -1 && /^\d{4}-\d{2}$/.test(process.argv[idx + 1] || "")) {
    [y, m] = process.argv[idx + 1].split("-").map(Number);
  } else {
    const now = new Date();
    // Previous month
    y = now.getUTCFullYear();
    m = now.getUTCMonth(); // 0-indexed; this is already "prev month" if we use (month-1)
    if (m === 0) { y -= 1; m = 12; }
  }
  const start = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0));
  const end = new Date(Date.UTC(y, m, 0, 23, 59, 59, 999)); // day 0 of next = last day of this
  return {
    startISO: start.toISOString(),
    endISO: end.toISOString(),
    monthStart: start.toISOString().slice(0, 10),
    monthEnd: end.toISOString().slice(0, 10),
  };
}

async function buildWeekOverWeek(startISO, endISO) {
  // Pull weekly_reports rows within this month for WoW trend
  const rows = await queryTable(
    SUPABASE_URL, SUPABASE_KEY,
    "weekly_reports",
    `select=week_start,week_end,total_pageviews,unique_visitors,total_posts,total_clicks,total_engagement,new_subscribers&week_start=gte.${startISO.slice(0, 10)}&week_end=lte.${endISO.slice(0, 10)}&order=week_start.asc`
  );
  return rows;
}

async function upsertMonthly(row) {
  if (DRY_RUN) { console.log("[DRY RUN] would upsert monthly_reports row", row.month_start); return; }
  const res = await fetch(`${SUPABASE_URL}/rest/v1/monthly_reports?on_conflict=month_start`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json", Prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify(row),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`monthly_reports upsert failed: ${res.status} ${t}`);
  }
}

async function insertDecisions(recs) {
  if (DRY_RUN || !recs.length) return;
  const rows = recs.map((r) => ({
    decision_type: "monthly_report_recommendation",
    recommended_action: r.action,
    reasoning: r.reasoning,
    confidence_score: r.priority === "high" ? 0.9 : r.priority === "medium" ? 0.7 : 0.5,
    context_data: { priority: r.priority, source: "monthly-report" },
  }));
  await fetch(`${SUPABASE_URL}/rest/v1/agent_decisions`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json", Prefer: "return=minimal",
    },
    body: JSON.stringify(rows),
  });
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
  if (!res.ok) console.log(`⚠️  email send failed: ${res.status}`);
}

async function main() {
  const { startISO, endISO, monthStart, monthEnd } = getMonthWindow();
  console.log(`🤖 Monthly Report — ${monthStart} → ${monthEnd}`);
  console.log(`   Mode: ${DRY_RUN ? "DRY RUN" : "LIVE"}\n`);

  const env = { SUPABASE_URL, SUPABASE_KEY };
  const report = await buildReport(env, startISO, endISO);
  const weekOverWeek = await buildWeekOverWeek(startISO, endISO);
  const recs = deriveRecommendations(report);

  const label = `Monthly Intelligence Report · Little Chubby Press`;
  const text = renderReportText(label, startISO, endISO, report, recs);
  const html = renderReportHtml(label, startISO, endISO, report, recs);
  console.log(text);

  const summary = `${report.total_pageviews} pageviews · ${report.unique_visitors} unique · ${report.total_posts} posts · ${report.total_clicks} clicks · ${report.new_subscribers} new subs · best type: ${report.best_post_types[0]?.post_type || "—"}`;

  await upsertMonthly({
    month_start: monthStart,
    month_end: monthEnd,
    total_pageviews: report.total_pageviews,
    unique_visitors: report.unique_visitors,
    total_posts: report.total_posts,
    total_clicks: report.total_clicks,
    total_engagement: report.total_engagement,
    new_subscribers: report.new_subscribers,
    follower_deltas: report.follower_deltas,
    week_over_week: weekOverWeek,
    top_posts: report.top_posts,
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
  await sendEmail(`📈 Monthly report · ${monthStart.slice(0, 7)}`, text, html);

  console.log(`\n✅ Monthly report stored for ${monthStart.slice(0, 7)}.`);
}

main().catch((err) => { console.error(`\n❌ ${err.message}\n`); process.exit(1); });
