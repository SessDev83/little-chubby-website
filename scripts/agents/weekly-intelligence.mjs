#!/usr/bin/env node
/**
 * Weekly Intelligence Report — Agent Layer 2 (Brain)
 *
 * Queries 30 days of social_metrics, traffic_insights, content_performance,
 * and engagement_snapshots from Supabase, sends the data to Claude for deep
 * analysis, stores the recommendations in agent_decisions, and emails a
 * summary report.
 *
 * Combines: trend analysis, timing optimization, content A/B insights,
 * engagement growth curves, and outreach priority recommendations.
 *
 * Usage:  node scripts/agents/weekly-intelligence.mjs [--dry-run] [--days 30]
 *
 * Required env vars:
 *   PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ANTHROPIC_API_KEY
 *
 * Optional env vars:
 *   RESEND_API_KEY, ANALYTICS_EMAIL (for email summary)
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
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const ANALYTICS_EMAIL = process.env.ANALYTICS_EMAIL || "hello@littlechubbypress.com";
const DRY_RUN = process.argv.includes("--dry-run");

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}
if (!ANTHROPIC_API_KEY) {
  console.error("Missing ANTHROPIC_API_KEY");
  process.exit(1);
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function getLookbackDays() {
  const idx = process.argv.indexOf("--days");
  if (idx !== -1 && process.argv[idx + 1]) return parseInt(process.argv[idx + 1], 10) || 30;
  return 30;
}

function sinceDate(days) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString();
}

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

async function insertDecision(row) {
  if (DRY_RUN) {
    console.log(`  [DRY RUN] Decision: ${row.decision_type} — ${row.recommended_action.slice(0, 100)}`);
    return;
  }
  const res = await fetch(`${SUPABASE_URL}/rest/v1/agent_decisions`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify(row),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Decision insert failed (${res.status}): ${body}`);
  }
}

// ─── Fetch all data ────────────────────────────────────────────────────────

async function fetchData(days) {
  const since = sinceDate(days);
  const prevSince = sinceDate(days * 2);

  console.log("📊 Fetching data...\n");

  // Current period
  const [socialMetrics, trafficInsights, contentPerf, engSnapshots] = await Promise.all([
    querySupabase("social_metrics", `select=*&collected_at=gte.${since}&order=collected_at.desc&limit=1000`),
    querySupabase("traffic_insights", `select=*&date=gte.${since.slice(0, 10)}&order=date.desc&limit=500`),
    querySupabase("content_performance", `select=*&created_at=gte.${since}&order=created_at.desc&limit=1000`),
    querySupabase("engagement_snapshots", `select=*&snapshot_at=gte.${since}&order=snapshot_at.desc&limit=2000`),
  ]);

  // Previous period (for comparison)
  const [prevTraffic, prevContent] = await Promise.all([
    querySupabase("traffic_insights", `select=*&date=gte.${prevSince.slice(0, 10)}&date=lt.${since.slice(0, 10)}&order=date.desc&limit=500`),
    querySupabase("content_performance", `select=*&created_at=gte.${prevSince}&created_at=lt.${since}&order=created_at.desc&limit=1000`),
  ]);

  console.log(`   Social metrics:       ${socialMetrics.length} rows`);
  console.log(`   Traffic insights:      ${trafficInsights.length} rows (prev: ${prevTraffic.length})`);
  console.log(`   Content performance:   ${contentPerf.length} rows (prev: ${prevContent.length})`);
  console.log(`   Engagement snapshots:  ${engSnapshots.length} rows`);

  return { socialMetrics, trafficInsights, contentPerf, prevTraffic, prevContent, engSnapshots };
}

// ─── Build analysis prompt ─────────────────────────────────────────────────

function buildAnalysisPrompt(data, days) {
  // Summarize social metrics by platform
  const socialByPlatform = {};
  for (const m of data.socialMetrics) {
    if (!socialByPlatform[m.platform]) socialByPlatform[m.platform] = [];
    socialByPlatform[m.platform].push({ type: m.metric_type, value: m.value, date: m.collected_at });
  }

  // Summarize traffic by source
  const trafficBySource = {};
  for (const t of data.trafficInsights) {
    const key = `${t.source_category}/${t.source_detail || "direct"}`;
    if (!trafficBySource[key]) trafficBySource[key] = { pageviews: 0, visitors: 0, days: 0 };
    trafficBySource[key].pageviews += t.pageviews;
    trafficBySource[key].visitors += t.unique_visitors;
    trafficBySource[key].days++;
  }

  // Summarize content performance by type + platform
  const perfByType = {};
  for (const p of data.contentPerf) {
    const key = `${p.post_type}|${p.platform}`;
    if (!perfByType[key]) perfByType[key] = { count: 0, likes: 0, comments: 0, shares: 0, clicks: 0 };
    perfByType[key].count++;
    perfByType[key].likes += p.likes || 0;
    perfByType[key].comments += p.comments || 0;
    perfByType[key].shares += p.shares || 0;
    perfByType[key].clicks += p.clicks || 0;
  }

  // Previous period comparison
  const prevTrafficTotal = data.prevTraffic.reduce((s, t) => s + t.pageviews, 0);
  const currTrafficTotal = data.trafficInsights.reduce((s, t) => s + t.pageviews, 0);
  const prevEngTotal = data.prevContent.reduce((s, p) => s + (p.likes || 0) + (p.comments || 0) + (p.shares || 0), 0);
  const currEngTotal = data.contentPerf.reduce((s, p) => s + (p.likes || 0) + (p.comments || 0) + (p.shares || 0), 0);

  // Extract posting times for timing analysis
  const postingTimes = {};
  for (const p of data.contentPerf) {
    if (!p.posted_at) continue;
    const d = new Date(p.posted_at);
    const dayOfWeek = d.toLocaleDateString("en-US", { weekday: "long", timeZone: "America/New_York" });
    const hour = d.toLocaleTimeString("en-US", { hour: "2-digit", hour12: true, timeZone: "America/New_York" });
    const key = `${dayOfWeek} ${hour}`;
    const eng = (p.likes || 0) + (p.comments || 0) + (p.shares || 0);
    if (!postingTimes[key]) postingTimes[key] = { count: 0, totalEng: 0 };
    postingTimes[key].count++;
    postingTimes[key].totalEng += eng;
  }

  // Engagement growth trends from snapshots
  const engGrowth = {};
  for (const snap of (data.engSnapshots || [])) {
    const key = `${snap.platform}|${snap.post_id}`;
    if (!engGrowth[key]) engGrowth[key] = [];
    engGrowth[key].push({
      likes: snap.likes, comments: snap.comments, shares: snap.shares,
      at: snap.snapshot_at,
    });
  }
  // Find top growing posts (biggest engagement delta first→last snapshot)
  const growthDeltas = [];
  for (const [key, snaps] of Object.entries(engGrowth)) {
    if (snaps.length < 2) continue;
    snaps.sort((a, b) => new Date(a.at) - new Date(b.at));
    const first = snaps[0], last = snaps[snaps.length - 1];
    const delta = (last.likes + last.comments + last.shares) -
                  (first.likes + first.comments + first.shares);
    if (delta > 0) {
      const [platform, post_id] = key.split("|");
      growthDeltas.push({ platform, post_id: post_id.slice(0, 60), delta, snapshots: snaps.length });
    }
  }
  growthDeltas.sort((a, b) => b.delta - a.delta);

  // Follower growth from social_metrics profile_stats over time
  const followerTimeline = {};
  for (const m of data.socialMetrics.filter(m => m.metric_type === "profile_stats")) {
    if (!followerTimeline[m.platform]) followerTimeline[m.platform] = [];
    followerTimeline[m.platform].push({
      followers: m.value?.followers || m.value?.fans || 0,
      date: m.collected_at,
    });
  }
  const followerGrowth = {};
  for (const [plat, timeline] of Object.entries(followerTimeline)) {
    if (timeline.length < 2) continue;
    timeline.sort((a, b) => new Date(a.date) - new Date(b.date));
    followerGrowth[plat] = {
      start: timeline[0].followers,
      end: timeline[timeline.length - 1].followers,
      change: timeline[timeline.length - 1].followers - timeline[0].followers,
      datapoints: timeline.length,
    };
  }

  return `You are the AI strategist for Little Chubby Press, an independent publisher of children's coloring books.
Analyze the following ${days}-day performance data and provide actionable intelligence.

═══ SOCIAL MEDIA METRICS BY PLATFORM ═══
${JSON.stringify(socialByPlatform, null, 2)}

═══ WEBSITE TRAFFIC BY SOURCE (${days} days) ═══
${JSON.stringify(trafficBySource, null, 2)}

═══ CONTENT PERFORMANCE BY TYPE + PLATFORM ═══
${JSON.stringify(perfByType, null, 2)}

═══ POSTING TIMES vs ENGAGEMENT ═══
${JSON.stringify(postingTimes, null, 2)}

═══ ENGAGEMENT GROWTH (top posts gaining traction) ═══
${growthDeltas.length > 0 ? JSON.stringify(growthDeltas.slice(0, 15), null, 2) : "No engagement growth data yet — snapshots will populate over the next few days."}

═══ FOLLOWER GROWTH (${days} days) ═══
${Object.keys(followerGrowth).length > 0 ? JSON.stringify(followerGrowth, null, 2) : "Insufficient data — need multiple collection runs to track growth."}

═══ PERIOD COMPARISON ═══
Current ${days}d traffic: ${currTrafficTotal} pageviews
Previous ${days}d traffic: ${prevTrafficTotal} pageviews (${prevTrafficTotal > 0 ? ((currTrafficTotal - prevTrafficTotal) / prevTrafficTotal * 100).toFixed(1) : "N/A"}% change)
Current ${days}d engagement: ${currEngTotal}
Previous ${days}d engagement: ${prevEngTotal} (${prevEngTotal > 0 ? ((currEngTotal - prevEngTotal) / prevEngTotal * 100).toFixed(1) : "N/A"}% change)

═══ CURRENT POSTING SCHEDULE ═══
Our posting schedule (ET timezone):
- Morning slot: 10:00 AM (Mon-Sun)
- Afternoon slot: 4:00 PM (Mon-Sat)
- Sunday extra: 2:00 PM, 6:00 PM
Content rotation: Mon(book-promo), Tue(parenting-tip), Wed(blog-share), Thu(behind-scenes), Fri(fun-fact), Sat(community), Sun(blog-share×3)
Platforms: Bluesky, Facebook, Instagram (all three for every post)
Languages: EN and ES alternating
We also cross-post to Facebook Groups for wider reach.

═══ YOUR TASK ═══
Provide your analysis as VALID JSON with this exact structure:
{
  "summary": "2-3 sentence executive summary of this period's performance",
  "content_recommendations": [
    {
      "action": "specific actionable recommendation",
      "reasoning": "why, based on the data",
      "priority": "high|medium|low",
      "confidence": 0.0-1.0
    }
  ],
  "timing_recommendations": [
    {
      "action": "specific timing change suggestion",
      "reasoning": "data-backed reason",
      "confidence": 0.0-1.0
    }
  ],
  "platform_insights": {
    "bluesky": "1-2 sentence insight about Bluesky performance",
    "facebook": "1-2 sentence insight about Facebook performance",
    "instagram": "1-2 sentence insight about Instagram performance"
  },
  "outreach_priorities": [
    "topic or community type to prioritize for outreach this week"
  ],
  "ab_test_suggestion": {
    "hypothesis": "what to test next",
    "method": "how to test it",
    "duration_days": 7
  },
  "group_recommendations": [
    "specific recommendation for Facebook Group cross-posting — e.g. which post types perform best in parenting groups, what content to share, what to avoid"
  ],
  "risk_alerts": ["any concerning trends or issues to watch"]
}

Be specific, data-driven, and actionable. If data is insufficient for a recommendation, say so and assign low confidence.`;
}

// ─── Call Claude for analysis ──────────────────────────────────────────────

async function analyzeWithClaude(prompt) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      // Model downgrade Apr 2026: structured analytics summarisation doesn't
      // need Sonnet — Haiku 4.5 is plenty and ~75% cheaper.
      model: process.env.ANTHROPIC_AGENT_MODEL || "claude-haiku-4-5",
      max_tokens: 8000,
      messages: [{ role: "user", content: prompt }],
    }),
    signal: AbortSignal.timeout(120_000),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Claude API error ${res.status}: ${err}`);
  }

  const json = await res.json();
  let raw = json.content?.[0]?.text?.trim() || "";

  // Strip markdown fences
  if (raw.startsWith("```")) {
    raw = raw.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");
  }

  try {
    return JSON.parse(raw);
  } catch (err) {
    // Claude occasionally returns truncated JSON. Try to recover by trimming
    // to the last complete object/array and closing brackets.
    console.warn(`⚠️  JSON parse failed (${err.message}). Attempting recovery...`);
    const recovered = recoverTruncatedJson(raw);
    if (recovered) return recovered;
    throw new Error(`Unparseable Claude response (first 500 chars): ${raw.slice(0, 500)}`);
  }
}

function recoverTruncatedJson(raw) {
  // Find the last well-formed closing brace position.
  // Walk backwards trimming tokens until JSON.parse succeeds.
  for (let end = raw.length; end > 100; end--) {
    const slice = raw.slice(0, end);
    // Must end on a structural char that could be valid
    const last = slice[slice.length - 1];
    if (last !== "}" && last !== "]") continue;
    try {
      const candidate = slice + (slice.includes("\"content_recommendations\"") && !slice.trim().endsWith("}") ? "}" : "");
      return JSON.parse(candidate);
    } catch { /* keep trimming */ }
  }
  // Last resort: return minimal shape so downstream doesn't crash.
  return { strategic_insights: [], content_recommendations: [], alerts: [], optimization_priorities: [], summary: "(recovery failed: Claude output was truncated or malformed)" };
}

