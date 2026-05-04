#!/usr/bin/env node
/**
 * Blog SEO Intelligence
 *
 * Reads local SEO article metadata plus recent Supabase analytics and writes
 * read-only recommendations to agent_decisions. It does not mutate the blog
 * queue; owner review stays in the loop.
 *
 * Usage:
 *   node scripts/agents/blog-seo-intelligence.mjs --days 30
 *   node scripts/agents/blog-seo-intelligence.mjs --days 30 --dry-run
 *   node scripts/agents/blog-seo-intelligence.mjs --offline --dry-run
 */

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { classifyGrowthSource } from "../../src/lib/linkable-assets.mjs";
import { normalizeAnalyticsEvents } from "../../src/lib/analytics-event-contract.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");
const BLOG_DIR = resolve(ROOT, "src/content/blog");
const QUEUE_PATH = resolve(ROOT, "scripts/blog-queue-500.json");
const CLUSTERS_PATH = resolve(ROOT, "scripts/blog-clusters.json");

loadEnv();

const DAYS = Number(argValue("--days", "30"));
const DRY_RUN = process.argv.includes("--dry-run");
const OFFLINE = process.argv.includes("--offline");
const SUPABASE_URL = process.env.PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!Number.isFinite(DAYS) || DAYS <= 0 || DAYS > 365) {
  console.error("--days must be a number between 1 and 365");
  process.exit(1);
}

if (!OFFLINE && (!SUPABASE_URL || !SUPABASE_KEY)) {
  console.error("Missing PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY (use --offline for local metadata-only preview)");
  process.exit(1);
}

function argValue(name, fallback = "") {
  const index = process.argv.indexOf(name);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
}

