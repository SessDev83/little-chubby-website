#!/usr/bin/env node

/**
 * Social Media CLI — Little Chubby Press
 *
 * Usage:
 *   node scripts/social/post.mjs <command> [options]
 *
 * Commands:
 *   generate             Preview posts without publishing
 *   post                 Generate and publish to selected platforms
 *   calendar             Generate a full 7-day content calendar (preview only)
 *
 * Options:
 *   --platform <name>    bluesky | facebook | instagram | all  (default: bluesky)
 *   --type <type>        book-promo | blog-share | engagement | community (default: book-promo)
 *   --lang <lang>        en | es  (default: en)
 *   --book <id>          Use a specific book by ID (e.g. "magical-creatures")
 *   --dry-run            Show what would be posted without actually posting
 *
 * Examples:
 *   node scripts/social/post.mjs generate --type engagement --lang es
 *   node scripts/social/post.mjs post --platform bluesky --type book-promo --book magical-creatures
 *   node scripts/social/post.mjs calendar --lang en
 *   node scripts/social/post.mjs post --platform all --type book-promo --dry-run
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { generatePost, generateWeeklyCalendar } from "./content-templates.mjs";
import { postToBluesky } from "./platforms/bluesky.mjs";
import { postToFacebook, postToInstagram } from "./platforms/meta.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");

// ─── Load .env file ────────────────────────────────────────────────────────
const envPath = resolve(ROOT, ".env");
if (existsSync(envPath)) {
  const envContent = readFileSync(envPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const value = trimmed.slice(eqIdx + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

// ─── Load books & posts data ───────────────────────────────────────────────
// We read the TS source and extract the data with a simple approach:
// Since the data files are purely declarative arrays, we parse them.

function loadBooks() {
  const src = readFileSync(resolve(ROOT, "src/data/books.ts"), "utf-8");
  // Find the array between "export const books ... = [" and the matching "];".
  const startMatch = src.match(/export\s+const\s+books[^=]*=\s*\[/);
  if (!startMatch) throw new Error("Could not find books array in books.ts");
  const startIdx = startMatch.index + startMatch[0].length - 1; // at the "["
  // Walk to find the matching "]"
  let depth = 0;
  let endIdx = startIdx;
  for (let i = startIdx; i < src.length; i++) {
    if (src[i] === "[") depth++;
    else if (src[i] === "]") { depth--; if (depth === 0) { endIdx = i + 1; break; } }
  }
  const arrayStr = src.slice(startIdx, endIdx);
  return new Function(`return ${arrayStr}`)();
}

function loadPosts() {
  const src = readFileSync(resolve(ROOT, "src/data/posts.ts"), "utf-8");
  const startMatch = src.match(/export\s+const\s+posts[^=]*=\s*\[/);
  if (!startMatch) throw new Error("Could not find posts array in posts.ts");
  const startIdx = startMatch.index + startMatch[0].length - 1;
  let depth = 0;
  let endIdx = startIdx;
  for (let i = startIdx; i < src.length; i++) {
    if (src[i] === "[") depth++;
    else if (src[i] === "]") { depth--; if (depth === 0) { endIdx = i + 1; break; } }
  }
  let arrayStr = src.slice(startIdx, endIdx);
  // Remove references to the books import
  arrayStr = arrayStr.replace(/books\.find\([^)]*\)/g, "undefined");
  // Remove template literal backtick content that may contain HTML (simplify for parsing)
  return new Function(`return ${arrayStr}`)();
}

// ─── Parse CLI args ─────────────────────────────────────────────────────────

function parseArgs() {
  const args = process.argv.slice(2);
  const command = args[0] || "generate";

  const opts = {
    command,
    platform: "bluesky",
    type: "book-promo",
    lang: "en",
    book: null,
    dryRun: false,
  };

  for (let i = 1; i < args.length; i++) {
    switch (args[i]) {
      case "--platform":
        opts.platform = args[++i];
        break;
      case "--type":
        opts.type = args[++i];
        break;
      case "--lang":
        opts.lang = args[++i];
        break;
      case "--book":
        opts.book = args[++i];
        break;
      case "--dry-run":
        opts.dryRun = true;
        break;
    }
  }

  return opts;
}

// ─── Publish to platforms ───────────────────────────────────────────────────

async function publishPost(fullPost, platform, options = {}) {
  const results = [];

  const platforms = platform === "all"
    ? ["bluesky", "facebook", "instagram"]
    : [platform];

  for (const p of platforms) {
    try {
      switch (p) {
        case "bluesky": {
          // Bluesky has a 300 grapheme limit.
          // Use only text (no CTA/hashtags inline) and attach the link as a card.
          let bskyText = options.bskyText || fullPost;
          if (bskyText.length > 300) bskyText = bskyText.slice(0, 297) + "...";
          const result = await postToBluesky(bskyText, options);
          results.push({ platform: "bluesky", success: true, result });
          console.log(`  ✅ Bluesky: posted successfully (${result.uri})`);
          break;
        }
        case "facebook": {
          const result = await postToFacebook(fullPost, { link: options.link });
          results.push({ platform: "facebook", success: true, result });
          console.log(`  ✅ Facebook: posted successfully (${result.id})`);
          break;
        }
        case "instagram": {
          if (!options.imageUrl) {
            console.log(`  ⚠️  Instagram: skipped (requires a public image URL)`);
            results.push({ platform: "instagram", success: false, error: "No image URL" });
            break;
          }
          const result = await postToInstagram(fullPost, options.imageUrl);
          results.push({ platform: "instagram", success: true, result });
          console.log(`  ✅ Instagram: posted successfully (${result.id})`);
          break;
        }
        default:
          console.log(`  ⚠️  Unknown platform: ${p}`);
      }
    } catch (err) {
      results.push({ platform: p, success: false, error: err.message });
      console.error(`  ❌ ${p}: ${err.message}`);
    }
  }

  return results;
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  const opts = parseArgs();
  const books = loadBooks();
  const posts = loadPosts();

  console.log(`\n🎨 Little Chubby Press — Social Media Tool\n`);

  if (opts.command === "calendar") {
    const calendar = generateWeeklyCalendar(books, posts, opts.lang);
    console.log(`📅 Weekly Content Calendar (${opts.lang.toUpperCase()}):\n`);
    for (const entry of calendar) {
      console.log(`━━━ ${entry.day} (${entry.type}) ━━━`);
      console.log(entry.fullPost);
      console.log();
    }
    return;
  }

  // Select data for the post
  let data;
  if (opts.type === "book-promo") {
    if (opts.book) {
      data = books.find((b) => b.id === opts.book);
      if (!data) {
        console.error(`❌ Book "${opts.book}" not found. Available IDs:`);
        books.forEach((b) => console.log(`   - ${b.id}`));
        process.exit(1);
      }
    } else {
      data = books[Math.floor(Math.random() * books.length)];
    }
  } else if (opts.type === "blog-share") {
    data = posts[Math.floor(Math.random() * posts.length)];
  }

  const post = generatePost(opts.type, opts.lang, data);

  console.log(`📝 Generated post (${opts.type}, ${opts.lang}):\n`);
  console.log("─".repeat(60));
  console.log(post.fullPost);
  console.log("─".repeat(60));
  console.log(`\n📏 Length: ${post.fullPost.length} chars\n`);

  if (opts.command === "generate") {
    console.log("ℹ️  Preview only. Use 'post' command to publish.\n");
    return;
  }

  if (opts.command === "post") {
    if (opts.dryRun) {
      console.log(`🏃 DRY RUN — Would post to: ${opts.platform}\n`);
      return;
    }

    console.log(`📤 Publishing to: ${opts.platform}...\n`);

    const pubOptions = {};
    if (data?.amazonUrl) pubOptions.link = data.amazonUrl;
    if (data?.coverSrc?.startsWith("http")) pubOptions.imageUrl = data.coverSrc;

    // For Bluesky: send only the text (no hashtags) and attach URL as a link card
    pubOptions.bskyText = `${post.text}\n\n${post.hashtags}`;
    if (data?.amazonUrl) {
      pubOptions.linkUrl = data.amazonUrl;
      pubOptions.linkTitle = data.title?.en || data.title?.es || "";
      pubOptions.linkDescription = data.description?.en || data.description?.es || "";
    } else if (post.cta) {
      // Extract URL from CTA text
      const urlMatch = post.cta.match(/https?:\/\/[^\s]+/);
      if (urlMatch) {
        pubOptions.linkUrl = urlMatch[0];
        pubOptions.linkTitle = "Little Chubby Press";
        pubOptions.linkDescription = "";
      }
    }

    await publishPost(post.fullPost, opts.platform, pubOptions);
    console.log("\n✨ Done!\n");
  }
}

main().catch((err) => {
  console.error(`\n❌ Fatal error: ${err.message}\n`);
  process.exit(1);
});
