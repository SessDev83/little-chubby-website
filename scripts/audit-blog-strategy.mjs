#!/usr/bin/env node
/**
 * Blog strategy audit for the 500-post SEO plan.
 *
 * Checks:
 * - EN/ES postId parity for article posts
 * - duplicate slugs, titles, postIds, and queue keywords
 * - queue cluster/category validity
 * - obvious conflicts between the strategic queue and existing posts
 */

import { existsSync, readFileSync, readdirSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const BLOG_DIR = resolve(ROOT, "src/content/blog");
const CLUSTERS_PATH = resolve(__dirname, "blog-clusters.json");
const SEO_QUEUE_PATH = resolve(__dirname, "blog-queue-500.json");

const VALID_ARTICLE_CATEGORIES = new Set(["focus-calm", "learning", "creativity", "activities", "guides"]);
const VALID_CONTENT_ROLES = new Set(["pillar", "spoke", "support"]);
const VALID_SEARCH_INTENTS = new Set(["informational", "commercial", "transactional", "navigational", "lifestyle"]);

function normalize(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf-8"));
}

function frontmatterValue(fm, key) {
  const match = fm.match(new RegExp(`^${key}:\\s*"([^"]*)"`, "m"));
  return match ? match[1] : "";
}

function readPosts(lang) {
  const dir = resolve(BLOG_DIR, lang);
  if (!existsSync(dir)) return [];
  const posts = [];
  for (const file of readdirSync(dir)) {
    if (!file.endsWith(".md") || file.startsWith("_")) continue;
    const content = readFileSync(resolve(dir, file), "utf-8").replace(/^\uFEFF/, "");
    const fm = content.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] || "";
    const category = frontmatterValue(fm, "category") || "article";
    if (category !== "article") continue;
    posts.push({
      lang,
      file,
      slug: file.replace(/\.md$/, ""),
      postId: frontmatterValue(fm, "postId"),
      title: frontmatterValue(fm, "title"),
      articleCategory: frontmatterValue(fm, "articleCategory"),
      seoCluster: frontmatterValue(fm, "seoCluster"),
      contentRole: frontmatterValue(fm, "contentRole"),
      primaryKeywordEn: fm.match(/^\s*en:\s*"([^"]*)"/m)?.[1] || "",
      primaryKeywordEs: fm.match(/^\s*es:\s*"([^"]*)"/m)?.[1] || "",
    });
  }
  return posts;
}

function addSeen(map, key, label) {
  if (!key) return;
  const normalized = normalize(key);
  if (!normalized) return;
  if (!map.has(normalized)) map.set(normalized, []);
  map.get(normalized).push(label);
}

function reportDuplicates(errors, map, type) {
  for (const [key, labels] of map.entries()) {
    if (labels.length > 1) errors.push(`${type} duplicated: "${key}" -> ${labels.join(" | ")}`);
  }
}

function main() {
  const errors = [];
  const warnings = [];

  const clustersData = readJson(CLUSTERS_PATH);
  const queue = readJson(SEO_QUEUE_PATH);
  const clusterIds = new Set((clustersData.clusters || []).map((cluster) => cluster.id));
  const posts = [...readPosts("en"), ...readPosts("es")];

  const slugs = new Map();
  const titles = new Map();
  const postIdsByLang = new Map();
  const existingKeywords = new Map();

  for (const post of posts) {
    addSeen(slugs, `${post.lang}/${post.slug}`, post.file);
    addSeen(titles, post.title, `${post.lang}/${post.file}`);
    if (!post.postId) errors.push(`Missing postId in ${post.lang}/${post.file}`);
    if (!postIdsByLang.has(post.postId)) postIdsByLang.set(post.postId, new Set());
    postIdsByLang.get(post.postId).add(post.lang);
    addSeen(existingKeywords, post.primaryKeywordEn, `${post.lang}/${post.file}`);
    addSeen(existingKeywords, post.primaryKeywordEs, `${post.lang}/${post.file}`);
  }

  reportDuplicates(errors, titles, "Article title");
  reportDuplicates(errors, existingKeywords, "Existing primary keyword");

  for (const [postId, langs] of postIdsByLang.entries()) {
    if (!postId) continue;
    if (!langs.has("en") || !langs.has("es")) {
      warnings.push(`Article postId lacks EN/ES pair: ${postId} (${[...langs].join(", ")})`);
    }
  }

  const queueIds = new Map();
  const queueKeywords = new Map();
  const queuePriorities = new Map();

  for (const item of queue) {
    const label = item.id || JSON.stringify(item.topic);
    if (!item.id) errors.push(`Queue item missing id: ${label}`);
    addSeen(queueIds, item.id, label);
    addSeen(queueKeywords, item.primaryKeyword?.en, `${label} [en]`);
    addSeen(queueKeywords, item.primaryKeyword?.es, `${label} [es]`);
    addSeen(queuePriorities, String(item.priority), label);

    if (!clusterIds.has(item.seoCluster)) errors.push(`Invalid seoCluster in queue item ${label}: ${item.seoCluster}`);
    if (!VALID_ARTICLE_CATEGORIES.has(item.articleCategory)) errors.push(`Invalid articleCategory in queue item ${label}: ${item.articleCategory}`);
    if (!VALID_CONTENT_ROLES.has(item.contentRole)) errors.push(`Invalid contentRole in queue item ${label}: ${item.contentRole}`);
    if (!VALID_SEARCH_INTENTS.has(item.searchIntent)) errors.push(`Invalid searchIntent in queue item ${label}: ${item.searchIntent}`);
    if (item.contentRole !== "pillar" && !item.pillarId) errors.push(`Non-pillar queue item missing pillarId: ${label}`);
    if (!item.topic?.en || !item.topic?.es) errors.push(`Queue item missing bilingual topic: ${label}`);

    const existingPostIdLangs = postIdsByLang.get(item.id);
    if (existingPostIdLangs) warnings.push(`Queue item already appears published by postId: ${item.id}`);
    for (const keyword of [item.primaryKeyword?.en, item.primaryKeyword?.es]) {
      const normalized = normalize(keyword);
      if (normalized && existingKeywords.has(normalized)) {
        warnings.push(`Queue keyword may already exist: "${keyword}" -> ${existingKeywords.get(normalized).join(" | ")}`);
      }
    }
  }

  reportDuplicates(errors, queueIds, "Queue id");
  reportDuplicates(errors, queueKeywords, "Queue primary keyword");
  reportDuplicates(warnings, queuePriorities, "Queue priority");

  console.log("\nBlog strategy audit");
  console.log("───────────────────");
  console.log(`Article posts checked: ${posts.length}`);
  console.log(`SEO clusters checked: ${(clustersData.clusters || []).length}`);
  console.log(`SEO queue items checked: ${queue.length}`);

  if (warnings.length) {
    console.log("\nWarnings:");
    for (const warning of warnings) console.log(`  ⚠ ${warning}`);
  }

  if (errors.length) {
    console.error("\nErrors:");
    for (const error of errors) console.error(`  ✗ ${error}`);
    process.exit(1);
  }

  console.log("\n✅ Blog strategy audit passed\n");
}

main();