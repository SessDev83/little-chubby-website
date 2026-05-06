#!/usr/bin/env node
/**
 * Aggregate visitor behavior report from Supabase.
 * Prints counts only; no emails, user IDs, or raw personal data.
 */
import { createClient } from "@supabase/supabase-js";
import { canonicalEventName } from "../src/lib/analytics-event-contract.mjs";

const args = process.argv.slice(2);
const daysIndex = args.indexOf("--days");
const days = daysIndex >= 0 && args[daysIndex + 1] ? Number(args[daysIndex + 1]) : 30;
const safeDays = Number.isFinite(days) && days > 0 && days <= 365 ? Math.floor(days) : 30;

const url = process.env.PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env");
  process.exit(1);
}

const sb = createClient(url, key, { auth: { persistSession: false } });
const since = new Date(Date.now() - safeDays * 86400_000).toISOString();
const MAX_ROWS = 10000;
const PAGE_SIZE = 1000;

async function selectRows(table, columns, { timeColumn = "created_at", orderColumn = timeColumn } = {}) {
  const rows = [];
  let exactCount = 0;
  for (let from = 0; from < MAX_ROWS; from += PAGE_SIZE) {
    const to = Math.min(from + PAGE_SIZE - 1, MAX_ROWS - 1);
    const { data, error, count } = await sb
      .from(table)
      .select(columns, { count: "exact" })
      .gte(timeColumn, since)
      .order(orderColumn, { ascending: false })
      .range(from, to);
    if (error) return { rows, count: exactCount || rows.length, error: error.message };
    if (from === 0) exactCount = count ?? data?.length ?? 0;
    rows.push(...(data || []));
    if (!data || data.length < PAGE_SIZE || rows.length >= exactCount) break;
  }
  return { rows, count: exactCount || rows.length, error: "" };
}

function countBy(rows, keyFn) {
  const map = new Map();
  for (const row of rows) {
    const key = keyFn(row) || "(unknown)";
    map.set(key, (map.get(key) || 0) + 1);
  }
  return map;
}

function topRows(map, limit = 12) {
  return [...map.entries()].sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0]))).slice(0, limit);
}

function printTop(title, map, limit = 12) {
  console.log(`\n${title}`);
  const rows = topRows(map, limit);
  if (!rows.length) {
    console.log("  (none)");
    return;
  }
  for (const [label, count] of rows) console.log(`  ${String(count).padStart(5)}  ${label}`);
}

