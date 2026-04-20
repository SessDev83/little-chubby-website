/**
 * pin-image-generate.mjs
 * Parametric Pinterest Pin (1000x1500) image generator.
 *
 * Produces a branded, Pinterest-optimized PNG buffer from:
 *   - A headline (big text)
 *   - A subtitle (small text)
 *   - An eyebrow (tiny uppercase label)
 *   - A CTA text (rounded button)
 *   - 0–3 showcase images (used as card thumbnails)
 *
 * Returns: { buffer: Buffer, mimeType: "image/png", width: 1000, height: 1500 }
 *
 * This is intentionally visual-only (no API calls) so it can run in CI without
 * extra secrets.
 */

import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const ROOT = path.resolve(import.meta.dirname, "../..");
const LOGO_PATH = path.join(ROOT, "public", "images", "brand", "logo-mark-transparent.png");

// ── Brand palette ────────────────────────────────────────
const PALETTE = {
  cream: "#f6f1e7",
  creamLight: "#fce9d9",
  brown: "#754624",
  gold: "#d3a442",
  ink: "#2f261f",
  coral: "#e9605a",
  white: "#ffffff",
};

// ── Canvas ───────────────────────────────────────────────
const W = 1000;
const H = 1500;

// ── Helpers ──────────────────────────────────────────────

/**
 * XML-escape a string for safe SVG embedding.
 */
