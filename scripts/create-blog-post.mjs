#!/usr/bin/env node
/**
 * Bilingual Blog Post Creator — Full Pipeline
 *
 * Creates matching EN + ES blog posts with:
 *   - Shared postId for seamless language switching
 *   - "Keep exploring" / "Sigue leyendo" internal links (3 related posts)
 *   - AI-generated hero image (brand-consistent WebP)
 *   - SEO-friendly slugs, tags, and meta descriptions
 *
 * Usage:
 *   node scripts/create-blog-post.mjs --topic "why coloring helps kids sleep"
 *   node scripts/create-blog-post.mjs --topic "..." --bookId cozy-kids-club
 *   node scripts/create-blog-post.mjs --topic "..." --dry-run
 *   node scripts/create-blog-post.mjs --topic "..." --no-image   # skip image generation
 *   node scripts/create-blog-post.mjs --seo-auto --date 2026-04-29
 *   node scripts/create-blog-post.mjs --seo-auto                  # pick next item from blog-queue-500.json
 */

import { readFileSync, writeFileSync, existsSync, readdirSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import sharp from "sharp";
import { BRAND_STYLE } from "./social/image-generate.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const BLOG_DIR = resolve(ROOT, "src/content/blog");
const IMG_DIR = resolve(ROOT, "public/images/blog");
const QUEUE_PATH = resolve(__dirname, "blog-queue.json");
const SEO_QUEUE_PATH = resolve(__dirname, "blog-queue-500.json");

// ─── Load .env ──────────────────────────────────────────────────────────────

const envPath = resolve(ROOT, ".env");
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf-8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq === -1) continue;
    const key = t.slice(0, eq).trim();
    const val = t.slice(eq + 1).trim();
    if (!process.env[key]) process.env[key] = val;
  }
}

// ─── API config ─────────────────────────────────────────────────────────────

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
// Model upgrade Apr 2026: blogs are long-form SEO — Opus 4.7 gives noticeably
// better prose + reasoning. Cost impact: ~$0.02 per blog post.
const CLAUDE_MODEL = process.env.ANTHROPIC_BLOG_MODEL || "claude-opus-4-7";
const MAX_TOKENS = 12288;

const NANO_API_URL = "https://api.nanobananaapi.dev/v1/images/generate";
// Model Apr 2026: flash-image-hd (5 credits) — matches social quality and avoids Pro 2K timeouts.
// Override via NANO_BANANA_BLOG_MODEL for premium hero images.
const IMG_MODEL = process.env.NANO_BANANA_BLOG_MODEL || "gemini-2.5-flash-image-hd";
const IMG_SIZE = 800;
const WEBP_QUALITY = 80;

// ─── Read existing posts for internal linking ───────────────────────────────

function readExistingPosts(lang) {
  const dir = resolve(BLOG_DIR, lang);
  if (!existsSync(dir)) return [];
  const posts = [];
  for (const file of readdirSync(dir)) {
    if (!file.endsWith(".md") || file.startsWith("_")) continue;
    const content = readFileSync(resolve(dir, file), "utf-8");
    const fmMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!fmMatch) continue;
    const fm = fmMatch[1];
    const get = (key) => {
      const m = fm.match(new RegExp(`^${key}:\\s*"([^"]*)"`, "m"));
      return m ? m[1] : "";
    };
    const getTags = () => {
      const m = fm.match(/^tags:\s*\[([^\]]*)\]/m);
      return m ? m[1].split(",").map((t) => t.trim().replace(/"/g, "")) : [];
    };
    const category = get("category") || "article";
    if (category !== "article") continue;
    const articleCategory = get("articleCategory");
    const slug = file.replace(/\.md$/, "");
    posts.push({
      slug,
      postId: get("postId"),
      title: get("title"),
      summary: get("summary"),
      tags: getTags(),
      bookId: get("bookId"),
      path: articleCategory ? `/${lang}/articles/${articleCategory}/${slug}/` : `/${lang}/blog/${slug}/`,
    });
  }
  return posts;
}