function referrerHost(referrer) {
  try {
    return new URL(referrer).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

function sourceForPageview(row) {
  if (row.utm_source) return row.utm_source;
  const host = referrerHost(row.referrer);
  if (!host) return "direct";
  if (host === "littlechubbypress.com" || host.endsWith(".littlechubbypress.com")) return "internal";
  return host;
}

function eventCounts(events) {
  const counts = new Map();
  for (const event of events) {
    const name = canonicalEventName(event.event_name || "");
    if (!name) continue;
    counts.set(name, (counts.get(name) || 0) + 1);
  }
  return counts;
}

function countEvent(counts, name) {
  return counts.get(canonicalEventName(name)) || 0;
}

function pathGroup(path = "") {
  if (path === "/" || /^\/(en|es)\/?$/.test(path)) return "home";
  if (path.includes("/coloring-corner")) return "coloring";
  if (path.includes("/books/")) return "books";
  if (path.includes("/articles/") || path.includes("/blog/")) return "longform";
  if (path.includes("/fun-facts/")) return "fun-facts";
  if (path.includes("/newsletter")) return "newsletter";
  if (path.includes("/register")) return "register";
  if (path.includes("/login")) return "login";
  if (path.includes("/lottery")) return "lottery";
  if (path.includes("/reviews")) return "reviews";
  if (path.includes("/bio")) return "bio";
  return "other";
}

const [{ rows: pageviews, count: pageviewCount, error: pageviewError }, { rows: events, count: eventCount, error: eventError }, { rows: downloads, count: downloadCount, error: downloadError }, { count: profileCount, error: profileError }] = await Promise.all([
  selectRows("pageviews", "path,referrer,visitor_hash,country,utm_source,utm_medium,utm_campaign,utm_content,landing_page,created_at"),
  selectRows("conversion_events", "event_name,path,visitor_hash,props,lang,created_at"),
  selectRows("artwork_downloads", "artwork_id,user_id,downloaded_at", { timeColumn: "downloaded_at" }),
  selectRows("profiles", "id,created_at"),
]);

for (const [label, error] of [["pageviews", pageviewError], ["conversion_events", eventError], ["artwork_downloads", downloadError], ["profiles", profileError]]) {
  if (error) console.warn(`Warning: ${label}: ${error}`);
}

const coloringPageviews = pageviews.filter((row) => String(row.path || "").includes("/coloring-corner"));
const uniqueVisitors = new Set(pageviews.map((row) => row.visitor_hash).filter(Boolean)).size;
const coloringVisitors = new Set(coloringPageviews.map((row) => row.visitor_hash).filter(Boolean)).size;
const uniqueDownloadUsers = new Set(downloads.map((row) => row.user_id).filter(Boolean)).size;
const eventsByName = eventCounts(events);
const bookIntent = countEvent(eventsByName, "book_page_viewed") + countEvent(eventsByName, "sample_viewed") + countEvent(eventsByName, "sample_cta_click") + countEvent(eventsByName, "amazon_click");

console.log(`\nBehavior report - last ${safeDays} day(s) - since ${since.slice(0, 10)}\n`);
console.log("SUMMARY");
console.log(`  Pageviews:              ${pageviewCount.toLocaleString()} (${pageviews.length.toLocaleString()} loaded)`);
console.log(`  Unique visitors:        ${uniqueVisitors.toLocaleString()}`);
console.log(`  Tracked events:         ${eventCount.toLocaleString()} (${events.length.toLocaleString()} loaded)`);
console.log(`  New profiles:           ${profileCount.toLocaleString()}`);
console.log(`  Coloring pageviews:     ${coloringPageviews.length.toLocaleString()}`);
console.log(`  Coloring visitors:      ${coloringVisitors.toLocaleString()}`);
console.log(`  Real artwork downloads: ${downloadCount.toLocaleString()}`);
console.log(`  Unique download users:  ${uniqueDownloadUsers.toLocaleString()}`);

console.log("\nKEY ACTIONS");
console.log(`  Lead magnet shown:      ${countEvent(eventsByName, "lead_magnet_shown").toLocaleString()}`);
console.log(`  Newsletter submitted:   ${countEvent(eventsByName, "newsletter_submitted").toLocaleString()}`);
console.log(`  Register started:       ${countEvent(eventsByName, "register_started").toLocaleString()}`);
console.log(`  Register completed:     ${countEvent(eventsByName, "register_completed").toLocaleString()}`);
console.log(`  Login attempts:         ${countEvent(eventsByName, "login_submit_attempt").toLocaleString()}`);
console.log(`  Login completed:        ${countEvent(eventsByName, "login_completed").toLocaleString()}`);
console.log(`  Book intent events:     ${bookIntent.toLocaleString()}`);
console.log(`  Amazon clicks:          ${countEvent(eventsByName, "amazon_click").toLocaleString()}`);
console.log(`  Share clicks:           ${countEvent(eventsByName, "share_click").toLocaleString()}`);
console.log(`  Share completed:        ${countEvent(eventsByName, "share_completed").toLocaleString()}`);
console.log(`  Download link clicks:   ${countEvent(eventsByName, "download_link_clicked").toLocaleString()}`);
console.log(`  Download attempts:      ${countEvent(eventsByName, "download_attempt").toLocaleString()}`);
console.log(`  Download completed:     ${countEvent(eventsByName, "download_completed").toLocaleString()}`);
console.log(`  Download blocked:       ${countEvent(eventsByName, "download_blocked").toLocaleString()}`);
console.log(`  Download errors:        ${countEvent(eventsByName, "download_error").toLocaleString()}`);

printTop("TOP PAGE GROUPS", countBy(pageviews, (row) => pathGroup(row.path)), 12);
printTop("TOP PATHS", countBy(pageviews, (row) => row.path || "/"), 15);
printTop("TOP SOURCES", countBy(pageviews, sourceForPageview), 15);
printTop("TOP UTM CONTENT", countBy(pageviews.filter((row) => row.utm_content), (row) => row.utm_content), 15);
printTop("TOP EVENTS", eventsByName, 20);
printTop("COLORING PATHS", countBy(coloringPageviews, (row) => row.path || "/"), 20);

console.log("\nREAD");
if (coloringPageviews.length > 0 && countEvent(eventsByName, "download_attempt") === 0) {
  console.log("  Visitors reached coloring pages, but the old tracker did not record download intent. The new instrumentation will start filling attempts/blocked/errors from this deployment onward.");
}
if (downloadCount === 0 && countEvent(eventsByName, "register_completed") === 0) {
  console.log("  Real downloads are zero because no completed registration/download path was measured in this window.");
}
console.log("  Amazon clicks are buyer-intent signals only, not confirmed purchases.\n");