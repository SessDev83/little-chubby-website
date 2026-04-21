#!/usr/bin/env node
/**
 * Content Performance Linker — Agent Layer 1
 *
 * Links social media posts to website traffic by matching UTM parameters
 * in pageview referrers back to specific social posts. Calculates
 * click-through rates per post and stores results in `content_performance`.
 *
 * Usage:  node scripts/agents/link-content-performance.mjs [--dry-run] [--days 7]
 *
 * Required env vars:
 *   PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *
 * Optional env vars:
 *   BLUESKY_HANDLE
 *   META_PAGE_ACCESS_TOKEN, META_PAGE_ID, META_IG_USER_ID
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
const BLUESKY_HANDLE = process.env.BLUESKY_HANDLE || "littlechubbypress.bsky.social";
const GRAPH_API = "https://graph.facebook.com/v21.0";
const DRY_RUN = process.argv.includes("--dry-run");

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

// ─── CLI: days lookback ────────────────────────────────────────────────────

function getLookbackDays() {
  const idx = process.argv.indexOf("--days");
  if (idx !== -1 && process.argv[idx + 1]) return parseInt(process.argv[idx + 1], 10) || 7;
  return 7;
}

// ─── Supabase helpers ──────────────────────────────────────────────────────

async function querySupabase(table, params) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${params}`, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
    },
  });
  if (!res.ok) throw new Error(`Query ${table} failed: ${res.status}`);
  return res.json();
}

async function upsertPerformance(row) {
  if (DRY_RUN) {
    console.log(`  [DRY RUN] ${row.platform}/${row.post_type}: ${row.likes}L ${row.comments}C ${row.shares}S ${row.clicks} clicks`);
    return;
  }
  const res = await fetch(`${SUPABASE_URL}/rest/v1/content_performance?on_conflict=post_id,platform`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify({ ...row, updated_at: new Date().toISOString() }),
  });
  if (res.ok) return;

  // 409 = duplicate key — fall back to PATCH to update existing row
  if (res.status === 409) {
    const filter =
      `post_id=eq.${encodeURIComponent(row.post_id)}&platform=eq.${encodeURIComponent(row.platform)}`;
    const { post_id, platform, ...updates } = row;
    updates.updated_at = new Date().toISOString();
    const patchRes = await fetch(`${SUPABASE_URL}/rest/v1/content_performance?${filter}`, {
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
    console.log(`  ↻ Updated existing row for ${row.platform}/${row.post_id}`);
    return;
  }

  const body = await res.text();
  throw new Error(`Upsert failed (${res.status}): ${body}`);
}

// ─── Fetch UTM-tagged clicks from pageviews ────────────────────────────────
// Returns two aggregates:
//   byContent  — per-post attribution: key = "platform|utm_content" → count
//   byCampaign — legacy fallback:      key = "platform|utm_campaign" → count

async function fetchUtmClicks(daysBack) {
  const since = new Date();
  since.setUTCDate(since.getUTCDate() - daysBack);
  const sinceStr = since.toISOString();

  // Prefer the new utm_* columns populated by the tracker since migration 031.
  // Fallback to parsing the referrer URL for rows that predate that.
  const rows = await querySupabase(
    "pageviews",
    `select=referrer,utm_source,utm_medium,utm_campaign,utm_content,created_at&created_at=gte.${sinceStr}&limit=20000`
  );

  const byContent = {};
  const byCampaign = {};

  for (const row of rows) {
    let source = row.utm_source || null;
    let medium = row.utm_medium || null;
    let campaign = row.utm_campaign || null;
    let content = row.utm_content || null;

    // Legacy fallback: parse referrer URL if row has no utm columns yet
    if (!source && row.referrer) {
      try {
        const u = new URL(row.referrer);
        source = u.searchParams.get("utm_source");
        medium = u.searchParams.get("utm_medium");
        campaign = u.searchParams.get("utm_campaign");
        content = u.searchParams.get("utm_content");
      } catch { /* not a URL */ }
    }

    if (!source) continue;

    if (content) {
      const k = `${source}|${content}`;
      byContent[k] = (byContent[k] || 0) + 1;
    }
    const kC = `${source}|${campaign || "organic"}`;
    byCampaign[kC] = (byCampaign[kC] || 0) + 1;
  }

  return { byContent, byCampaign };
}

// ─── Extract UTM + canonical URL embedded in a post's text ─────────────────
// Our social agents always inject URLs tagged with utm_content=<creative-id>
// (see scripts/social/content-templates.mjs → buildUtmUrl).
// This function yanks the first tagged URL out of a post body so we can map
// post → clicks by exact creative-id.
function extractEmbeddedUtm(text) {
  if (!text) return null;
  const match = text.match(/https?:\/\/[^\s)]+/g);
  if (!match) return null;
  for (const raw of match) {
    try {
      const u = new URL(raw);
      if (!u.hostname.includes("littlechubbypress")) continue;
      const source = u.searchParams.get("utm_source");
      const campaign = u.searchParams.get("utm_campaign");
      const content = u.searchParams.get("utm_content");
      if (source || campaign || content) {
        // Canonical URL: strip querystring
        const canonical = `${u.origin}${u.pathname}`;
        return { source, campaign, content, canonical };
      }
    } catch { /* malformed URL */ }
  }
  return null;
}

