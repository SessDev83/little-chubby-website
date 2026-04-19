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
const CLAUDE_MODEL = "claude-sonnet-4-20250514";
const MAX_TOKENS = 4096;

const NANO_API_URL = "https://api.nanobananaapi.dev/v1/images/generate";
const IMG_MODEL = "gemini-2.5-flash-image";
const IMG_SIZE = 800;
const WEBP_QUALITY = 80;

const SITE_URL = "https://www.littlechubbypress.com";

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
    const slug = file.replace(/\.md$/, "");
    posts.push({
      slug,
      postId: get("postId"),
      title: get("title"),
      summary: get("summary"),
      tags: getTags(),
      bookId: get("bookId"),
      path: `/${lang}/blog/${slug}/`,
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
  const opts = { topic: null, bookId: null, dryRun: false, noImage: false, auto: false };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--topic" && args[i + 1]) opts.topic = args[++i];
    if (args[i] === "--bookId" && args[i + 1]) opts.bookId = args[++i];
    if (args[i] === "--dry-run") opts.dryRun = true;
    if (args[i] === "--no-image") opts.noImage = true;
    if (args[i] === "--auto") opts.auto = true;
  }
  return opts;
}

// ─── Queue management ───────────────────────────────────────────────────────

const QUEUE_PATH = resolve(__dirname, "blog-queue.json");

function loadQueue() {
  if (!existsSync(QUEUE_PATH)) return [];
  return JSON.parse(readFileSync(QUEUE_PATH, "utf-8"));
}

function pickNextFromQueue() {
  const queue = loadQueue();
  const next = queue.find((item) => item.status === "pending");
  return next || null;
}

function markQueueItemDone(topic) {
  const queue = loadQueue();
  const item = queue.find((i) => i.topic === topic && i.status === "pending");
  if (item) {
    item.status = "done";
    writeFileSync(QUEUE_PATH, JSON.stringify(queue, null, 2) + "\n", "utf-8");
  }
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

// ─── AI content generation ─────────────────────────────────────────────────

async function generatePost(topic, bookId, enPostsList, esPostsList) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error("  ✗ ANTHROPIC_API_KEY not set");
    process.exit(1);
  }

  let userPrompt = `Write a bilingual blog post about: "${topic}"`;
  if (bookId) {
    userPrompt += `\n\nRelated book (bookId: "${bookId}"). Mention this book naturally in both versions with its title in **bold** — never as an ad. Include a brief recommendation that fits the post narrative.`;
  }
  userPrompt += `\n\nToday's date: ${todayISO()}`;

  const systemPrompt = buildSystemPrompt(enPostsList, esPostsList);

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
  return JSON.parse(raw);
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
    signal: AbortSignal.timeout(120_000),
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
  const { topic: topicArg, bookId: bookIdArg, dryRun, noImage, auto } = parseArgs();

  // ─── Auto mode: pick next topic from queue ───────────────────────────────
  let topic = topicArg;
  let bookId = bookIdArg;

  if (auto) {
    const next = pickNextFromQueue();
    if (!next) {
      console.log("\n  ✅ Queue empty — all blog posts have been created!\n");
      process.exit(0);
    }
    topic = next.topic;
    bookId = next.bookId || null;
    console.log(`\n  🤖 AUTO MODE — picked from queue: "${topic}"`);
  }

  if (!topic) {
    console.log(`
📝 Little Chubby Press — Bilingual Blog Post Creator

Usage:
  node scripts/create-blog-post.mjs --topic "your topic here"
  node scripts/create-blog-post.mjs --auto          # pick next from queue

Options:
  --topic      Topic or title idea for the post (required unless --auto)
  --bookId     Link a book (e.g. magical-creatures, awesome-boys)
  --auto       Pick the next pending topic from blog-queue.json
  --dry-run    Preview output without writing files or generating images
  --no-image   Skip hero image generation
`);
    process.exit(0);
  }

  console.log("\n📝 Little Chubby Press — Bilingual Blog Post Creator\n");
  console.log(`  Topic:   ${topic}`);
  if (bookId) console.log(`  Book:    ${bookId}`);
  console.log(`  Date:    ${todayISO()}`);

  // Step 1: Read existing posts for internal linking
  console.log("\n  📚 Reading existing posts for internal linking...");
  const enPostsList = buildExistingPostsList("en");
  const esPostsList = buildExistingPostsList("es");
  const enCount = readExistingPosts("en").length;
  const esCount = readExistingPosts("es").length;
  console.log(`     Found ${enCount} EN + ${esCount} ES posts`);

  // Step 2: Generate bilingual content with Claude
  const post = await generatePost(topic, bookId, enPostsList, esPostsList);

  const date = todayISO();
  const { postId, imagePrompt } = post;

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
  const enFrontmatter = buildFrontmatter(post.en, "en", postId, bookId, date, imagePath);
  const esFrontmatter = buildFrontmatter(post.es, "es", postId, bookId, date, imagePath);

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
  if (auto) {
    markQueueItemDone(topic);
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
