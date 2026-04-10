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
 *   --type <type>        book-promo | blog-share | engagement | community | parenting-tip | behind-scenes | fun-fact (default: book-promo)
 *   --lang <lang>        en | es  (default: en)
 *   --book <id>          Use a specific book by ID (e.g. "magical-creatures")
 *   --dry-run            Show what would be posted without actually posting
 *   --no-ai              Force static templates instead of AI generation
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
import { generateAIPost } from "./ai-generate.mjs";
import { generateImage, downloadImage } from "./image-generate.mjs";
import { postToBluesky } from "./platforms/bluesky.mjs";
import { postToFacebook, postToInstagram } from "./platforms/meta.mjs";

const SITE_URL = "https://www.littlechubbypress.com";

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
    noAi: false,
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
      case "--no-ai":
        opts.noAi = true;
        break;
    }
  }

  return opts;
}

// ─── Adapt static template to per-platform format ─────────────────────────

function adaptToPlatforms(post, data, lang) {
  // Bluesky: short text, no URLs, 2-3 hashtags — total must be ≤300 chars
  let bskyText = post.text;
  // Strip any URLs from bluesky text
  bskyText = bskyText.replace(/https?:\/\/[^\s]+/g, "").replace(/\n\n+/g, "\n\n").trim();
  let bskyHashtags = post.hashtags.split(" ").slice(0, 3).join(" ");

  // Ensure combined text + hashtags fits in 300 chars (AT Protocol limit)
  const bskyMaxTotal = 300;
  const hashtagBlock = bskyHashtags ? `\n\n${bskyHashtags}` : "";
  const maxTextLen = bskyMaxTotal - hashtagBlock.length;
  if (bskyText.length > maxTextLen) {
    let cut = bskyText.lastIndexOf(".", maxTextLen - 1);
    if (cut < 80) cut = bskyText.lastIndexOf(" ", maxTextLen - 1);
    if (cut < 80) cut = maxTextLen - 1;
    bskyText = bskyText.slice(0, cut + 1);
  }

  // Facebook: full text with CTA and link
  const fbText = `${post.text}\n\n${post.cta}`;
  const fbHashtags = post.hashtags;

  // Instagram: no URLs, "link in bio" instead
  let igText = post.text.replace(/https?:\/\/[^\s]+/g, "").trim();
  if (post.cta) {
    const bioText = lang === "es" ? "Link en bio" : "Link in bio";
    igText += `\n\n${bioText}`;
  }
  // More hashtags for Instagram discovery
  const extraIG = lang === "es"
    ? "#Colorear #ArteInfantil #MamasCreativas #PapasCreativos #ActividadesSinPantallas"
    : "#KidsArt #ColoringTime #Parenting #MomLife #ArtForKids";
  const igHashtags = `${post.hashtags} ${extraIG}`;

  return {
    concept: post.text.split("\n")[0].slice(0, 80),
    platforms: {
      bluesky:   { text: bskyText, hashtags: bskyHashtags },
      facebook:  { text: fbText, hashtags: fbHashtags },
      instagram: { text: igText, hashtags: igHashtags },
    },
    imagePrompt: null,
    aiGenerated: false,
  };
}

// ─── Resolve image for platforms ────────────────────────────────────────────

async function resolveImage(post, data, opts) {
  // For book-promo: use the book cover
  if (opts.type === "book-promo" && data?.coverSrc) {
    const url = data.coverSrc.startsWith("http")
      ? data.coverSrc
      : `${SITE_URL}${data.coverSrc}`;
    console.log(`🖼️  Using book cover: ${url}`);
    try {
      const { buffer, mimeType } = await downloadImage(url);
      return { url, buffer, mimeType };
    } catch (err) {
      console.log(`⚠️  Could not download book cover: ${err.message}`);
      return { url, buffer: null, mimeType: null };
    }
  }

  // For blog-share: use blog post image if available
  if (opts.type === "blog-share" && data?.image) {
    const url = data.image.startsWith("http")
      ? data.image
      : `${SITE_URL}${data.image}`;
    console.log(`🖼️  Using blog image: ${url}`);
    try {
      const { buffer, mimeType } = await downloadImage(url);
      return { url, buffer, mimeType };
    } catch (err) {
      console.log(`⚠️  Could not download blog image: ${err.message}`);
      // Fall through to AI generation
    }
  }

  // For all other types (or if blog image failed): generate with AI
  if (post.imagePrompt && process.env.NANO_BANANA_API_KEY) {
    try {
      console.log("🎨 Generating image with AI (Nano Banana)...");
      const result = await generateImage(post.imagePrompt);
      if (result?.buffer) {
        console.log(`✅ Image generated (${result.mimeType}, ${(result.buffer.length / 1024).toFixed(0)} KB)`);
        return { url: result.url, buffer: result.buffer, mimeType: result.mimeType };
      }
    } catch (err) {
      console.log(`⚠️  Image generation failed: ${err.message}`);
    }
  } else if (post.imagePrompt && !process.env.NANO_BANANA_API_KEY) {
    console.log("⏭️  Image generation skipped (no NANO_BANANA_API_KEY configured)");
  }

  return null;
}

// ─── Build full post text for a platform ────────────────────────────────────

function buildFullText(platformContent) {
  const { text, hashtags } = platformContent;
  return hashtags ? `${text}\n\n${hashtags}` : text;
}

// ─── Publish to platforms ───────────────────────────────────────────────────