function loadEnv() {
  const envPath = resolve(ROOT, ".env");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf-8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

function readJson(path, fallback) {
  try {
    return JSON.parse(readFileSync(path, "utf-8"));
  } catch {
    return fallback;
  }
}

function normalizePath(value) {
  if (!value) return "/";
  try {
    const parsed = new URL(String(value), "https://www.littlechubbypress.com");
    return parsed.pathname.endsWith("/") ? parsed.pathname : `${parsed.pathname}/`;
  } catch {
    const path = String(value).split("?")[0].split("#")[0] || "/";
    return path.endsWith("/") ? path : `${path}/`;
  }
}

function frontmatterValue(fm, key) {
  const match = fm.match(new RegExp(`^${key}:\\s*(?:"([^"]*)"|'([^']*)'|([^\\r\\n#]+))`, "m"));
  return (match?.[1] ?? match?.[2] ?? match?.[3] ?? "").trim().replace(/^['"]|['"]$/g, "");
}

function nestedValue(fm, parent, key) {
  const block = fm.match(new RegExp(`^${parent}:\\s*\\r?\\n([\\s\\S]*?)(?=\\n\\S|$)`, "m"))?.[1] || "";
  const match = block.match(new RegExp(`^\\s*${key}:\\s*(?:"([^"]*)"|'([^']*)'|([^\\r\\n#]+))`, "m"));
  return (match?.[1] ?? match?.[2] ?? match?.[3] ?? "").trim().replace(/^['"]|['"]$/g, "");
}

function postPath(post) {
  if (post.category === "article" && post.articleCategory) {
    return `/${post.lang}/articles/${post.articleCategory}/${post.slug}/`;
  }
  return `/${post.lang}/blog/${post.slug}/`;
}

function readPosts(lang) {
  const dir = resolve(BLOG_DIR, lang);
  if (!existsSync(dir)) return [];

  return readdirSync(dir)
    .filter((file) => file.endsWith(".md") && !file.startsWith("_"))
    .map((file) => {
      const raw = readFileSync(join(dir, file), "utf-8").replace(/^\uFEFF/, "");
      const fm = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] || "";
      if (!fm) return null;
      const post = {
        lang,
        file,
        slug: file.replace(/\.md$/, ""),
        postId: frontmatterValue(fm, "postId"),
        title: frontmatterValue(fm, "title"),
        summary: frontmatterValue(fm, "summary"),
        date: frontmatterValue(fm, "date"),
        category: frontmatterValue(fm, "category") || "article",
        articleCategory: frontmatterValue(fm, "articleCategory"),
        seoCluster: frontmatterValue(fm, "seoCluster") || "unclustered",
        contentRole: frontmatterValue(fm, "contentRole") || "support",
        searchIntent: frontmatterValue(fm, "searchIntent"),
        primaryKeyword: nestedValue(fm, "primaryKeyword", lang),
      };
      if (post.category !== "article") return null;
      post.path = normalizePath(postPath(post));
      return post;
    })
    .filter(Boolean);
}

function buildPathIndex(posts) {
  const index = new Map();
  for (const post of posts) {
    index.set(post.path, { post, stale: false });
    if (post.articleCategory) {
      index.set(normalizePath(`/${post.lang}/blog/${post.slug}/`), { post, stale: true });
    }
  }
  return index;
}

async function fetchAll(table, select, dateColumn, startISO, endISO) {
  if (OFFLINE) return [];
  const rows = [];
  let offset = 0;
  while (true) {
    const params = new URLSearchParams();
    params.set("select", select);
    params.set(dateColumn, `gte.${startISO}`);
    params.append(dateColumn, `lte.${endISO}`);
    params.set("order", `${dateColumn}.asc`);
    params.set("limit", "1000");
    params.set("offset", String(offset));
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${params}`, {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
    });
    if (!res.ok) {
      console.log(`Warning: ${table} query failed (${res.status}); continuing with available data.`);
      break;
    }
    const page = await res.json();
    if (!page.length) break;
    rows.push(...page);
    if (page.length < 1000) break;
    offset += 1000;
  }
  return rows;
}

function emptyPostStats(post) {
  return {
    post,
    pageviews: 0,
    uniqueVisitors: new Set(),
    organicPageviews: 0,
    referralPageviews: 0,
    socialPageviews: 0,
    emailPageviews: 0,
    directPageviews: 0,
    internalPageviews: 0,
    stalePathPageviews: 0,
    events: 0,
    leads: 0,
    registrations: 0,
    downloads: 0,
    bookIntent: 0,
    amazonClicks: 0,
  };
}

function eventBucket(name) {
  if (/newsletter|lead_magnet/.test(name)) return "leads";
  if (name === "register_completed") return "registrations";
  if (name === "download_completed") return "downloads";
  if (/book_page|sample/.test(name)) return "bookIntent";
  if (name === "amazon_click") return "amazonClicks";
  return "events";
}

function summarize(posts, pageviews, events) {
  const pathIndex = buildPathIndex(posts);
  const byKey = new Map(posts.map((post) => [`${post.lang}/${post.slug}`, emptyPostStats(post)]));

  for (const row of pageviews) {
    const hit = pathIndex.get(normalizePath(row.path));
    if (!hit) continue;
    const stats = byKey.get(`${hit.post.lang}/${hit.post.slug}`);
    stats.pageviews += 1;
    if (row.visitor_hash) stats.uniqueVisitors.add(row.visitor_hash);
    if (hit.stale) stats.stalePathPageviews += 1;
    const source = classifyGrowthSource(row).category;
    if (source === "organic") stats.organicPageviews += 1;
    else if (source === "referral") stats.referralPageviews += 1;
    else if (source === "social") stats.socialPageviews += 1;
    else if (source === "email") stats.emailPageviews += 1;
    else if (source === "internal") stats.internalPageviews += 1;
    else stats.directPageviews += 1;
  }

  for (const event of normalizeAnalyticsEvents(events)) {
    const path = event.path || event.props?.landing_page || "";
    const hit = pathIndex.get(normalizePath(path));
    if (!hit) continue;
    const stats = byKey.get(`${hit.post.lang}/${hit.post.slug}`);
    stats.events += 1;
    const bucket = eventBucket(event.event_name || "");
    if (bucket !== "events") stats[bucket] += 1;
  }

  return [...byKey.values()].map((stats) => {
    const qualifiedPageviews = stats.organicPageviews + stats.referralPageviews;
    const conversionPoints =
      stats.leads * 3 +
      stats.registrations * 4 +
      stats.downloads * 3 +
      stats.bookIntent * 2 +
      stats.amazonClicks * 5;
    const growthScore =
      qualifiedPageviews * 1.5 +
      stats.socialPageviews * 0.5 +
      stats.emailPageviews * 0.75 +
      stats.uniqueVisitors.size * 0.3 +
      conversionPoints -
      stats.stalePathPageviews * 2;
    return {
      ...stats,
      uniqueVisitors: stats.uniqueVisitors.size,
      qualifiedPageviews,
      conversionPoints,
      growthScore: Number(growthScore.toFixed(2)),
      actionRate: stats.pageviews ? Number(((stats.leads + stats.registrations + stats.downloads + stats.bookIntent + stats.amazonClicks) / stats.pageviews).toFixed(4)) : 0,
    };
  });
}

function clusterSummaries(rows, clusters) {
  const known = new Map((clusters.clusters || []).map((cluster) => [cluster.id, { ...cluster, posts: 0 }]));
  const byCluster = new Map();
  for (const row of rows) {
    const id = row.post.seoCluster || "unclustered";
    if (!byCluster.has(id)) {
      byCluster.set(id, {
        id,
        name: known.get(id)?.name || id,
        posts: 0,
        pageviews: 0,
        qualifiedPageviews: 0,
        leads: 0,
        amazonClicks: 0,
        conversionPoints: 0,
        growthScore: 0,
      });
    }
    const cluster = byCluster.get(id);
    cluster.posts += 1;
    cluster.pageviews += row.pageviews;
    cluster.qualifiedPageviews += row.qualifiedPageviews;
    cluster.leads += row.leads;
    cluster.amazonClicks += row.amazonClicks;
    cluster.conversionPoints += row.conversionPoints;
    cluster.growthScore += row.growthScore;
  }
  return [...byCluster.values()].sort((a, b) => b.growthScore - a.growthScore || b.qualifiedPageviews - a.qualifiedPageviews);
}

function pickQueueCandidates(queue, clusters) {
  const pending = queue.filter((item) => item.status !== "done");
  if (!pending.length) return [];
  const topCluster = clusters.find((cluster) => cluster.qualifiedPageviews > 0 || cluster.conversionPoints > 0);
  const minPublished = Math.min(...clusters.map((cluster) => cluster.posts));
  return pending
    .map((item) => {
      const cluster = clusters.find((entry) => entry.id === item.seoCluster);
      const score =
        (cluster?.growthScore || 0) +
        (topCluster && item.seoCluster === topCluster.id ? 25 : 0) +
        (cluster && cluster.posts === minPublished ? 10 : 0) -
        Number(item.priority || 999) / 10;
      return { item, score: Number(score.toFixed(2)), cluster };
    })
    .sort((a, b) => b.score - a.score || Number(a.item.priority || 999) - Number(b.item.priority || 999))
    .slice(0, 5);
}

function deriveRecommendations({ rows, clusters, queueCandidates, days }) {
  const recs = [];
  const topPosts = rows.filter((row) => row.pageviews > 0).sort((a, b) => b.growthScore - a.growthScore).slice(0, 5);
  const staleHits = rows.filter((row) => row.stalePathPageviews > 0).sort((a, b) => b.stalePathPageviews - a.stalePathPageviews);
  const topCluster = clusters.find((cluster) => cluster.qualifiedPageviews > 0 || cluster.conversionPoints > 0);

  if (queueCandidates[0]) {
    const { item, cluster } = queueCandidates[0];
    recs.push({
      priority: topCluster && item.seoCluster === topCluster.id ? "high" : "medium",
      action: `Prioritize next SEO queue item: ${item.id}`,
      reasoning: `${item.contentRole || "article"} in ${item.seoCluster}; current cluster score ${cluster?.growthScore?.toFixed?.(1) || "0.0"}; queue priority ${item.priority}.`,
      context: { queue_item: item.id, seoCluster: item.seoCluster, articleCategory: item.articleCategory, score: queueCandidates[0].score },
    });
  }

  if (topCluster) {
    recs.push({
      priority: "medium",
      action: `Expand the ${topCluster.id} cluster with one new spoke or internal-link refresh`,
      reasoning: `${topCluster.qualifiedPageviews} qualified pageviews and ${topCluster.conversionPoints} conversion points in the last ${days} days.`,
      context: { seoCluster: topCluster.id, qualifiedPageviews: topCluster.qualifiedPageviews, conversionPoints: topCluster.conversionPoints },
    });
  }

  if (topPosts[0]) {
    recs.push({
      priority: "medium",
      action: `Use ${topPosts[0].post.slug} as the internal-link destination for related new posts`,
      reasoning: `Top article score ${topPosts[0].growthScore}; ${topPosts[0].qualifiedPageviews} qualified pageviews; action rate ${(topPosts[0].actionRate * 100).toFixed(1)}%.`,
      context: { path: topPosts[0].post.path, postId: topPosts[0].post.postId, seoCluster: topPosts[0].post.seoCluster },
    });
  }

  if (staleHits[0]) {
    recs.push({
      priority: "high",
      action: "Fix any remaining social/email links that point article traffic to legacy /blog/ URLs",
      reasoning: `${staleHits[0].stalePathPageviews} stale-path pageviews detected for ${staleHits[0].post.slug}.`,
      context: { path: staleHits[0].post.path, slug: staleHits[0].post.slug, stalePathPageviews: staleHits[0].stalePathPageviews },
    });
  }

  if (!topPosts.length) {
    recs.push({
      priority: "low",
      action: "Keep the SEO queue moving while analytics volume builds",
      reasoning: `No article pageviews matched the local SEO content map in the last ${days} days.`,
      context: { days },
    });
  }

  return recs.slice(0, 8);
}

async function insertDecisions(recommendations, report) {
  if (OFFLINE || DRY_RUN || !recommendations.length) {
    console.log(`Decision write skipped (${OFFLINE ? "offline" : DRY_RUN ? "dry-run" : "no recommendations"}).`);
    return;
  }
  const rows = recommendations.map((rec) => ({
    decision_type: "blog_seo_recommendation",
    recommended_action: rec.action,
    reasoning: rec.reasoning,
    confidence_score: rec.priority === "high" ? 0.9 : rec.priority === "medium" ? 0.72 : 0.55,
    context_data: { ...rec.context, source: "blog-seo-intelligence", window_days: report.days, generated_at: report.generatedAt },
  }));
  const res = await fetch(`${SUPABASE_URL}/rest/v1/agent_decisions`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify(rows),
  });
  if (!res.ok) throw new Error(`agent_decisions insert failed: ${res.status} ${await res.text()}`);
  console.log(`Stored ${rows.length} blog SEO recommendation(s) in agent_decisions.`);
}

function renderReport(report) {
  const lines = [];
  lines.push("Blog SEO Intelligence");
  lines.push("=====================");
  lines.push(`Window: ${report.startISO.slice(0, 10)} to ${report.endISO.slice(0, 10)} (${report.days} days)`);
  lines.push(`Mode: ${OFFLINE ? "offline" : DRY_RUN ? "dry-run" : "live"}`);
  lines.push("");
  lines.push(`Articles mapped: ${report.articleCount}`);
  lines.push(`Pageviews read: ${report.pageviewCount}`);
  lines.push(`Events read: ${report.eventCount}`);
  lines.push("");
  lines.push("Top clusters:");
  for (const cluster of report.clusters.slice(0, 6)) {
    lines.push(`- ${cluster.id}: score ${cluster.growthScore.toFixed(1)}, ${cluster.qualifiedPageviews} qualified PV, ${cluster.conversionPoints} conversion points, ${cluster.posts} article files`);
  }
  lines.push("");
  lines.push("Top articles:");
  for (const row of report.topArticles) {
    lines.push(`- ${row.post.lang}/${row.post.slug}: score ${row.growthScore}, ${row.pageviews} PV, ${row.qualifiedPageviews} qualified, ${row.leads} leads, ${row.amazonClicks} Amazon clicks`);
  }
  if (!report.topArticles.length) lines.push("- No matched article traffic yet.");
  lines.push("");
  lines.push("Queue candidates:");
  for (const candidate of report.queueCandidates) {
    lines.push(`- ${candidate.item.id}: score ${candidate.score}, cluster ${candidate.item.seoCluster}, priority ${candidate.item.priority}`);
  }
  if (!report.queueCandidates.length) lines.push("- No pending queue items found.");
  lines.push("");
  lines.push("Recommendations:");
  for (const rec of report.recommendations) {
    lines.push(`- [${rec.priority}] ${rec.action}`);
    lines.push(`  Reason: ${rec.reasoning}`);
  }
  return lines.join("\n");
}

async function main() {
  const generatedAt = new Date().toISOString();
  const end = new Date();
  const start = new Date(end.getTime() - DAYS * 24 * 60 * 60 * 1000);
  const startISO = start.toISOString();
  const endISO = end.toISOString();

  const posts = [...readPosts("en"), ...readPosts("es")];
  const queue = readJson(QUEUE_PATH, []);
  const clustersData = readJson(CLUSTERS_PATH, { clusters: [] });
  const [pageviews, events] = await Promise.all([
    fetchAll("pageviews", "path,referrer,visitor_hash,utm_source,utm_medium,utm_campaign,utm_content,created_at", "created_at", startISO, endISO),
    fetchAll("conversion_events", "event_name,path,visitor_hash,props,created_at", "created_at", startISO, endISO),
  ]);

  const rows = summarize(posts, pageviews, events);
  const clusters = clusterSummaries(rows, clustersData);
  const queueCandidates = pickQueueCandidates(queue, clusters);
  const recommendations = deriveRecommendations({ rows, clusters, queueCandidates, days: DAYS });
  const topArticles = rows.filter((row) => row.pageviews > 0).sort((a, b) => b.growthScore - a.growthScore).slice(0, 10);

  const report = {
    generatedAt,
    days: DAYS,
    startISO,
    endISO,
    articleCount: posts.length,
    pageviewCount: pageviews.length,
    eventCount: events.length,
    clusters,
    topArticles,
    queueCandidates,
    recommendations,
  };

  console.log(renderReport(report));
  await insertDecisions(recommendations, report);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
