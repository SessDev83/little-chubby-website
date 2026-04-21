#!/usr/bin/env node

/**
 * Generate brand-consistent blog post hero images using Nano Banana API.
 * Outputs optimized WebP images (800Ã—800, quality 80) for fast page loads.
 *
 * Uses the shared BRAND_STYLE from social/image-generate.mjs so blog
 * images and social images follow the same visual identity.
 *
 * Usage:
 *   node scripts/generate-blog-images.mjs              # generate all
 *   node scripts/generate-blog-images.mjs --id 0       # generate only the first one
 *   node scripts/generate-blog-images.mjs --id 3       # generate only index 3
 *   node scripts/generate-blog-images.mjs --start 5    # start from index 5 onward
 *   node scripts/generate-blog-images.mjs --dry-run    # preview prompts only
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { BRAND_STYLE } from "./social/image-generate.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

// â”€â”€â”€ Image optimization settings â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const IMG_SIZE = 800;         // square 800Ã—800 px â€” crisp on retina, light on bandwidth
const WEBP_QUALITY = 80;      // good visual quality at ~40-80 KB per image

// â”€â”€â”€ Load .env â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

const API_KEY = process.env.NANO_BANANA_API_KEY;
if (!API_KEY) {
  console.error("âŒ NANO_BANANA_API_KEY is required. Set it in .env or environment.");
  process.exit(1);
}

const API_URL = "https://api.nanobananaapi.dev/v1/images/generate";
// Model upgrade Apr 2026: align with social (gemini-3-pro 2K). Blog heroes benefit most from extra resolution.
const MODEL = process.env.NANO_BANANA_BLOG_MODEL || "gemini-3-pro-image-preview-2k";

// â”€â”€â”€ Image prompts per blog post â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const BLOG_IMAGES = [
  {
    filename: "fantasy-coloring.webp",
    prompt: "A happy child (around 5 years old) sitting cross-legged on a cozy rug, coloring a page with unicorns and dragons. Around them, the colored creatures float off the page and come alive as soft watercolor wisps â€” a unicorn, a friendly dragon, a mermaid tail â€” creating a magical atmosphere. Crayons scattered around, warm golden light from a window."
  },
  {
    filename: "choosing-coloring-book.webp",
    prompt: "A parent and young child (around 4 years old) sitting together at a sunlit table, looking at different coloring books spread out. The child is pointing excitedly at one book. There are 3-4 colorful coloring books on the table, crayons nearby. Warm living room background with soft light. Feeling of a cozy decision-making moment."
  },
  {
    filename: "fashion-teens.webp",
    prompt: "A teenage girl (around 14) relaxed on a beanbag chair, coloring a fashion design page with stylish outfits. She looks focused and peaceful. Fashion-themed coloring pages around her with dresses, accessories, and modern outfits sketched. Colored pencils and markers nearby. Soft bedroom aesthetic with fairy lights in background."
  },
  {
    filename: "dress-confidence.webp",
    prompt: "A young girl (around 6) proudly holding up a colored page of a beautiful dress she designed, big smile on her face. Her creation shows a colorful princess dress. A coloring book with dresses and dolls is open on the table. Warm sunlit room, crayons and colored pencils around her. Feeling of pride and self-expression."
  },
  {
    filename: "creative-workshop.webp",
    prompt: "An overhead view of a creative activity table where two children are doing different coloring activities â€” one is coloring a page, another is cutting out colored shapes. Crayons, scissors (child-safe), glue sticks, and colorful paper scraps on the table. Warm afternoon light. A joyful mess of creative play."
  },
  {
    filename: "fashion-history.webp",
    prompt: "A cute chubby baby elephant wearing a tiny beret, painting colorful dresses and hats on a big canvas. Around the elephant are sketches of fun outfits: a crown, a cape, sparkly shoes, a big floppy hat. Bright watercolor palette, warm paper-textured background, cheerful kawaii illustration style for children."
  },
  {
    filename: "focus-concentration.webp",
    prompt: "A young child (around 5) deeply focused on coloring a page, tongue slightly out in concentration, leaning over a coloring book at a quiet desk. Soft sunlight streaming through a window, a glass of juice nearby, crayons neatly organized. The scene radiates peaceful concentration and calm. Warm, cozy tones."
  },
  {
    filename: "calm-corner.webp",
    prompt: "A cozy reading/coloring nook in the corner of a room â€” soft cushions on the floor, a small bookshelf with coloring books, a cup with crayons and pencils, warm string lights, and a child sitting calmly coloring with a peaceful expression. Soft muted warm tones, creating a safe calm-down space feeling."
  },
  {
    filename: "screen-free.webp",
    prompt: "A boy (around 7) enthusiastically coloring an action-packed page with rockets and vehicles, completely ignoring a turned-off tablet sitting nearby. He's at a bright kitchen table with a big smile, coloring book open, bold markers in hand. Energetic but wholesome scene. Warm afternoon light."
  },
  {
    filename: "easter-family.webp",
    prompt: "A family scene: parent and two children around a table doing Easter-themed coloring activities â€” coloring eggs on paper, a coloring book with bunnies and Easter eggs open. Colorful decorated paper eggs drying on a string above. Spring flowers on the table. Warm, festive, family-time atmosphere with soft pastel colors."
  },
  {
    filename: "food-picky-eaters.webp",
    prompt: "A child at a kitchen table coloring a page full of fun food illustrations â€” pizza slices, cupcakes, fruits, and ice cream. Next to the coloring book there's a real plate with colorful snacks. The child looks curious and engaged. Bright cheerful kitchen setting with warm light. Connection between coloring food and eating food."
  },
  {
    filename: "naming-feelings.webp",
    prompt: "A child sitting with an open coloring book showing pages with different emotion faces â€” happy, sad, surprised, calm. The child is coloring a happy face with a yellow crayon. Soft rainbow of colored pencils arranged around. Warm, gentle, emotionally safe atmosphere. Cozy room with cushions."
  },
  {
    filename: "confident-girls.webp",
    prompt: "A confident young girl (around 6) standing and holding up her colorful artwork proudly, surrounded by her other completed coloring pages taped to the wall behind her like a gallery. Coloring supplies on a nearby table. Big genuine smile. Warm room with good lighting. Feeling of pride and accomplishment."
  },
  {
    filename: "coloring-supplies.webp",
    prompt: "A beautiful flat-lay arrangement of coloring supplies on a wooden table: a set of crayons, colored pencils in a cup, washable markers, an open coloring book showing a half-colored page, and a child's hand reaching for a blue crayon. Warm overhead lighting, organized and inviting. Creamy paper background tones."
  },
  {
    filename: "space-stem.webp",
    prompt: "A child (around 6) coloring a space-themed page with planets, rockets, and stars. Above the coloring book, the colored planets seem to float up as soft watercolor dream bubbles showing the solar system. The child looks up with wonder. Dark blue and starry accents mixed with warm room tones. Feeling of curiosity and discovery."
  },
  {
    filename: "trucks-skills.webp",
    prompt: "A boy (around 5) lying on the floor coloring a page full of construction vehicles â€” excavators, dump trucks, cranes. In his other hand he holds a toy truck. The scene is warm and cozy, with a living room rug and scattered crayons. The coloring page shows bold machine outlines. Feeling of happy obsession."
  },
  {
    filename: "first-coloring-book.webp",
    prompt: "A toddler (around 3) holding an oversized crayon, making big colorful marks on a coloring page with a simple large animal outline. The book has thick bold outlines perfect for tiny hands. A parent's hand gently guides nearby. Bright, warm, cheerful nursery setting. First coloring experience feeling."
  },
  {
    filename: "airplanes-world.webp",
    prompt: "A child coloring airplanes on a page, with watercolor dream-bubbles showing different world landmarks (Eiffel Tower, pyramids, mountains) floating above. A world map is visible on the wall behind. Crayons scattered around a wooden table. Warm afternoon light. Feeling of wanderlust and curiosity about the world."
  },
  {
    filename: "letters-preschool.webp",
    prompt: "A preschooler (around 4) happily coloring a large letter 'A' that has an apple drawn inside it. The open alphabet coloring book shows colorful letters with fun images. Chunky crayons in primary colors nearby. Bright cheerful preschool/home setting with educational posters softly blurred in background. Fun learning atmosphere."
  },
];

// â”€â”€â”€ Parse CLI args â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const args = process.argv.slice(2);
let onlyId = null;
let startFrom = 0;
let dryRun = false;

for (let i = 0; i < args.length; i++) {
  if (args[i] === "--id") onlyId = parseInt(args[++i], 10);
  if (args[i] === "--start") startFrom = parseInt(args[++i], 10);
  if (args[i] === "--dry-run") dryRun = true;
}

// â”€â”€â”€ Generate â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

async function generateImage(prompt) {
  const fullPrompt = `${BRAND_STYLE}\n\nScene to illustrate:\n${prompt}`;

  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prompt: fullPrompt,
      num: 1,
      model: MODEL,
      image_size: "1:1",
    }),
    signal: AbortSignal.timeout(120_000),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API error (${res.status}): ${body}`);
  }

  const json = await res.json();
  if (json.code !== 0) throw new Error(`API error: ${json.message}`);

  const url = Array.isArray(json.data?.url) ? json.data.url[0] : json.data?.url;
  if (!url) throw new Error("No image URL returned");

  // Download the raw image
  const imgRes = await fetch(url, { signal: AbortSignal.timeout(30_000) });
  if (!imgRes.ok) throw new Error(`Download failed (${imgRes.status})`);
  const rawBuffer = Buffer.from(await imgRes.arrayBuffer());

  // Optimize: resize to 800×800 and convert to WebP
  const optimized = await sharp(rawBuffer)
    .resize(IMG_SIZE, IMG_SIZE, { fit: "cover" })
    .webp({ quality: WEBP_QUALITY })
    .toBuffer();

  return { raw: rawBuffer, optimized };
}

async function main() {
  console.log(`\nðŸŽ¨ Little Chubby Press â€” Blog Image Generator\n`);
  console.log(`   Images to generate: ${BLOG_IMAGES.length}`);
  console.log(`   Output: public/images/blog/`);
  console.log(`   Format: WebP ${IMG_SIZE}×${IMG_SIZE} q${WEBP_QUALITY}\n`);

  const toProcess = onlyId !== null
    ? [{ ...BLOG_IMAGES[onlyId], index: onlyId }]
    : BLOG_IMAGES.map((img, i) => ({ ...img, index: i })).filter((_, i) => i >= startFrom);

  let success = 0;
  let failed = 0;

  for (const img of toProcess) {
    const outPath = resolve(ROOT, "public/images/blog", img.filename);
    console.log(`[${img.index + 1}/${BLOG_IMAGES.length}] ${img.filename}`);

    if (dryRun) {
      console.log(`   ðŸ“ Prompt: ${img.prompt.slice(0, 120)}...`);
      console.log(`   â­ï¸  Dry run â€” skipping generation\n`);
      continue;
    }

    try {
      console.log(`   ðŸ–¼ï¸  Generating...`);
      const { raw, optimized } = await generateImage(img.prompt);
      writeFileSync(outPath, optimized);
      const saved = ((1 - optimized.length / raw.length) * 100).toFixed(0);
      console.log(`   âœ… Saved (${(optimized.length / 1024).toFixed(0)} KB, ${saved}% smaller)\n`);
      success++;
    } catch (err) {
      console.error(`   âŒ Failed: ${err.message}\n`);
      failed++;
    }
  }

  console.log(`\nðŸ“Š Done: ${success} generated, ${failed} failed\n`);
}

main().catch((err) => {
  console.error(`\nâŒ Fatal error: ${err.message}\n`);
  process.exit(1);
});
