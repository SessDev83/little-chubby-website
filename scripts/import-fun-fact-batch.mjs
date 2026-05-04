#!/usr/bin/env node
/**
 * Fun-fact batch importer (kid-safe, SEO-friendly, EN+ES parity).
 *
 * Reads `scripts/fun-fact-batches/batch-NN.mjs` and writes paired EN/ES
 * Markdown files into `src/content/blog/{en,es}/<slug>.md`.
 *
 * Design goals:
 *   1. Idempotent: skip if file already exists (won't overwrite hand-edits).
 *   2. Date continuity: pick next day after the latest existing fun-fact date.
 *   3. Parity-safe: postId is shared between EN+ES (validated by check-i18n).
 *   4. Dry-run mode for previewing changes before writing.
 *   5. Strict frontmatter: matches the schema in src/content.config.ts.
 *
 * Each fact in a batch file must look like:
 *   {
 *     slug: "fun-fact-neutron-star-teaspoon",   // shared filename
 *     postId: "fun-fact-neutron-star",          // shared cross-lang anchor
 *     tags: ["fun-fact", "space", "science"],   // drives category routing
 *     en: { title, summary, body },
 *     es: { title, summary, body }
 *   }
 *
 * Usage:
 *   node scripts/import-fun-fact-batch.mjs                  # default: batch 1
 *   node scripts/import-fun-fact-batch.mjs --batch 2
 *   node scripts/import-fun-fact-batch.mjs --batch 1 --dry-run
 *   node scripts/import-fun-fact-batch.mjs --batch 1 --start-date 2026-05-03
 */

import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const ROOT = path.resolve(import.meta.dirname, "..");
const EN_DIR = path.join(ROOT, "src/content/blog/en");
const ES_DIR = path.join(ROOT, "src/content/blog/es");
const BATCH_DIR = path.join(ROOT, "scripts/fun-fact-batches");

// ─── Args ──────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
function arg(name, fallback) {
  const idx = args.indexOf(name);
  return idx >= 0 && idx + 1 < args.length ? args[idx + 1] : fallback;
}
const BATCH_NUM = parseInt(arg("--batch", "1"), 10);
const DRY_RUN = args.includes("--dry-run");
const START_DATE_OVERRIDE = arg("--start-date", null);

if (!Number.isFinite(BATCH_NUM) || BATCH_NUM < 1) {
  console.error("❌ --batch must be a positive integer.");
  process.exit(1);
}