function buildExistingPostsList(lang) {
  const posts = readExistingPosts(lang);
  return posts
    .map((p) => `- slug: "${p.slug}" | title: "${p.title}" | tags: [${p.tags.join(", ")}] | path: ${p.path}`)
    .join("\n");
}

// ─── System prompt ──────────────────────────────────────────────────────────

function buildSystemPrompt(enPostsList, esPostsList) {
  return `You are the bilingual blog content writer for Little Chubby Press, a small independent publisher of children's coloring books.

Your job is to create ONE blog post in TWO languages (English + Spanish) simultaneously.

═══ BRAND VOICE FOUNDATION (from BRAND_VOICE_GUIDE.md) ═══

ORIGIN: Little Chubby Press was born from real family moments. A family with four kids discovered that coloring together created calm, creativity, laughter, and real conversations. After years of it being the go-to family activity, they decided to share it with other families.

DIFFERENTIATOR: Our books are designed by kids, for kids. Every concept starts with our own kids' ideas. No book goes to print until every kid approves every page. If our kids love it, other kids will too.

VOICE: You write as Chubby the Elephant — the brand mascot and voice of ALL content. In blog posts, Chubby speaks in a more article-friendly tone (less chatbot, more storytelling) but keeps the same casual, warm personality.

VOICE CALIBRATION (match this energy in every post):
- "Our books are simple to color — they don't create stress."
- "It doesn't really matter if you color a bunny blue. If your kid likes it, that's perfect."
- "Enjoy the moment."
- "Every color in every place of the page can be a good fit."
- "It's designed to let kids AND parents use their creativity."

PERSONALITY:
- Casual & relaxed — like a parent chatting at the park
- Warm but not cheesy — no forced excitement
- Encouraging, never judgmental
- Practical — useful takeaways, not fluff
- Authentic — real parent voice
- Anti-pressure — never push sales, suggest naturally

PRIVACY GUARDRAILS (non-negotiable):
- ALLOWED: "we have kids", "our little ones", "our four kids", generic anonymized anecdotes
- NEVER: real names, exact ages, real photos, geographic location, gender breakdown
- NEVER: mention AI involvement in book creation

CONTENT PILLARS (every post maps to one):
1. Screen-Free Family Time  2. Kids' Creativity  3. Educational Benefits  4. Creative Gift Ideas  5. Community & Sharing

SALES RULES:
- Max 15% of content should promote buying. Lead with experience, not product
- NEVER use: "Buy now!", "Limited time!", aggressive urgency
- CTAs: "Check it out if you're curious", "It's on Amazon whenever you're ready"

EMOJI RULES:
- Blog posts: minimal. Only in intro/closing. None in body paragraphs
- Only use: 🐘 🎨 📚 🥜 ✨ — never hype emojis

BRAND ENEMIES (frame with empathy, never guilt):
- Screens & tech overload — offer alternatives, don't shame
- Kids' boredom — turn boring moments into creative ones

TARGET AUDIENCE:
- Parents and caregivers of children ages 4-12
- They value reducing screen time, fostering creativity, and quality family moments

WRITING RULES:
- Posts should be 600-900 words each (per language)
- Use Markdown: ## for sections (never #), **bold** for emphasis, bullet lists where helpful
- 3-6 clear sections with descriptive ## headings
- Open with a relatable hook that names a real parenting pain point
- NEVER open with: "In today's world...", "As parents, we all know...", "Have you ever wondered...", or any generic/cliche opener
- Include practical, actionable tips parents can use TODAY
- End with a section titled "## Your next step" (EN) / "## Tu siguiente paso" (ES) with one clear, encouraging closing paragraph
- DO NOT use # (h1) — Astro renders the title separately
- DO NOT include the title in the body text
- DO NOT use apostrophes (write "do not" instead of "don't", "it is" instead of "it's")
- Spanish: Latin American, casual but respectful. Do NOT use accents/tildes. Use "peques" for little kids
- English: warm American English, inclusive language

INTERNAL LINKS — CRITICAL:
After the "Your next step" section, you MUST add an internal links section:
- English: "## Keep exploring" with exactly 3 bullet links
- Spanish: "## Sigue leyendo" with exactly 3 bullet links
Each bullet is formatted as: - [Descriptive anchor text](path) — short explanation.
Pick the 3 most RELEVANT existing posts based on topic/tag overlap.
Use the EXACT paths from the lists below. Do NOT invent paths.

EXISTING ENGLISH POSTS:
${enPostsList}

EXISTING SPANISH POSTS:
${esPostsList}

SLUG RULES:
- English slug: 4-7 lowercase words separated by hyphens, descriptive SEO-friendly
- Spanish slug: 4-7 lowercase words separated by hyphens, descriptive SEO-friendly in Spanish
- NO accents/tildes in slugs

TAG RULES:
- 3-5 tags per post, lowercase English words (same tags for both languages)
- Pick from existing tags when possible: creativity, focus, emotions, parenting, screen-free, fine-motor, book-review, confidence, imagination, education, family-activities, stem, self-expression, travel, seasonal, food, fashion, activities, wellness, emotional-development, coloring, bedtime
- Only invent a new tag if truly needed

IMAGE PROMPT:
Also provide a detailed prompt for generating a hero image. The image should:
- Feature the cute chubby baby elephant mascot OR children in kawaii watercolor style
- Use warm paper tones, soft watercolors, brand colors (cream, coral, sky blue, green)
- Show a scene related to the post topic with coloring/creativity elements
- Be a clean square composition with no text or words

RESPONSE FORMAT:
Respond with VALID JSON ONLY. No markdown fences, no backticks, no commentary.
{
  "postId": "short-kebab-case-id-shared-by-both",
  "imagePrompt": "detailed scene description for AI image generation",
  "en": {
    "slug": "english-seo-friendly-slug",
    "title": "Engaging English Title in Title Case",
    "summary": "One compelling sentence (max 160 chars) for meta description",
    "tags": ["tag1", "tag2", "tag3"],
    "body": "Full markdown body including ## Keep exploring section at end..."
  },
  "es": {
    "slug": "slug-descriptivo-en-espanol",
    "title": "Titulo atractivo en espanol",
    "summary": "Una oracion compelling (max 160 chars) para meta description",
    "tags": ["tag1", "tag2", "tag3"],
    "body": "Cuerpo completo en markdown incluyendo ## Sigue leyendo al final..."
  }
}`;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = { topic: null, bookId: null, dryRun: false, noImage: false, auto: false, seoAuto: false, date: null };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--topic" && args[i + 1]) opts.topic = args[++i];
    if (args[i] === "--bookId" && args[i + 1]) opts.bookId = args[++i];
    if (args[i] === "--date" && args[i + 1]) opts.date = args[++i];
    if (args[i] === "--dry-run") opts.dryRun = true;
    if (args[i] === "--no-image") opts.noImage = true;
    if (args[i] === "--auto") opts.auto = true;
    if (args[i] === "--seo-auto") opts.seoAuto = true;
  }
  return opts;
}