// ─── Fetch recent Bluesky posts with engagement ────────────────────────────

async function fetchBlueskyPosts() {
  try {
    const res = await fetch(
      `https://public.api.bsky.app/xrpc/app.bsky.feed.getAuthorFeed?actor=${encodeURIComponent(BLUESKY_HANDLE)}&limit=50`
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data.feed || []).map((item) => ({
      platform: "bluesky",
      post_id: item.post.uri,
      text: item.post.record?.text || "",
      likes: item.post.likeCount || 0,
      comments: item.post.replyCount || 0,
      shares: item.post.repostCount || 0,
      posted_at: item.post.indexedAt,
    }));
  } catch (err) {
    console.log(`  ⚠️  Bluesky fetch failed: ${err.message}`);
    return [];
  }
}

// ─── Fetch recent Facebook posts with engagement ───────────────────────────

async function fetchFacebookPosts() {
  const token = process.env.META_PAGE_ACCESS_TOKEN;
  const pageId = process.env.META_PAGE_ID;
  if (!token || !pageId) return [];

  try {
    const res = await fetch(
      `${GRAPH_API}/${encodeURIComponent(pageId)}/published_posts?fields=id,message,created_time,likes.summary(true),comments.summary(true),shares&limit=25&access_token=${encodeURIComponent(token)}`
    );
    if (!res.ok) return [];
    const data = await res.json();
    const posts = (data.data || []).map((post) => ({
      platform: "facebook",
      post_id: post.id,
      text: post.message || "",
      likes: post.likes?.summary?.total_count || 0,
      comments: post.comments?.summary?.total_count || 0,
      shares: post.shares?.count || 0,
      reach: 0,
      impressions: 0,
      posted_at: post.created_time,
    }));

    // Enrich with reach/impressions (best effort — some accounts lack permission)
    for (const p of posts) {
      try {
        const iRes = await fetch(
          `${GRAPH_API}/${encodeURIComponent(p.post_id)}/insights?metric=post_impressions,post_impressions_unique&access_token=${encodeURIComponent(token)}`
        );
        if (!iRes.ok) continue;
        const iData = await iRes.json();
        for (const m of iData.data || []) {
          const v = m.values?.[0]?.value || 0;
          if (m.name === "post_impressions") p.impressions = v;
          if (m.name === "post_impressions_unique") p.reach = v;
        }
      } catch { /* ignore per-post errors */ }
    }

    return posts;
  } catch (err) {
    console.log(`  ⚠️  Facebook fetch failed: ${err.message}`);
    return [];
  }
}

// ─── Fetch recent Instagram media with engagement ──────────────────────────

async function fetchInstagramPosts() {
  const token = process.env.META_PAGE_ACCESS_TOKEN;
  const igUserId = process.env.META_IG_USER_ID;
  if (!token || !igUserId) return [];

  try {
    const res = await fetch(
      `${GRAPH_API}/${encodeURIComponent(igUserId)}/media?fields=id,caption,timestamp,media_type,like_count,comments_count&limit=25&access_token=${encodeURIComponent(token)}`
    );
    if (!res.ok) return [];
    const data = await res.json();
    const posts = (data.data || []).map((item) => ({
      platform: "instagram",
      post_id: item.id,
      text: item.caption || "",
      likes: item.like_count || 0,
      comments: item.comments_count || 0,
      shares: 0,
      reach: 0,
      impressions: 0,
      media_type: item.media_type,
      posted_at: item.timestamp,
    }));

    // Enrich with reach/impressions (IG Business API)
    for (const p of posts) {
      try {
        const metric = p.media_type === "VIDEO" || p.media_type === "REELS"
          ? "reach,impressions,video_views"
          : "reach,impressions";
        const iRes = await fetch(
          `${GRAPH_API}/${encodeURIComponent(p.post_id)}/insights?metric=${metric}&access_token=${encodeURIComponent(token)}`
        );
        if (!iRes.ok) continue;
        const iData = await iRes.json();
        for (const m of iData.data || []) {
          const v = m.values?.[0]?.value || 0;
          if (m.name === "reach") p.reach = v;
          if (m.name === "impressions") p.impressions = v;
        }
      } catch { /* ignore per-post errors */ }
    }

    return posts;
  } catch (err) {
    console.log(`  ⚠️  Instagram fetch failed: ${err.message}`);
    return [];
  }
}

