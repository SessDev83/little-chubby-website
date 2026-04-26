#!/usr/bin/env node
/**
 * scripts/funnel-report.mjs
 *
 * Pkg P5-T6 — print conversion-funnel report from Supabase `conversion_events`
 * + `pageviews`. Uses SUPABASE_SERVICE_ROLE_KEY (RLS policy
 * `service_read_conversion_events`).
 *
 * Usage:
 *   node --env-file=.env scripts/funnel-report.mjs            # last 7 days
 *   node --env-file=.env scripts/funnel-report.mjs --days 30  # last 30 days
 *
 * Requires PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in env (e.g. .env).
 */
import { createClient } from "@supabase/supabase-js";

const args = process.argv.slice(2);
const daysIdx = args.indexOf("--days");
const days = daysIdx >= 0 && args[daysIdx + 1] ? Number(args[daysIdx + 1]) : 7;

const url = process.env.PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env");
  process.exit(1);
}

const sb = createClient(url, key, { auth: { persistSession: false } });
const since = new Date(Date.now() - days * 86400_000).toISOString();

async function countEvent(name) {
  const { count, error } = await sb
    .from("conversion_events")
    .select("*", { head: true, count: "exact" })
    .eq("event_name", name)
    .gte("created_at", since);
  if (error) throw new Error(`count(${name}): ${error.message}`);
  return count ?? 0;
}

async function countPageviews() {
  const { count, error } = await sb
    .from("pageviews")
    .select("*", { head: true, count: "exact" })
    .gte("created_at", since);
  if (error) {
    // Table might not exist or different name — soft fail
    return null;
  }
  return count ?? 0;
}

const FUNNEL = [
  { label: "pageviews", kind: "pageviews" },
  { label: "lead_magnet_shown", kind: "event", name: "lead_magnet_shown" },
  { label: "lead_magnet_submit_success", kind: "event", name: "lead_magnet_submit_success", parent: "lead_magnet_shown" },
  { label: "newsletter_inline_view", kind: "event", name: "newsletter_inline_view" },
  { label: "newsletter_inline_submit_success", kind: "event", name: "newsletter_inline_submit_success", parent: "newsletter_inline_view" },
  { label: "newsletter_confirmed", kind: "event", name: "newsletter_confirmed", parent: "newsletter_inline_submit_success" },
  { label: "register_view", kind: "event", name: "register_view" },
  { label: "register_submit_attempt", kind: "event", name: "register_submit_attempt", parent: "register_view" },
  { label: "register_submit_success", kind: "event", name: "register_submit_success", parent: "register_submit_attempt" },
  { label: "register_submit_error", kind: "event", name: "register_submit_error" },
  { label: "login_view", kind: "event", name: "login_view" },
  { label: "login_submit_attempt", kind: "event", name: "login_submit_attempt", parent: "login_view" },
  { label: "login_submit_success", kind: "event", name: "login_submit_success", parent: "login_submit_attempt" },
  { label: "lottery_view", kind: "event", name: "lottery_view" },
  { label: "lottery_claim_attempt", kind: "event", name: "lottery_claim_attempt", parent: "lottery_view" },
  { label: "lottery_claim_success", kind: "event", name: "lottery_claim_success", parent: "lottery_claim_attempt" },
];

function pad(s, n) { s = String(s); return s + " ".repeat(Math.max(0, n - s.length)); }
function rpad(s, n) { s = String(s); return " ".repeat(Math.max(0, n - s.length)) + s; }

(async () => {
  console.log(`\nFunnel report — last ${days} day(s) — since ${since.slice(0, 10)}\n`);
  const counts = {};
  for (const row of FUNNEL) {
    if (row.kind === "pageviews") counts[row.label] = await countPageviews();
    else counts[row.label] = await countEvent(row.name);
  }

  const W_LABEL = 36, W_COUNT = 10, W_RATE = 14;
  console.log(pad("Step", W_LABEL) + rpad("Count", W_COUNT) + rpad("vs parent", W_RATE));
  console.log("-".repeat(W_LABEL + W_COUNT + W_RATE));
  for (const row of FUNNEL) {
    const c = counts[row.label];
    const cStr = c === null ? "(no data)" : String(c);
    let rate = "";
    if (row.parent && counts[row.parent] && counts[row.label] != null) {
      const p = counts[row.parent];
      const pct = p > 0 ? ((counts[row.label] / p) * 100).toFixed(1) + "%" : "—";
      rate = pct;
    }
    console.log(pad(row.label, W_LABEL) + rpad(cStr, W_COUNT) + rpad(rate, W_RATE));
  }
  console.log("");
})().catch((err) => {
  console.error(err);
  process.exit(2);
});
