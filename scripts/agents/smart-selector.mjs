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

  const [recentDecisions, contentPerf, trafficInsights, socialMetrics, topPages] = await Promise.all([
    // Latest agent decisions (recommendations from weekly intelligence)
    querySupabase("agent_decisions", `select=decision_type,recommended_action,reasoning,confidence_score,created_at&created_at=gte.${since7d}&order=created_at.desc&limit=20`),

    // Content performance last 30 days (what works)
    querySupabase("content_performance", `select=post_type,platform,likes,comments,shares,clicks,posted_at&created_at=gte.${since30d}&order=created_at.desc&limit=200`),

    // Traffic insights last 7 days (where visitors come from)
    querySupabase("traffic_insights", `select=source_category,source_detail,pageviews,unique_visitors,date&created_at=gte.${since7d}&order=date.desc&limit=50`),

    // Latest social metrics (follower trends)
    querySupabase("social_metrics", `select=platform,metric_type,value,collected_at&metric_type=eq.profile_stats&order=collected_at.desc&limit=6`),

    // Top visited pages last 7 days (what people actually look at)
    querySupabase("pageviews", `select=path&created_at=gte.${since7d}&limit=500`),
  ]);

  return { recentDecisions, contentPerf, trafficInsights, socialMetrics, topPages };
}

// ─── Build performance summary for AI prompt injection ─────────────────────

function buildPerformanceSummary(context) {
  const lines = [];

  // Content performance by type
  const perfByType = {};
  for (const p of context.contentPerf) {
    if (!perfByType[p.post_type]) perfByType[p.post_type] = { count: 0, engagement: 0, clicks: 0 };
    perfByType[p.post_type].count++;
    perfByType[p.post_type].engagement += (p.likes || 0) + (p.comments || 0) + (p.shares || 0);
    perfByType[p.post_type].clicks += p.clicks || 0;
  }

  if (Object.keys(perfByType).length > 0) {
    lines.push("CONTENT PERFORMANCE (last 30 days):");
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