// ─── Store decisions in Supabase ───────────────────────────────────────────

async function storeDecisions(analysis) {
  console.log("\n💾 Storing decisions...\n");

  // Content recommendations
  for (const rec of analysis.content_recommendations || []) {
    await insertDecision({
      decision_type: "content_recommendation",
      recommended_action: rec.action,
      reasoning: rec.reasoning,
      confidence_score: rec.confidence || 0.5,
      context_data: { priority: rec.priority },
    });
  }

  // Timing recommendations
  for (const rec of analysis.timing_recommendations || []) {
    await insertDecision({
      decision_type: "timing_adjustment",
      recommended_action: rec.action,
      reasoning: rec.reasoning,
      confidence_score: rec.confidence || 0.5,
    });
  }

  // Outreach priorities
  if (analysis.outreach_priorities?.length > 0) {
    await insertDecision({
      decision_type: "outreach_priority",
      recommended_action: analysis.outreach_priorities.join("; "),
      reasoning: "Weekly intelligence analysis — topics showing highest engagement potential",
      confidence_score: 0.7,
      context_data: { topics: analysis.outreach_priorities },
    });
  }

  // A/B test suggestion
  if (analysis.ab_test_suggestion?.hypothesis) {
    await insertDecision({
      decision_type: "ab_test",
      recommended_action: `TEST: ${analysis.ab_test_suggestion.hypothesis}`,
      reasoning: analysis.ab_test_suggestion.method,
      confidence_score: 0.6,
      context_data: analysis.ab_test_suggestion,
    });
  }

  // Group posting recommendations
  for (const rec of analysis.group_recommendations || []) {
    await insertDecision({
      decision_type: "group_recommendation",
      recommended_action: rec,
      reasoning: "Weekly intelligence — Facebook Group cross-posting strategy",
      confidence_score: 0.7,
    });
  }

  // Weekly summary (for smart-selector to reference)
  await insertDecision({
    decision_type: "weekly_analysis",
    recommended_action: analysis.summary,
    reasoning: JSON.stringify(analysis.platform_insights || {}),
    confidence_score: 0.8,
    context_data: {
      risk_alerts: analysis.risk_alerts || [],
      platform_insights: analysis.platform_insights || {},
    },
  });
}

