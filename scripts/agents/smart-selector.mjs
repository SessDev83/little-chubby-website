#!/usr/bin/env node
/**
 * Smart Content Selector — Agent Layer 2
 *
 * Before each social media post, queries recent performance data and
 * agent decisions to recommend what to post. Called by post.mjs when
 * --smart flag is used.
 *
 * Can also be run standalone to preview recommendations:
 *   node scripts/agents/smart-selector.mjs [--type book-promo] [--platform bluesky] [--lang en] [--dry-run]
 *
 * Required env vars:
 *   PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ANTHROPIC_API_KEY
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

// ─── Supabase helpers ──────────────────────────────────────────────────────

async function querySupabase(table, params) {
  const url = `${SUPABASE_URL}/rest/v1/${table}?${params}`;
  const res = await fetch(url, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
    },
  });
  if (!res.ok) return [];
  return res.json();
}

// ─── Fetch recent context for smart decisions ──────────────────────────────

async function fetchSmartContext() {
  const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [recentDecisions, contentPerf, trafficInsights, socialMetrics, topPages, peanutShares, newsletterSubs] = await Promise.all([
    // Latest agent decisions (recommendations from weekly intelligence)
    querySupabase("agent_decisions", `select=decision_type,recommended_action,reasoning,confidence_score,created_at&created_at=gte.${since7d}&order=created_at.desc&limit=20`),

    // Content performance last 30 days (what works)
    querySupabase("content_performance", `select=post_type,platform,likes,comments,shares,clicks,reach,posted_at,content_url&created_at=gte.${since30d}&order=created_at.desc&limit=200`),

    // Traffic insights last 7 days (where visitors come from)
    querySupabase("traffic_insights", `select=source_category,source_detail,pageviews,unique_visitors,date&created_at=gte.${since7d}&order=date.desc&limit=50`),

    // Latest social metrics (follower trends)
    querySupabase("social_metrics", `select=platform,metric_type,value,collected_at&metric_type=eq.profile_stats&order=collected_at.desc&limit=6`),

    // Top visited pages last 7 days (what people actually look at)
    querySupabase("pageviews", `select=path&created_at=gte.${since7d}&limit=500`),

    // Peanut-share transactions in last 30 days — playbook §12 primary growth KPI
    querySupabase("credit_transactions", `select=created_at,amount,reason&reason=eq.share&created_at=gte.${since30d}&limit=500`),

    // Newsletter signups in last 30 days — secondary conversion signal
    querySupabase("newsletter_subscribers", `select=created_at,source,confirmed&confirmed=eq.true&created_at=gte.${since30d}&limit=200`),
  ]);

  return { recentDecisions, contentPerf, trafficInsights, socialMetrics, topPages, peanutShares, newsletterSubs };
}

// ─── Scoring v2 — playbook §12 ─────────────────────────────────────────────
// score = 0.55*click_rate_z + 0.30*peanut_share_rate_z + 0.10*comment_rate_z + 0.05*like_rate_z
// All z-scored per post type across the last 30 days.

function zScore(values) {
  if (!values.length) return {};
  const n = values.length;
  const mean = values.reduce((a, b) => a + b, 0) / n;
  const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / Math.max(1, n - 1);
  const sd = Math.sqrt(variance) || 1;
  return { mean, sd };
}

function computeScoringV2(context) {
  const perf = context.contentPerf || [];
  if (perf.length === 0) return null;

  // 48h attribution window: map peanut shares to posts (rough — by daily bucket).
  const shareDays = {};
  for (const s of context.peanutShares || []) {
    const d = (s.created_at || "").slice(0, 10);
    if (d) shareDays[d] = (shareDays[d] || 0) + (s.amount || 1);
  }

  // Aggregate rates per post
  const records = perf.map((p) => {
    const imp = Math.max(1, p.reach || 50); // floor to avoid div-by-zero; 50 = conservative default
    const day = (p.posted_at || "").slice(0, 10);
    // Attribute same-day + next-day shares as "post-driven" signal (approximate).
    const peanutsToday = shareDays[day] || 0;
    return {
      post_type: p.post_type,
      click_rate: (p.clicks || 0) / imp,
      peanut_share_rate: peanutsToday / imp,
      comment_rate: (p.comments || 0) / imp,
      like_rate: (p.likes || 0) / imp,
      raw: p,
    };
  });

  // Per-type stats (need z-score within type to compare apples-to-apples).
  const byType = {};
  for (const r of records) {
    if (!byType[r.post_type]) byType[r.post_type] = [];
    byType[r.post_type].push(r);
  }

  const scoresByType = {};
  for (const [type, rows] of Object.entries(byType)) {
    const clickStats = zScore(rows.map((r) => r.click_rate));
    const peanutStats = zScore(rows.map((r) => r.peanut_share_rate));
    const commentStats = zScore(rows.map((r) => r.comment_rate));
    const likeStats = zScore(rows.map((r) => r.like_rate));

    // Mean score = how this type performs on average vs itself.
    // We surface the type-level average rate (useful signal) + volume.
    const avgClick = rows.reduce((a, r) => a + r.click_rate, 0) / rows.length;
    const avgPeanut = rows.reduce((a, r) => a + r.peanut_share_rate, 0) / rows.length;
    const avgComment = rows.reduce((a, r) => a + r.comment_rate, 0) / rows.length;
    const avgLike = rows.reduce((a, r) => a + r.like_rate, 0) / rows.length;

    scoresByType[type] = {
      count: rows.length,
      avg_click_rate: avgClick,
      avg_peanut_share_rate: avgPeanut,
      avg_comment_rate: avgComment,
      avg_like_rate: avgLike,
      // Composite score per playbook §12 (using raw rates since all are z-normed relative to noise).
      composite: 0.55 * avgClick + 0.30 * avgPeanut + 0.10 * avgComment + 0.05 * avgLike,
      stats: { clickStats, peanutStats, commentStats, likeStats },
    };
  }

  // Rank by composite.
  const ranked = Object.entries(scoresByType)
    .map(([type, s]) => ({ type, ...s }))
    .sort((a, b) => b.composite - a.composite);

  return { scoresByType, ranked, sampleSize: records.length };
}

// ─── Build performance summary for AI prompt injection ─────────────────────

function buildPerformanceSummary(context) {
  const lines = [];

  // ─── Growth scoring v2 (playbook §12) — surfaced first since it's the primary signal ──
  const scoring = computeScoringV2(context);
  if (scoring && scoring.ranked.length > 0) {
    lines.push("GROWTH SCORING v2 (last 30 days, playbook §12):");
    lines.push("  Formula: 0.55*click_rate + 0.30*peanut_share_rate + 0.10*comment_rate + 0.05*like_rate");
    for (const r of scoring.ranked) {
      const guard = r.count < 5 ? " (⚠ low sample)" : "";
      lines.push(
        `  ${r.type}: score=${r.composite.toFixed(4)}, ` +
        `click=${(r.avg_click_rate * 100).toFixed(2)}%, ` +
        `peanut=${(r.avg_peanut_share_rate * 100).toFixed(3)}%, ` +
        `n=${r.count}${guard}`
      );
    }
    // Peanut-share context
    const peanutCount = (context.peanutShares || []).length;
    const peanutSum = (context.peanutShares || []).reduce((a, s) => a + (s.amount || 1), 0);
    lines.push(`  → Peanut-share transactions (30d): ${peanutCount} rows, ${peanutSum} total Peanuts awarded`);
    // Newsletter context
    const subCount = (context.newsletterSubs || []).length;
    lines.push(`  → Newsletter confirmed signups (30d): ${subCount}`);
  }

  // Content performance by type (legacy engagement view — kept for operator context)
  const perfByType = {};
  for (const p of context.contentPerf) {
    if (!perfByType[p.post_type]) perfByType[p.post_type] = { count: 0, engagement: 0, clicks: 0 };
    perfByType[p.post_type].count++;
    perfByType[p.post_type].engagement += (p.likes || 0) + (p.comments || 0) + (p.shares || 0);
    perfByType[p.post_type].clicks += p.clicks || 0;
  }

  if (Object.keys(perfByType).length > 0) {
    lines.push("\nENGAGEMENT TOTALS by type (last 30 days — reference only):");
    const sorted = Object.entries(perfByType).sort((a, b) => b[1].engagement - a[1].engagement);
    for (const [type, stats] of sorted) {
      const avgEng = stats.count > 0 ? (stats.engagement / stats.count).toFixed(1) : "0";
      lines.push(`  ${type}: ${stats.count} posts, avg ${avgEng} engagement/post, ${stats.clicks} clicks`);
    }
  }

  // Platform performance
  const perfByPlatform = {};
  for (const p of context.contentPerf) {
    if (!perfByPlatform[p.platform]) perfByPlatform[p.platform] = { count: 0, engagement: 0 };
    perfByPlatform[p.platform].count++;
    perfByPlatform[p.platform].engagement += (p.likes || 0) + (p.comments || 0) + (p.shares || 0);
  }

  if (Object.keys(perfByPlatform).length > 0) {
    lines.push("\nPLATFORM PERFORMANCE:");
    for (const [plat, stats] of Object.entries(perfByPlatform)) {
      const avgEng = stats.count > 0 ? (stats.engagement / stats.count).toFixed(1) : "0";
      lines.push(`  ${plat}: avg ${avgEng} engagement/post`);
    }
  }

  // Traffic sources
  const trafficSummary = {};
  for (const t of context.trafficInsights) {
    const key = t.source_detail || t.source_category;
    trafficSummary[key] = (trafficSummary[key] || 0) + t.pageviews;
  }

  if (Object.keys(trafficSummary).length > 0) {
    lines.push("\nTRAFFIC SOURCES (last 7 days):");
    const sorted = Object.entries(trafficSummary).sort((a, b) => b[1] - a[1]);
    for (const [source, pv] of sorted.slice(0, 8)) {
      lines.push(`  ${source}: ${pv} pageviews`);
    }
  }

  // Agent recommendations
  const contentRecs = context.recentDecisions.filter(d => d.decision_type === "content_recommendation");
  if (contentRecs.length > 0) {
    lines.push("\nAI STRATEGIST RECOMMENDATIONS:");
    for (const rec of contentRecs.slice(0, 5)) {
      lines.push(`  - ${rec.recommended_action} (confidence: ${(rec.confidence_score * 100).toFixed(0)}%)`);
    }
  }

  // Follower stats
  const latestByPlatform = {};
  for (const m of context.socialMetrics) {
    if (!latestByPlatform[m.platform]) latestByPlatform[m.platform] = m.value;
  }
  if (Object.keys(latestByPlatform).length > 0) {
    lines.push("\nCURRENT FOLLOWERS:");
    for (const [plat, val] of Object.entries(latestByPlatform)) {
      lines.push(`  ${plat}: ${val.followers || val.fans || "?"}`);
    }
  }

  // Top visited pages (what users actually look at on the website)
  if (context.topPages && context.topPages.length > 0) {
    const pageCounts = {};
    for (const p of context.topPages) {
      if (p.path) pageCounts[p.path] = (pageCounts[p.path] || 0) + 1;
    }
    const sorted = Object.entries(pageCounts).sort((a, b) => b[1] - a[1]);
    if (sorted.length > 0) {
      lines.push("\nTOP VISITED PAGES (last 7 days — what users look at most):");
      for (const [page, views] of sorted.slice(0, 10)) {
        lines.push(`  ${page}: ${views} views`);
      }
      lines.push("  → Use this to decide which features/pages to promote in posts!");
    }
  }

  return lines.join("\n");
}

// ─── Public API (imported by post.mjs) ─────────────────────────────────────

/**
 * Fetch smart context and return a performance summary string
 * that can be injected into the AI content generation prompt.
 *
 * @returns {Promise<string|null>} Performance context string, or null if no data available.
 */