// ─── Queue management ───────────────────────────────────────────────────────

function loadQueue(queuePath = QUEUE_PATH) {
  if (!existsSync(queuePath)) return [];
  return JSON.parse(readFileSync(queuePath, "utf-8"));
}

function pickNextFromQueue(queuePath = QUEUE_PATH) {
  const queue = loadQueue(queuePath);
  const pending = queue.filter((item) => item.status === "pending");
  pending.sort((a, b) => (a.priority ?? Number.MAX_SAFE_INTEGER) - (b.priority ?? Number.MAX_SAFE_INTEGER));
  return pending[0] || null;
}

function getQueueItemKey(itemOrTopic) {
  if (typeof itemOrTopic === "string") return itemOrTopic;
  return itemOrTopic?.id || itemOrTopic?.topic || "";
}

function markQueueItemDone(itemOrTopic, queuePath = QUEUE_PATH) {
  const queue = loadQueue(queuePath);
  const key = getQueueItemKey(itemOrTopic);
  const item = queue.find((i) => getQueueItemKey(i) === key && i.status === "pending");
  if (item) {
    item.status = "done";
    writeFileSync(queuePath, JSON.stringify(queue, null, 2) + "\n", "utf-8");
  }
}

function queueTopicText(item) {
  if (!item) return "";
  if (typeof item.topic === "string") return item.topic;
  if (item.topic?.en && item.topic?.es) return `${item.topic.en} / ${item.topic.es}`;
  return item.id || "";
}

