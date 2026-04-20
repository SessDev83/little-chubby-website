#!/usr/bin/env node
/**
 * generate-pinterest-pin.mjs
 * Generates a 1000x1500 Pinterest-optimized Pin image for the Mini Coloring Book freebie.
 *
 * Usage:
 *   node scripts/generate-pinterest-pin.mjs
 *   node scripts/generate-pinterest-pin.mjs --output public/images/pinterest/pin-01.png
 *
 * Requires: sharp (devDep, already installed)
 */

import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const ROOT = path.resolve(import.meta.dirname, "..");
const FREE_IMAGES = path.join(ROOT, "Free Images");
const LOGO_PATH = path.join(ROOT, "public", "images", "brand", "logo-mark-transparent.png");

// ── Canvas (Pinterest 2:3) ────────────────────────────────
const W = 1000;
const H = 1500;

// ── Brand palette (matches generate-mini-book.mjs) ────────
const CREAM = "#f6f1e7";
const BROWN = "#754624";
const GOLD = "#d3a442";
const INK = "#2f261f";
const CORAL = "#e9605a";

// ── 3 showcase images (variety = trust signal on Pinterest) ──
const SHOWCASE = [
  path.join(FREE_IMAGES, "Dinausor", "Image1.png"),
  path.join(FREE_IMAGES, "Astronauts-space", "Image1.png"),
  path.join(FREE_IMAGES, "Kids Favorites (Toys, Fun & Fantasy)", "Image1.png"),
];

