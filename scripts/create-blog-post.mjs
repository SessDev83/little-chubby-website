#!/usr/bin/env node
/**
 * Bilingual Blog Post Creator
 * Creates matching EN + ES blog posts with shared postId for seamless language switching.
 *
 * Usage:
 *   node scripts/create-blog-post.mjs --topic "why coloring helps kids sleep better"
 *   node scripts/create-blog-post.mjs --topic "..." --bookId magical-creatures
 *   node scripts/create-blog-post.mjs --topic "..." --dry-run
 */

import { writeFileSync, existsSync } from "fs";
import { resolve } from "path";

// ─── Config ─────────────────────────────────────────────────────────────────

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-sonnet-4-20250514";
const MAX_TOKENS = 4096;
const BLOG_DIR = resolve("src/content/blog");

const SITE_URL = "https://www.littlechubbypress.com";

// ─── System prompt ──────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are the bilingual blog content writer for Little Chubby Press, a small independent publisher of children's coloring books.

Your job is to create ONE blog post in TWO languages (English + Spanish) simultaneously.

BRAND VOICE:
- Warm, friendly, and encouraging — like a helpful parent friend
- Speak TO parents/caregivers, not to kids
- Passionate about screen-free creative play
- Expert but approachable — back claims with reasoning, not jargon
- Never salesy — even book mentions should feel like genuine recommendations

TARGET AUDIENCE:
- Parents and caregivers of children ages 4-12
- They value reducing screen time, fostering creativity, and quality family moments

WRITING RULES:
- Posts should be 600-900 words each (per language)
- Use Markdown: ## for sections (never #), **bold** for emphasis, bullet lists where helpful
- 4-6 clear sections with descriptive ## headings
- Open with a relatable hook that names a real parenting pain point
- Include practical, actionable tips parents can use TODAY
- Close with an encouraging takeaway
- DO NOT use # (h1) — Astro renders the title separately
- DO NOT include the title in the body text
- Spanish: Latin American, casual but respectful. Do NOT use accents/tildes. Use "peques" instead of "ninos pequenos"
- English: warm American English, inclusive language

SLUG RULES:
- English slug: 4-7 lowercase words separated by hyphens, descriptive SEO-friendly
- Spanish slug: 4-7 lowercase words separated by hyphens, descriptive SEO-friendly in Spanish
- NO accents/tildes in slugs

TAG RULES:
- 3-5 tags per post, lowercase English words
- Pick from existing tags when possible: creativity, focus, emotions, parenting, screen-free, fine-motor, book-review, confidence, imagination, education, family-activities, stem, self-expression, travel, seasonal, food, fashion
- Only invent a new tag if truly needed

RESPONSE FORMAT:
Respond with VALID JSON ONLY. No markdown fences, no backticks, no commentary.
{
  "postId": "short-kebab-case-id-shared-by-both",
  "en": {
    "slug": "english-seo-friendly-slug",
    "title": "Engaging English Title in Title Case",
    "summary": "One compelling sentence (max 160 chars) for meta description",
    "tags": ["tag1", "tag2", "tag3"],
    "body": "Full markdown body (600-900 words)..."
  },
  "es": {
    "slug": "slug-descriptivo-en-espanol",
    "title": "Titulo atractivo en espanol",
    "summary": "Una oracion compelling (max 160 chars) para meta description",
    "tags": ["tag1", "tag2", "tag3"],
    "body": "Cuerpo completo en markdown (600-900 palabras)..."
  }
}`;

// ─── Helpers ────────────────────────────────────────────────────────────────

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = { topic: null, bookId: null, dryRun: false };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--topic" && args[i + 1]) opts.topic = args[++i];
    if (args[i] === "--bookId" && args[i + 1]) opts.bookId = args[++i];
    if (args[i] === "--dry-run") opts.dryRun = true;
  }
  return opts;
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function buildFrontmatter(data, lang, postId, bookId, date, imagePath) {
  const lines = [
    "---",
    `postId: "${postId}"`,
    `title: "${data.title.replace(/"/g, '\\"')}"`,
    `date: "${date}"`,
    `summary: "${data.summary.replace(/"/g, '\\"')}"`,
    `lang: "${lang}"`,
  ];
  if (bookId) lines.push(`bookId: "${bookId}"`);
  if (imagePath) lines.push(`image: "${imagePath}"`);
  lines.push(`tags: [${data.tags.map((t) => `"${t}"`).join(", ")}]`);
  lines.push("---");
  return lines.join("\n");
}

