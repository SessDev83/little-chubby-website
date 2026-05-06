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
import { canonicalEventName } from "../src/lib/analytics-event-contract.mjs";

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

const EVENT_COUNT_ALIASES = {
  download_completed: ["download_completed", "download_success"],
  lead_magnet_submitted: ["lead_magnet_submitted", "lead_magnet_submit_success"],
  login_completed: ["login_completed", "login_submit_success"],
  lottery_entered: ["lottery_entered", "lottery_claim_success"],
  lottery_viewed: ["lottery_viewed", "lottery_view"],
  newsletter_submitted: ["newsletter_submitted", "newsletter_inline_submit_success"],
  register_started: ["register_started", "register_submit_attempt", "register_view"],
  register_completed: ["register_completed", "register_submit_success"],
  share_completed: ["share_completed", "share_credit_success"],
  ticket_purchased_with_peanuts: ["ticket_purchased_with_peanuts", "ticket_purchase", "ticket_purchased"],
};

function rawEventNamesFor(name) {
  const canonical = canonicalEventName(name);
  return EVENT_COUNT_ALIASES[canonical] || [canonical];
}

async function countEvent(name) {
  const names = rawEventNamesFor(name);
  const { count, error } = await sb
    .from("conversion_events")
    .select("*", { head: true, count: "exact" })
    .in("event_name", names)
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
  { label: "lead_magnet_submitted", kind: "event", name: "lead_magnet_submitted", parent: "lead_magnet_shown" },
  { label: "newsletter_inline_view", kind: "event", name: "newsletter_inline_view" },
  { label: "newsletter_submitted", kind: "event", name: "newsletter_submitted", parent: "newsletter_inline_view" },
  { label: "newsletter_confirmed", kind: "event", name: "newsletter_confirmed", parent: "newsletter_submitted" },
  { label: "register_started", kind: "event", name: "register_started" },
  { label: "register_completed", kind: "event", name: "register_completed", parent: "register_started" },
  { label: "register_submit_error", kind: "event", name: "register_submit_error" },
  { label: "login_view", kind: "event", name: "login_view" },
  { label: "login_submit_attempt", kind: "event", name: "login_submit_attempt", parent: "login_view" },
  { label: "login_completed", kind: "event", name: "login_completed", parent: "login_submit_attempt" },
  { label: "lottery_viewed", kind: "event", name: "lottery_viewed" },
  { label: "lottery_claim_attempt", kind: "event", name: "lottery_claim_attempt", parent: "lottery_viewed" },
  { label: "lottery_entered", kind: "event", name: "lottery_entered", parent: "lottery_claim_attempt" },
  { label: "book_page_viewed", kind: "event", name: "book_page_viewed" },
  { label: "sample_viewed", kind: "event", name: "sample_viewed", parent: "book_page_viewed" },
  { label: "sample_cta_click", kind: "event", name: "sample_cta_click", parent: "book_page_viewed" },
  { label: "amazon_click", kind: "event", name: "amazon_click", parent: "book_page_viewed" },
  { label: "download_link_clicked", kind: "event", name: "download_link_clicked" },
  { label: "download_attempt", kind: "event", name: "download_attempt" },
  { label: "download_completed", kind: "event", name: "download_completed", parent: "download_attempt" },
  { label: "download_blocked", kind: "event", name: "download_blocked", parent: "download_attempt" },
  { label: "download_error", kind: "event", name: "download_error", parent: "download_attempt" },
  { label: "share_click", kind: "event", name: "share_click" },
  { label: "share_completed", kind: "event", name: "share_completed", parent: "share_click" },
  { label: "share_credit_error", kind: "event", name: "share_credit_error", parent: "share_click" },
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