async function main() {
  const outputArg = process.argv.find((a) => a.startsWith("--output="));
  const output = outputArg
    ? path.resolve(ROOT, outputArg.split("=")[1])
    : path.join(ROOT, "public", "images", "pinterest", "pin-01-mini-coloring-book.png");

  fs.mkdirSync(path.dirname(output), { recursive: true });

  console.log("📌 Generating Pinterest Pin (1000x1500)...\n");

  // ── 1. Background with subtle top/bottom color bands ───
  const background = Buffer.from(`
    <svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="topBand" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#fce9d9"/>
          <stop offset="100%" stop-color="#f6f1e7"/>
        </linearGradient>
      </defs>
      <rect width="${W}" height="${H}" fill="${CREAM}"/>
      <rect width="${W}" height="420" fill="url(#topBand)"/>
    </svg>
  `);

  // ── 2. Prepare 3 showcase thumbnails (white cards) ─────
  const CARD_W = 260;
  const CARD_H = 340;
  const GAP = 30;
  const ROW_W = CARD_W * 3 + GAP * 2;
  const ROW_X = Math.floor((W - ROW_W) / 2);
  const ROW_Y = 560;

  const cards = [];
  for (let i = 0; i < SHOWCASE.length; i++) {
    const img = await sharp(SHOWCASE[i])
      .resize({ width: CARD_W - 40, height: CARD_H - 40, fit: "inside", background: "#ffffff" })
      .flatten({ background: "#ffffff" })
      .toBuffer();

    const meta = await sharp(img).metadata();

    // White rounded card as SVG (drop-shadow effect)
    const card = Buffer.from(`
      <svg width="${CARD_W}" height="${CARD_H}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="6" stdDeviation="8" flood-color="#000" flood-opacity="0.15"/>
          </filter>
        </defs>
        <rect x="6" y="6" width="${CARD_W - 12}" height="${CARD_H - 12}" rx="18" ry="18"
              fill="#ffffff" filter="url(#shadow)"/>
      </svg>
    `);

    const composed = await sharp(card)
      .composite([
        {
          input: img,
          left: Math.floor((CARD_W - (meta.width ?? 0)) / 2),
          top: Math.floor((CARD_H - (meta.height ?? 0)) / 2),
        },
      ])
      .png()
      .toBuffer();

    // Slight rotation on outer cards
    const angle = i === 0 ? -6 : i === 2 ? 6 : 0;
    const rotated =
      angle === 0
        ? composed
        : await sharp(composed)
            .rotate(angle, { background: { r: 0, g: 0, b: 0, alpha: 0 } })
            .toBuffer();

    cards.push({
      buffer: rotated,
      x: ROW_X + i * (CARD_W + GAP),
      y: ROW_Y,
    });
  }

  // ── 3. Text overlay (SVG, crisp at any size) ────────────
  const textOverlay = Buffer.from(`
    <svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
      <style>
        .headline {
          font-family: 'Arial Black', 'Helvetica Neue', sans-serif;
          font-weight: 900;
          fill: ${BROWN};
        }
        .sub {
          font-family: 'Arial', 'Helvetica', sans-serif;
          font-weight: 600;
          fill: ${INK};
        }
        .eyebrow {
          font-family: 'Arial', 'Helvetica', sans-serif;
          font-weight: 700;
          fill: ${CORAL};
          letter-spacing: 6px;
        }
        .cta {
          font-family: 'Arial Black', 'Helvetica Neue', sans-serif;
          font-weight: 900;
          fill: #ffffff;
          letter-spacing: 2px;
        }
        .url {
          font-family: 'Arial', 'Helvetica', sans-serif;
          font-weight: 700;
          fill: ${BROWN};
          letter-spacing: 1px;
        }
      </style>

      <!-- Eyebrow -->
      <text x="${W / 2}" y="125" class="eyebrow" font-size="28" text-anchor="middle">
        FREE PRINTABLE · PDF
      </text>

      <!-- Headline line 1 -->
      <text x="${W / 2}" y="230" class="headline" font-size="96" text-anchor="middle">
        10 FREE
      </text>
      <!-- Headline line 2 -->
      <text x="${W / 2}" y="330" class="headline" font-size="78" text-anchor="middle">
        Coloring Pages
      </text>
      <!-- Subtitle -->
      <text x="${W / 2}" y="400" class="sub" font-size="34" text-anchor="middle">
        For Kids Ages 3–8 · Screen-Free Fun
      </text>

      <!-- CTA badge -->
      <g transform="translate(${W / 2 - 260}, ${H - 360})">
        <rect x="0" y="0" width="520" height="108" rx="54" ry="54" fill="${CORAL}"/>
        <text x="260" y="70" class="cta" font-size="40" text-anchor="middle">
          DOWNLOAD FREE →
        </text>
      </g>

      <!-- URL (bottom) -->
      <text x="${W / 2}" y="${H - 50}" class="url" font-size="28" text-anchor="middle">
        littlechubbypress.com
      </text>
    </svg>
  `);

  // ── 4. Logo ─────────────────────────────────────────────
  const logoSize = 96;
  const logo = await sharp(LOGO_PATH)
    .resize({ width: logoSize, height: logoSize, fit: "inside" })
    .toBuffer();

  // ── 5. Compose everything ───────────────────────────────
  // Layout bottom (top → bottom):
  //   CTA badge bottom edge  → y = H - 252
  //   Logo (96px)            → y = H - 210  (42px gap above, 114px to URL)
  //   URL baseline           → y = H - 50
  const composites = [
    ...cards.map((c) => ({ input: c.buffer, left: c.x, top: c.y })),
    { input: textOverlay, left: 0, top: 0 },
    { input: logo, left: Math.floor((W - logoSize) / 2), top: H - 210 },
  ];

  await sharp(background).composite(composites).png({ quality: 95 }).toFile(output);

  const stats = fs.statSync(output);
  console.log(`✅ Pin created: ${path.relative(ROOT, output)}`);
  console.log(`   Size: ${W}x${H}px · ${(stats.size / 1024).toFixed(1)} KB`);
  console.log(`\n📋 Next steps:`);
  console.log(`   1. Review the PNG visually`);
  console.log(`   2. Upload to Pinterest → Board: "Free Coloring Pages for Kids"`);
  console.log(`   3. Destination URL:`);
  console.log(
    `      https://www.littlechubbypress.com/en/coloring-corner/?utm_source=pinterest&utm_medium=social&utm_campaign=freebie_launch&utm_content=pin01_mini_book`,
  );
}

main().catch((err) => {
  console.error("❌ Failed:", err);
  process.exit(1);
});