function buildSeoQueuePrompt(item) {
  if (!item) return "";
  return [
    "Approved SEO queue item:",
    `- postId to use exactly: ${item.id}`,
    `- contentRole: ${item.contentRole}`,
    `- seoCluster: ${item.seoCluster}`,
    `- articleCategory: ${item.articleCategory}`,
    `- searchIntent: ${item.searchIntent}`,
    `- pillarId: ${item.pillarId}`,
    `- EN topic/title target: ${item.topic?.en || item.topic}`,
    `- ES topic/title target: ${item.topic?.es || item.topic}`,
    `- EN primary keyword: ${item.primaryKeyword?.en || ""}`,
    `- ES primary keyword: ${item.primaryKeyword?.es || ""}`,
    `- editorial angle: ${item.angle || ""}`,
    `- avoid overlapping with these existing/queued topics: ${(item.avoidOverlapWith || []).join(", ") || "none"}`,
    "Use the primary keyword naturally. Do not keyword-stuff. Keep the article distinct from the avoidOverlapWith items.",
    "If this is a spoke and the exact pillar URL appears in the existing-post lists, link to it naturally. If it does not appear, do not invent a pillar URL.",
  ].join("\n");
}

function readAllExistingPosts() {
  return ["en", "es"].flatMap((lang) => readExistingPosts(lang).map((post) => ({ ...post, lang })));
}

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function validateGeneratedPost(post, finalPostId, seoItem) {
  const existing = readAllExistingPosts();
  const existingPostIds = new Set(existing.map((p) => p.postId).filter(Boolean));
  const existingTitles = new Set(existing.map((p) => normalizeText(p.title)).filter(Boolean));
  const existingSlugs = new Set(existing.map((p) => p.slug).filter(Boolean));

  if (existingPostIds.has(finalPostId)) {
    throw new Error(`Duplicate postId detected before writing: ${finalPostId}`);
  }
  for (const lang of ["en", "es"]) {
    const data = post[lang];
    if (!data?.slug || !data?.title || !data?.summary || !Array.isArray(data?.tags) || !data?.body) {
      throw new Error(`Generated ${lang.toUpperCase()} post is missing required fields`);
    }
    if (existingSlugs.has(data.slug)) {
      throw new Error(`Duplicate ${lang.toUpperCase()} slug detected before writing: ${data.slug}`);
    }
    const normalizedTitle = normalizeText(data.title);
    if (existingTitles.has(normalizedTitle)) {
      throw new Error(`Duplicate ${lang.toUpperCase()} title detected before writing: ${data.title}`);
    }
  }
  if (seoItem?.id && finalPostId !== seoItem.id) {
    throw new Error(`SEO queue postId mismatch. Expected "${seoItem.id}", got "${finalPostId}"`);
  }
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function validateDateISO(date) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error(`Invalid --date value "${date}". Use YYYY-MM-DD.`);
  }
  const parsed = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) {
    throw new Error(`Invalid --date value "${date}". Use a real calendar date.`);
  }
  return date;
}

