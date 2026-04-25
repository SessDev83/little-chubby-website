#!/usr/bin/env node
/**
 * i18n parity checker (master doc invariant #9, pkg P2-11.1).
 *
 * Verifies structural parity of bilingual content between EN and ES:
 *   1. Blog posts: every `postId` declared in src/content/blog/en/*.md must
 *      have a matching `postId` in src/content/blog/es/*.md, and vice versa.
 *      (Slugs are translated and intentionally differ — postId is the canonical
 *      cross-language anchor.) Posts with `category: "joke"` are EXCLUDED:
 *      jokes are designed as language-specific content with different humor
 *      per locale (different postIds by design, e.g. `joke-en-*` vs `chiste-*`).
 *   2. Book data: every entry in src/data/books.ts must declare BOTH `en` and
 *      `es` strings (non-empty) for title, subtitle, description, coverAlt,
 *      and ageRange. Optional fields (features, perfectFor) are checked only
 *      when present.
 *
 * Out of scope:
 *   - Astro hardcoded strings in components.
 *   - i18n of alt texts / ARIA labels.
 *
 * Exit codes:
 *   0 — parity OK
 *   1 — parity broken (lists offending postIds / book ids / fields)
 *
 * Usage:
 *   node scripts/check-i18n-parity.mjs
 */

import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const BLOG_EN = path.join(ROOT, "src/content/blog/en");
const BLOG_ES = path.join(ROOT, "src/content/blog/es");
const BOOKS_TS = path.join(ROOT, "src/data/books.ts");

let failed = false;

// ─── Blog parity (by postId, not by slug) ──────────────────────────────────

/**
 * Read each .md file in dir, extract `postId:` from frontmatter.
 * Returns Map<postId, slug>. Skips files starting with "_" (templates) and
 * files whose frontmatter declares `category: "joke"` (jokes are designed as
 * language-specific content with different humor per locale; postIds in EN
 * and ES are intentionally disjoint, e.g. `joke-en-*` vs `chiste-*`).
 * Reports duplicate postIds within the same lang as parity errors.
 */
function readBlogPostIds(dir, lang) {
  const map = new Map();
  if (!fs.existsSync(dir)) {
    console.error(`❌ Blog dir missing: ${dir}`);
    failed = true;
    return map;
  }
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".md") && !f.startsWith("_"));
  for (const file of files) {
    const slug = file.replace(/\.md$/, "");
    let raw = fs.readFileSync(path.join(dir, file), "utf-8");
    // Strip UTF-8 BOM if present (some editors add it; YAML frontmatter parser
    // would otherwise see BOM + `---` and fail the `^---` anchor).
    if (raw.charCodeAt(0) === 0xfeff) raw = raw.slice(1);
    // Frontmatter is the first --- ... --- block.
    const fm = raw.match(/^---\s*\n([\s\S]*?)\n---/);
    if (!fm) {
      console.error(`❌ ${lang}/${file}: missing YAML frontmatter.`);
      failed = true;
      continue;
    }
    const idMatch = fm[1].match(/^postId:\s*"([^"]*)"/m);
    if (!idMatch || !idMatch[1].trim()) {
      console.error(`❌ ${lang}/${file}: missing or empty postId in frontmatter.`);
      failed = true;
      continue;
    }
    const postId = idMatch[1].trim();
    // Skip jokes from cross-lang parity (intentional language-specific humor).
    const categoryMatch = fm[1].match(/^category:\s*"([^"]*)"/m);
    if (categoryMatch && categoryMatch[1].trim() === "joke") {
      continue;
    }
    if (map.has(postId)) {
      console.error(`❌ ${lang}: duplicate postId "${postId}" in ${map.get(postId)}.md and ${slug}.md`);
      failed = true;
    } else {
      map.set(postId, slug);
    }
  }
  return map;
}

const enPosts = readBlogPostIds(BLOG_EN, "en");
const esPosts = readBlogPostIds(BLOG_ES, "es");

const missingInEs = [...enPosts.keys()].filter((id) => !esPosts.has(id));
const missingInEn = [...esPosts.keys()].filter((id) => !enPosts.has(id));

if (missingInEs.length) {
  failed = true;
  console.error("❌ Blog postIds present in EN but missing in ES:");
  for (const id of missingInEs) console.error(`   - ${id}  (en/${enPosts.get(id)}.md)`);
}
if (missingInEn.length) {
  failed = true;
  console.error("❌ Blog postIds present in ES but missing in EN:");
  for (const id of missingInEn) console.error(`   - ${id}  (es/${esPosts.get(id)}.md)`);
}

// ─── Book data parity ──────────────────────────────────────────────────────
//
// Lightweight parse: read books.ts as text, slice into per-book blocks by
// `id: "..."` markers, then for each required localized field verify both
// `en:` and `es:` keys hold non-empty strings.
//
// If books.ts adopts a fundamentally different shape, this script needs an
// update — same trade-off other repo scripts take (daily-newsletter etc.).

const REQUIRED_FIELDS = ["title", "subtitle", "description", "coverAlt", "ageRange"];

const booksRaw = fs.readFileSync(BOOKS_TS, "utf-8");
// Split the books array by lines like `    id: "<slug>",` which open each
// object literal. We capture starting positions and slice between them.
const idMatches = [...booksRaw.matchAll(/^\s{2,}id:\s*"([^"]+)",?\s*$/gm)];
if (idMatches.length === 0) {
  console.error("❌ books.ts: could not locate any `id: \"...\"` entries (parser may need updating).");
  failed = true;
}

for (let i = 0; i < idMatches.length; i++) {
  const start = idMatches[i].index ?? 0;
  const end = i + 1 < idMatches.length ? (idMatches[i + 1].index ?? booksRaw.length) : booksRaw.length;
  const block = booksRaw.slice(start, end);
  const id = idMatches[i][1];

  for (const field of REQUIRED_FIELDS) {
    // Match `<field>: { ... en: "...", ... es: "..." ... }` — order-independent.
    const fieldRx = new RegExp(`${field}:\\s*\\{([^}]*)\\}`, "s");
    const fm = block.match(fieldRx);
    if (!fm) {
      console.error(`❌ books.ts: book "${id}" is missing the "${field}" field.`);
      failed = true;
      continue;
    }
    const inner = fm[1];
    const en = inner.match(/en:\s*"([^"]*)"/)?.[1]?.trim();
    const es = inner.match(/es:\s*"([^"]*)"/)?.[1]?.trim();
    if (!en) {
      console.error(`❌ books.ts: book "${id}" has empty/missing EN ${field}.`);
      failed = true;
    }
    if (!es) {
      console.error(`❌ books.ts: book "${id}" has empty/missing ES ${field}.`);
      failed = true;
    }
  }
}

if (failed) {
  console.error("\ni18n parity check FAILED.");
  process.exit(1);
}

console.log(
  `✅ i18n parity OK — ${enPosts.size} blog post pairs matched (by postId), ${idMatches.length} books verified across ${REQUIRED_FIELDS.length} required fields.`,
);
process.exit(0);
