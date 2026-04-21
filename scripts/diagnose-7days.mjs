#!/usr/bin/env node
/**
 * 7-Day Complete Traffic Diagnostic
 * Pulls everything from Supabase: pageviews, referrers, UTM, countries,
 * per-day trends, blog performance, social metrics, content_performance,
 * newsletter subs, user registrations, traffic_insights aggregates.
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
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
const BLUESKY_HANDLE = process.env.BLUESKY_HANDLE || "littlechubbypress.bsky.social";

if (!SUPABASE_URL || !SUPABASE_KEY) { console.error("Missing Supabase env"); process.exit(1); }

const DAYS = 7;
const now = new Date();
const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59));
const start = new Date(end); start.setUTCDate(start.getUTCDate() - (DAYS - 1)); start.setUTCHours(0, 0, 0, 0);
const startISO = start.toISOString();
const endISO = end.toISOString();

async function q(table, params) {
  const url = `${SUPABASE_URL}/rest/v1/${table}?${params}`;
  const res = await fetch(url, { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, Prefer: "count=exact" } });
  const count = parseInt(res.headers.get("content-range")?.split("/")[1] || "0", 10);
  if (!res.ok) { const t = await res.text(); return { data: [], count: 0, error: t }; }
  const data = await res.json();
  return { data, count };
}

function hostnameOf(url) { try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return url; } }
function classifyReferrer(ref) {
  if (!ref) return { cat: "direct", detail: "(none)" };
  let h; try { h = new URL(ref).hostname.replace(/^www\./, ""); } catch { return { cat: "referral", detail: ref }; }
  if (h.includes("littlechubbypress")) return { cat: "internal", detail: h };
  if (/google|bing|duckduckgo|yahoo|yandex|ecosia|brave/.test(h)) return { cat: "organic", detail: h };
  if (/bsky|bluesky/.test(h)) return { cat: "social", detail: "bluesky" };
  if (/facebook|fb\./.test(h)) return { cat: "social", detail: "facebook" };
  if (/instagram/.test(h)) return { cat: "social", detail: "instagram" };
  if (/pinterest/.test(h)) return { cat: "social", detail: "pinterest" };
  if (/t\.co|twitter|x\.com/.test(h)) return { cat: "social", detail: "twitter/x" };
  if (/tiktok/.test(h)) return { cat: "social", detail: "tiktok" };
  if (/reddit/.test(h)) return { cat: "social", detail: "reddit" };
  if (/youtube|youtu\.be/.test(h)) return { cat: "social", detail: "youtube" };
  if (/linkedin/.test(h)) return { cat: "social", detail: "linkedin" };
  if (/mail|gmail|outlook|yahoo\.com|resend/.test(h)) return { cat: "email", detail: h };
  return { cat: "referral", detail: h };
}
function parseUtm(ref) {
  if (!ref) return null;
  try {
    const u = new URL(ref);
    const s = u.searchParams.get("utm_source");
    const m = u.searchParams.get("utm_medium");
    const c = u.searchParams.get("utm_campaign");
    if (s || m || c) return { source: s, medium: m, campaign: c };
  } catch {}
  return null;
}

function topN(obj, n = 15) { return Object.entries(obj).sort((a, b) => b[1] - a[1]).slice(0, n); }

console.log("═════════════════════════════════════════════════════════════════════");
console.log(`  LITTLE CHUBBY PRESS — 7-DAY COMPLETE TRAFFIC DIAGNOSTIC`);
console.log(`  Window: ${startISO.slice(0,10)} → ${endISO.slice(0,10)} (UTC)`);
console.log("═════════════════════════════════════════════════════════════════════\n");

// ─── PAGEVIEWS ──────────────────────────────────────────────────────────────
console.log("⏳ Fetching pageviews...");
let allRows = []; let offset = 0;
while (true) {
  const { data } = await q("pageviews", `select=path,referrer,visitor_hash,country,created_at&created_at=gte.${startISO}&created_at=lte.${endISO}&order=created_at.asc&limit=1000&offset=${offset}`);
  if (!data.length) break;
  allRows.push(...data);
  if (data.length < 1000) break;
  offset += 1000;
}
console.log(`✓ ${allRows.length} pageviews retrieved\n`);

const totalPV = allRows.length;
const uniqueVisitors = new Set(allRows.map(r => r.visitor_hash)).size;

// Per-day breakdown
const byDay = {};
for (const r of allRows) {
  const d = r.created_at.slice(0, 10);
  if (!byDay[d]) byDay[d] = { pv: 0, uniq: new Set() };
  byDay[d].pv++;
  byDay[d].uniq.add(r.visitor_hash);
}

console.log("📅 DAILY BREAKDOWN");
console.log("─────────────────────────────────────────");
console.log("Date        │ Pageviews │ Unique Visitors");
console.log("─────────────────────────────────────────");
const sortedDays = Object.keys(byDay).sort();
for (const d of sortedDays) {
  console.log(`${d}  │   ${String(byDay[d].pv).padStart(6)}  │   ${String(byDay[d].uniq.size).padStart(6)}`);
}
console.log("─────────────────────────────────────────");
console.log(`TOTAL       │   ${String(totalPV).padStart(6)}  │   ${String(uniqueVisitors).padStart(6)}`);
console.log(`AVG/day     │   ${String(Math.round(totalPV/DAYS)).padStart(6)}  │   (cross-day uniques differ)\n`);

// Source categorization
console.log("🌐 TRAFFIC SOURCES (7-day totals)");
console.log("─────────────────────────────────────────");
const srcCat = {}; const srcDetail = {}; const refHosts = {};
for (const r of allRows) {
  const c = classifyReferrer(r.referrer);
  srcCat[c.cat] = (srcCat[c.cat] || 0) + 1;
  const key = `${c.cat} / ${c.detail}`;
  srcDetail[key] = (srcDetail[key] || 0) + 1;
  if (r.referrer) {
    const h = hostnameOf(r.referrer);
    if (!h.includes("littlechubbypress")) refHosts[h] = (refHosts[h] || 0) + 1;
  }
}
for (const [cat, count] of topN(srcCat, 20)) {
  const pct = ((count / totalPV) * 100).toFixed(1);
  console.log(`  ${cat.padEnd(12)} ${String(count).padStart(5)}  (${pct}%)`);
}
console.log("\n🔗 SOURCE DETAIL (category / source)");
console.log("─────────────────────────────────────────");
for (const [key, count] of topN(srcDetail, 20)) {
  console.log(`  ${key.padEnd(40)} ${String(count).padStart(5)}`);
}

console.log("\n🌍 TOP REFERRER HOSTS");
console.log("─────────────────────────────────────────");
for (const [h, c] of topN(refHosts, 20)) console.log(`  ${h.padEnd(40)} ${String(c).padStart(5)}`);

// UTM
console.log("\n🏷️  UTM-TAGGED TRAFFIC");
console.log("─────────────────────────────────────────");
const utmBreakdown = {};
for (const r of allRows) {
  const u = parseUtm(r.referrer); if (!u) continue;
  const key = `${u.source || "?"} / ${u.medium || "?"} / ${u.campaign || "?"}`;
  utmBreakdown[key] = (utmBreakdown[key] || 0) + 1;
}
if (!Object.keys(utmBreakdown).length) console.log("  (no UTM-tagged pageviews found)");
else for (const [k, v] of topN(utmBreakdown, 20)) console.log(`  ${k.padEnd(55)} ${String(v).padStart(4)}`);

// Top pages
console.log("\n📄 TOP PAGES");
console.log("─────────────────────────────────────────");
const pageCounts = {};
for (const r of allRows) pageCounts[r.path] = (pageCounts[r.path] || 0) + 1;
for (const [p, c] of topN(pageCounts, 25)) console.log(`  ${String(c).padStart(5)}  ${p}`);

// Blog posts
console.log("\n📝 BLOG POSTS (pages containing /blog/)");
console.log("─────────────────────────────────────────");
const blogCounts = {};
for (const [p, c] of Object.entries(pageCounts)) {
  if (p.includes("/blog/") && p !== "/blog" && p !== "/blog/") blogCounts[p] = c;
}
if (!Object.keys(blogCounts).length) console.log("  (no blog-post pageviews)");
else for (const [p, c] of topN(blogCounts, 20)) console.log(`  ${String(c).padStart(4)}  ${p}`);

// Countries
console.log("\n🗺️  TOP COUNTRIES");
console.log("─────────────────────────────────────────");
const cc = {};
for (const r of allRows) if (r.country) cc[r.country] = (cc[r.country] || 0) + 1;
for (const [k, v] of topN(cc, 15)) {
  const pct = ((v / totalPV) * 100).toFixed(1);
  console.log(`  ${k.padEnd(6)} ${String(v).padStart(5)}  (${pct}%)`);
}
const noCountry = allRows.filter(r => !r.country).length;
if (noCountry) console.log(`  (unknown): ${noCountry}`);

// Language split
console.log("\n🌐 LANGUAGE SPLIT (by URL prefix)");
console.log("─────────────────────────────────────────");
let en = 0, es = 0, other = 0;
for (const r of allRows) {
  if (r.path.startsWith("/es/") || r.path === "/es") es++;
  else if (r.path.startsWith("/en/") || r.path === "/en" || /^\/(blog|books|reviews|gallery|bio|giveaway)/.test(r.path) || r.path === "/") en++;
  else other++;
}
console.log(`  EN:  ${en}  (${((en/totalPV)*100).toFixed(1)}%)`);
console.log(`  ES:  ${es}  (${((es/totalPV)*100).toFixed(1)}%)`);
console.log(`  Other: ${other}`);

// ─── TRAFFIC_INSIGHTS (aggregated by agent) ─────────────────────────────────
console.log("\n📊 TRAFFIC_INSIGHTS (agent aggregator, last 7 days)");
console.log("─────────────────────────────────────────");
const { data: insights } = await q("traffic_insights", `select=*&date=gte.${startISO.slice(0,10)}&order=date.desc,sessions.desc&limit=500`);
if (!insights.length) console.log("  (no traffic_insights rows for this window)");
else {
  for (const i of insights) {
    console.log(`  ${i.date} │ ${i.source_category.padEnd(10)} │ ${(i.source_detail||"").padEnd(22)} sessions=${i.sessions} pv=${i.pageviews} uniq=${i.unique_visitors}`);
  }
}

// ─── SOCIAL METRICS ─────────────────────────────────────────────────────────
console.log("\n📱 SOCIAL METRICS (7-day)");
console.log("─────────────────────────────────────────");
const { data: social } = await q("social_metrics", `select=*&collected_at=gte.${startISO}&order=collected_at.desc&limit=500`);
console.log(`  ${social.length} metric rows collected`);
const socialLatestFollowers = {};
for (const s of social) {
  if (s.metric_type === "followers" || s.metric_type === "profile_stats") {
    const cur = socialLatestFollowers[s.platform];
    if (!cur || s.collected_at > cur.collected_at) socialLatestFollowers[s.platform] = s;
  }
}
for (const [plat, s] of Object.entries(socialLatestFollowers)) {
  console.log(`  ${plat.padEnd(12)} @ ${s.collected_at.slice(0,16)}Z → ${JSON.stringify(s.value)}`);
}

// First-vs-last followers (growth)
const byPlatform = {};
for (const s of social) {
  if (!["followers", "profile_stats"].includes(s.metric_type)) continue;
  if (!byPlatform[s.platform]) byPlatform[s.platform] = [];
  byPlatform[s.platform].push(s);
}
console.log("\n  Follower growth over window:");
for (const [plat, arr] of Object.entries(byPlatform)) {
  arr.sort((a,b)=>a.collected_at.localeCompare(b.collected_at));
  const first = arr[0], last = arr[arr.length-1];
  const f = first.value.followers_count ?? first.value.followersCount ?? first.value.followers ?? first.value.count;
  const l = last.value.followers_count ?? last.value.followersCount ?? last.value.followers ?? last.value.count;
  if (typeof f === "number" && typeof l === "number") {
    const diff = l - f;
    console.log(`    ${plat.padEnd(12)} ${f} → ${l}  (${diff>=0?"+":""}${diff})`);
  }
}

// ─── CONTENT PERFORMANCE ────────────────────────────────────────────────────
console.log("\n🎯 CONTENT PERFORMANCE (posts in window)");
console.log("─────────────────────────────────────────");
const { data: cp } = await q("content_performance", `select=*&posted_at=gte.${startISO}&order=posted_at.desc&limit=200`);
console.log(`  ${cp.length} posts tracked`);
let totalLikes = 0, totalComments = 0, totalShares = 0, totalClicks = 0, totalReach = 0;
for (const p of cp) {
  totalLikes += p.likes||0; totalComments += p.comments||0; totalShares += p.shares||0; totalClicks += p.clicks||0; totalReach += p.reach||0;
}
console.log(`  Totals: likes=${totalLikes} comments=${totalComments} shares=${totalShares} clicks=${totalClicks} reach=${totalReach}`);
console.log("\n  TOP 15 POSTS by engagement:");
cp.sort((a,b) => ((b.likes||0)+(b.comments||0)+(b.shares||0)) - ((a.likes||0)+(a.comments||0)+(a.shares||0)));
for (const p of cp.slice(0,15)) {
  const eng = (p.likes||0)+(p.comments||0)+(p.shares||0);
  console.log(`    ${(p.posted_at||"").slice(0,16)} │ ${p.platform.padEnd(10)} │ ${(p.post_type||"").padEnd(16)} │ eng=${eng} clicks=${p.clicks||0} reach=${p.reach||0} camp=${p.utm_campaign||"-"}`);
}

// ─── NEWSLETTER & USERS ─────────────────────────────────────────────────────
console.log("\n📧 NEWSLETTER & USERS (7-day)");
console.log("─────────────────────────────────────────");
const { count: newSubs } = await q("newsletter_subscribers", `select=id&created_at=gte.${startISO}`);
const { count: totalSubs } = await q("newsletter_subscribers", `select=id`);
console.log(`  Newsletter: +${newSubs} in 7d   (total: ${totalSubs})`);

try {
  const ures = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?page=1&per_page=1000`, { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } });
  if (ures.ok) {
    const j = await ures.json();
    const users = j.users || j || [];
    const newU = users.filter(u => u.created_at >= startISO).length;
    console.log(`  Registered users: +${newU} in 7d   (total: ${users.length})`);
  }
} catch {}

// ─── ENGAGEMENT SNAPSHOTS / AGENT_DECISIONS ─────────────────────────────────
const { data: snaps } = await q("engagement_snapshots", `select=*&created_at=gte.${startISO}&order=created_at.desc&limit=50`);
if (snaps.length) {
  console.log("\n💬 ENGAGEMENT SNAPSHOTS (recent)");
  console.log("─────────────────────────────────────────");
  for (const s of snaps.slice(0,10)) {
    console.log(`  ${s.created_at.slice(0,16)} │ ${JSON.stringify(s).slice(0,140)}`);
  }
}

const { data: decisions } = await q("agent_decisions", `select=decision_type,recommended_action,confidence_score,created_at&created_at=gte.${startISO}&order=created_at.desc&limit=20`);
if (decisions.length) {
  console.log("\n🤖 AGENT DECISIONS (7-day)");
  console.log("─────────────────────────────────────────");
  for (const d of decisions) {
    console.log(`  ${d.created_at.slice(0,16)} │ ${d.decision_type.padEnd(26)} │ conf=${d.confidence_score ?? "-"} │ ${(d.recommended_action||"").slice(0,90)}`);
  }
}

// ─── BLUESKY LIVE STATS ─────────────────────────────────────────────────────
console.log("\n🦋 BLUESKY LIVE PROFILE");
console.log("─────────────────────────────────────────");
try {
  const r = await fetch(`https://public.api.bsky.app/xrpc/app.bsky.actor.getProfile?actor=${BLUESKY_HANDLE}`);
  if (r.ok) {
    const p = await r.json();
    console.log(`  @${p.handle}  followers=${p.followersCount}  follows=${p.followsCount}  posts=${p.postsCount}`);
  }
} catch (e) { console.log("  err:", e.message); }

console.log("\n═════════════════════════════════════════════════════════════════════");
console.log("  END OF 7-DAY DIAGNOSTIC");
console.log("═════════════════════════════════════════════════════════════════════");