// ─── Email report ──────────────────────────────────────────────────────────

async function sendEmailReport(analysis, days) {
  if (!RESEND_API_KEY || DRY_RUN) {
    console.log("\n📧 Email report (preview):\n");
    console.log(`Summary: ${analysis.summary}\n`);
    console.log("Content recommendations:");
    for (const r of analysis.content_recommendations || []) {
      console.log(`  [${r.priority}] ${r.action}`);
    }
    console.log("\nTiming recommendations:");
    for (const r of analysis.timing_recommendations || []) {
      console.log(`  ${r.action}`);
    }
    console.log("\nPlatform insights:");
    for (const [p, insight] of Object.entries(analysis.platform_insights || {})) {
      console.log(`  ${p}: ${insight}`);
    }
    if (analysis.risk_alerts?.length) {
      console.log("\n⚠️  Risk alerts:");
      for (const alert of analysis.risk_alerts) console.log(`  - ${alert}`);
    }
    if (!RESEND_API_KEY) return;
  }

  const html = `
    <h2>🧠 Weekly Intelligence Report — Little Chubby Press</h2>
    <p><em>${days}-day analysis ending ${new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</em></p>

    <h3>📋 Executive Summary</h3>
    <p>${analysis.summary}</p>

    <h3>📝 Content Recommendations</h3>
    <ul>${(analysis.content_recommendations || []).map(r =>
      `<li><strong>[${r.priority.toUpperCase()}]</strong> ${r.action}<br/><em>${r.reasoning}</em></li>`
    ).join("")}</ul>

    <h3>⏰ Timing Recommendations</h3>
    <ul>${(analysis.timing_recommendations || []).map(r =>
      `<li>${r.action}<br/><em>${r.reasoning}</em></li>`
    ).join("")}</ul>

    <h3>📱 Platform Insights</h3>
    <table border="1" cellpadding="8" style="border-collapse:collapse;">
      <tr><th>Platform</th><th>Insight</th></tr>
      ${Object.entries(analysis.platform_insights || {}).map(([p, i]) =>
        `<tr><td><strong>${p}</strong></td><td>${i}</td></tr>`
      ).join("")}
    </table>

    <h3>🔍 Outreach Priorities</h3>
    <ul>${(analysis.outreach_priorities || []).map(t => `<li>${t}</li>`).join("")}</ul>

    ${analysis.ab_test_suggestion?.hypothesis ? `
    <h3>🧪 A/B Test Suggestion</h3>
    <p><strong>Hypothesis:</strong> ${analysis.ab_test_suggestion.hypothesis}</p>
    <p><strong>Method:</strong> ${analysis.ab_test_suggestion.method}</p>
    <p><strong>Duration:</strong> ${analysis.ab_test_suggestion.duration_days} days</p>
    ` : ""}

    ${analysis.risk_alerts?.length ? `
    <h3>⚠️ Risk Alerts</h3>
    <ul>${analysis.risk_alerts.map(a => `<li>${a}</li>`).join("")}</ul>
    ` : ""}

    <hr/><p style="color:#888;font-size:12px;">Generated by the Little Chubby Press AI Agent System</p>
  `;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Little Chubby Press <analytics@littlechubbypress.com>",
      to: ANALYTICS_EMAIL,
      subject: `🧠 Weekly Intelligence Report — ${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" })}`,
      html,
    }),
  });

  if (res.ok) {
    console.log(`\n📧 Report emailed to ${ANALYTICS_EMAIL}`);
  } else {
    console.log(`\n⚠️  Email send failed: ${res.status}`);
  }
}

// ─── Main ──────────────────────────────────────────────────────────────────

async function main() {
  const days = getLookbackDays();
  console.log("🧠 Agent: Weekly Intelligence Report");
  console.log(`   Period: Last ${days} days`);
  console.log(`   Mode:   ${DRY_RUN ? "DRY RUN" : "LIVE"}\n`);

  // 1. Fetch all data
  const data = await fetchData(days);

  // Check if we have enough data
  const totalDataPoints = data.socialMetrics.length + data.trafficInsights.length + data.contentPerf.length;
  if (totalDataPoints === 0) {
    console.log("\n⚠️  No data available yet. Run the collectors first (collect-social-metrics + aggregate-traffic + link-content-performance).\n");
    return;
  }

  // 2. Analyze with Claude
  console.log("\n🤖 Analyzing with Claude...\n");
  const prompt = buildAnalysisPrompt(data, days);
  const analysis = await analyzeWithClaude(prompt);

  // 3. Store decisions
  await storeDecisions(analysis);

  // 4. Email report
  await sendEmailReport(analysis, days);

  console.log("\n✨ Weekly intelligence complete.\n");
}

main().catch((err) => {
  console.error(`\n❌ Fatal: ${err.message}\n`);
  process.exit(1);
});