// ─── AI call ────────────────────────────────────────────────────────────────

async function generatePost(topic, bookId) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error("  ✗ ANTHROPIC_API_KEY not set");
    process.exit(1);
  }

  let userPrompt = `Write a bilingual blog post about: "${topic}"`;
  if (bookId) {
    userPrompt += `\n\nRelated book (bookId: "${bookId}"). Mention this book naturally in both versions as a recommendation — never as an ad. Include a brief "check out [book title]" moment that fits the post's narrative.`;
  }
  userPrompt += `\n\nToday's date: ${todayISO()}`;
  userPrompt += `\n\nSite URL: ${SITE_URL}`;

  console.log("  🤖 Calling Claude...");
  const res = await fetch(ANTHROPIC_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userPrompt }],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Anthropic API error (${res.status}): ${err}`);
  }

  const json = await res.json();
  const raw = json.content?.[0]?.text ?? "";
  return JSON.parse(raw);
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  const { topic, bookId, dryRun } = parseArgs();

  if (!topic) {
    console.log(`
📝 Little Chubby Press — Bilingual Blog Post Creator

Usage:
  node scripts/create-blog-post.mjs --topic "your topic here"

Options:
  --topic     Topic or title idea for the post (required)
  --bookId    Link a book (e.g. magical-creatures, awesome-boys)
  --dry-run   Preview output without writing files
`);
    process.exit(0);
  }

  console.log("\n📝 Little Chubby Press — Bilingual Blog Post Creator\n");
  console.log(`  Topic:   ${topic}`);
  if (bookId) console.log(`  Book:    ${bookId}`);
  console.log(`  Date:    ${todayISO()}`);
  console.log("");

  const post = await generatePost(topic, bookId);

  const date = todayISO();
  const { postId } = post;

  // Image placeholder — to be generated separately with generate-blog-images.mjs
  const imagePath = `/images/blog/${post.en.slug.split("-").slice(0, 3).join("-")}.webp`;

  console.log(`\n  ✅ Generated bilingual post: "${postId}"\n`);
  console.log(`  EN: ${post.en.slug}`);
  console.log(`      "${post.en.title}"`);
  console.log(`  ES: ${post.es.slug}`);
  console.log(`      "${post.es.title}"`);
  console.log(`  Tags EN: ${post.en.tags.join(", ")}`);
  console.log(`  Tags ES: ${post.es.tags.join(", ")}`);
  console.log(`  Image:   ${imagePath}`);

  // Build markdown files
  const enFrontmatter = buildFrontmatter(post.en, "en", postId, bookId, date, imagePath);
  const esFrontmatter = buildFrontmatter(post.es, "es", postId, bookId, date, imagePath);

  const enContent = `${enFrontmatter}\n\n${post.en.body}\n`;
  const esContent = `${esFrontmatter}\n\n${post.es.body}\n`;

  const enPath = resolve(BLOG_DIR, "en", `${post.en.slug}.md`);
  const esPath = resolve(BLOG_DIR, "es", `${post.es.slug}.md`);

  if (dryRun) {
    console.log("\n  🔍 DRY RUN — files not written\n");
    console.log("─".repeat(60));
    console.log(`EN → ${enPath}\n`);
    console.log(enContent.slice(0, 500) + "\n...\n");
    console.log("─".repeat(60));
    console.log(`ES → ${esPath}\n`);
    console.log(esContent.slice(0, 500) + "\n...\n");
    return;
  }

  // Safety: don't overwrite
  if (existsSync(enPath)) {
    console.error(`\n  ✗ File already exists: ${enPath}`);
    process.exit(1);
  }
  if (existsSync(esPath)) {
    console.error(`\n  ✗ File already exists: ${esPath}`);
    process.exit(1);
  }

  writeFileSync(enPath, enContent, "utf-8");
  writeFileSync(esPath, esContent, "utf-8");

  console.log(`\n  📄 Written: ${enPath}`);
  console.log(`  📄 Written: ${esPath}`);
  console.log(`\n  💡 Next steps:`);
  console.log(`     1. Review both files and tweak if needed`);
  console.log(`     2. Generate hero image: node scripts/generate-blog-images.mjs --id <N>`);
  console.log(`        (add entry to BLOG_IMAGES array first)`);
  console.log(`     3. Build & push: npm run build && git add -A && git commit && git push\n`);
}

main().catch((err) => {
  console.error("  ✗ Error:", err.message);
  process.exit(1);
});