function buildFrontmatter(data, lang, postId, bookId, date, imagePath, seoMeta = null) {
  const yamlEscape = (s) => String(s).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  const lines = [
    "---",
    `postId: "${postId}"`,
    `title: "${yamlEscape(data.title)}"`,
    `date: "${date}"`,
    `summary: "${yamlEscape(data.summary)}"`,
    `lang: "${lang}"`,
    `category: "article"`,
  ];
  if (seoMeta?.articleCategory) lines.push(`articleCategory: "${yamlEscape(seoMeta.articleCategory)}"`);
  if (bookId) lines.push(`bookId: "${yamlEscape(bookId)}"`);
  if (imagePath) lines.push(`image: "${yamlEscape(imagePath)}"`);
  lines.push(`tags: [${data.tags.map((t) => `"${yamlEscape(t)}"`).join(", ")}]`);
  if (seoMeta?.seoCluster) lines.push(`seoCluster: "${yamlEscape(seoMeta.seoCluster)}"`);
  if (seoMeta?.searchIntent) lines.push(`searchIntent: "${yamlEscape(seoMeta.searchIntent)}"`);
  if (seoMeta?.contentRole) lines.push(`contentRole: "${yamlEscape(seoMeta.contentRole)}"`);
  if (seoMeta?.pillarId) lines.push(`pillarId: "${yamlEscape(seoMeta.pillarId)}"`);
  if (seoMeta?.primaryKeyword?.en && seoMeta?.primaryKeyword?.es) {
    lines.push("primaryKeyword:");
    lines.push(`  en: "${yamlEscape(seoMeta.primaryKeyword.en)}"`);
    lines.push(`  es: "${yamlEscape(seoMeta.primaryKeyword.es)}"`);
  }
  lines.push("---");
  return lines.join("\n");
}

// ─── AI content generation ─────────────────────────────────────────────────