// ─── Helpers ───────────────────────────────────────────────────────────────
const yamlEscape = (s) => String(s).replace(/\\/g, "\\\\").replace(/"/g, '\\"');

function readFrontmatter(raw) {
  const stripped = raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw;
  const m = stripped.match(/^---\s*\n([\s\S]*?)\n---/);
  if (!m) return null;
  const block = m[1];
  const out = {};
  for (const line of block.split(/\r?\n/)) {
    const kv = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (kv) out[kv[1]] = kv[2].trim();
  }
  return out;
}

function getLatestFunFactDate() {
  let latest = "0000-00-00";
  for (const dir of [EN_DIR, ES_DIR]) {
    if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir).filter((x) => x.endsWith(".md"))) {
      const raw = fs.readFileSync(path.join(dir, f), "utf-8");
      const fm = readFrontmatter(raw);
      if (!fm) continue;
      const cat = (fm.category || "").replace(/^["']|["']$/g, "");
      if (cat !== "fun-fact") continue;
      const date = (fm.date || "").replace(/^["']|["']$/g, "");
      if (date && date > latest) latest = date;
    }
  }
  return latest;
}

function addDays(isoDate, days) {
  const [y, m, d] = isoDate.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function buildFrontmatter(fact, lang, date) {
  const tagsArray = JSON.stringify(fact.tags);
  const localized = fact[lang];
  return [
    "---",
    `postId: "${fact.postId}"`,
    `title: "${yamlEscape(localized.title)}"`,
    `date: "${date}"`,
    `summary: "${yamlEscape(localized.summary)}"`,
    `lang: "${lang}"`,
    `category: "fun-fact"`,
    `image: ""`,
    `tags: ${tagsArray}`,
    "---",
    "",
    localized.body.trim(),
    "",
  ].join("\n");
}

function validateFact(fact, idx) {
  const errors = [];
  const required = ["slug", "postId", "tags", "en", "es"];
  for (const field of required) {
    if (!fact[field]) errors.push(`fact #${idx + 1}: missing "${field}"`);
  }
  if (fact.slug && !/^fun-fact-[a-z0-9-]+$/.test(fact.slug)) {
    errors.push(`fact #${idx + 1} (${fact.slug}): slug must match fun-fact-[a-z0-9-]+`);
  }
  if (fact.tags && !fact.tags.includes("fun-fact")) {
    errors.push(`fact #${idx + 1} (${fact.slug}): tags must include "fun-fact"`);
  }
  for (const lang of ["en", "es"]) {
    if (!fact[lang]) continue;
    for (const f of ["title", "summary", "body"]) {
      if (!fact[lang][f] || !fact[lang][f].trim()) {
        errors.push(`fact #${idx + 1} (${fact.slug}): ${lang}.${f} is empty`);
      }
    }
  }
  return errors;
}

// ─── Run ───────────────────────────────────────────────────────────────────
async function main() {
  const padded = String(BATCH_NUM).padStart(2, "0");
  const batchPath = path.join(BATCH_DIR, `batch-${padded}.mjs`);
  if (!fs.existsSync(batchPath)) {
    console.error(`❌ Batch file not found: ${batchPath}`);
    process.exit(1);
  }

  console.log(`\n📦 Fun-fact batch importer\n`);
  console.log(`  Batch file: scripts/fun-fact-batches/batch-${padded}.mjs`);

  const mod = await import(pathToFileURL(batchPath).href);
  const batch = mod.default || mod;
  const facts = batch.facts || [];
  if (!facts.length) {
    console.error("❌ Batch contains no facts.");
    process.exit(1);
  }

  // Validate everything first.
  const errors = facts.flatMap((f, i) => validateFact(f, i));
  // Detect duplicate slugs / postIds within the batch.
  const seenSlugs = new Map();
  const seenIds = new Map();
  facts.forEach((f, i) => {
    if (seenSlugs.has(f.slug)) {
      errors.push(`fact #${i + 1}: duplicate slug "${f.slug}" (also at #${seenSlugs.get(f.slug) + 1})`);
    } else {
      seenSlugs.set(f.slug, i);
    }
    if (seenIds.has(f.postId)) {
      errors.push(`fact #${i + 1}: duplicate postId "${f.postId}" (also at #${seenIds.get(f.postId) + 1})`);
    } else {
      seenIds.set(f.postId, i);
    }
  });
  if (errors.length) {
    console.error("\n❌ Batch validation failed:");
    for (const e of errors) console.error("   - " + e);
    process.exit(1);
  }

  const baseDate = START_DATE_OVERRIDE || addDays(getLatestFunFactDate(), 1);
  console.log(`  Facts in batch: ${facts.length}`);
  console.log(`  Start date: ${baseDate}${START_DATE_OVERRIDE ? " (override)" : " (latest + 1 day)"}`);
  console.log(`  Mode: ${DRY_RUN ? "DRY RUN (no files written)" : "WRITE"}\n`);

  let written = 0;
  let skipped = 0;
  let day = 0;
  for (const fact of facts) {
    const date = addDays(baseDate, day);
    day++;

    const enPath = path.join(EN_DIR, `${fact.slug}.md`);
    const esPath = path.join(ES_DIR, `${fact.slug}.md`);
    const enExists = fs.existsSync(enPath);
    const esExists = fs.existsSync(esPath);

    if (enExists && esExists) {
      skipped++;
      console.log(`  ⏭  ${fact.slug}  (already exists in both langs)`);
      continue;
    }

    const enContent = buildFrontmatter(fact, "en", date);
    const esContent = buildFrontmatter(fact, "es", date);

    if (DRY_RUN) {
      console.log(`  ✎  ${fact.slug}  (${date}) — would write ${enExists ? "" : "EN "}${esExists ? "" : "ES"}`);
    } else {
      if (!enExists) fs.writeFileSync(enPath, enContent, "utf-8");
      if (!esExists) fs.writeFileSync(esPath, esContent, "utf-8");
      console.log(`  ✓  ${fact.slug}  (${date})`);
    }
    written++;
  }

  console.log(`\n✅ Done. Written: ${written} | Skipped: ${skipped} | Total in batch: ${facts.length}`);
  if (DRY_RUN) {
    console.log("ℹ️  Dry run — no files were modified.");
  } else {
    console.log("Next: run `npm run check:i18n` then `npm run check` to validate.");
  }
}

main().catch((err) => {
  console.error("❌ Importer crashed:", err);
  process.exit(1);
});
