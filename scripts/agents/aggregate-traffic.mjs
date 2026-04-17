#!/usr/bin/env node
/**
 * Traffic Aggregator — Agent Layer 1
 *
 * Aggregates yesterday's pageview data from Supabase into the
 * `traffic_insights` table, grouped by source category (organic,
 * social, direct, referral, email) with UTM attribution.
 *
 * Usage:  node scripts/agents/aggregate-traffic.mjs [--dry-run] [--date YYYY-MM-DD]
 *
 * Required env vars:
 *   PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");

// ─── Load .env ─────────────────────────────────────────────────────────────
const envPath = resolve(ROOT, ".env");
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf-8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq === -1) continue;
    const k = t.slice(0, eq).trim();
    const v = t.slice(eq + 1).trim();
    if (!process.env[k]) process.env[k] = v;
  }
}

const SUPABASE_URL = process.env.PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DRY_RUN = process.argv.includes("--dry-run");

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

// ─── Date helpers ──────────────────────────────────────────────────────────

function getTargetDate() {
  const dateArg = process.argv.find((a, i) => process.argv[i - 1] === "--date");
  if (dateArg && /^\d{4}-\d{2}-\d{2}$/.test(dateArg)) return dateArg;
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

// ─── Supabase helpers ──────────────────────────────────────────────────────

async function queryPageviews(date) {
  const dayStart = `${date}T00:00:00.000Z`;
  const dayEnd = `${date}T23:59:59.999Z`;
  const params = `select=path,referrer,visitor_hash,country&created_at=gte.${dayStart}&created_at=lte.${dayEnd}&limit=10000`;
  const res = await fetch(`${SUPABASE_URL}/rest/v1/pageviews?${params}`, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
    },
  });
  if (!res.ok) throw new Error(`Pageviews query failed: ${res.status}`);
  return res.json();
}

async function upsertInsight(row) {
  if (DRY_RUN) {
    console.log(`  [DRY RUN] ${row.source_category}/${row.source_detail || "(none)"}: ${row.pageviews} pv, ${row.unique_visitors} uv`);
    return;
  }
  const res = await fetch(`${SUPABASE_URL}/rest/v1/traffic_insights?on_conflict=date,source_category,source_detail`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify(row),
  });
  if (res.ok) return;

  // 409 = duplicate key — fall back to PATCH to update existing row
  if (res.status === 409) {
    const filter =
      `date=eq.${row.date}&source_category=eq.${encodeURIComponent(row.source_category)}` +
      `&source_detail=eq.${encodeURIComponent(row.source_detail)}`;
    const { date, source_category, source_detail, ...updates } = row;
    const patchRes = await fetch(`${SUPABASE_URL}/rest/v1/traffic_insights?${filter}`, {
      method: "PATCH",
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify(updates),
    });
    if (!patchRes.ok) {
      const body = await patchRes.text();
      throw new Error(`PATCH fallback failed (${patchRes.status}): ${body}`);
    }
    console.log(`  ↻ Updated existing row for ${row.source_category}/${row.source_detail || "(none)"}`);
    return;
  }

  const body = await res.text();
  throw new Error(`Upsert failed (${res.status}): ${body}`);
}

// ─── Source classification ─────────────────────────────────────────────────

const SOCIAL_DOMAINS = [
  "bsky.app", "bsky.social",                         // Bluesky
  "facebook.com", "fb.com", "fb.me", "m.facebook",   // Facebook
  "instagram.com",                                     // Instagram
  "twitter.com", "x.com", "t.co",                     // X/Twitter
  "linkedin.com",                                      // LinkedIn
  "reddit.com",                                        // Reddit
  "pinterest.com",                                     // Pinterest
  "tiktok.com",                                        // TikTok
];

const SEARCH_DOMAINS = [
  "google.com", "google.co", "bing.com", "duckduckgo.com",
  "yahoo.com", "baidu.com", "yandex.com", "ecosia.org",
];

function classifySource(referrer) {
  if (!referrer) return { category: "direct", detail: "" };

  let hostname;
  try {
    const url = new URL(referrer);
    hostname = url.hostname.replace(/^www\./, "").toLowerCase();

    // Check for UTM source first
    const utmSource = url.searchParams.get("utm_source");
    if (utmSource) {
      return { category: "social", detail: utmSource };
    }
  } catch {
    hostname = referrer.toLowerCase();
  }

  // Skip self-referrals
  if (hostname.includes("littlechubbypress")) return null;

  // Social
  for (const domain of SOCIAL_DOMAINS) {
    if (hostname.includes(domain)) {
      const detail = domain.includes("bsky") ? "bluesky"
        : domain.includes("facebook") || domain.includes("fb.") ? "facebook"
        : domain.includes("instagram") ? "instagram"
        : hostname;
      return { category: "social", detail };
    }
  }

  // Organic search
  for (const domain of SEARCH_DOMAINS) {
    if (hostname.includes(domain)) {
      return { category: "organic", detail: hostname };
    }
  }

  // Email
  if (hostname.includes("mail") || hostname.includes("email") || hostname.includes("resend")) {
    return { category: "email", detail: hostname };
  }

  return { category: "referral", detail: hostname };
}

// ─── Main ──────────────────────────────────────────────────────────────────

async function main() {
  const date = getTargetDate();
  console.log("🤖 Agent: Traffic Aggregator");
  console.log(`   Date:  ${date}`);
  console.log(`   Mode:  ${DRY_RUN ? "DRY RUN" : "LIVE"}\n`);

  const rows = await queryPageviews(date);
  console.log(`   Fetched ${rows.length} pageview rows.\n`);

  if (rows.length === 0) {
    console.log("   No pageviews for this date. Nothing to aggregate.\n");
    return;
  }

  // Group by source
  const groups = {};

  for (const row of rows) {
    const source = classifySource(row.referrer);
    if (!source) continue; // self-referral

    const key = `${source.category}|${source.detail || ""}`;
    if (!groups[key]) {
      groups[key] = {
        category: source.category,
        detail: source.detail,
        visitors: new Set(),
        pageviews: 0,
        pages: {},
      };
    }
    groups[key].visitors.add(row.visitor_hash);
    groups[key].pageviews++;
    groups[key].pages[row.path] = (groups[key].pages[row.path] || 0) + 1;
  }

  // Insert aggregated rows
  let inserted = 0;
  for (const g of Object.values(groups)) {
    const topPages = Object.entries(g.pages)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([path, count]) => ({ path, count }));

    await upsertInsight({
      date,
      source_category: g.category,
      source_detail: g.detail || "",
      sessions: g.visitors.size,
      pageviews: g.pageviews,
      unique_visitors: g.visitors.size,
      top_pages: topPages,
    });
    inserted++;
  }

  console.log(`\n✅ Aggregated ${rows.length} pageviews into ${inserted} source groups.`);

  // Summary
  const totalByCategory = {};
  for (const g of Object.values(groups)) {
    totalByCategory[g.category] = (totalByCategory[g.category] || 0) + g.pageviews;
  }
  console.log("\n📊 Summary:");
  for (const [cat, count] of Object.entries(totalByCategory).sort((a, b) => b[1] - a[1])) {
    console.log(`   ${cat}: ${count} pageviews`);
  }
  console.log();
}

main().catch((err) => {
  console.error(`\n❌ Fatal: ${err.message}\n`);
  process.exit(1);
});