async function generatePost(topic, bookId, enPostsList, esPostsList, seoItem = null, date = todayISO()) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error("  ✗ ANTHROPIC_API_KEY not set");
    process.exit(1);
  }

  let userPrompt = `Write a bilingual blog post about: "${topic}"`;
  if (seoItem) {
    userPrompt += `\n\n${buildSeoQueuePrompt(seoItem)}`;
  }
  if (bookId) {
    userPrompt += `\n\nRelated book (bookId: "${bookId}"). Mention this book naturally in both versions with its title in **bold** — never as an ad. Include a brief recommendation that fits the post narrative.`;
  }
  userPrompt += `\n\nToday's date: ${date}`;

  const systemPrompt = buildSystemPrompt(enPostsList, esPostsList);

  const MAX_ATTEMPTS = 3;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    if (attempt > 1) console.log(`  🔄 Retry ${attempt - 1}/${MAX_ATTEMPTS - 1} — Claude returned invalid JSON`);
    console.log("  🤖 Calling Claude for bilingual content...");
    const res = await fetch(ANTHROPIC_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: CLAUDE_MODEL,
        max_tokens: MAX_TOKENS,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Anthropic API error (${res.status}): ${err}`);
    }

    const json = await res.json();
    let raw = json.content?.[0]?.text ?? "";
    // Strip markdown fences if Claude wraps JSON in ```json ... ```
    raw = raw.replace(/^```(?:json)?\s*\n?/i, "").replace(/\n?```\s*$/i, "").trim();
    try {
      return JSON.parse(raw);
    } catch (parseErr) {
      if (attempt === MAX_ATTEMPTS) throw parseErr;
    }
  }
}

// ─── Hero image generation ─────────────────────────────────────────────────

async function generateHeroImage(imagePrompt, filename) {
  const apiKey = process.env.NANO_BANANA_API_KEY;
  if (!apiKey) {
    console.log("  ⚠ NANO_BANANA_API_KEY not set — skipping image generation");
    return false;
  }

  console.log("  🎨 Generating hero image...");
  const fullPrompt = `${BRAND_STYLE}\n\nScene to illustrate:\n${imagePrompt}`;

  const res = await fetch(NANO_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prompt: fullPrompt,
      num: 1,
      model: IMG_MODEL,
      image_size: "1:1",
    }),
    signal: AbortSignal.timeout(240_000),
  });

  if (!res.ok) {
    const body = await res.text();
    console.log(`  ⚠ Image API error (${res.status}): ${body}`);
    return false;
  }

  const json = await res.json();
  if (json.code !== 0) {
    console.log(`  ⚠ Image API error: ${json.message}`);
    return false;
  }

  const url = Array.isArray(json.data?.url) ? json.data.url[0] : json.data?.url;
  if (!url) {
    console.log("  ⚠ No image URL returned");
    return false;
  }

  const imgRes = await fetch(url, { signal: AbortSignal.timeout(30_000) });
  if (!imgRes.ok) {
    console.log("  ⚠ Failed to download image");
    return false;
  }

  const rawBuffer = Buffer.from(await imgRes.arrayBuffer());
  const optimized = await sharp(rawBuffer)
    .resize(IMG_SIZE, IMG_SIZE, { fit: "cover" })
    .webp({ quality: WEBP_QUALITY })
    .toBuffer();

  const outPath = resolve(IMG_DIR, filename);
  writeFileSync(outPath, optimized);
  const kb = Math.round(optimized.length / 1024);
  const pct = Math.round((1 - optimized.length / rawBuffer.length) * 100);
  console.log(`  ✅ Image saved: ${filename} (${kb} KB, ${pct}% smaller)`);
  return true;
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  const { topic: topicArg, bookId: bookIdArg, dryRun, noImage, auto, seoAuto, date: dateArg } = parseArgs();
  const publicationDate = dateArg ? validateDateISO(dateArg) : todayISO();

  // ─── Auto mode: pick next topic from queue ───────────────────────────────
  let topic = topicArg;
  let bookId = bookIdArg;
  let queueItem = null;
  let activeQueuePath = QUEUE_PATH;

  if (auto || seoAuto) {
    activeQueuePath = seoAuto ? SEO_QUEUE_PATH : QUEUE_PATH;
    const next = pickNextFromQueue(activeQueuePath);
    if (!next) {
      console.log("\n  ✅ Queue empty — all blog posts have been created!\n");
      process.exit(0);
    }
    queueItem = next;
    topic = queueTopicText(next);
    bookId = next.bookId || null;
    console.log(`\n  🤖 ${seoAuto ? "SEO AUTO" : "AUTO"} MODE — picked from queue: "${topic}"`);
  }

  if (!topic) {
    console.log(`
📝 Little Chubby Press — Bilingual Blog Post Creator

Usage:
  node scripts/create-blog-post.mjs --topic "your topic here"
  node scripts/create-blog-post.mjs --auto          # pick next from queue
  node scripts/create-blog-post.mjs --seo-auto      # pick next from blog-queue-500.json

Options:
  --topic      Topic or title idea for the post (required unless --auto)
  --bookId     Link a book (e.g. magical-creatures, awesome-boys)
  --auto       Pick the next pending topic from blog-queue.json
  --seo-auto   Pick the next pending SEO item from blog-queue-500.json
  --dry-run    Preview output without writing files or generating images
  --no-image   Skip hero image generation
  --date       Publication date to write in frontmatter (YYYY-MM-DD)
`);
    process.exit(0);
  }

  console.log("\n📝 Little Chubby Press — Bilingual Blog Post Creator\n");
  console.log(`  Topic:   ${topic}`);
  if (queueItem?.seoCluster) console.log(`  Cluster: ${queueItem.seoCluster}`);
  if (queueItem?.contentRole) console.log(`  Role:    ${queueItem.contentRole}`);
  if (bookId) console.log(`  Book:    ${bookId}`);
  console.log(`  Date:    ${publicationDate}`);

  // Step 1: Read existing posts for internal linking
  console.log("\n  📚 Reading existing posts for internal linking...");
  const enPostsList = buildExistingPostsList("en");
  const esPostsList = buildExistingPostsList("es");
  const enCount = readExistingPosts("en").length;
  const esCount = readExistingPosts("es").length;
  console.log(`     Found ${enCount} EN + ${esCount} ES posts`);

  // Step 2: Generate bilingual content with Claude
  const post = await generatePost(topic, bookId, enPostsList, esPostsList, queueItem, publicationDate);

  const date = publicationDate;
  const postId = queueItem?.id || post.postId;
  const { imagePrompt } = post;
  validateGeneratedPost(post, postId, queueItem);

  // Derive image filename from EN slug
  const imageFilename = `${post.en.slug.split("-").slice(0, 3).join("-")}.webp`;
  const imagePath = `/images/blog/${imageFilename}`;

  console.log(`\n  ✅ Content generated: "${postId}"\n`);
  console.log(`  EN: ${post.en.slug}`);
  console.log(`      "${post.en.title}"`);
  console.log(`  ES: ${post.es.slug}`);
  console.log(`      "${post.es.title}"`);
  console.log(`  Tags: ${post.en.tags.join(", ")}`);
  console.log(`  Image: ${imagePath}`);

  // Build markdown files
  const enFrontmatter = buildFrontmatter(post.en, "en", postId, bookId, date, imagePath, queueItem);
  const esFrontmatter = buildFrontmatter(post.es, "es", postId, bookId, date, imagePath, queueItem);

  const enContent = `${enFrontmatter}\n\n${post.en.body}\n`;
  const esContent = `${esFrontmatter}\n\n${post.es.body}\n`;

  const enPath = resolve(BLOG_DIR, "en", `${post.en.slug}.md`);
  const esPath = resolve(BLOG_DIR, "es", `${post.es.slug}.md`);

  if (dryRun) {
    console.log("\n  🔍 DRY RUN — nothing written\n");
    console.log("─".repeat(60));
    console.log(`EN → ${post.en.slug}.md\n`);
    console.log(enContent.slice(0, 800) + "\n...\n");
    console.log("─".repeat(60));
    console.log(`ES → ${post.es.slug}.md\n`);
    console.log(esContent.slice(0, 800) + "\n...\n");
    console.log("─".repeat(60));
    console.log(`Image prompt: ${imagePrompt}\n`);
    return;
  }

  // Safety: do not overwrite
  if (existsSync(enPath)) {
    console.error(`\n  ✗ File already exists: ${enPath}`);
    process.exit(1);
  }
  if (existsSync(esPath)) {
    console.error(`\n  ✗ File already exists: ${esPath}`);
    process.exit(1);
  }

  // Step 3: Write markdown files
  writeFileSync(enPath, enContent, "utf-8");
  writeFileSync(esPath, esContent, "utf-8");
  console.log(`\n  📄 EN post written: src/content/blog/en/${post.en.slug}.md`);
  console.log(`  📄 ES post written: src/content/blog/es/${post.es.slug}.md`);

  // Mark queue item as done (if auto mode)
  if (auto || seoAuto) {
    markQueueItemDone(queueItem || topic, activeQueuePath);
    console.log(`  ✅ Queue item marked done`);
  }

  // Step 4: Generate hero image
  if (!noImage) {
    console.log("");
    const imageOk = await generateHeroImage(imagePrompt, imageFilename);
    if (!imageOk) {
      console.log(`  💡 Generate image manually later:`);
      console.log(`     Add to BLOG_IMAGES in generate-blog-images.mjs, then run --id <N>`);
    }
  } else {
    console.log("\n  ⏭ Image generation skipped (--no-image)");
  }

  console.log(`\n  ✨ Done! Review posts, then: npm run build && git add -A && git commit && git push\n`);
}

main().catch((err) => {
  console.error("  ✗ Error:", err.message);
  process.exit(1);
});