// ─── Detect post type from text content ────────────────────────────────────

function detectPostType(text) {
  const lower = (text || "").toLowerCase();
  if (lower.includes("amazon.com") || lower.includes("coloring book") || lower.includes("libro para colorear")) return "book-promo";
  if (lower.includes("/blog/") || lower.includes("new post") || lower.includes("nuevo articulo")) return "blog-share";
  if (lower.includes("link in bio") || lower.includes("link en bio")) return "book-promo";
  if (lower.includes("newsletter") || lower.includes("gallery") || lower.includes("galeria")) return "community";
  if (lower.includes("tip") || lower.includes("consejo")) return "parenting-tip";
  if (lower.includes("behind") || lower.includes("detras")) return "behind-scenes";
  if (lower.includes("did you know") || lower.includes("sabias que")) return "fun-fact";
  if (lower.includes("?")) return "engagement";
  return "engagement";
}

// ─── Match UTM clicks to posts ─────────────────────────────────────────────
// Strategy:
//   1. Preferred — match by utm_content (unique per-post creative-id).
//   2. Fallback  — match by utm_campaign (post_type) when no creative-id.

function matchClicksToPost(post, utmClicks, embedded) {
  const postType = embedded?.campaign || detectPostType(post.text);
  const source = post.platform;

  let clicks = 0;

  // Preferred: exact creative-id match
  if (embedded?.content) {
    const k = `${source}|${embedded.content}`;
    clicks = utmClicks.byContent[k] || 0;
  }

  // Fallback: aggregate by campaign if no per-post clicks found
  if (clicks === 0) {
    for (const [key, count] of Object.entries(utmClicks.byCampaign)) {
      const [utmSource, utmCampaign] = key.split("|");
      if (utmSource === source && utmCampaign === postType) {
        clicks += count;
      }
    }
  }

  return { clicks, campaign: postType };
}

// ─── Main ──────────────────────────────────────────────────────────────────

async function main() {
  const daysBack = getLookbackDays();
  console.log("🤖 Agent: Content Performance Linker");
  console.log(`   Lookback: ${daysBack} days`);
  console.log(`   Mode:     ${DRY_RUN ? "DRY RUN" : "LIVE"}\n`);

  // Step 1: Fetch UTM-tagged clicks from pageviews
  console.log("📊 Fetching UTM-tagged clicks from pageviews...");
  const utmClicks = await fetchUtmClicks(daysBack);
  const totalByContent = Object.values(utmClicks.byContent).reduce((a, b) => a + b, 0);
  const totalByCampaign = Object.values(utmClicks.byCampaign).reduce((a, b) => a + b, 0);
  console.log(`   ${totalByContent} clicks attributed to ${Object.keys(utmClicks.byContent).length} creative-ids.`);
  console.log(`   ${totalByCampaign} clicks across ${Object.keys(utmClicks.byCampaign).length} source/campaign combos.\n`);

  for (const [key, count] of Object.entries(utmClicks.byCampaign)) {
    console.log(`   ${key}: ${count} clicks`);
  }

  // Step 2: Fetch recent posts from all platforms
  console.log("\n📱 Fetching recent posts from all platforms...");
  const allPosts = [
    ...(await fetchBlueskyPosts()),
    ...(await fetchFacebookPosts()),
    ...(await fetchInstagramPosts()),
  ];
  console.log(`   Found ${allPosts.length} total posts.\n`);

  // Step 3: Link posts to clicks and store
  let linked = 0;
  for (const post of allPosts) {
    const embedded = extractEmbeddedUtm(post.text);
    const postType = embedded?.campaign || detectPostType(post.text);
    const { clicks, campaign } = matchClicksToPost(post, utmClicks, embedded);

    await upsertPerformance({
      post_type: postType,
      platform: post.platform,
      posted_at: post.posted_at,
      post_id: post.post_id,
      likes: post.likes,
      comments: post.comments,
      shares: post.shares,
      clicks,
      reach: post.reach || 0,
      impressions: post.impressions || 0,
      content_url: embedded?.canonical || null,
      utm_campaign: campaign,
    });
    linked++;
  }

  console.log(`\n✅ Linked ${linked} posts to performance data.`);

  // Step 4: Summary — top performers
  if (allPosts.length > 0) {
    const sorted = [...allPosts].sort(
      (a, b) => (b.likes + b.comments + b.shares) - (a.likes + a.comments + a.shares)
    );
    console.log("\n🏆 Top 5 performers:");
    for (const p of sorted.slice(0, 5)) {
      const eng = p.likes + p.comments + p.shares;
      console.log(`   ${p.platform} | ${eng} eng | "${p.text.slice(0, 60)}..."`);
    }
  }
  console.log();
}

main().catch((err) => {
  console.error(`\n❌ Fatal: ${err.message}\n`);
  process.exit(1);
});