function xmlEscape(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Wrap a long headline into up to `maxLines` lines (simple char-count based).
 * Keeps Pinterest feed legibility — headlines too long kill thumbnail CTR.
 */
function wrapHeadline(text, maxCharsPerLine = 14, maxLines = 2) {
  const words = text.split(/\s+/);
  const lines = [];
  let current = "";
  for (const w of words) {
    if ((current + " " + w).trim().length <= maxCharsPerLine) {
      current = (current + " " + w).trim();
    } else {
      if (current) lines.push(current);
      current = w;
      if (lines.length === maxLines - 1) {
        // Remaining words go into last line (even if long)
        current = [current, ...words.slice(words.indexOf(w) + 1)].join(" ");
        break;
      }
    }
  }
  if (current) lines.push(current);
  return lines.slice(0, maxLines);
}

// ── Card with showcase image ─────────────────────────────
async function makeShowcaseCard(imagePath, { w = 260, h = 340, angle = 0 }) {
  // Resize source image to fit the card with padding
  const inner = await sharp(imagePath)
    .resize({ width: w - 40, height: h - 40, fit: "inside", background: "#ffffff" })
    .flatten({ background: "#ffffff" })
    .toBuffer();
  const meta = await sharp(inner).metadata();

  const card = Buffer.from(`
    <svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="s" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="6" stdDeviation="8" flood-color="#000" flood-opacity="0.15"/>
        </filter>
      </defs>
      <rect x="6" y="6" width="${w - 12}" height="${h - 12}" rx="18" ry="18" fill="${PALETTE.white}" filter="url(#s)"/>
    </svg>
  `);

  const composed = await sharp(card)
    .composite([
      {
        input: inner,
        left: Math.floor((w - (meta.width ?? 0)) / 2),
        top: Math.floor((h - (meta.height ?? 0)) / 2),
      },
    ])
    .png()
    .toBuffer();

  if (!angle) return composed;
  return sharp(composed)
    .rotate(angle, { background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();
}

// ── Hero image card (single large image, for book-promo / blog) ──
async function makeHeroCard(imagePath, { w = 700, h = 700, padding = 40 }) {
  const inner = await sharp(imagePath)
    .resize({ width: w - padding * 2, height: h - padding * 2, fit: "inside", background: "#ffffff" })
    .flatten({ background: "#ffffff" })
    .toBuffer();
  const meta = await sharp(inner).metadata();

  const card = Buffer.from(`
    <svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="hs" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="10" stdDeviation="14" flood-color="#000" flood-opacity="0.18"/>
        </filter>
      </defs>
      <rect x="8" y="8" width="${w - 16}" height="${h - 16}" rx="24" ry="24" fill="${PALETTE.white}" filter="url(#hs)"/>
    </svg>
  `);

  return sharp(card)
    .composite([
      {
        input: inner,
        left: Math.floor((w - (meta.width ?? 0)) / 2),
        top: Math.floor((h - (meta.height ?? 0)) / 2),
      },
    ])
    .png()
    .toBuffer();
}

// ── Main API ─────────────────────────────────────────────

/**
 * Generate a 1000x1500 Pinterest Pin image.
 *
 * @param {object} params
 * @param {string} params.headline            Main text (1-4 words best)
 * @param {string} [params.subtitle]          One-line subhead
 * @param {string} [params.eyebrow]           Tiny uppercase label
 * @param {string} [params.ctaText]           CTA button text (default: "LEARN MORE →")
 * @param {string[]} [params.showcaseImages]  0–3 image paths (triptych layout)
 * @param {string} [params.heroImage]         Single hero image path (alternate layout)
 * @param {string} [params.url]               Display-only URL at the bottom
 * @param {string} [params.variant]           "triptych" (default) | "hero"
 * @returns {Promise<{ buffer: Buffer, mimeType: "image/png", width: number, height: number }>}
 */
export async function generatePinImage({
  headline,
  subtitle = "",
  eyebrow = "",
  ctaText = "LEARN MORE →",
  showcaseImages = [],
  heroImage = null,
  url = "littlechubbypress.com",
  variant = null,
} = {}) {
  const effectiveVariant = variant || (heroImage ? "hero" : "triptych");

  // ── 1. Background ──
  const background = Buffer.from(`
    <svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="${PALETTE.creamLight}"/>
          <stop offset="100%" stop-color="${PALETTE.cream}"/>
        </linearGradient>
      </defs>
      <rect width="${W}" height="${H}" fill="${PALETTE.cream}"/>
      <rect width="${W}" height="440" fill="url(#g)"/>
    </svg>
  `);

  // ── 2. Image composition ──
  const imageComposites = [];

  if (effectiveVariant === "hero" && heroImage) {
    const CARD_W = 720;
    const CARD_H = 720;
    const card = await makeHeroCard(heroImage, { w: CARD_W, h: CARD_H });
    imageComposites.push({
      input: card,
      left: Math.floor((W - CARD_W) / 2),
      top: 500,
    });
  } else if (showcaseImages.length > 0) {
    const CARD_W = 260;
    const CARD_H = 340;
    const GAP = 30;
    const rowW = CARD_W * 3 + GAP * 2;
    const rowX = Math.floor((W - rowW) / 2);
    const rowY = 560;

    // pad/truncate to 3 slots
    const slots = [...showcaseImages].slice(0, 3);
    while (slots.length < 3) slots.push(showcaseImages[slots.length % showcaseImages.length]);

    for (let i = 0; i < 3; i++) {
      const angle = i === 0 ? -6 : i === 2 ? 6 : 0;
      const buf = await makeShowcaseCard(slots[i], { w: CARD_W, h: CARD_H, angle });
      imageComposites.push({
        input: buf,
        left: rowX + i * (CARD_W + GAP),
        top: rowY,
      });
    }
  }

  // ── 3. Text overlay ──
  const lines = wrapHeadline(headline, 14, 2);
  const headlineFontSize = lines.length === 1 ? 110 : 86;
  const headlineLine1Y = lines.length === 1 ? 280 : 240;
  const headlineLine2Y = 340;

  const textOverlay = Buffer.from(`
    <svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
      <style>
        .headline { font-family: 'Arial Black', 'Helvetica Neue', sans-serif; font-weight: 900; fill: ${PALETTE.brown}; }
        .sub       { font-family: 'Arial', 'Helvetica', sans-serif; font-weight: 600; fill: ${PALETTE.ink}; }
        .eyebrow   { font-family: 'Arial', 'Helvetica', sans-serif; font-weight: 700; fill: ${PALETTE.coral}; letter-spacing: 6px; }
        .cta       { font-family: 'Arial Black', 'Helvetica Neue', sans-serif; font-weight: 900; fill: ${PALETTE.white}; letter-spacing: 2px; }
        .url       { font-family: 'Arial', 'Helvetica', sans-serif; font-weight: 700; fill: ${PALETTE.brown}; letter-spacing: 1px; }
      </style>

      ${eyebrow ? `<text x="${W / 2}" y="125" class="eyebrow" font-size="28" text-anchor="middle">${xmlEscape(eyebrow)}</text>` : ""}

      ${lines[0] ? `<text x="${W / 2}" y="${headlineLine1Y}" class="headline" font-size="${headlineFontSize}" text-anchor="middle">${xmlEscape(lines[0])}</text>` : ""}
      ${lines[1] ? `<text x="${W / 2}" y="${headlineLine2Y}" class="headline" font-size="${Math.round(headlineFontSize * 0.82)}" text-anchor="middle">${xmlEscape(lines[1])}</text>` : ""}

      ${subtitle ? `<text x="${W / 2}" y="420" class="sub" font-size="32" text-anchor="middle">${xmlEscape(subtitle)}</text>` : ""}

      <!-- CTA badge -->
      <g transform="translate(${W / 2 - 280}, ${H - 360})">
        <rect x="0" y="0" width="560" height="110" rx="55" ry="55" fill="${PALETTE.coral}"/>
        <text x="280" y="72" class="cta" font-size="38" text-anchor="middle">${xmlEscape(ctaText)}</text>
      </g>

      ${url ? `<text x="${W / 2}" y="${H - 50}" class="url" font-size="28" text-anchor="middle">${xmlEscape(url)}</text>` : ""}
    </svg>
  `);

  // ── 4. Logo ──
  const logoSize = 96;
  const logo = await sharp(LOGO_PATH)
    .resize({ width: logoSize, height: logoSize, fit: "inside" })
    .toBuffer();

  // ── 5. Compose ──
  const buffer = await sharp(background)
    .composite([
      ...imageComposites,
      { input: textOverlay, left: 0, top: 0 },
      { input: logo, left: Math.floor((W - logoSize) / 2), top: H - 210 },
    ])
    .png({ quality: 95 })
    .toBuffer();

  return { buffer, mimeType: "image/png", width: W, height: H };
}

/**
 * Resolve a set of showcase images for the "triptych" layout
 * given a content type — uses local Free Images when available.
 */
export function defaultShowcaseForType(type) {
  const freeImages = path.join(ROOT, "Free Images");
  const picks = {
    "free-coloring": [
      path.join(freeImages, "Dinausor", "Image1.png"),
      path.join(freeImages, "Astronauts-space", "Image1.png"),
      path.join(freeImages, "Kids Favorites (Toys, Fun & Fantasy)", "Image1.png"),
    ],
    "giveaway": [
      path.join(freeImages, "Kids Favorites (Toys, Fun & Fantasy)", "Image2.png"),
      path.join(freeImages, "Animal & Nature Togheter", "Image1.png"),
      path.join(freeImages, "Dinausor", "Image2.png"),
    ],
    "fun-fact": [
      path.join(freeImages, "Astronauts-space", "Image2.png"),
      path.join(freeImages, "Dinausor", "Image3.jpg"),
      path.join(freeImages, "Animal & Nature Togheter", "Image2.png"),
    ],
    "engagement": [
      path.join(freeImages, "Mini Scenes", "Image1.png"),
      path.join(freeImages, "Food & Drink togheter", "Image1.png"),
      path.join(freeImages, "Kids Favorites (Toys, Fun & Fantasy)", "Image3.png"),
    ],
    "parenting-tip": [
      path.join(freeImages, "Jobs", "Image1.png"),
      path.join(freeImages, "Machine & Site", "Image1.png"),
      path.join(freeImages, "Basic elements", "Image1.png"),
    ],
  };
  const list = picks[type] || picks["free-coloring"];
  // Only keep existing files
  return list.filter((p) => fs.existsSync(p));
}

/**
 * Write a generated pin to disk (dev/debug only).
 */
export async function writePinImage(buffer, outPath) {
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, buffer);
  return outPath;
}