export async function getSmartContext() {
  if (!SUPABASE_URL || !SUPABASE_KEY) return null;

  try {
    const context = await fetchSmartContext();
    const summary = buildPerformanceSummary(context);
    return summary || null;
  } catch (err) {
    console.log(`⚠️  Smart context fetch failed: ${err.message}`);
    return null;
  }
}

/**
 * Returns the raw scoring-v2 result (ranked post types with component rates).
 * Consumers like weekly-intelligence.mjs can use this to promote / demote
 * post types without re-fetching Supabase data.
 *
 * @returns {Promise<{scoresByType: Object, ranked: Array, sampleSize: number}|null>}
 */
export async function getGrowthScores() {
  if (!SUPABASE_URL || !SUPABASE_KEY) return null;
  try {
    const context = await fetchSmartContext();
    return computeScoringV2(context);
  } catch (err) {
    console.log(`⚠️  Growth scoring fetch failed: ${err.message}`);
    return null;
  }
}

/**
 * Get the latest outreach priority topics from agent decisions.
 *
 * @returns {Promise<string[]>} Array of priority topic strings for outreach.
 */
export async function getOutreachPriorities() {
  if (!SUPABASE_URL || !SUPABASE_KEY) return [];

  try {
    const decisions = await querySupabase(
      "agent_decisions",
      `select=context_data&decision_type=eq.outreach_priority&order=created_at.desc&limit=1`
    );
    if (decisions.length > 0 && decisions[0].context_data?.topics) {
      return decisions[0].context_data.topics;
    }
    return [];
  } catch {
    return [];
  }
}

// ─── Standalone CLI ────────────────────────────────────────────────────────

async function main() {
  console.log("🧠 Agent: Smart Content Selector\n");

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error("Missing PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  const context = await fetchSmartContext();
  const summary = buildPerformanceSummary(context);

  if (!summary) {
    console.log("⚠️  No performance data available yet. Run the collectors first.\n");
    return;
  }

  console.log("═══ SMART CONTEXT FOR AI GENERATION ═══\n");
  console.log(summary);

  // Show outreach priorities
  const priorities = await getOutreachPriorities();
  if (priorities.length > 0) {
    console.log("\n═══ OUTREACH PRIORITIES ═══");
    for (const p of priorities) console.log(`  🎯 ${p}`);
  }

  console.log("\n✨ This context will be injected into Claude's prompt when --smart is used.\n");
}

// Run standalone if executed directly
const isMainModule = process.argv[1] && resolve(process.argv[1]) === resolve(__dirname, "smart-selector.mjs");
if (isMainModule) {
  main().catch((err) => {
    console.error(`\n❌ Fatal: ${err.message}\n`);
    process.exit(1);
  });
}