async function publishPost(post, platform, imageData, data, lang) {
  const results = [];
  const platforms = platform === "all"
    ? ["bluesky", "facebook", "instagram"]
    : [platform];

  for (const p of platforms) {
    const content = post.platforms[p];
    if (!content) {
      console.log(`  ⚠️  No content for platform: ${p}`);
      continue;
    }

    const fullText = buildFullText(content);

    try {
      switch (p) {
        case "bluesky": {
          if (!process.env.BLUESKY_HANDLE || !process.env.BLUESKY_PASSWORD) {
            console.log(`  ⏭️  Bluesky: skipped (no credentials configured)`);
            break;
          }

          let bskyText = fullText;
          if (bskyText.length > 300) {
            let cut = bskyText.lastIndexOf(".", 297);
            if (cut < 80) cut = bskyText.lastIndexOf(" ", 297);
            if (cut < 80) cut = 297;
            bskyText = bskyText.slice(0, cut + 1);
          }

          const bskyOpts = {};

          // Attach link card embed
          if (data?.amazonUrl) {
            bskyOpts.linkUrl = data.amazonUrl;
            bskyOpts.linkTitle = data.title?.[lang] || data.title?.en || "";
            bskyOpts.linkDescription = data.description?.[lang] || data.description?.en || "";
          } else {
            // Extract any URL from Facebook text as link card source
            const urlMatch = post.platforms.facebook.text.match(/https?:\/\/[^\s]+/);
            if (urlMatch) {
              bskyOpts.linkUrl = urlMatch[0];
              bskyOpts.linkTitle = "Little Chubby Press";
              bskyOpts.linkDescription = "";
            }
          }

          // Attach image (overrides link card)
          if (imageData?.buffer) {
            bskyOpts.imageBuffer = imageData.buffer;
            bskyOpts.imageMimeType = imageData.mimeType || "image/png";
            bskyOpts.imageAlt = post.concept || "Little Chubby Press";
          }

          const result = await postToBluesky(bskyText, bskyOpts);
          results.push({ platform: "bluesky", success: true, result });
          console.log(`  ✅ Bluesky: posted successfully (${result.uri})`);
          break;
        }

        case "facebook": {
          if (!process.env.META_PAGE_ACCESS_TOKEN || !process.env.META_PAGE_ID) {
            console.log(`  ⏭️  Facebook: skipped (no credentials configured)`);
            break;
          }

          const fbOpts = {};
          if (data?.amazonUrl) fbOpts.link = data.amazonUrl;
          if (imageData?.url) fbOpts.imageUrl = imageData.url;

          const result = await postToFacebook(fullText, fbOpts);
          results.push({ platform: "facebook", success: true, result });
          console.log(`  ✅ Facebook: posted successfully (${result.id})`);
          break;
        }

        case "instagram": {
          if (!process.env.META_PAGE_ACCESS_TOKEN || !process.env.META_IG_USER_ID) {
            console.log(`  ⏭️  Instagram: skipped (no credentials configured)`);
            break;
          }
          if (!imageData?.url) {
            console.log(`  ⚠️  Instagram: skipped (requires a public image URL)`);
            results.push({ platform: "instagram", success: false, error: "No image URL" });
            break;
          }

          const result = await postToInstagram(fullText, imageData.url);
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

// ─── Display post preview ──────────────────────────────────────────────────

function displayPreview(post, aiUsed, type, lang) {
  const source = aiUsed ? "AI" : "template";
  console.log(`📝 Generated post (${type}, ${lang}, ${source}):\n`);

  if (post.concept) {
    console.log(`💡 Concept: ${post.concept}\n`);
  }

  for (const [platform, content] of Object.entries(post.platforms)) {
    const icon = { bluesky: "🦋", facebook: "📘", instagram: "📸" }[platform] || "📱";
    const full = buildFullText(content);
    console.log(`${icon} ${platform.toUpperCase()} (${full.length} chars)`);
    console.log("─".repeat(50));
    console.log(full);
    console.log("─".repeat(50));
    console.log();
  }

  if (post.imagePrompt) {
    console.log(`🖼️  Image prompt: ${post.imagePrompt}\n`);
  }
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

  // Try AI generation first, fall back to static templates
  let post;
  let aiUsed = false;

  if (!opts.noAi && process.env.ANTHROPIC_API_KEY) {
    try {
      console.log("🤖 Generating content with AI (Claude)...\n");
      const aiPost = await generateAIPost(opts.type, opts.lang, data);
      if (aiPost) {
        post = aiPost;
        aiUsed = true;
      }
    } catch (err) {
      console.log(`⚠️  AI generation failed: ${err.message}`);
      console.log("📋 Falling back to static templates...\n");
    }
  }

  if (!post) {
    const staticPost = generatePost(opts.type, opts.lang, data);
    post = adaptToPlatforms(staticPost, data, opts.lang);
  }

  // Display preview
  displayPreview(post, aiUsed, opts.type, opts.lang);

  if (opts.command === "generate") {
    console.log("ℹ️  Preview only. Use 'post' command to publish.\n");
    return;
  }

  if (opts.command === "post") {
    // Resolve image (book cover, blog image, or AI-generated)
    const imageData = await resolveImage(post, data, opts);

    if (opts.dryRun) {
      console.log(`\n🏃 DRY RUN — Would post to: ${opts.platform}`);
      if (imageData?.url) {
        console.log(`   Image: ${imageData.url.slice(0, 80)}...`);
      }
      console.log();
      return;
    }

    console.log(`\n📤 Publishing to: ${opts.platform}...\n`);
    await publishPost(post, opts.platform, imageData, data, opts.lang);
    console.log("\n✨ Done!\n");
  }
}

main().catch((err) => {
  console.error(`\n❌ Fatal error: ${err.message}\n`);
  process.exit(1);
});
